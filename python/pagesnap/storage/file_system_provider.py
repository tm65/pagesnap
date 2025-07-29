import os
from pathlib import Path
from .storage_provider import StorageProvider
import aiofiles

class FileSystemProvider(StorageProvider):
    def __init__(self, options: dict):
        super().__init__(options)
        self.location = Path(os.getcwd()) / (options.get("location", "./snapshots"))

    async def save(self, file_name: str, data: bytes) -> str:
        self.location.mkdir(parents=True, exist_ok=True)
        file_path = self.location / file_name

        if not self.options.get("overwrite", True) and file_path.exists():
            print(f"File {file_path} already exists and overwrite is false. Skipping.")
            return str(file_path)

        async with aiofiles.open(file_path, 'wb') as f:
            await f.write(data)
        return str(file_path)
