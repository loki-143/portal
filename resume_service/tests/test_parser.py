from __future__ import annotations

import unittest
from pathlib import Path

from resume_service.extractors import UnsupportedResumeError
from resume_service.parser import parse_resume_document
from resume_service.schemas import CandidateType

from resume_service.tests.fixture_builders import build_docx, build_legacy_doc_stub, build_pdf, load_case


class ParserTests(unittest.TestCase):
    def test_parse_pdf_fresher_resume(self) -> None:
        case = load_case("fresher_resume")
        pdf_bytes = build_pdf(case["lines"])

        response = parse_resume_document(
            file_bytes=pdf_bytes,
            filename="fresher.pdf",
            resume_id=case["resume_id"],
            candidate_type=CandidateType(case["candidate_type"]),
            content_type="application/pdf",
        )

        self.assertEqual(response.normalized_resume.full_name, "Aarav Sharma")
        self.assertIn("aarav.sharma@email.com", response.normalized_resume.emails)
        self.assertIn("+919876543210", response.normalized_resume.phones)
        self.assertIn("Python", response.normalized_resume.skills)
        self.assertIn("FastAPI", response.normalized_resume.skills)
        self.assertEqual(response.normalized_resume.notice_period, "Immediate")
        self.assertEqual(response.normalized_resume.preferred_location, "Hyderabad")
        self.assertEqual(response.parser_metadata.file_type, "pdf")
        self.assertEqual(response.parser_metadata.extractor_name, "pypdf")
        self.assertIsNotNone(response.parser_metadata.content_fingerprint)
        self.assertTrue(response.normalized_resume.projects)
        self.assertTrue(response.normalized_resume.skill_evidence)
        self.assertGreater(response.resume_quality.score, 0)
        self.assertIn(response.resume_quality.recommendation, {"STRONG", "REVIEW", "IMPROVE"})

    def test_parse_docx_lateral_resume_and_redact_sensitive(self) -> None:
        case = load_case("lateral_resume")
        docx_bytes = build_docx(case["lines"])

        response = parse_resume_document(
            file_bytes=docx_bytes,
            filename="lateral.docx",
            resume_id=case["resume_id"],
            candidate_type=CandidateType(case["candidate_type"]),
            content_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        )

        self.assertEqual(response.normalized_resume.full_name, "Priya Nair")
        self.assertEqual(response.normalized_resume.current_role, "Senior Software Engineer")
        self.assertEqual(response.normalized_resume.current_ctc, "16 LPA")
        self.assertEqual(response.normalized_resume.expected_ctc, "22 LPA")
        self.assertEqual(response.normalized_resume.work_authorization, "India")
        self.assertIn("pan", response.parser_metadata.sensitive_findings)
        self.assertIn("aadhaar", response.parser_metadata.sensitive_findings)
        self.assertTrue(response.warnings)
        self.assertGreater(response.resume_quality.score, 0)

    def test_legacy_doc_is_rejected(self) -> None:
        with self.assertRaises(UnsupportedResumeError):
            parse_resume_document(
                file_bytes=build_legacy_doc_stub(),
                filename="legacy.doc",
                resume_id="res_legacy",
                candidate_type=CandidateType.lateral,
                content_type="application/msword",
            )

    def test_scanned_pdf_is_rejected(self) -> None:
        with self.assertRaises(UnsupportedResumeError):
            parse_resume_document(
                file_bytes=build_pdf([], image_only=True),
                filename="scan.pdf",
                resume_id="res_scan",
                candidate_type=CandidateType.lateral,
                content_type="application/pdf",
            )

    def test_spring_boot_does_not_also_extract_plain_spring(self) -> None:
        response = parse_resume_document(
            file_bytes=build_docx(
                [
                    "Riya Verma",
                    "riya@example.com | +91 9876543210 | Hyderabad",
                    "Skills",
                    "Spring Boot, Java, PostgreSQL",
                    "Education",
                    "B.Tech - Example Institute (2024)",
                ]
            ),
            filename="spring-boot.docx",
            resume_id="res_spring_boot",
            candidate_type=CandidateType.lateral,
            content_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        )

        self.assertIn("Spring Boot", response.normalized_resume.skills)
        self.assertNotIn("Spring", response.normalized_resume.skills)

    def test_docx_table_content_is_extracted(self) -> None:
        response = parse_resume_document(
            file_bytes=build_docx(
                [
                    "Meera Iyer",
                    "meera@example.com | +91 9876543210 | Chennai, Tamil Nadu",
                    "Education",
                    "B.Tech - Example Institute (2024)",
                    "Certifications",
                ],
                table_rows=[["Skills", "Terraform, AWS, Docker"], ["Certifications", "AWS Certified Developer - 2024"]],
            ),
            filename="table.docx",
            resume_id="res_table_docx",
            candidate_type=CandidateType.lateral,
            content_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        )

        self.assertIn("Terraform", response.normalized_resume.skills)
        self.assertIn("AWS", response.normalized_resume.skills)
        self.assertTrue(response.normalized_resume.certifications)

    def test_real_repo_sample_pdf_parses(self) -> None:
        sample_path = Path(__file__).resolve().parents[2] / "A22126511005_BankuruGanesh.pdf"
        response = parse_resume_document(
            file_bytes=sample_path.read_bytes(),
            filename=sample_path.name,
            resume_id="res_real_pdf",
            candidate_type=CandidateType.lateral,
            content_type="application/pdf",
        )

        self.assertEqual(response.normalized_resume.full_name, "Bankuru Ganesh")
        self.assertGreaterEqual(response.parser_metadata.page_count, 1)
        self.assertTrue(response.normalized_resume.projects)

    def test_two_column_pdf_sets_detected_columns(self) -> None:
        response = parse_resume_document(
            file_bytes=build_pdf(
                ["Rohit Das", "Hyderabad, Telangana", "Skills", "Python, FastAPI"],
                right_column_lines=["Projects", "Talent Portal | Python, SQL"],
            ),
            filename="two-column.pdf",
            resume_id="res_two_column",
            candidate_type=CandidateType.fresher,
            content_type="application/pdf",
        )

        self.assertGreaterEqual(response.parser_metadata.detected_columns, 2)

    def test_multi_page_pdf_includes_all_pages(self) -> None:
        response = parse_resume_document(
            file_bytes=build_pdf(
                [],
                pages=[
                    ["Ananya Rao", "Bengaluru, Karnataka", "Projects", "Parser App | Python, FastAPI"],
                    ["Certifications", "AWS Certified Developer - 2024", "Education", "B.Tech - Example Institute (2024)"],
                ],
            ),
            filename="multi-page.pdf",
            resume_id="res_multi_page",
            candidate_type=CandidateType.fresher,
            content_type="application/pdf",
        )

        self.assertGreaterEqual(response.parser_metadata.page_count, 2)
        self.assertTrue(response.normalized_resume.projects)
        self.assertTrue(response.normalized_resume.certifications)

    def test_pan_false_positive_reduced(self) -> None:
        response = parse_resume_document(
            file_bytes=build_docx(
                [
                    "Vikram Singh",
                    "vikram@example.com | +91 9876543210 | Pune, Maharashtra",
                    "Summary",
                    "Worked with internal code ABCDE1234F in a billing platform.",
                    "Education",
                    "B.Tech - Example Institute (2023)",
                ]
            ),
            filename="pan-false-positive.docx",
            resume_id="res_pan_false_positive",
            candidate_type=CandidateType.lateral,
            content_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        )

        self.assertNotIn("pan", response.parser_metadata.sensitive_findings)
