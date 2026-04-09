from __future__ import annotations

import re
from collections import OrderedDict, defaultdict
from datetime import date

from .constants import (
    CTC_PATTERNS,
    DEGREE_ALIASES,
    INDIAN_LOCATIONS,
    MONTH_NAMES,
    NOTICE_PERIOD_PATTERNS,
    PREFERRED_LOCATION_PATTERNS,
    SECTION_ALIASES,
    SENSITIVE_PATTERNS,
    SKILL_ALIASES,
    WORK_AUTHORIZATION_PATTERNS,
)
from .schemas import (
    CandidateType,
    CertificationRecord,
    EducationRecord,
    EmploymentRecord,
    NormalizedResume,
    ProjectRecord,
    SkillEvidenceRecord,
)

EMAIL_RE = re.compile(r"\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[A-Za-z]{2,}\b")
PHONE_RE = re.compile(r"(?:\+?91[\s\-]?)?(?:\(?0?\)?[\s\-]?)?[6-9]\d[\d\s\-]{8,12}")
URL_RE = re.compile(r"\b(?:https?://|www\.)[^\s|,;]+", re.I)
DATE_RANGE_RE = re.compile(
    rf"((?:{'|'.join(MONTH_NAMES)})\s+\d{{4}}|\d{{4}})\s*(?:-|to|–|—)\s*((?:{'|'.join(MONTH_NAMES)})\s+\d{{4}}|\d{{4}}|present|current)",
    re.I,
)
EXPERIENCE_YEARS_RE = re.compile(r"(\d+(?:\.\d+)?)\+?\s+(?:years?|yrs?)", re.I)
YEAR_RE = re.compile(r"\b(20\d{2}|19\d{2})\b")
CGPA_RE = re.compile(r"\b(?:cgpa|gpa)\b\s*[:\-]?\s*(\d+(?:\.\d+)?)", re.I)
PERCENT_RE = re.compile(r"(\d{2}(?:\.\d+)?)\s*%")
ROLE_COMPANY_RE = re.compile(
    r"^(?P<title>[A-Za-z0-9 /&().+-]+?)\s*(?:\||@| at )\s*(?P<company>[A-Za-z0-9 /&().,+-]+?)(?:\s*\||\s+)?(?P<dates>.*)$",
    re.I,
)
PROJECT_HEADER_RE = re.compile(r"^(?P<title>[A-Za-z][A-Za-z0-9 /&().+-]{2,})(?:\s*\((?P<stack>[^)]+)\))?(?:\s*\|\s*(?P<pipe>.*))?$")
CERT_DATE_RE = re.compile(r"\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\s+\d{4}\b|\b20\d{2}\b", re.I)


