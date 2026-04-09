from __future__ import annotations

import unittest

from fastapi.testclient import TestClient

from resume_service.main import app
from resume_service.storage import DB_PATH, load_parsed_resume

from resume_service.tests.fixture_builders import build_docx, build_legacy_doc_stub, build_pdf, load_case


class ContractTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.client = TestClient(app)

    def test_parse_endpoint_accepts_multipart_pdf(self) -> None:
        case = load_case("fresher_resume")
        resume_id = "contract_parse_pdf_001"
        response = self.client.post(
            "/v1/parse",
            files={"file": ("resume.pdf", build_pdf(case["lines"]), "application/pdf")},
            data={"resume_id": resume_id, "candidate_type": case["candidate_type"]},
        )

        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body["resume_id"], resume_id)
        self.assertEqual(body["candidate_type"], case["candidate_type"])
        self.assertEqual(body["normalized_resume"]["full_name"], "Aarav Sharma")
        self.assertIn("resume_quality", body)
        self.assertIn("score", body["resume_quality"])
        self.assertTrue(DB_PATH.exists())
        self.assertIsNotNone(load_parsed_resume(resume_id))

    def test_score_endpoint_returns_breakdown(self) -> None:
        case = load_case("lateral_resume")
        resume_id = "contract_score_breakdown_001"
        parse_response = self.client.post(
            "/v1/parse",
            files={
                "file": (
                    "resume.docx",
                    build_docx(case["lines"]),
                    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                )
            },
            data={"resume_id": resume_id, "candidate_type": case["candidate_type"]},
        )
        self.assertEqual(parse_response.status_code, 200)

        score_response = self.client.post(
            "/v1/score",
            json={
                "resume_id": resume_id,
                "job_context": {
                    "job_id": "job_backend_001",
                    "title": "Senior Backend Developer",
                    "description": "Java Spring Boot AWS PostgreSQL REST APIs",
                    "required_skills": ["Java", "Spring Boot", "REST APIs", "PostgreSQL"],
                    "preferred_skills": ["AWS", "Docker"],
                    "experience_min_years": 3
                }
            },
        )

        self.assertEqual(score_response.status_code, 200)
        body = score_response.json()
        self.assertEqual(
            set(body.keys()),
            {
                "resume_id",
                "jd_match_score",
                "resume_quality_score",
                "breakdown",
                "matched_skills",
                "missing_skills",
                "recommendation",
                "warnings",
                "summary",
            },
        )
        self.assertIn("jd_match", body["breakdown"])
        self.assertIn("resume_quality", body["breakdown"])
        self.assertIn("recommendation", body)

    def test_score_endpoint_uses_stored_resume_data_with_minimal_payload(self) -> None:
        case = load_case("fresher_resume")
        resume_id = "contract_storage_score_001"
        parse_response = self.client.post(
            "/v1/parse",
            files={"file": ("resume.pdf", build_pdf(case["lines"]), "application/pdf")},
            data={"resume_id": resume_id, "candidate_type": case["candidate_type"]},
        )
        self.assertEqual(parse_response.status_code, 200)

        score_response = self.client.post(
            "/v1/score",
            json={
                "resume_id": resume_id,
                "job_context": {
                    "job_id": "job_python_001",
                    "title": "Python Intern",
                    "description": "Need Python, FastAPI, SQL and Docker.",
                    "required_skills": ["Python", "SQL"],
                    "preferred_skills": ["FastAPI", "Docker"],
                },
            },
        )

        self.assertEqual(score_response.status_code, 200)
        body = score_response.json()
        self.assertEqual(body["resume_id"], resume_id)
        self.assertIn("Python", body["matched_skills"])

    def test_score_endpoint_returns_404_when_resume_not_stored(self) -> None:
        response = self.client.post(
            "/v1/score",
            json={
                "resume_id": "missing_resume_contract_404",
                "job_context": {
                    "job_id": "job_missing_001",
                    "title": "Backend Intern",
                    "required_skills": ["Python"],
                },
            },
        )

        self.assertEqual(response.status_code, 404)

    def test_parse_endpoint_rejects_legacy_doc(self) -> None:
        response = self.client.post(
            "/v1/parse",
            files={"file": ("legacy.doc", build_legacy_doc_stub(), "application/msword")},
            data={"resume_id": "contract_legacy_doc_001", "candidate_type": "lateral"},
        )

        self.assertEqual(response.status_code, 422)
        self.assertIn("not supported", response.json()["message"].lower())

    def test_parse_endpoint_rejects_corrupted_payload(self) -> None:
        response = self.client.post(
            "/v1/parse",
            files={"file": ("broken.pdf", b"not-a-real-pdf", "application/pdf")},
            data={"resume_id": "res_broken", "candidate_type": "lateral"},
        )

        self.assertEqual(response.status_code, 422)

    def test_parse_endpoint_requires_file_field(self) -> None:
        response = self.client.post(
            "/v1/parse",
            files={"placeholder": ("note.txt", b"placeholder", "text/plain")},
            data={"resume_id": "contract_missing_file_001", "candidate_type": "lateral"},
        )

        self.assertEqual(response.status_code, 422)
        self.assertEqual(response.json()["detail"], "Multipart field 'file' is required.")

    def test_parse_endpoint_requires_resume_id_field(self) -> None:
        response = self.client.post(
            "/v1/parse",
            files={"file": ("resume.pdf", build_pdf(["Example Resume"]), "application/pdf")},
            data={"candidate_type": "lateral"},
        )

        self.assertEqual(response.status_code, 422)
        self.assertEqual(response.json()["detail"], "Multipart field 'resume_id' is required.")

    def test_parse_endpoint_returns_expected_response_shape(self) -> None:
        case = load_case("fresher_resume")
        resume_id = "contract_parse_shape_001"
        response = self.client.post(
            "/v1/parse",
            files={"file": ("resume.pdf", build_pdf(case["lines"]), "application/pdf")},
            data={"resume_id": resume_id, "candidate_type": case["candidate_type"]},
        )

        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(
            set(body.keys()),
            {
                "resume_id",
                "candidate_type",
                "normalized_resume",
                "warnings",
                "missing_fields",
                "resume_quality",
                "parser_metadata",
            },
        )
        self.assertEqual(
            set(body["resume_quality"].keys()),
            {"score", "breakdown", "recommendation", "summary"},
        )
        self.assertIn("projects", body["normalized_resume"])
        self.assertIn("certifications", body["normalized_resume"])
        self.assertIn("skill_evidence", body["normalized_resume"])
        self.assertIn("extracted_text", body["parser_metadata"])
        self.assertIn("extractor_name", body["parser_metadata"])
        self.assertIn("page_count", body["parser_metadata"])
        self.assertIn("content_fingerprint", body["parser_metadata"])
