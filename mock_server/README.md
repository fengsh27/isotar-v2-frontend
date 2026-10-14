# Mock Flask Job Server

> ⚠️ **Outdated — does not match the current frontend.** It serves the old
> unprefixed paths (`/jobs`), while the frontend now calls `/api/v1/jobs/…`,
> and it implements none of the endpoints added since (results paging with
> `venn`, `/network`, `/enrichment`, `/result/download`, `/targets/validate`).
> Point the frontend at a real backend (see [`docker-compose.yml`](../docker-compose.yml))
> unless you first update the routes below.

What it implements:

- `POST /jobs` submit job
- `GET /jobs` list jobs
- `GET /jobs/<job_id>` query status
- `GET /jobs/<job_id>/result` obtain result (completed jobs only)
- `POST /jobs/<job_id>/kill` cancel running job
- `GET /mirna/validate?id=...` mock miRNA validation
- `GET /health`

## Run

```bash
cd mock_server
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python app.py
```

Server runs on `http://127.0.0.1:5001`.

## Frontend

Set the **server-side** API base in `.env.local` at the repo root — the browser
makes relative requests that Next.js proxies there:

```bash
API_BASE=http://127.0.0.1:5001
```

(`5001` is also the default when `API_BASE` is unset.) Then run the Next.js
app. Do not use `NEXT_PUBLIC_API_BASE` for this; it bypasses the proxy and is
only meant for a backend on a different origin.
