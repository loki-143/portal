from __future__ import annotations

import json
import tempfile
import unittest
from pathlib import Path
from unittest import mock
from uuid import uuid4

from fastapi.testclient import TestClient

from resume_service.main import app
from resume_service.normalization import (
    _is_missing,
    _normalize_phone,
    _split_sections,
)
from resume_service.parser import parse_resume_document
from resume_service.schemas import CandidateType, JobContext, ScoreResumeRequest
from resume_service.scoring import (
    _canonicalize_skills,
    _experience_alignment,
    _keyword_overlap_ratio,
    _recommendation_for,
    score_resume,
    score_resume_quality,
)
from resume_service.storage import (
    DB_PATH,
    list_parsed_resumes,
    load_migration_run,
    load_parsed_resume,
    migrate_legacy_json_store,
    save_parsed_resume,
)
from resume_service.tests.fixture_builders import build_docx, build_legacy_doc_stub, build_pdf, load_case


# ---------------------------------------------------------------------------
# API Contract Tests (via FastAPI TestClient)
# ---------------------------------------------------------------------------


class APIContractTests(unittest.TestCase):
    """Tests the full HTTP API surface including edge cases."""

    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)

    # --- /v1/parse success paths ---

    def test_parse_pdf_returns_200(self):
        case = load_case("fresher_resume")
        resp = self.client.post(
            "/v1/parse",
            files={"file": ("r.pdf", build_pdf(case["lines"]), "application/pdf")},
            data={"resume_id": "res_api_pdf_001", "candidate_type": "fresher"},
        )
        self.assertEqual(resp.status_code, 200)
        body = resp.json()
        self.assertEqual(body["resume_id"], "res_api_pdf_001")

    def test_parse_docx_returns_200(self):
        case = load_case("lateral_resume")
        resp = self.client.post(
            "/v1/parse",
            files={"file": ("r.docx", build_docx(case["lines"]), "application/vnd.openxmlformats-officedocument.wordprocessingml.document")},
            data={"resume_id": "res_api_docx_001", "candidate_type": "lateral"},
        )
        self.assertEqual(resp.status_code, 200)

    def test_parse_default_candidate_type_is_lateral(self):
        case = load_case("fresher_resume")
        resp = self.client.post(
            "/v1/parse",
            files={"file": ("r.pdf", build_pdf(case["lines"]), "application/pdf")},
            data={"resume_id": "res_api_default_type"},
        )
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()["candidate_type"], "lateral")

    # --- /v1/parse rejection paths ---

    def test_parse_rejects_legacy_doc_via_api(self):
        resp = self.client.post(
            "/v1/parse",
            files={"file": ("r.doc", build_legacy_doc_stub(), "application/msword")},
            data={"resume_id": "res_api_legacy"},
        )
        # sniff.py raises UnsupportedResumeError which main.py maps to 422
        self.assertEqual(resp.status_code, 422)
        body = resp.json()
        self.assertIn("Legacy", body["message"])

    def test_parse_rejects_scanned_image_only_pdf_via_api(self):
        resp = self.client.post(
            "/v1/parse",
            files={"file": ("r.pdf", build_pdf([], image_only=True), "application/pdf")},
            data={"resume_id": "res_api_scanned"},
        )
        self.assertEqual(resp.status_code, 422)

    def test_parse_rejects_empty_file_field(self):
        """When file field is present but empty, the endpoint should reject."""
        resp = self.client.post(
            "/v1/parse",
            files={"file": ("", b"", "application/octet-stream")},
            data={"resume_id": "res_api_empty_file"},
        )
        # The multipart parser accepts the field but the filename is empty,
        # so the endpoint rejects it as invalid.
        self.assertIn(resp.status_code, {400, 422})

    def test_parse_rejects_missing_resume_id_field(self):
        case = load_case("fresher_resume")
        resp = self.client.post(
            "/v1/parse",
            files={"file": ("r.pdf", build_pdf(case["lines"]), "application/pdf")},
        )
        self.assertEqual(resp.status_code, 422)
        self.assertIn("resume_id", resp.json()["detail"].lower())

    # --- /v1/score: load from storage by resume_id only ---

    def test_score_by_resume_id_only(self):
        """Score endpoint should load stored parsed resume when only resume_id + job_context provided."""
        case = load_case("lateral_resume")
        # 1. Parse first
        self.client.post(
            "/v1/parse",
            files={"file": ("r.docx", build_docx(case["lines"]), "application/vnd.openxmlformats-officedocument.wordprocessingml.document")},
            data={"resume_id": case["resume_id"], "candidate_type": case["candidate_type"]},
        )
        # 2. Score with resume_id only (no normalized_resume, no resume_text)
        resp = self.client.post(
            "/v1/score",
            json={
                "resume_id": case["resume_id"],
                "job_context": {
                    "job_id": "job_001",
                    "title": "Backend Developer",
                    "required_skills": ["Java", "PostgreSQL"],
                },
            },
        )
        self.assertEqual(resp.status_code, 200)
        body = resp.json()
        self.assertIn("jd_match_score", body)
        self.assertIn("resume_quality_score", body)
        self.assertIn("recommendation", body)
        self.assertEqual(body["resume_id"], case["resume_id"])

    def test_score_returns_404_for_missing_resume_id(self):
        resp = self.client.post(
            "/v1/score",
            json={
                "resume_id": "does_not_exist_xyz",
                "job_context": {"job_id": "j1", "required_skills": []},
            },
        )
        self.assertEqual(resp.status_code, 404)

    # --- /v1/score: validation ---

    def test_score_rejects_partial_resume_inputs(self):
        """Providing normalized_resume without resume_text (or vice versa) should fail validation."""
        resp = self.client.post(
            "/v1/score",
            json={
                "resume_id": "res_x",
                "normalized_resume": {},
                "job_context": {"job_id": "j1", "required_skills": []},
            },
        )
        self.assertEqual(resp.status_code, 422)

    # --- Response schema shape ---

    def test_parse_response_shape(self):
        case = load_case("fresher_resume")
        resp = self.client.post(
            "/v1/parse",
            files={"file": ("r.pdf", build_pdf(case["lines"]), "application/pdf")},
            data={"resume_id": "res_shape_001"},
        )
        body = resp.json()
        for key in ("resume_id", "candidate_type", "normalized_resume", "warnings", "missing_fields", "resume_quality"):
            self.assertIn(key, body)
        rq = body["resume_quality"]
        for key in ("score", "breakdown", "recommendation", "summary"):
            self.assertIn(key, rq)

    def test_score_response_shape(self):
        case = load_case("lateral_resume")
        self.client.post(
            "/v1/parse",
            files={"file": ("r.docx", build_docx(case["lines"]), "application/vnd.openxmlformats-officedocument.wordprocessingml.document")},
            data={"resume_id": case["resume_id"], "candidate_type": case["candidate_type"]},
        )
        resp = self.client.post(
            "/v1/score",
            json={
                "resume_id": case["resume_id"],
                "job_context": {"job_id": "j1", "required_skills": ["Java"]},
            },
        )
        body = resp.json()
        for key in ("resume_id", "jd_match_score", "resume_quality_score", "breakdown", "matched_skills", "missing_skills", "recommendation"):
            self.assertIn(key, body)
        self.assertIn("jd_match", body["breakdown"])
        self.assertIn("resume_quality", body["breakdown"])

    def test_metrics_endpoint_returns_counters(self):
        resp = self.client.get("/metrics")
        self.assertEqual(resp.status_code, 200)
        body = resp.json()
        self.assertIn("parse_success_count", body)
        self.assertIn("score_request_count", body)

    def test_resume_audit_endpoints_return_stored_data(self):
        case = load_case("fresher_resume")
        resume_id = "res_audit_001"
        parse_resp = self.client.post(
            "/v1/parse",
            files={"file": ("r.pdf", build_pdf(case["lines"]), "application/pdf")},
            data={"resume_id": resume_id, "candidate_type": "fresher"},
        )
        self.assertEqual(parse_resp.status_code, 200)

        list_resp = self.client.get("/v1/resumes?page=1&page_size=20")
        self.assertEqual(list_resp.status_code, 200)
        self.assertTrue(any(item["resume_id"] == resume_id for item in list_resp.json()["items"]))

        detail_resp = self.client.get(f"/v1/resumes/{resume_id}")
        self.assertEqual(detail_resp.status_code, 200)
        detail = detail_resp.json()
        self.assertEqual(detail["resume_id"], resume_id)
        self.assertIn("parser_metadata", detail)
        self.assertIn("normalized_resume", detail)

    # --- Swagger/example schema sanity ---

    def test_openapi_schema_is_valid(self):
        resp = self.client.get("/openapi.json")
        self.assertEqual(resp.status_code, 200)
        schema = resp.json()
        self.assertIn("/v1/parse", schema["paths"])
        self.assertIn("/v1/score", schema["paths"])
        self.assertIn("/health", schema["paths"])
        # Verify ScoreResumeRequest has expected properties
        schemas = schema["components"]["schemas"]
        score_req = schemas.get("ScoreResumeRequest", {})
        self.assertIn("properties", score_req)
        self.assertIn("resume_id", score_req["properties"])
        self.assertIn("job_context", score_req["properties"])


