import boto3
from .storage_provider import StorageProvider

class S3Provider(StorageProvider):
    def __init__(self, options: dict):
        super().__init__(options)
        if "location" not in options:
            raise ValueError("S3Provider requires a 'location' (bucket name) in the configuration.")
        
        self.bucket = options["location"]
        self.s3_client = boto3.client(
            's3',
            region_name=options.get("region") # boto3 handles env vars automatically
        )

    async def save(self, file_name: str, data: bytes) -> str:
        try:
            self.s3_client.put_object(Bucket=self.bucket, Key=file_name, Body=data)
            return f"s3://{self.bucket}/{file_name}"
        except Exception as e:
            print(f"Failed to upload {file_name} to S3: {e}")
            raise
