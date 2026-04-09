from __future__ import annotations

import json
import logging
import time
from collections import defaultdict, deque
from dataclasses import dataclass, field

from .schemas import MetricsResponse
from .settings import SETTINGS

LOGGER = logging.getLogger("resume_service")
if not LOGGER.handlers:
    logging.basicConfig(level=logging.INFO)


@dataclass
class MetricsStore:
    parse_success_count: int = 0
    parse_failure_count: int = 0
    score_request_count: int = 0
    unsupported_format_reject_count: int = 0
    scanned_resume_reject_count: int = 0
    parse_latency_total_ms: float = 0.0
    score_latency_total_ms: float = 0.0

    def snapshot(self) -> MetricsResponse:
        parse_avg = self.parse_latency_total_ms / self.parse_success_count if self.parse_success_count else 0.0
        score_avg = self.score_latency_total_ms / self.score_request_count if self.score_request_count else 0.0
        return MetricsResponse(
            parse_success_count=self.parse_success_count,
            parse_failure_count=self.parse_failure_count,
            score_request_count=self.score_request_count,
            unsupported_format_reject_count=self.unsupported_format_reject_count,
            scanned_resume_reject_count=self.scanned_resume_reject_count,
            average_parse_latency_ms=round(parse_avg, 2),
            average_score_latency_ms=round(score_avg, 2),
        )


@dataclass
class RateLimiter:
    _events: dict[tuple[str, str], deque[float]] = field(default_factory=lambda: defaultdict(deque))

    def allow(self, client_id: str, route: str) -> bool:
        now = time.time()
        window = SETTINGS.rate_limit_window_seconds
        limit = SETTINGS.rate_limit_requests_per_window
        bucket = self._events[(client_id, route)]
        while bucket and bucket[0] <= now - window:
            bucket.popleft()
        if len(bucket) >= limit:
            return False
        bucket.append(now)
        return True


METRICS = MetricsStore()
RATE_LIMITER = RateLimiter()


def log_event(**payload: object) -> None:
    LOGGER.info(json.dumps(payload, ensure_ascii=True, default=str))
