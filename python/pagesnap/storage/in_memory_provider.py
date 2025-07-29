from .storage_provider import StorageProvider
from lru import LRU

class InMemoryProvider(StorageProvider):
    def __init__(self, options: dict):
        super().__init__(options)
        # lru-dict uses max_size in number of items, not bytes.
        # This is a slight deviation from the JS implementation but achieves the same goal.
        self.cache = LRU(options.get("max_items", 256))

    async def save(self, file_name: str, data: bytes) -> str:
        self.cache[file_name] = data
        return f"in-memory://{file_name}"

    def get(self, file_name: str) -> bytes:
        return self.cache.get(file_name)
