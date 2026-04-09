from __future__ import annotations

import re
from collections import OrderedDict

from .constants import SKILL_ALIASES
from .normalization import estimate_total_experience_months
from .schemas import JobContext, ResumeQualityResult, ScoreBreakdown, ScoreResumeRequest, ScoreResumeResponse, SkillEvidenceRecord
from .settings import SETTINGS


def score_resume(request: ScoreResumeRequest) -> ScoreResumeResponse:
    resume_skills = _canonicalize_skills(request.normalized_resume.skills)
    job_required_skills = _canonicalize_skills(request.job_context.required_skills)
    job_preferred_skills = _canonicalize_skills(request.job_context.preferred_skills)
    keywords = _job_keywords(request.job_context)
    evidence_strength = _skill_evidence_strength(request.normalized_resume.skill_evidence)

    matched_required = sorted(set(resume_skills) & set(job_required_skills))
    missing_required = sorted(set(job_required_skills) - set(resume_skills))
    matched_preferred = sorted(set(resume_skills) & set(job_preferred_skills))

    required_strength = sum(evidence_strength.get(skill, 1.0) for skill in matched_required)
    preferred_strength = sum(evidence_strength.get(skill, 1.0) for skill in matched_preferred)
    skills_ratio = 1.0 if not job_required_skills else required_strength / len(job_required_skills)
    preferred_ratio = 1.0 if not job_preferred_skills else preferred_strength / len(job_preferred_skills)
    skills_component = round(
        SETTINGS.jd_score_weights.skills * ((skills_ratio * 0.85) + (preferred_ratio * 0.15)),
        2,
    )

    experience_years = _weighted_experience_years(request)
    experience_component = round(
        SETTINGS.jd_score_weights.experience * _experience_alignment(experience_years, request.job_context),
        2,
    )

    keyword_component = round(
        SETTINGS.jd_score_weights.keywords * _keyword_overlap_ratio(keywords, request.resume_text, request.normalized_resume.current_role),
        2,
    )
    jd_match_score = int(round(skills_component + experience_component + keyword_component))

    quality_result = score_resume_quality(
        resume_id=request.resume_id,
        normalized_resume=request.normalized_resume,
        resume_text=request.resume_text,
    )
    completeness_component = quality_result.breakdown["completeness"]
    structure_component = quality_result.breakdown["structure"]
    contact_component = quality_result.breakdown["contactability"]
    signal_component = quality_result.breakdown["signal_quality"]
    resume_quality_score = quality_result.score

    warnings: list[str] = []
    if missing_required:
        warnings.append("Some required job skills are missing from the normalized resume.")
    if request.normalized_resume.notice_period and "immediate" not in request.normalized_resume.notice_period.lower():
        warnings.append(f"Candidate notice period detected: {request.normalized_resume.notice_period}.")

    return ScoreResumeResponse(
        resume_id=request.resume_id,
        jd_match_score=jd_match_score,
        resume_quality_score=resume_quality_score,
        breakdown=ScoreBreakdown(
            jd_match={
                "skills": skills_component,
                "experience": experience_component,
                "keywords": keyword_component,
            },
            resume_quality={
                "completeness": completeness_component,
                "structure": structure_component,
                "contactability": contact_component,
                "signal_quality": signal_component,
            },
        ),
        matched_skills=matched_required,
        missing_skills=missing_required,
        recommendation=_recommendation_for(jd_match_score, resume_quality_score),
        warnings=warnings,
        summary=_build_summary(jd_match_score, resume_quality_score, matched_required, missing_required),
    )


def score_resume_quality(
    *,
    resume_id: str,
    normalized_resume,
    resume_text: str,
) -> ResumeQualityResult:
    request = ScoreResumeRequest(
        resume_id=resume_id,
        normalized_resume=normalized_resume,
        resume_text=resume_text,
        job_context=JobContext(),
    )

    completeness_component = _score_completeness(request)
    structure_component = _score_structure(request)
    contact_component = _score_contactability(request)
    signal_component = _score_signal_quality(request)
    score = int(round(completeness_component + structure_component + contact_component + signal_component))

    return ResumeQualityResult(
        score=score,
        breakdown={
            "completeness": completeness_component,
            "structure": structure_component,
            "contactability": contact_component,
            "signal_quality": signal_component,
        },
        recommendation=_quality_recommendation_for(score),
        summary=_quality_summary_for(
            score=score,
            normalized_resume=request.normalized_resume,
        ),
    )


def _canonicalize_skills(skills: list[str]) -> list[str]:
    canonicalized: list[str] = []
    for skill in skills:
        lowered = skill.lower().strip()
        matched = False
        for canonical, aliases in SKILL_ALIASES.items():
            if lowered == canonical.lower() or lowered in aliases:
                canonicalized.append(canonical)
                matched = True
                break
        if not matched and skill.strip():
            canonicalized.append(skill.strip())
    return sorted(OrderedDict.fromkeys(canonicalized))


def _job_keywords(job_context: JobContext) -> list[str]:
    keywords = list(job_context.keywords)
    if job_context.title:
        keywords.extend(re.findall(r"[A-Za-z][A-Za-z.+#/-]{2,}", job_context.title))
    if job_context.description:
        keywords.extend(re.findall(r"[A-Za-z][A-Za-z.+#/-]{3,}", job_context.description))
    return sorted(OrderedDict.fromkeys(keyword.lower() for keyword in keywords))


def _keyword_overlap_ratio(keywords: list[str], resume_text: str, current_role: str | None) -> float:
    if not keywords:
        return 1.0
    searchable = f"{resume_text}\n{current_role or ''}".lower()
    matched = sum(1 for keyword in keywords if keyword in searchable)
    return matched / len(keywords)