# ---------------------------------------------------------------------------
# Storage Tests
# ---------------------------------------------------------------------------


class StorageTests(unittest.TestCase):
    """Verify SQLite-backed resume storage behavior."""

    def test_save_and_load_roundtrip(self):
        case = load_case("fresher_resume")
        parsed = parse_resume_document(
            file_bytes=build_pdf(case["lines"]),
            filename="r.pdf",
            resume_id="res_storage_rt",
            candidate_type=CandidateType.fresher,
        )
        save_parsed_resume(parsed)
        loaded = load_parsed_resume("res_storage_rt")
        self.assertIsNotNone(loaded)
        self.assertEqual(loaded.resume_id, "res_storage_rt")
        self.assertEqual(loaded.normalized_resume.full_name, "Aarav Sharma")
        self.assertEqual(loaded.candidate_type, CandidateType.fresher)
        self.assertIn("aarav.sharma@email.com", loaded.normalized_resume.emails)

    def test_load_returns_none_for_missing_id(self):
        result = load_parsed_resume("this_id_never_existed")
        self.assertIsNone(result)

    def test_sqlite_database_exists_on_disk(self):
        case = load_case("lateral_resume")
        parsed = parse_resume_document(
            file_bytes=build_docx(case["lines"]),
            filename="r.docx",
            resume_id="res_disk_check",
            candidate_type=CandidateType.lateral,
        )
        save_parsed_resume(parsed)
        self.assertTrue(DB_PATH.exists())
        loaded = load_parsed_resume("res_disk_check")
        self.assertIsNotNone(loaded)
        self.assertEqual(loaded.resume_id, "res_disk_check")

    def test_list_parsed_resumes_returns_metadata(self):
        case = load_case("fresher_resume")
        parsed = parse_resume_document(
            file_bytes=build_pdf(case["lines"]),
            filename="r.pdf",
            resume_id="res_list_check",
            candidate_type=CandidateType.fresher,
        )
        save_parsed_resume(parsed)
        listing = list_parsed_resumes(page=1, page_size=20)
        self.assertGreaterEqual(listing.total, 1)
        self.assertTrue(any(item.resume_id == "res_list_check" for item in listing.items))

    def test_duplicate_fingerprint_is_linked_to_original_resume(self):
        case = load_case("fresher_resume")
        duplicate_lines = list(case["lines"]) + ["Fingerprint Marker: duplicate-test-2026"]
        first = parse_resume_document(
            file_bytes=build_pdf(duplicate_lines),
            filename="dup-a.pdf",
            resume_id="res_dup_fp_a",
            candidate_type=CandidateType.fresher,
        )
        second = parse_resume_document(
            file_bytes=build_pdf(duplicate_lines),
            filename="dup-b.pdf",
            resume_id="res_dup_fp_b",
            candidate_type=CandidateType.fresher,
        )

        save_parsed_resume(first)
        save_parsed_resume(second)

        stored_first = load_parsed_resume("res_dup_fp_a")
        stored_second = load_parsed_resume("res_dup_fp_b")
        self.assertIsNotNone(stored_first)
        self.assertIsNotNone(stored_second)
        self.assertIsNone(stored_first.duplicate_of_resume_id)
        self.assertEqual(stored_second.duplicate_of_resume_id, "res_dup_fp_a")

    def test_migration_run_persists_status_and_retirement(self):
        case = load_case("fresher_resume")
        parsed = parse_resume_document(
            file_bytes=build_pdf(case["lines"]),
            filename="legacy-import.pdf",
            resume_id="res_migration_source_001",
            candidate_type=CandidateType.fresher,
        )
        target_resume_id = f"res_migration_target_{uuid4().hex[:10]}"

        with tempfile.TemporaryDirectory() as tmp_dir:
            legacy_dir = Path(tmp_dir) / "resumes"
            legacy_dir.mkdir(parents=True, exist_ok=True)
            payload = {
                "resume_id": target_resume_id,
                "candidate_type": "fresher",
                "normalized_resume": parsed.normalized_resume.model_dump(),
                "warnings": parsed.warnings,
                "missing_fields": parsed.missing_fields,
                "resume_quality": parsed.resume_quality.model_dump(),
                "parser_metadata": parsed.parser_metadata.model_dump(),
            }
            source_file = legacy_dir / "legacy_test_resume.json"
            source_file.write_text(json.dumps(payload), encoding="utf-8")

            with mock.patch("resume_service.storage.RESUME_STORE_DIR", legacy_dir):
                result = migrate_legacy_json_store(retire_legacy_files=True)

            self.assertEqual(result["status"], "success")
            self.assertEqual(result["imported_count"], 1)
            self.assertEqual(result["retired_count"], 1)
            self.assertFalse(source_file.exists())

            retired_file = legacy_dir.parent / "resumes_retired" / result["run_id"] / source_file.name
            self.assertTrue(retired_file.exists())

            run = load_migration_run(result["run_id"])
            self.assertIsNotNone(run)
            self.assertEqual(run["status"], "success")
            self.assertEqual(run["imported_count"], 1)


