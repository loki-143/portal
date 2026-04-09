from __future__ import annotations

import unittest

from resume_service.parser import parse_resume_document
from resume_service.schemas import CandidateType, JobContext, ScoreResumeRequest
from resume_service.scoring import score_resume

from resume_service.tests.fixture_builders import build_docx, build_pdf, load_case


class ScoringTests(unittest.TestCase):
    def test_exactish_match_scores_high(self) -> None:
        case = load_case("lateral_resume")
        parsed = parse_resume_document(
            file_bytes=build_docx(case["lines"]),
            filename="lateral.docx",
            resume_id=case["resume_id"],
            candidate_type=CandidateType(case["candidate_type"]),
        )

        response = score_resume(
            ScoreResumeRequest(
                resume_id=case["resume_id"],
                normalized_resume=parsed.normalized_resume,
                resume_text=parsed.parser_metadata.extracted_text,
                job_context=JobContext(
                    job_id="job_backend_001",
                    title="Senior Backend Developer",
                    description="Looking for Java, Spring Boot, REST APIs, PostgreSQL, AWS and Docker experience.",
                    required_skills=["Java", "Spring Boot", "REST APIs", "PostgreSQL", "AWS"],
                    preferred_skills=["Docker", "Kubernetes"],
                    experience_min_years=3,
                    experience_max_years=6,
                    location="Bengaluru",
                ),
            )
        )

        self.assertGreaterEqual(response.jd_match_score, 80)
        self.assertGreaterEqual(response.resume_quality_score, 60)
        self.assertEqual(response.recommendation, "SHORTLIST")
        self.assertIn("AWS", response.matched_skills)

    def test_missing_skills_are_reported(self) -> None:
        case = load_case("fresher_resume")
        parsed = parse_resume_document(
            file_bytes=build_pdf(case["lines"]),
            filename="fresher.pdf",
            resume_id=case["resume_id"],
            candidate_type=CandidateType(case["candidate_type"]),
        )

        response = score_resume(
            ScoreResumeRequest(
                resume_id=case["resume_id"],
                normalized_resume=parsed.normalized_resume,
                resume_text=parsed.parser_metadata.extracted_text,
                job_context=JobContext(
                    job_id="job_data_001",
                    title="Cloud Data Engineer",
                    description="Need Python, AWS, Kubernetes and PostgreSQL for a cloud-heavy data role.",
                    required_skills=["Python", "AWS", "Kubernetes", "PostgreSQL"],
                    preferred_skills=["Docker"],
                    experience_min_years=2,
                ),
            )
        )

        self.assertIn("AWS", response.missing_skills)
        self.assertIn("Kubernetes", response.missing_skills)
        self.assertLess(response.jd_match_score, 80)
        self.assertIn(response.recommendation, {"REVIEW", "REJECT"})
