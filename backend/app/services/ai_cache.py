"""Thread-safe In-Memory LRU Cache with TTL."""

from collections import OrderedDict
import hashlib
import json
import threading
import time
from typing import Any, Optional


class AICache:
    def __init__(self, max_size: int = 250, default_ttl_seconds: int = 600):
        self.max_size = max_size
        self.default_ttl_seconds = default_ttl_seconds
        self._cache: OrderedDict[str, dict] = OrderedDict()
        self._lock = threading.Lock()

    def generate_key(self, prefix: str, payload: Any) -> str:
        """Generates SHA-256 hash key from payload."""
        data_str = payload if isinstance(payload, str) else json.dumps(payload, sort_keys=True, default=str)
        digest = hashlib.sha256(data_str.encode("utf-8")).hexdigest()[:24]
        return f"{prefix}:{digest}"

    def get(self, key: str) -> Optional[Any]:
        """Gets value and refreshes access order (true LRU)."""
        now = time.time()
        with self._lock:
            if key not in self._cache:
                return None

            entry = self._cache[key]
            if now > entry["expires_at"]:
                del self._cache[key]
                return None

            # Move to end for LRU freshness
            self._cache.move_to_end(key)
            return entry["data"]

    def set(self, key: str, data: Any, ttl_seconds: Optional[int] = None) -> None:
        """Sets value with eviction of oldest key if capacity reached."""
        ttl = ttl_seconds if ttl_seconds is not None else self.default_ttl_seconds
        expires_at = time.time() + ttl

        with self._lock:
            if key in self._cache:
                self._cache.move_to_end(key)
            elif len(self._cache) >= self.max_size:
                # Evict least recently accessed (first item)
                self._cache.popitem(last=False)

            self._cache[key] = {"data": data, "expires_at": expires_at}

    def clear(self) -> None:
        with self._lock:
            self._cache.clear()


ai_cache = AICache()