# ---------------------------------------------------------------------------
# Phone Normalization Tests
# ---------------------------------------------------------------------------


class PhoneNormalizationTests(unittest.TestCase):
    def test_10_digit_indian_number(self):
        self.assertEqual(_normalize_phone("9876543210"), "+919876543210")

    def test_10_digit_with_spaces(self):
        self.assertEqual(_normalize_phone("98765 43210"), "+919876543210")

    def test_10_digit_with_dashes(self):
        self.assertEqual(_normalize_phone("98765-43210"), "+919876543210")

    def test_12_digit_with_91_prefix(self):
        self.assertEqual(_normalize_phone("919876543210"), "+919876543210")

    def test_12_digit_with_plus_91(self):
        self.assertEqual(_normalize_phone("+919876543210"), "+919876543210")

    def test_11_digit_with_leading_zero(self):
        self.assertEqual(_normalize_phone("09876543210"), "+919876543210")

    def test_invalid_number_too_short(self):
        self.assertIsNone(_normalize_phone("12345"))

    def test_invalid_number_starts_with_wrong_digit(self):
        self.assertIsNone(_normalize_phone("1234567890"))

    def test_number_from_resume_fresher(self):
        case = load_case("fresher_resume")
        raw_text = "\n".join(case["lines"])
        parsed = parse_resume_document(
            file_bytes=build_pdf(case["lines"]),
            filename="r.pdf",
            resume_id="res_phone_fresher",
            candidate_type=CandidateType.fresher,
        )
        self.assertIn("+919876543210", parsed.normalized_resume.phones)


