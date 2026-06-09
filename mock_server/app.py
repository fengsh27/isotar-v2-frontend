from __future__ import annotations

import random
import re
import time
import uuid
from datetime import UTC, datetime
from typing import Any

from flask import Flask, jsonify, request

app = Flask(__name__)

JOBS: dict[str, dict[str, Any]] = {}
RUN_SECONDS = 14.0
QUEUE_SECONDS = 1.0

STAGES = [
    "miRNA preprocessing",
    "Target prediction",
    "Aggregation",
    "Functional enrichment",
]


def now_iso() -> str:
    return datetime.now(UTC).isoformat()


def stage_for_percent(percent: int) -> str:
    if percent <= 20:
        return STAGES[0]
    if percent <= 55:
        return STAGES[1]
    if percent <= 85:
        return STAGES[2]
    return STAGES[3]


def build_results(job_id: str, payload: dict[str, Any]) -> dict[str, Any]:
    seed = sum(ord(ch) for ch in job_id)
    rng = random.Random(seed)

    tool_count = len(payload.get("tools", []))
    targets = rng.randint(120, 420)
    enrichments = rng.randint(8, 35)

    return {
        "summary": {
            "job_id": job_id,
            "tools_used": tool_count,
            "predicted_targets": targets,
            "enrichment_terms": enrichments,
            "mirna_id": payload.get("mirna_id"),
        },
        "predicted_targets": [
            {
                "gene": f"GENE_{i + 1}",
                "score": round(rng.uniform(0.5, 0.99), 4),
                "support_tools": rng.randint(1, max(1, tool_count)),
            }
            for i in range(min(20, targets))
        ],
        "enrichment": [
            {
                "term": f"Pathway_{i + 1}",
                "fdr": round(rng.uniform(0.0001, 0.049), 4),
                "source": rng.choice(["GO:BP", "KEGG", "Reactome"]),
            }
            for i in range(min(20, enrichments))
        ],
    }


def refresh_job(job: dict[str, Any]) -> None:
    if job["status"] in ("completed", "failed", "cancelled"):
        return

    now_ts = time.time()
    elapsed = now_ts - job["created_ts"]

    if elapsed < QUEUE_SECONDS:
        job["status"] = "queued"
        job["progress"] = {"percent": 0, "stage": STAGES[0], "message": "Queued"}
        return

    if job.get("started_ts") is None:
        job["started_ts"] = job["created_ts"] + QUEUE_SECONDS
        job["started_at"] = datetime.fromtimestamp(job["started_ts"], UTC).isoformat()

    run_elapsed = max(0.0, now_ts - job["started_ts"])
    percent = min(100, int((run_elapsed / RUN_SECONDS) * 100))

    if percent >= 100:
        job["status"] = "completed"
        job["finished_at"] = now_iso()
        job["progress"] = {"percent": 100, "stage": STAGES[-1], "message": "Completed"}
        job["results"] = build_results(job["job_id"], job["payload"])
        return

    job["status"] = "running"
    job["progress"] = {
        "percent": percent,
        "stage": stage_for_percent(percent),
        "message": "Running",
    }


def serialize_job(job: dict[str, Any]) -> dict[str, Any]:
    return {
        "job_id": job["job_id"],
        "status": job["status"],
        "created_at": job["created_at"],
        "started_at": job.get("started_at"),
        "finished_at": job.get("finished_at"),
        "progress": job.get("progress"),
        "results": job.get("results"),
        "error": job.get("error"),
    }


@app.after_request
def add_cors_headers(response):  # type: ignore[no-untyped-def]
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, DELETE, OPTIONS"
    return response


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"ok": True})


@app.route("/mirna/validate", methods=["GET"])
def validate_mirna():
    mirna_id = request.args.get("id", "").strip()
    valid = bool(re.match(r"^[a-z]{3}-miR-[A-Za-z0-9\-]+$", mirna_id))
    return jsonify(
        {
            "valid": valid,
            "canonical_id": mirna_id if valid else None,
            "message": None if valid else "Invalid miRNA ID format for mock server.",
        }
    )


@app.route("/jobs", methods=["POST"])
def create_job():
    payload = request.get_json(silent=True) or {}
    job_id = f"isotar-{datetime.now(UTC).strftime('%Y%m%d')}-{uuid.uuid4().hex[:8]}"

    job = {
        "job_id": job_id,
        "status": "queued",
        "created_at": now_iso(),
        "created_ts": time.time(),
        "started_at": None,
        "started_ts": None,
        "finished_at": None,
        "progress": {"percent": 0, "stage": STAGES[0], "message": "Queued"},
        "results": None,
        "error": None,
        "payload": payload,
    }
    JOBS[job_id] = job

    return jsonify({"job_id": job_id}), 201


@app.route("/jobs", methods=["GET"])
def list_jobs():
    ids_arg = request.args.get("ids", "").strip()
    ids = [item.strip() for item in ids_arg.split(",") if item.strip()] if ids_arg else list(JOBS.keys())

    rows = []
    for job_id in ids:
        job = JOBS.get(job_id)
        if not job:
            continue
        refresh_job(job)
        rows.append(serialize_job(job))

    return jsonify({"jobs": rows})


@app.route("/jobs/<job_id>", methods=["GET"])
def get_job(job_id: str):
    job = JOBS.get(job_id)
    if not job:
        return jsonify({"message": f"Job not found: {job_id}"}), 404

    refresh_job(job)
    return jsonify(serialize_job(job))


@app.route("/jobs/<job_id>/result", methods=["GET"])
def get_job_result(job_id: str):
    job = JOBS.get(job_id)
    if not job:
        return jsonify({"message": f"Job not found: {job_id}"}), 404

    refresh_job(job)
    if job["status"] != "completed":
        return jsonify({"message": f"Job {job_id} is not completed yet.", "status": job["status"]}), 409

    return jsonify(
        {
            "job_id": job_id,
            "status": job["status"],
            "results": job["results"],
        }
    )


@app.route("/jobs/<job_id>/kill", methods=["POST"])
def kill_job(job_id: str):
    job = JOBS.get(job_id)
    if not job:
        return jsonify({"message": f"Job not found: {job_id}"}), 404

    refresh_job(job)
    if job["status"] in ("completed", "failed", "cancelled"):
        return jsonify({"message": f"Job {job_id} is already terminal.", "job": serialize_job(job)}), 409

    job["status"] = "cancelled"
    job["finished_at"] = now_iso()
    current_percent = job.get("progress", {}).get("percent", 0)
    current_stage = job.get("progress", {}).get("stage", STAGES[0])
    job["progress"] = {
        "percent": current_percent,
        "stage": current_stage,
        "message": "Cancelled by user",
    }
    return jsonify(serialize_job(job))


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5001, debug=True)
