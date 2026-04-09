from __future__ import annotations

from enum import Enum
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


class CandidateType(str, Enum):
    fresher = "fresher"
    lateral = "lateral"


class EmploymentRecord(BaseModel):
    company: str | None = None
    title: str | None = None
    start_date: str | None = None
    end_date: str | None = None
    employment_type: str | None = None
    location: str | None = None
    description: str | None = None
    is_current: bool = False


class EducationRecord(BaseModel):
    degree: str | None = None
    specialization: str | None = None
    institution: str | None = None
    completion_year: int | None = None
    score: str | None = None


class ProjectRecord(BaseModel):
    title: str
    tech_stack: list[str] = Field(default_factory=list)
    summary: str | None = None
    source_section: str


class CertificationRecord(BaseModel):
    name: str
    issuer: str | None = None
    issued_date: str | None = None


class SkillEvidenceRecord(BaseModel):
    skill: str
    evidence_type: str
    source_section: str


class NormalizedResume(BaseModel):
    full_name: str | None = None
    emails: list[str] = Field(default_factory=list)
    phones: list[str] = Field(default_factory=list)
    current_location: str | None = None
    links: list[str] = Field(default_factory=list)
    skills: list[str] = Field(default_factory=list)
    skill_evidence: list[SkillEvidenceRecord] = Field(default_factory=list)
    experience_summary: str | None = None
    employment_history: list[EmploymentRecord] = Field(default_factory=list)
    education: list[EducationRecord] = Field(default_factory=list)
    projects: list[ProjectRecord] = Field(default_factory=list)
    certifications: list[CertificationRecord] = Field(default_factory=list)
    current_role: str | None = None
    full_time_months: int = 0
    internship_months: int = 0
    total_relevant_months: int = 0
    notice_period: str | None = None
    current_ctc: str | None = None
    expected_ctc: str | None = None
    preferred_location: str | None = None
    work_authorization: str | None = None


class ParserMetadata(BaseModel):
    filename: str
    file_type: str
    content_type: str | None = None
    file_size_bytes: int
    line_count: int
    page_count: int = 1
    extractor_name: str | None = None
    section_order: list[str] = Field(default_factory=list)
    detected_columns: int = 1
    is_scanned: bool = False
    content_fingerprint: str | None = None
    sensitive_findings: list[str] = Field(default_factory=list)
    extracted_text: str


class ParseResumeResponse(BaseModel):
    resume_id: str
    candidate_type: CandidateType
    normalized_resume: NormalizedResume
    warnings: list[str] = Field(default_factory=list)
    missing_fields: list[str] = Field(default_factory=list)
    resume_quality: "ResumeQualityResult"
    parser_metadata: ParserMetadata


class JobContext(BaseModel):
    job_id: str | None = None
    title: str | None = None
    description: str | None = None
    required_skills: list[str] = Field(default_factory=list)
    preferred_skills: list[str] = Field(default_factory=list)
    keywords: list[str] = Field(default_factory=list)
    experience_min_years: float | None = None
    experience_max_years: float | None = None
    location: str | None = None


class ScoreBreakdown(BaseModel):
    jd_match: dict[str, float]
    resume_quality: dict[str, float]


class ResumeQualityResult(BaseModel):
    score: int
    breakdown: dict[str, float]
    recommendation: str
    summary: str | None = None


class ScoreResumeRequest(BaseModel):
    resume_id: str
    normalized_resume: NormalizedResume | None = None
    resume_text: str | None = None
    job_context: JobContext

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "resume_id": "res_123",
                "job_context": {
                    "job_id": "job_backend_intern_001",
                    "title": "Backend Developer Intern",
                    "description": "Looking for Python, SQL, Git, Flask or FastAPI, and Docker exposure.",
                    "required_skills": ["Python", "SQL", "Git"],
                    "preferred_skills": ["Flask", "Docker", "AWS"],
                    "keywords": ["backend", "api", "internship", "problem solving"],
                    "experience_min_years": 0,
                    "experience_max_years": 1,
                    "location": "Hyderabad",
                },
            }
        }
    )

    @field_validator("resume_text")
    @classmethod
    def ensure_resume_text(cls, value: str | None) -> str | None:
        if value is None:
            return value
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("resume_text must not be empty")
        return cleaned

    @model_validator(mode="after")
    def ensure_resume_inputs_are_complete(self) -> "ScoreResumeRequest":
        has_resume = self.normalized_resume is not None
        has_text = self.resume_text is not None
        if has_resume != has_text:
            raise ValueError("Provide both normalized_resume and resume_text together, or omit both to use stored resume data.")
        return self


class ScoreResumeResponse(BaseModel):
    resume_id: str
    jd_match_score: int
    resume_quality_score: int
    breakdown: ScoreBreakdown
    matched_skills: list[str] = Field(default_factory=list)
    missing_skills: list[str] = Field(default_factory=list)
    recommendation: str
    warnings: list[str] = Field(default_factory=list)
    summary: str | None = None


class ResumeListItem(BaseModel):
    resume_id: str
    candidate_type: CandidateType
    full_name: str | None = None
    current_role: str | None = None
    filename: str | None = None
    extractor_name: str | None = None
    page_count: int = 1
    content_fingerprint: str | None = None
    duplicate_of_resume_id: str | None = None
    created_at: str
    updated_at: str


class ResumeListResponse(BaseModel):
    page: int
    page_size: int
    total: int
    items: list[ResumeListItem] = Field(default_factory=list)


class MetricsResponse(BaseModel):
    parse_success_count: int = 0
    parse_failure_count: int = 0
    score_request_count: int = 0
    unsupported_format_reject_count: int = 0
    scanned_resume_reject_count: int = 0
    average_parse_latency_ms: float = 0.0
    average_score_latency_ms: float = 0.0


class ErrorResponse(BaseModel):
    status: str = "error"
    message: str
    detail: dict[str, Any] | None = None
