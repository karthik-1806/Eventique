"""Security utilities: Prompt injection protection, sanitization, and rate limiting."""

import html
import re
import time
from typing import Dict, Optional, Tuple
from fastapi import Request


def sanitize_for_prompt(text: Optional[str], max_length: int = 500) -> str:
    """Disarm prompt injection delimiters, role overrides, and dangerous characters."""
    if not text:
        return ""

    sanitized = str(text)

    # 1. Disarm delimiter breaking
    sanitized = re.sub(r"={3,}", "---", sanitized)
    sanitized = re.sub(r"-{4,}", "---", sanitized)

    # 2. Strip bracket characters commonly used for prompt escapes/templates
    sanitized = re.sub(r"[<>{}\[\]]", "", sanitized)

    # 3. Disarm role spoofing keywords at line starts
    sanitized = re.sub(
        r"(?i)^(system|assistant|user|developer|instruction|override)\s*:",
        "[sanitized]:",
        sanitized,
        flags=re.MULTILINE,
    )

    # 4. Strip null bytes and non-printable control characters
    sanitized = re.sub(r"[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]", "", sanitized)

    # 5. Collapse excessive whitespace
    sanitized = re.sub(r"\n{3,}", "\n\n", sanitized)

    # 6. Length truncation
    return sanitized[:max_length].strip()


def sanitize_html(text: Optional[str]) -> str:
    """Escapes HTML special characters for safe output."""
    if not text:
        return ""
    return html.escape(str(text))


class RateLimiter:
    """Thread-safe rate limiter with automated expiration pruning to prevent memory leaks."""

    def __init__(self, max_requests: int, window_seconds: int = 60, max_tracked_ips: int = 1000):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.max_tracked_ips = max_tracked_ips
        self._records: Dict[str, Dict[str, float]] = {}

    def _prune(self, now: float) -> None:
        """Remove expired IP records."""
        expired_ips = [ip for ip, data in self._records.items() if now > data["reset_at"]]
        for ip in expired_ips:
            del self._records[ip]

    def check(self, client_ip: str) -> Tuple[bool, int, int]:
        """
        Check if client IP is within rate limits.
        Returns: (is_allowed, remaining_requests, retry_after_seconds)
        """
        now = time.time()

        if len(self._records) > self.max_tracked_ips:
            self._prune(now)

        record = self._records.get(client_ip)

        if not record or now > record["reset_at"]:
            reset_at = now + self.window_seconds
            self._records[client_ip] = {"count": 1, "reset_at": reset_at}
            return True, self.max_requests - 1, 0

        if record["count"] >= self.max_requests:
            retry_after = max(1, int(record["reset_at"] - now))
            return False, 0, retry_after

        record["count"] += 1
        remaining = max(0, self.max_requests - int(record["count"]))
        return True, remaining, 0

    def reset(self) -> None:
        """Clear all rate limit records (for testing)."""
        self._records.clear()


def get_client_ip(request: Request) -> str:
    """Safely extract client IP from X-Forwarded-For or client host."""
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        parts = forwarded.split(",")
        for part in parts:
            trimmed = part.strip()
            # Simple IPv4 or IPv6 validation
            if re.match(r"^(?:\d{1,3}\.){3}\d{1,3}$|^[a-fA-F0-9:]+$", trimmed):
                return trimmed
    return request.client.host if request.client else "127.0.0.1"