def normalize_resume(lines: list[str], raw_text: str, candidate_type: CandidateType) -> tuple[NormalizedResume, list[str], list[str], list[str], list[str]]:
    cleaned_lines = _clean_lines(lines)
    section_map = _split_sections(cleaned_lines)
    header_lines = section_map.get("header", cleaned_lines[:5])
    sensitive_findings = _detect_sensitive_findings(raw_text)
    warnings: list[str] = []
    if sensitive_findings:
        warnings.append("Sensitive personal identifiers were detected and excluded from the normalized profile.")

    emails = sorted(OrderedDict.fromkeys(match.lower() for match in EMAIL_RE.findall(raw_text)))
    phones = sorted(OrderedDict.fromkeys(filter(None, (_normalize_phone(match) for match in PHONE_RE.findall(raw_text)))))
    links = sorted(OrderedDict.fromkeys(_normalize_link(match) for match in URL_RE.findall(raw_text)))
    full_name = _extract_name(header_lines, cleaned_lines)
    current_location = _extract_location(header_lines, cleaned_lines, raw_text)
    projects = _extract_projects(section_map.get("projects", []))
    certifications = _extract_certifications(section_map.get("certifications", []))
    skills, skill_evidence = _extract_skills(raw_text, section_map, projects, certifications)
    education = _extract_education(section_map.get("education", cleaned_lines))
    employment_history = _extract_employment_history(section_map, candidate_type)
    full_time_months, internship_months, total_relevant_months = calculate_experience_totals(employment_history)
    current_role = _extract_current_role(header_lines, cleaned_lines, employment_history)
    experience_summary = _extract_experience_summary(section_map, raw_text, total_relevant_months)
    notice_period = _extract_pattern_value(raw_text, NOTICE_PERIOD_PATTERNS)
    current_ctc = _extract_named_value(raw_text, CTC_PATTERNS["current_ctc"])
    expected_ctc = _extract_named_value(raw_text, CTC_PATTERNS["expected_ctc"])
    preferred_location = _extract_pattern_value(raw_text, PREFERRED_LOCATION_PATTERNS)
    work_authorization = _extract_pattern_value(raw_text, WORK_AUTHORIZATION_PATTERNS)

    normalized = NormalizedResume(
        full_name=full_name,
        emails=emails,
        phones=phones,
        current_location=current_location,
        links=links,
        skills=skills,
        skill_evidence=skill_evidence,
        experience_summary=experience_summary,
        employment_history=employment_history,
        education=education,
        projects=projects,
        certifications=certifications,
        current_role=current_role,
        full_time_months=full_time_months,
        internship_months=internship_months,
        total_relevant_months=total_relevant_months,
        notice_period=notice_period,
        current_ctc=current_ctc,
        expected_ctc=expected_ctc,
        preferred_location=preferred_location,
        work_authorization=work_authorization,
    )

    missing_fields = [
        field_name
        for field_name in (
            "full_name",
            "emails",
            "phones",
            "current_location",
            "skills",
            "education",
            "current_role",
        )
        if _is_missing(getattr(normalized, field_name))
    ]

    return normalized, warnings, missing_fields, list(section_map.keys()), sensitive_findings


def estimate_total_experience_months(employment_history: list[EmploymentRecord]) -> int:
    full_time_months, internship_months, _ = calculate_experience_totals(employment_history)
    return int(round(full_time_months + (internship_months * 0.75)))


def calculate_experience_totals(employment_history: list[EmploymentRecord]) -> tuple[int, int, int]:
    full_time_months = 0
    internship_months = 0
    for record in employment_history:
        months = _months_for_record(record)
        if months <= 0:
            continue
        if record.employment_type == "internship":
            internship_months += months
        else:
            full_time_months += months
    return full_time_months, internship_months, full_time_months + internship_months


def _clean_lines(lines: list[str]) -> list[str]:
    cleaned: list[str] = []
    for raw_line in lines:
        line = raw_line.replace("\u200b", " ").replace("\ufeff", " ")
        line = re.sub(r"[•●▪◆■]", " ", line)
        line = re.sub(r"\s+", " ", line).strip(" -:\t")
        if line:
            cleaned.append(line)
    return cleaned


def _split_sections(lines: list[str]) -> dict[str, list[str]]:
    sections: dict[str, list[str]] = OrderedDict()
    current_section = "header"
    sections[current_section] = []

    for line in lines:
        section_key = _match_section_heading(line)
        if section_key:
            current_section = section_key
            sections.setdefault(current_section, [])
            continue
        sections.setdefault(current_section, []).append(line)

    return sections


def _match_section_heading(line: str) -> str | None:
    normalized = re.sub(r"[^a-z0-9 ]", "", line.lower()).strip()
    for section, aliases in SECTION_ALIASES.items():
        if normalized in aliases:
            return section
    return None


def _detect_sensitive_findings(raw_text: str) -> list[str]:
    findings: list[str] = []
    for label, pattern in SENSITIVE_PATTERNS.items():
        if re.search(pattern, raw_text, re.I):
            findings.append(label)
    return findings


