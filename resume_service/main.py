from __future__ import annotations

import time
import uuid

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

from .extractors import ExtractionError, UnsupportedResumeError
from .multipart_parser import MultipartError, parse_multipart
from .observability import METRICS, RATE_LIMITER, log_event
from .parser import parse_resume_document
from .schemas import CandidateType, ErrorResponse, ScoreResumeRequest
from .scoring import score_resume
from .storage import init_storage, list_parsed_resumes, load_parsed_resume, save_parsed_resume

app = FastAPI(
    title="Resume Service",
    version="0.1.0",
    description=(
        "Internal deterministic resume parsing and scoring service for Indian resume normalization. "
        "Use `/v1/parse` for multipart file uploads and `/v1/score` for JD scoring."
    ),
)

# Add CORS middleware for benchmark webapp
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for testing
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup() -> None:
    init_storage()


@app.middleware("http")
async def request_context_middleware(request: Request, call_next):
    request_id = request.headers.get("x-request-id") or str(uuid.uuid4())
    request.state.request_id = request_id

    route_key = request.url.path
    if route_key in {"/v1/parse", "/v1/score"}:
        client_ip = request.client.host if request.client else "unknown"
        if not RATE_LIMITER.allow(client_ip, route_key):
            log_event(request_id=request_id, endpoint=route_key, status=429, failure_reason="rate_limited")
            return JSONResponse(status_code=429, content=ErrorResponse(message="Rate limit exceeded. Please retry shortly.").model_dump())

    start_time = time.perf_counter()
    response = await call_next(request)
    response.headers["x-request-id"] = request_id

    latency_ms = (time.perf_counter() - start_time) * 1000
    if route_key == "/v1/parse" and response.status_code < 400:
        METRICS.parse_success_count += 1
        METRICS.parse_latency_total_ms += latency_ms
    elif route_key == "/v1/score" and response.status_code < 400:
        METRICS.score_request_count += 1
        METRICS.score_latency_total_ms += latency_ms
    return response


@app.exception_handler(MultipartError)
async def multipart_error_handler(request: Request, exc: MultipartError) -> JSONResponse:
    if request.url.path == "/v1/parse":
        METRICS.parse_failure_count += 1
    log_event(
        request_id=getattr(request.state, "request_id", None),
        endpoint=request.url.path,
        status=400,
        failure_reason=str(exc),
    )
    return JSONResponse(status_code=400, content=ErrorResponse(message=str(exc)).model_dump())


@app.exception_handler(UnsupportedResumeError)
async def unsupported_resume_handler(request: Request, exc: UnsupportedResumeError) -> JSONResponse:
    if request.url.path == "/v1/parse":
        METRICS.parse_failure_count += 1
    message = str(exc)
    if "unsupported" in message.lower():
        METRICS.unsupported_format_reject_count += 1
    if "scanned" in message.lower() or "image-based" in message.lower():
        METRICS.scanned_resume_reject_count += 1
    log_event(
        request_id=getattr(request.state, "request_id", None),
        endpoint=request.url.path,
        status=422,
        failure_reason=message,
    )
    return JSONResponse(status_code=422, content=ErrorResponse(message=str(exc)).model_dump())


@app.exception_handler(ExtractionError)
async def extraction_error_handler(request: Request, exc: ExtractionError) -> JSONResponse:
    if request.url.path == "/v1/parse":
        METRICS.parse_failure_count += 1
    log_event(
        request_id=getattr(request.state, "request_id", None),
        endpoint=request.url.path,
        status=400,
        failure_reason=str(exc),
    )
    return JSONResponse(status_code=400, content=ErrorResponse(message=str(exc)).model_dump())


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    if request.url.path == "/v1/parse" and exc.status_code >= 400:
        METRICS.parse_failure_count += 1
    log_event(
        request_id=getattr(request.state, "request_id", None),
        endpoint=request.url.path,
        status=exc.status_code,
        failure_reason=exc.detail,
    )
    if isinstance(exc.detail, str):
        return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})
    return JSONResponse(status_code=exc.status_code, content=exc.detail)


@app.get("/health")
async def healthcheck() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/metrics")
async def metrics_endpoint():
    return METRICS.snapshot().model_dump()