# ---------------------------------------------------------------------------
# Education Normalization Tests
# ---------------------------------------------------------------------------


class EducationNormalizationTests(unittest.TestCase):
    def test_btech_education_parsed(self):
        case = load_case("fresher_resume")
        parsed = parse_resume_document(
            file_bytes=build_pdf(case["lines"]),
            filename="r.pdf",
            resume_id="res_edu_001",
            candidate_type=CandidateType.fresher,
        )
        education = parsed.normalized_resume.education
        self.assertTrue(education)
        self.assertEqual(education[0].degree, "B.Tech")
        self.assertEqual(education[0].completion_year, 2025)

    def test_be_education_parsed(self):
        case = load_case("lateral_resume")
        parsed = parse_resume_document(
            file_bytes=build_docx(case["lines"]),
            filename="r.docx",
            resume_id="res_edu_002",
            candidate_type=CandidateType.lateral,
        )
        degrees = [e.degree for e in parsed.normalized_resume.education]
        self.assertIn("B.E", degrees)

    def test_cgpa_extracted(self):
        case = load_case("fresher_resume")
        parsed = parse_resume_document(
            file_bytes=build_pdf(case["lines"]),
            filename="r.pdf",
            resume_id="res_edu_003",
            candidate_type=CandidateType.fresher,
        )
        edu = parsed.normalized_resume.education[0]
        self.assertIsNotNone(edu.score)
        self.assertIn("8.4", edu.score)


