import abc

class StorageProvider(abc.ABC):
    def __init__(self, options: dict):
        self.options = options

    @abc.abstractmethod
    async def save(self, file_name: str, data: bytes) -> str:
        """Saves the image data."""
        raise NotImplementedError

    async def cleanup(self):
        """Performs cleanup of expired assets."""
        print(f"Cleanup not implemented for {self.__class__.__name__}")
        return