@app.post(
    "/v1/parse",
    summary="Parse a resume",
    openapi_extra={
        "requestBody": {
            "required": True,
            "content": {
                "multipart/form-data": {
                    "schema": {
                        "type": "object",
                        "required": ["file", "resume_id"],
                        "properties": {
                            "file": {
                                "type": "string",
                                "format": "binary",
                                "description": "Resume file in PDF or DOCX format.",
                            },
                            "resume_id": {
                                "type": "string",
                                "description": "Resume identifier from the main backend.",
                                "example": "res_123",
                            },
                            "candidate_type": {
                                "type": "string",
                                "enum": ["fresher", "lateral"],
                                "default": "lateral",
                            },
                        },
                    }
                }
            },
        }
    },
)
async def parse_resume_endpoint(request: Request):
    parts = parse_multipart(await request.body(), request.headers.get("content-type"))
    file_part = parts.get("file")
    resume_id_part = parts.get("resume_id")
    candidate_type_part = parts.get("candidate_type")

    if not file_part or not file_part.filename:
        raise HTTPException(status_code=422, detail="Multipart field 'file' is required.")
    if not resume_id_part or not resume_id_part.text:
        raise HTTPException(status_code=422, detail="Multipart field 'resume_id' is required.")

    try:
        candidate_type = CandidateType(candidate_type_part.text) if candidate_type_part and candidate_type_part.text else CandidateType.lateral
    except ValueError as exc:
        raise HTTPException(status_code=422, detail="Multipart field 'candidate_type' must be 'fresher' or 'lateral'.") from exc
    response = parse_resume_document(
        file_bytes=file_part.data,
        filename=file_part.filename,
        resume_id=resume_id_part.text,
        candidate_type=candidate_type,
        content_type=file_part.content_type,
    )
    save_parsed_resume(response)
    log_event(
        request_id=getattr(request.state, "request_id", None),
        endpoint="/v1/parse",
        status=200,
        resume_id=response.resume_id,
        extractor=response.parser_metadata.extractor_name,
        detected_columns=response.parser_metadata.detected_columns,
    )
    return response.model_dump()


@app.post(
    "/v1/score",
    summary="Score a parsed resume against a job description",
    description="Use stored parsed resume data by sending only `resume_id` and `job_context`, or override with explicit `normalized_resume` and `resume_text`.",
)
async def score_resume_endpoint(request: Request, request_body: ScoreResumeRequest):
    if request_body.normalized_resume is None or request_body.resume_text is None:
        stored_resume = load_parsed_resume(request_body.resume_id)
        if stored_resume is None:
            raise HTTPException(
                status_code=404,
                detail="Parsed resume not found for this resume_id. Call /v1/parse first or provide normalized_resume and resume_text.",
            )
        request_body = ScoreResumeRequest(
            resume_id=request_body.resume_id,
            normalized_resume=stored_resume.normalized_resume,
            resume_text=stored_resume.resume_text,
            job_context=request_body.job_context,
        )

    response = score_resume(request_body)
    log_event(
        request_id=getattr(request.state, "request_id", None),
        endpoint="/v1/score",
        status=200,
        resume_id=request_body.resume_id,
        recommendation=response.recommendation,
    )
    return response.model_dump()


@app.get("/v1/resumes")
async def list_resumes_endpoint(page: int = 1, page_size: int = 20):
    safe_page = max(1, page)
    safe_page_size = min(100, max(1, page_size))
    return list_parsed_resumes(page=safe_page, page_size=safe_page_size).model_dump()


@app.get("/v1/resumes/{resume_id}")
async def get_resume_endpoint(resume_id: str):
    stored_resume = load_parsed_resume(resume_id)
    if stored_resume is None:
        raise HTTPException(status_code=404, detail="Parsed resume not found for this resume_id.")
    return {
        "resume_id": stored_resume.resume_id,
        "candidate_type": stored_resume.candidate_type.value,
        "normalized_resume": stored_resume.normalized_resume.model_dump(),
        "resume_quality": stored_resume.resume_quality.model_dump(),
        "parser_metadata": stored_resume.parser_metadata.model_dump(),
        "resume_text": stored_resume.resume_text,
        "duplicate_of_resume_id": stored_resume.duplicate_of_resume_id,
        "created_at": stored_resume.created_at,
        "updated_at": stored_resume.updated_at,
    }
