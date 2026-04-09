# Resume Service

Internal Python microservice for deterministic resume parsing and scoring with Indian resume normalization.

## Features

- `POST /v1/parse` accepts multipart resume uploads.
- `POST /v1/score` scores a parsed resume against a job description.
- Supports text-based `PDF` and `DOCX`.
- Rejects scanned/image-only PDFs and legacy `.doc` files in v1.
- Redacts or ignores sensitive PII such as Aadhaar, PAN, passport numbers, religion, caste, and family details.

## Run

```powershell
uvicorn resume_service.main:app --reload
```

## Tests

```powershell
python -m unittest discover resume_service/tests -v
```

