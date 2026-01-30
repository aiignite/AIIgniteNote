import { prisma } from '../config/database';
import { ApiErrorClass } from '../utils/response';
import path from 'path';
import fs from 'fs/promises';
import { randomUUID } from 'crypto';

export interface UploadResult {
  id: string;
  fileName: string;
  originalName: string;
  fileSize: number;
  mimeType: string;
  filePath: string;
}

export class AttachmentService {
  private uploadDir: string;
  private maxFileSize: number = 10 * 1024 * 1024; // 10MB
  private allowedMimeTypes: string[] = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
  ];

  constructor() {
    // Set upload directory to backend/uploads/attachments
    this.uploadDir = path.join(process.cwd(), 'uploads', 'attachments');
    this.ensureUploadDir();
  }

  private async ensureUploadDir() {
    try {
      await fs.mkdir(this.uploadDir, { recursive: true });
    } catch (error) {
      console.error('Failed to create upload directory:', error);
    }
  }

  /**
   * Validate file before upload
   */
  private validateFile(file: Express.Multer.File): void {
    // Check file size
    if (file.size > this.maxFileSize) {
      throw new ApiErrorClass(
        'FILE_TOO_LARGE',
        `File size exceeds maximum allowed size of ${this.maxFileSize / 1024 / 1024}MB`,
        400
      );
    }

    // Check file type
    if (!this.allowedMimeTypes.includes(file.mimetype)) {
      throw new ApiErrorClass(
        'INVALID_FILE_TYPE',
        `File type ${file.mimetype} is not allowed`,
        400
      );
    }
  }

  /**
   * Save uploaded file and return metadata
   */
  async saveFile(userId: string, file: Express.Multer.File): Promise<UploadResult> {
    this.validateFile(file);

    // Generate unique filename
    const fileExtension = path.extname(file.originalname);
    const uniqueFileName = `${randomUUID()}${fileExtension}`;
    const filePath = path.join(this.uploadDir, uniqueFileName);

    // Save file to disk
    await fs.writeFile(filePath, file.buffer);

    // Save file metadata to database
    // First check if AIAttachment model exists, otherwise use Attachment
    let attachment: any;
    try {
      // Try using AIAttachment model (if available after rebuild)
      attachment = await (prisma as any).aIAttachment.create({
        data: {
          userId,
          fileName: uniqueFileName,
          originalName: file.originalname,
          fileSize: file.size,
          mimeType: file.mimetype,
          filePath: `/uploads/attachments/${uniqueFileName}`,
        },
      });
    } catch (e) {
      // Fallback: Use raw SQL to insert into ai_attachments table
      const newId = randomUUID();
      const result = await (prisma as any).$queryRaw`
        INSERT INTO "ai_attachments" (id, "userId", "fileName", "originalName", "fileSize", "mimeType", "filePath", "createdAt")
        VALUES (${newId}, ${userId}, ${uniqueFileName}, ${file.originalname}, ${file.size}, ${file.mimetype}, ${`/uploads/attachments/${uniqueFileName}`}, NOW())
        RETURNING *
      `;
      attachment = result[0];
    }

    return {
      id: attachment.id,
      fileName: attachment.fileName,
      originalName: attachment.originalName,
      fileSize: attachment.fileSize,
      mimeType: attachment.mimeType,
      filePath: attachment.filePath,
    };
  }

  /**
   * Get attachment by ID
   */
  async getAttachment(id: string, userId: string) {
    // Try using AIAttachment model first, then fallback to raw query
    let attachment: any;
    try {
      attachment = await (prisma as any).aIAttachment.findFirst({
        where: {
          id,
          userId,
        },
      });
    } catch (e) {
      const result = await (prisma as any).$queryRaw`
        SELECT * FROM "ai_attachments"
        WHERE id = ${id} AND "userId" = ${userId}
        LIMIT 1
      `;
      attachment = result[0];
    }

    if (!attachment) {
      throw new ApiErrorClass(
        'ATTACHMENT_NOT_FOUND',
        'Attachment not found',
        404
      );
    }

    return attachment;
  }

  /**
   * Delete attachment by ID
   */
  async deleteAttachment(id: string, userId: string) {
    const attachment = await this.getAttachment(id, userId);

    // Delete file from disk
    const filePath = path.join(process.cwd(), 'public', attachment.filePath);
    try {
      await fs.unlink(filePath);
    } catch (error) {
      console.warn('Failed to delete file from disk:', error);
    }

    // Delete from database
    try {
      await (prisma as any).aIAttachment.delete({
        where: { id },
      });
    } catch (e) {
      await (prisma as any).$queryRaw`
        DELETE FROM "ai_attachments" WHERE id = ${id}
      `;
    }

    return { success: true };
  }

  /**
   * Get file content for AI processing
   * For text files, returns the content
   * For images/PDFs, returns metadata about the file
   */
  async getFileContent(attachmentId: string): Promise<string> {
    let attachment: any;
    try {
      attachment = await (prisma as any).aIAttachment.findUnique({
        where: { id: attachmentId },
      });
    } catch (e) {
      const result = await (prisma as any).$queryRaw`
        SELECT * FROM "ai_attachments" WHERE id = ${attachmentId}
      `;
      attachment = result[0];
    }

    if (!attachment) {
      throw new ApiErrorClass(
        'ATTACHMENT_NOT_FOUND',
        'Attachment not found',
        404
      );
    }

    const filePath = path.join(process.cwd(), 'public', attachment.filePath);

    // For text files, read content
    if (attachment.mimeType === 'text/plain') {
      try {
        const content = await fs.readFile(filePath, 'utf-8');
        return content;
      } catch (error) {
        console.error('Failed to read text file:', error);
        return `[Error reading text file: ${attachment.originalName}]`;
      }
    }

    // For images, we could extract text using OCR (not implemented)
    // For now, return metadata
    return `[File: ${attachment.originalName} (${(attachment.fileSize / 1024).toFixed(1)} KB, ${attachment.mimeType})]`;
  }

  /**
   * Get multiple file contents for AI context
   */
  async getAttachmentsContent(attachmentIds: string[]): Promise<string> {
    const contents: string[] = [];

    for (const id of attachmentIds) {
      try {
        const content = await this.getFileContent(id);
        contents.push(content);
      } catch (error) {
        console.error(`Failed to get content for attachment ${id}:`, error);
        contents.push(`[Error loading attachment ${id}]`);
      }
    }

    return contents.join('\n\n');
  }
}

export const attachmentService = new AttachmentService();
