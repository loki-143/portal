from __future__ import annotations

from dataclasses import dataclass, field


@dataclass(frozen=True)
class ScoreWeights:
    skills: int = 50
    experience: int = 30
    keywords: int = 20


@dataclass(frozen=True)
class ResumeQualityWeights:
    completeness: int = 40
    structure: int = 25
    contactability: int = 20
    signal_quality: int = 15


@dataclass(frozen=True)
class AppSettings:
    max_file_size_bytes: int = 5 * 1024 * 1024
    supported_extensions: tuple[str, ...] = (".pdf", ".docx")
    blocked_extensions: tuple[str, ...] = (".doc",)
    minimum_text_characters: int = 60
    rate_limit_requests_per_window: int = 30
    rate_limit_window_seconds: int = 60
    jd_score_weights: ScoreWeights = field(default_factory=ScoreWeights)
    quality_score_weights: ResumeQualityWeights = field(default_factory=ResumeQualityWeights)


SETTINGS = AppSettings()
