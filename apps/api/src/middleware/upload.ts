import multer from 'multer';
import type { Request } from 'express';
import { AppError } from './errorHandler';

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'video/mp4',
];

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB
const MAX_FILES_PER_COMPLAINT = 5;

function fileFilter(
  _req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback,
) {
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(new AppError(`File type not allowed. Accepted types: JPEG, PNG, WebP, MP4`, 400));
    return;
  }

  // Check extension matches MIME type
  const ext = file.originalname.split('.').pop()?.toLowerCase();
  const validExtensions: Record<string, string[]> = {
    'image/jpeg': ['jpg', 'jpeg'],
    'image/jpg': ['jpg', 'jpeg'],
    'image/png': ['png'],
    'image/webp': ['webp'],
    'video/mp4': ['mp4'],
  };

  if (ext && !validExtensions[file.mimetype]?.includes(ext)) {
    cb(new AppError('File extension does not match content type', 400));
    return;
  }

  cb(null, true);
}

// Use memory storage — file never written to disk
export const uploadMiddleware = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: MAX_FILES_PER_COMPLAINT,
  },
  fileFilter,
});

export const ALLOWED_MIME_TYPES_SET = new Set(ALLOWED_MIME_TYPES);