# ---------------------------------------------------------------------------
# Section Detection Tests
# ---------------------------------------------------------------------------


class SectionDetectionTests(unittest.TestCase):
    def test_all_section_aliases_match(self):
        """Verify that all SECTION_ALIASES keys have at least one alias."""
        from resume_service.constants import SECTION_ALIASES
        for section, aliases in SECTION_ALIASES.items():
            self.assertTrue(len(aliases) > 0, f"Section {section} has no aliases")

    def test_sections_split_correctly(self):
        lines = [
            "John Doe",
            "john@email.com",
            "SUMMARY",
            "Experienced developer.",
            "TECHNICAL SKILLS",
            "Python, Java",
            "EXPERIENCE",
            "Senior Dev | Google | Jan 2020 - Present",
            "Did things.",
            "EDUCATION",
            "B.Tech in CS | MIT | 2019",
        ]
        cleaned = [l.replace("\u200b", "").strip() for l in lines if l.strip()]
        sections = _split_sections(cleaned)
        self.assertIn("summary", sections)
        self.assertIn("skills", sections)
        self.assertIn("experience", sections)
        self.assertIn("education", sections)
        # Content should be under correct section
        self.assertTrue(any("Experienced developer" in l for l in sections["summary"]))
        self.assertTrue(any("Python" in l for l in sections["skills"]))

    def test_unknown_heading_keeps_previous_section(self):
        lines = [
            "SUMMARY",
            "Good candidate.",
            "RANDOM SECTION",
            "Some text.",
        ]
        sections = _split_sections(lines)
        self.assertIn("summary", sections)
        # "Some text." should be in "summary" since "RANDOM SECTION" doesn't match
        all_text = " ".join(sections.get("summary", []))
        self.assertIn("Some text.", all_text)


# ---------------------------------------------------------------------------
# Sensitive Field Filtering Tests
# ---------------------------------------------------------------------------


class SensitiveFieldFilteringTests(unittest.TestCase):
    def test_pan_detected_in_raw_text(self):
        from resume_service.normalization import _detect_sensitive_findings
        text = "John Doe\nPAN: ABCDE1234F\nEmail: john@email.com"
        findings = _detect_sensitive_findings(text)
        self.assertIn("pan", findings)

    def test_aadhaar_detected_in_raw_text(self):
        from resume_service.normalization import _detect_sensitive_findings
        text = "Aadhaar: 1234 5678 9012"
        findings = _detect_sensitive_findings(text)
        self.assertIn("aadhaar", findings)

    def test_sensitive_findings_produce_warning(self):
        case = load_case("lateral_resume")
        parsed = parse_resume_document(
            file_bytes=build_docx(case["lines"]),
            filename="r.docx",
            resume_id="res_sensitive_001",
            candidate_type=CandidateType.lateral,
        )
        self.assertIn("pan", parsed.parser_metadata.sensitive_findings)
        self.assertIn("aadhaar", parsed.parser_metadata.sensitive_findings)
        # Warning should be raised
        self.assertTrue(any("Sensitive" in w for w in parsed.warnings))

    def test_no_sensitive_fields_in_normalized_resume(self):
        """Sensitive fields should NOT appear in NormalizedResume fields."""
        case = load_case("lateral_resume")
        parsed = parse_resume_document(
            file_bytes=build_docx(case["lines"]),
            filename="r.docx",
            resume_id="res_sensitive_002",
            candidate_type=CandidateType.lateral,
        )
        nr = parsed.normalized_resume
        # PAN and Aadhaar patterns should not appear in any normalized field
        combined = json.dumps(nr.model_dump())
        self.assertNotIn("ABCDE1234F", combined)
        self.assertNotIn("1234 5678 9012", combined)


# ---------------------------------------------------------------------------
# Scoring Tests
# ---------------------------------------------------------------------------


