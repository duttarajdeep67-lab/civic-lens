import os
import uuid
import aiofiles
from fastapi import UploadFile, HTTPException, status
from app.core.config import settings

ALLOWED_MIME_TYPES = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
}

async def save_upload_file(file: UploadFile, subfolder: str = "complaints") -> str:
    # Validate content type
    if file.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file type: {file.content_type}. Allowed types: JPEG, PNG, WebP"
        )

    # Read and check size
    contents = await file.read()
    max_size_bytes = settings.MAX_FILE_SIZE_MB * 1024 * 1024
    if len(contents) > max_size_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File size exceeds maximum allowed limit of {settings.MAX_FILE_SIZE_MB}MB"
        )

    # Create destination folder
    target_dir = os.path.join(settings.UPLOAD_DIR, subfolder)
    os.makedirs(target_dir, exist_ok=True)

    # Generate unique filename
    ext = ALLOWED_MIME_TYPES[file.content_type]
    filename = f"{uuid.uuid4()}{ext}"
    file_path = os.path.join(target_dir, filename)

    # Save to disk
    with open(file_path, "wb") as f:
        f.write(contents)

    # Return relative URL
    return f"/uploads/{subfolder}/{filename}"