def _extract_name(header_lines: list[str], cleaned_lines: list[str]) -> str | None:
    candidates: list[tuple[int, str]] = []
    for line in header_lines + cleaned_lines[:6]:
        if _looks_like_contact_line(line) or _match_section_heading(line):
            continue
        if len(line) > 48 or not (2 <= len(line.split()) <= 5):
            continue
        if "|" in line or "," in line:
            continue
        score = 0
        if line.istitle():
            score += 2
        if line.isupper():
            score += 1
        if header_lines and line in header_lines[:2]:
            score += 2
        candidates.append((score, line))

    if not candidates:
        return None

    best = sorted(candidates, key=lambda item: (-item[0], len(item[1])))[0][1]
    return " ".join(word.capitalize() for word in best.split())


def _extract_location(header_lines: list[str], cleaned_lines: list[str] | str, raw_text: str | None = None) -> str | None:
    if raw_text is None and isinstance(cleaned_lines, str):
        raw_text = cleaned_lines
        cleaned_lines = header_lines
    assert raw_text is not None
    for line in header_lines[:4]:
        if _looks_like_contact_line(line) or "http" in line.lower() or "www." in line.lower():
            continue
        header_part = line.split("|", 1)[0].strip()
        if "," in header_part and not EMAIL_RE.search(header_part) and not PHONE_RE.search(header_part):
            return header_part
    search_window = "\n".join(cleaned_lines[:20]) + "\n" + raw_text[:1000]
    for alias, normalized in INDIAN_LOCATIONS.items():
        if re.search(rf"\b{re.escape(alias)}\b", search_window, re.I):
            return normalized
    explicit_match = re.search(r"\b(?:location|current location)\b\s*[:\-]?\s*([^\n|,;]+)", raw_text, re.I)
    return explicit_match.group(1).strip() if explicit_match else None


def _extract_skills(
    raw_text: str,
    section_map: dict[str, list[str]] | list[str],
    projects: list[ProjectRecord] | None = None,
    certifications: list[CertificationRecord] | None = None,
) -> tuple[list[str], list[SkillEvidenceRecord]]:
    if isinstance(section_map, list):
        section_map = {"skills": section_map}
    projects = projects or []
    certifications = certifications or []
    evidence_map: dict[str, set[tuple[str, str]]] = defaultdict(set)
    contexts = (
        ("primary", "skills", "\n".join(section_map.get("skills", []))),
        (
            "project",
            "projects",
            "\n".join(
                " ".join(part for part in [project.title, project.summary or "", ", ".join(project.tech_stack)] if part)
                for project in projects
            ),
        ),
        (
            "certification",
            "certifications",
            "\n".join(
                " ".join(part for part in [cert.name, cert.issuer or "", cert.issued_date or ""] if part)
                for cert in certifications
            ),
        ),
        ("mention", "summary", raw_text),
    )

    for evidence_type, source_section, text in contexts:
        if not text.strip():
            continue
        for canonical in _match_skills(text):
            evidence_map[canonical].add((evidence_type, source_section))

    skills = sorted(evidence_map.keys())
    evidence: list[SkillEvidenceRecord] = []
    priority = {"primary": 0, "project": 1, "certification": 2, "mention": 3}
    for skill in skills:
        for evidence_type, source_section in sorted(evidence_map[skill], key=lambda item: priority.get(item[0], 9)):
            evidence.append(
                SkillEvidenceRecord(
                    skill=skill,
                    evidence_type=evidence_type,
                    source_section=source_section,
                )
            )
    return skills, evidence


def _match_skills(text: str) -> list[str]:
    normalized_text = text.lower()
    found: list[str] = []
    consumed_spans: list[tuple[int, int]] = []
    alias_entries = sorted(
        ((canonical, alias) for canonical, aliases in SKILL_ALIASES.items() for alias in aliases),
        key=lambda item: len(item[1]),
        reverse=True,
    )
    for canonical, alias in alias_entries:
        if canonical in found:
            continue
        pattern = re.compile(rf"(?<![A-Za-z]){re.escape(alias)}(?![A-Za-z])", re.I)
        alias_spans = [
            match.span()
            for match in pattern.finditer(normalized_text)
            if not _spans_overlap(match.span(), consumed_spans)
        ]
        if not alias_spans:
            continue
        found.append(canonical)
        consumed_spans.extend(alias_spans)
    return sorted(OrderedDict.fromkeys(found))


