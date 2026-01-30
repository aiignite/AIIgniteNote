import multer from 'multer';
import path from 'path';
import { config } from '../config';
import fs from 'fs';
import crypto from 'crypto';

// Ensure uploads directory exists
const uploadsDir = path.resolve(process.cwd(), config.uploadDir);
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Storage configuration
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (_req, file, cb) => {
    // Generate unique filename with original extension
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const hash = crypto.createHash('md5').update(file.originalname + uniqueSuffix).digest('hex').substring(0, 8);
    cb(null, `${hash}-${uniqueSuffix}${ext}`);
  },
});

// File filter
const fileFilter = (_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Allowed file types
  const allowedMimes = [
    // Images
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    // Documents
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    // Text
    'text/plain',
    'text/markdown',
    'application/json',
    // Archives
    'application/zip',
    'application/x-rar-compressed',
    'application/x-7z-compressed',
  ];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('File type not allowed'));
  }
};

// Multer configuration
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: config.maxFileSize,
  },
});

// Export single and multiple upload handlers
export const uploadSingle = upload.single('file');
export const uploadMultiple = upload.array('files', 10);
