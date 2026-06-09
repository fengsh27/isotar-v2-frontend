# Mock Flask Job Server

This mock server implements the backend contract needed by the frontend:

- `POST /jobs` submit job
- `GET /jobs/<job_id>` query status
- `GET /jobs/<job_id>/result` obtain result (completed jobs only)
- `POST /jobs/<job_id>/kill` cancel running job
- `GET /jobs` list jobs
- `GET /mirna/validate?id=...` mock miRNA validation

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

Set frontend API base:

```bash
NEXT_PUBLIC_API_BASE=http://127.0.0.1:5001
```

Then run the Next.js app.