def _spans_overlap(candidate: tuple[int, int], existing: list[tuple[int, int]]) -> bool:
    start, end = candidate
    return any(start < other_end and end > other_start for other_start, other_end in existing)


def _extract_education(lines: list[str]) -> list[EducationRecord]:
    entries: list[EducationRecord] = []
    for line in lines:
        normalized_line = line.lower()
        degree = None
        for canonical, aliases in DEGREE_ALIASES.items():
            if any(alias in normalized_line for alias in aliases):
                degree = canonical
                break
        if not degree:
            continue
        year_matches = YEAR_RE.findall(line)
        cgpa_match = CGPA_RE.search(line)
        percent_match = PERCENT_RE.search(line)
        entries.append(
            EducationRecord(
                degree=degree,
                specialization=_extract_specialization(line, degree),
                institution=_extract_institution(line, degree),
                completion_year=int(year_matches[-1]) if year_matches else None,
                score=cgpa_match.group(1) if cgpa_match else (percent_match.group(1) + "%" if percent_match else None),
            )
        )

    deduped: list[EducationRecord] = []
    seen: set[tuple[str | None, str | None, int | None]] = set()
    for entry in entries:
        key = (entry.degree, entry.institution, entry.completion_year)
        if key in seen:
            continue
        seen.add(key)
        deduped.append(entry)
    return deduped


def _extract_specialization(line: str, degree: str) -> str | None:
    parts = [part.strip() for part in re.split(r"[-|,]", line) if part.strip()]
    for part in parts:
        lowered = part.lower()
        if degree.lower().replace(".", "") in re.sub(r"[^a-z]", "", lowered):
            continue
        if any(token in lowered for token in ("computer", "information", "electronics", "mechanical", "civil", "business", "it")):
            return part
    return None


def _extract_institution(line: str, degree: str) -> str | None:
    if " - " in line:
        prefix, remainder = line.split(" - ", 1)
        if degree.lower().replace(".", "") in re.sub(r"[^a-z]", "", prefix.lower()):
            cleaned = re.sub(r"\(?\b(?:19|20)\d{2}\s*[-–]\s*(?:19|20)\d{2}\b\)?", "", remainder)
            cleaned = re.sub(r"\(?\b(?:19|20)\d{2}\b\)?", "", cleaned)
            cleaned = cleaned.strip(" -()")
            if cleaned:
                return cleaned
    parts = [part.strip() for part in re.split(r"[-|,]", line) if part.strip()]
    for part in parts:
        lowered = part.lower()
        if degree.lower() in lowered:
            continue
        if any(word in lowered for word in ("university", "college", "institute", "school")):
            return part
    return None


def _extract_projects(lines: list[str]) -> list[ProjectRecord]:
    projects: list[ProjectRecord] = []
    active: dict[str, object] | None = None
    for line in lines:
        if _looks_like_project_header(line):
            if active:
                projects.append(_project_from_active(active))
            active = _seed_project(line)
            continue
        if active is not None:
            summary_lines = active.setdefault("summary_lines", [])
            summary_lines.append(line)
    if active:
        projects.append(_project_from_active(active))
    return projects


def _looks_like_project_header(line: str) -> bool:
    if len(line) < 4 or len(line) > 120:
        return False
    if line.endswith(":") or line.lower().startswith(("developed", "built", "implemented", "enabled", "integrated", "applied")):
        return False
    return bool(PROJECT_HEADER_RE.match(line))