class ScoringDetailedTests(unittest.TestCase):
    def test_deterministic_score_output_shape(self):
        """Score output should always have consistent shape with integer scores."""
        case = load_case("lateral_resume")
        parsed = parse_resume_document(
            file_bytes=build_docx(case["lines"]),
            filename="r.docx",
            resume_id="res_score_shape_001",
            candidate_type=CandidateType.lateral,
        )
        resp = score_resume(
            ScoreResumeRequest(
                resume_id=parsed.resume_id,
                normalized_resume=parsed.normalized_resume,
                resume_text=parsed.parser_metadata.extracted_text,
                job_context=JobContext(
                    job_id="j1",
                    title="Developer",
                    required_skills=["Java"],
                ),
            )
        )
        self.assertIsInstance(resp.jd_match_score, int)
        self.assertIsInstance(resp.resume_quality_score, int)
        self.assertIsInstance(resp.breakdown.jd_match, dict)
        self.assertIsInstance(resp.breakdown.resume_quality, dict)
        self.assertIn(resp.recommendation, {"SHORTLIST", "REVIEW", "REJECT"})

    def test_recommendation_shortlist(self):
        self.assertEqual(_recommendation_for(85, 60), "SHORTLIST")

    def test_recommendation_review_by_jd(self):
        self.assertEqual(_recommendation_for(65, 40), "REVIEW")

    def test_recommendation_review_by_quality(self):
        self.assertEqual(_recommendation_for(50, 65), "REVIEW")

    def test_recommendation_reject(self):
        self.assertEqual(_recommendation_for(30, 30), "REJECT")

    def test_experience_alignment_in_range(self):
        job = JobContext(experience_min_years=2, experience_max_years=5)
        # Exactly in range
        self.assertEqual(_experience_alignment(3.0, job), 1.0)
        # Below minimum
        self.assertGreaterEqual(_experience_alignment(1.0, job), 0.2)
        self.assertLessEqual(_experience_alignment(1.0, job), 1.0)
        # Above maximum
        self.assertGreaterEqual(_experience_alignment(8.0, job), 0.75)

    def test_experience_alignment_no_bounds(self):
        job = JobContext()
        self.assertEqual(_experience_alignment(5.0, job), 1.0)
        self.assertEqual(_experience_alignment(0.0, job), 0.5)

    def test_keyword_overlap_ratio(self):
        text = "I am a Python developer with AWS experience."
        keywords = ["python", "aws", "kubernetes"]
        ratio = _keyword_overlap_ratio(keywords, text, None)
        self.assertAlmostEqual(ratio, 2 / 3, places=2)

    def test_keyword_overlap_empty_keywords(self):
        ratio = _keyword_overlap_ratio([], "some text", None)
        self.assertEqual(ratio, 1.0)

    def test_canonicalize_skills_deduplicates(self):
        skills = ["python", "Python", "PYTHON"]
        result = _canonicalize_skills(skills)
        self.assertEqual(result, ["Python"])

    def test_canonicalize_skills_maps_aliases(self):
        skills = ["postgres", "nodejs"]
        result = _canonicalize_skills(skills)
        self.assertIn("PostgreSQL", result)
        self.assertIn("Node.js", result)

    def test_resume_quality_recommendation(self):
        case = load_case("fresher_resume")
        parsed = parse_resume_document(
            file_bytes=build_pdf(case["lines"]),
            filename="r.pdf",
            resume_id="res_quality_001",
            candidate_type=CandidateType.fresher,
        )
        quality = score_resume_quality(
            resume_id=parsed.resume_id,
            normalized_resume=parsed.normalized_resume,
            resume_text=parsed.parser_metadata.extracted_text,
        )
        self.assertIn(quality.recommendation, {"STRONG", "REVIEW", "IMPROVE"})
        self.assertGreaterEqual(quality.score, 0)
        self.assertLessEqual(quality.score, 100)


# ---------------------------------------------------------------------------
# _is_missing utility tests
# ---------------------------------------------------------------------------


class IsMissingTests(unittest.TestCase):
    def test_none_is_missing(self):
        self.assertTrue(_is_missing(None))

    def test_empty_string_is_missing(self):
        self.assertTrue(_is_missing(""))

    def test_whitespace_string_is_missing(self):
        self.assertTrue(_is_missing("   "))

    def test_empty_list_is_missing(self):
        self.assertTrue(_is_missing([]))

    def test_non_empty_string_ok(self):
        self.assertFalse(_is_missing("hello"))

    def test_non_empty_list_ok(self):
        self.assertFalse(_is_missing(["a", "b"]))


# ---------------------------------------------------------------------------
# Health endpoint
# ---------------------------------------------------------------------------


class HealthTests(unittest.TestCase):
    def test_health_returns_ok(self):
        client = TestClient(app)
        resp = client.get("/health")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json(), {"status": "ok"})


if __name__ == "__main__":
    unittest.main()