def _experience_alignment(experience_years: float, job_context: JobContext) -> float:
    minimum = job_context.experience_min_years
    maximum = job_context.experience_max_years
    if minimum is None and maximum is None:
        return 1.0 if experience_years > 0 else 0.5
    if minimum is None:
        return 1.0 if experience_years <= maximum else max(0.7, maximum / max(experience_years, 1))
    if experience_years >= minimum:
        if maximum is None or experience_years <= maximum:
            return 1.0
        return max(0.75, maximum / max(experience_years, 1))
    gap = minimum - experience_years
    return max(0.2, 1 - (gap / max(minimum, 1)))


def _score_completeness(request: ScoreResumeRequest) -> float:
    resume = request.normalized_resume
    checks = (
        bool(resume.full_name),
        bool(resume.emails),
        bool(resume.phones),
        bool(resume.current_location),
        bool(resume.skills),
        bool(resume.education),
        bool(resume.current_role),
        bool(resume.experience_summary),
        bool(resume.projects),
        bool(resume.certifications),
    )
    return round(
        sum(1 for check in checks if check) / len(checks) * SETTINGS.quality_score_weights.completeness,
        2,
    )


def _score_structure(request: ScoreResumeRequest) -> float:
    resume = request.normalized_resume
    ratio = 0.0
    if resume.experience_summary:
        ratio += 0.25
    if resume.skills:
        ratio += 0.2
    if resume.education:
        ratio += 0.2
    if resume.employment_history or resume.current_role:
        ratio += 0.2
    if resume.projects or resume.certifications:
        ratio += 0.15
    return round(ratio * SETTINGS.quality_score_weights.structure, 2)


def _score_contactability(request: ScoreResumeRequest) -> float:
    resume = request.normalized_resume
    score = 0.0
    if resume.emails:
        score += 8
    if resume.phones:
        score += 8
    if resume.links:
        score += 2
    if resume.current_location:
        score += 2
    return round(min(score, SETTINGS.quality_score_weights.contactability), 2)


def _score_signal_quality(request: ScoreResumeRequest) -> float:
    score = 0.0
    text_length = len(request.resume_text.strip())
    if text_length >= 300:
        score += 6
    elif text_length >= 160:
        score += 4
    if len(request.normalized_resume.skills) >= 5:
        score += 4
    elif request.normalized_resume.skills:
        score += 2
    if request.normalized_resume.employment_history or request.normalized_resume.education:
        score += 3
    if request.normalized_resume.projects:
        score += 2
    if request.normalized_resume.certifications:
        score += 2
    if request.normalized_resume.notice_period or request.normalized_resume.current_ctc or request.normalized_resume.expected_ctc:
        score += 2
    return round(min(score, SETTINGS.quality_score_weights.signal_quality), 2)


def _recommendation_for(jd_match_score: int, quality_score: int) -> str:
    if jd_match_score >= 80 and quality_score >= 55:
        return "SHORTLIST"
    if jd_match_score >= 60 or quality_score >= 60:
        return "REVIEW"
    return "REJECT"


def _quality_recommendation_for(score: int) -> str:
    if score >= 75:
        return "STRONG"
    if score >= 55:
        return "REVIEW"
    return "IMPROVE"


def _quality_summary_for(*, score: int, normalized_resume) -> str:
    strengths: list[str] = []
    gaps: list[str] = []

    if normalized_resume.skills:
        strengths.append(f"{len(normalized_resume.skills)} skills extracted")
    if normalized_resume.education:
        strengths.append("education parsed")
    if normalized_resume.emails and normalized_resume.phones:
        strengths.append("contact details complete")

    if not normalized_resume.current_location:
        gaps.append("location missing")
    if not normalized_resume.employment_history and not normalized_resume.current_role:
        gaps.append("role history weak")
    if not normalized_resume.links:
        gaps.append("links missing")

    strength_text = ", ".join(strengths[:3]) if strengths else "basic profile extracted"
    if gaps:
        return f"Resume quality {score}/100. Strengths: {strength_text}. Gaps: {', '.join(gaps[:3])}."
    return f"Resume quality {score}/100. Strengths: {strength_text}."


def _build_summary(jd_match_score: int, quality_score: int, matched_skills: list[str], missing_skills: list[str]) -> str:
    if matched_skills and missing_skills:
        return (
            f"JD match {jd_match_score}/100 and resume quality {quality_score}/100. "
            f"Strongest matches: {', '.join(matched_skills[:3])}. Missing: {', '.join(missing_skills[:3])}."
        )
    if matched_skills:
        return (
            f"JD match {jd_match_score}/100 and resume quality {quality_score}/100. "
            f"Strong alignment on {', '.join(matched_skills[:3])}."
        )
    return f"JD match {jd_match_score}/100 and resume quality {quality_score}/100. Resume needs closer recruiter review."


def _weighted_experience_years(request: ScoreResumeRequest) -> float:
    if request.normalized_resume.total_relevant_months:
        weighted_months = request.normalized_resume.full_time_months + (request.normalized_resume.internship_months * 0.75)
        return weighted_months / 12
    return estimate_total_experience_months(request.normalized_resume.employment_history) / 12


def _skill_evidence_strength(evidence_records: list[SkillEvidenceRecord]) -> dict[str, float]:
    strength_map: dict[str, float] = {}
    weights = {
        "primary": 1.0,
        "project": 0.9,
        "certification": 0.85,
        "mention": 0.7,
    }
    for evidence in evidence_records:
        strength_map[evidence.skill] = max(strength_map.get(evidence.skill, 0.0), weights.get(evidence.evidence_type, 0.7))
    return strength_map