def _seed_project(line: str) -> dict[str, object]:
    match = PROJECT_HEADER_RE.match(line)
    title = line
    tech_stack: list[str] = []
    if match:
        title = match.group("title").strip()
        inline_stack = match.group("stack") or match.group("pipe")
        if inline_stack:
            tech_stack = _match_skills(inline_stack)
    return {"title": title, "tech_stack": tech_stack, "summary_lines": []}


def _project_from_active(active: dict[str, object]) -> ProjectRecord:
    summary = " ".join(line for line in active.get("summary_lines", []) if isinstance(line, str)).strip() or None
    tech_stack = list(active.get("tech_stack", []))
    if summary:
        tech_stack = sorted(OrderedDict.fromkeys(tech_stack + _match_skills(summary)))
    return ProjectRecord(
        title=str(active["title"]).strip(),
        tech_stack=tech_stack,
        summary=summary,
        source_section="projects",
    )


def _extract_certifications(lines: list[str]) -> list[CertificationRecord]:
    certifications: list[CertificationRecord] = []
    for line in lines:
        cleaned = line.strip(" -")
        if len(cleaned) < 4:
            continue
        issued_date_match = CERT_DATE_RE.search(cleaned)
        issued_date = issued_date_match.group(0) if issued_date_match else None
        working = cleaned
        if issued_date:
            working = working.replace(issued_date, "").strip(" -()")
        if " - " in working:
            left, right = working.split(" - ", 1)
            if len(left.split()) >= 2:
                certifications.append(CertificationRecord(name=left.strip(), issuer=right.strip() or None, issued_date=issued_date))
                continue
        parts = [part.strip() for part in re.split(r"[–|]", working) if part.strip()]
        if len(parts) >= 2:
            certifications.append(CertificationRecord(name=parts[0], issuer=parts[1], issued_date=issued_date))
            continue
        certifications.append(CertificationRecord(name=working.strip(), issuer=None, issued_date=issued_date))
    return certifications


def _extract_employment_history(section_map: dict[str, list[str]], candidate_type: CandidateType) -> list[EmploymentRecord]:
    history: list[EmploymentRecord] = []
    primary_sections = ["experience", "internships"] if candidate_type == CandidateType.fresher else ["experience", "internships"]
    for section_name in primary_sections:
        history.extend(_parse_experience_entries(section_map.get(section_name, []), section_name.rstrip("s")))
    return history


def _parse_experience_entries(lines: list[str], employment_type: str) -> list[EmploymentRecord]:
    entries: list[EmploymentRecord] = []
    active: dict[str, str | None] | None = None

    for line in lines:
        if "|" in line and DATE_RANGE_RE.search(line):
            if active:
                entries.append(_employment_from_active(active, employment_type))
            parts = [part.strip() for part in line.split("|") if part.strip()]
            title = parts[0] if parts else None
            company = parts[1] if len(parts) > 1 else None
            dates = parts[2] if len(parts) > 2 else line
            location = parts[3] if len(parts) > 3 else None
            active = {
                "title": title,
                "company": company,
                "dates": dates,
                "description": "",
                "location": location,
            }
            continue

        role_company_match = ROLE_COMPANY_RE.match(line)
        date_range_match = DATE_RANGE_RE.search(line)
        if role_company_match or date_range_match:
            if active:
                entries.append(_employment_from_active(active, employment_type))
            active = {
                "title": role_company_match.group("title").strip() if role_company_match else None,
                "company": role_company_match.group("company").strip() if role_company_match else None,
                "dates": (role_company_match.group("dates") if role_company_match else line).strip(),
                "description": "",
                "location": None,
            }
            continue
        if active is not None:
            active["description"] = f"{active.get('description', '')} {line}".strip()

    if active:
        entries.append(_employment_from_active(active, employment_type))
    return entries


def _employment_from_active(active: dict[str, str | None], employment_type: str) -> EmploymentRecord:
    dates_text = active.get("dates") or ""
    date_match = DATE_RANGE_RE.search(dates_text)
    start_date = date_match.group(1).title() if date_match else None
    end_date = date_match.group(2).title() if date_match else None
    return EmploymentRecord(
        company=(active.get("company") or "").strip() or None,
        title=(active.get("title") or "").strip() or None,
        start_date=start_date,
        end_date=end_date,
        employment_type=employment_type,
        location=(active.get("location") or "").strip() or None,
        description=(active.get("description") or "").strip() or None,
        is_current=bool(end_date and end_date.lower() in {"present", "current"}),
    )


def _extract_current_role(header_lines: list[str], cleaned_lines: list[str], employment_history: list[EmploymentRecord]) -> str | None:
    for record in employment_history:
        if record.is_current and record.title:
            return record.title
    for record in employment_history:
        if record.title:
            return record.title
    for line in header_lines + cleaned_lines[:10]:
        undergrad_match = re.search(
            r"\b((?:[A-Za-z]+\s+){0,4}(?:undergraduate|student|intern))\b",
            line,
            re.I,
        )
        if undergrad_match:
            return undergrad_match.group(1).strip().title()
    for line in header_lines + cleaned_lines[:12]:
        if _match_section_heading(line) or _looks_like_contact_line(line):
            continue
        if len(line.split()) <= 8 and re.search(
            r"\b(engineer|developer|analyst|intern|consultant|manager|undergraduate|student)\b",
            line,
            re.I,
        ):
            return line
    return None


def _extract_experience_summary(section_map: dict[str, list[str]], raw_text: str, total_relevant_months: int) -> str | None:
    summary_lines = section_map.get("summary", [])
    if summary_lines:
        return " ".join(summary_lines[:3]).strip()
    years_match = EXPERIENCE_YEARS_RE.search(raw_text)
    if years_match:
        return f"{years_match.group(1)} years of experience"
    if total_relevant_months > 0:
        return f"{round(total_relevant_months / 12, 1)} years of relevant experience"
    return None


def _normalize_phone(raw_phone: str) -> str | None:
    digits = re.sub(r"\D", "", raw_phone)
    if len(digits) == 10 and digits[0] in "6789":
        return f"+91{digits}"
    if len(digits) == 12 and digits.startswith("91") and digits[2] in "6789":
        return f"+{digits}"
    if len(digits) == 11 and digits.startswith("0") and digits[1] in "6789":
        return f"+91{digits[1:]}"
    return None


def _normalize_link(link: str) -> str:
    if link.lower().startswith("http"):
        return link.rstrip("/").lower()
    return f"https://{link.rstrip('/')}".lower()


def _extract_pattern_value(raw_text: str, patterns: tuple[str, ...]) -> str | None:
    for pattern in patterns:
        match = re.search(pattern, raw_text, re.I)
        if match:
            return match.group(1).strip()
    return None


def _extract_named_value(raw_text: str, pattern: str) -> str | None:
    match = re.search(pattern, raw_text, re.I)
    return match.group(2).strip() if match else None


def _parse_month_year(value: str | None) -> date | None:
    if not value:
        return None
    lower = value.lower()
    year_match = YEAR_RE.search(lower)
    if not year_match:
        return None
    year = int(year_match.group(1))
    month = 1
    for index, month_name in enumerate(MONTH_NAMES[:12], start=1):
        if re.search(rf"\b{month_name}\b", lower):
            month = index
            break
    return date(year, month, 1)


def _months_for_record(record: EmploymentRecord) -> int:
    start = _parse_month_year(record.start_date)
    end = _parse_month_year(record.end_date) if record.end_date and record.end_date.lower() not in {"present", "current"} else date.today()
    if not start or not end or end < start:
        return 0
    return max(1, (end.year - start.year) * 12 + (end.month - start.month) + 1)


def _looks_like_contact_line(line: str) -> bool:
    return bool(EMAIL_RE.search(line) or PHONE_RE.search(line) or URL_RE.search(line) or "|" in line)


def _is_missing(value: object) -> bool:
    if value is None:
        return True
    if isinstance(value, str):
        return not value.strip()
    if isinstance(value, list):
        return len(value) == 0
    return False
