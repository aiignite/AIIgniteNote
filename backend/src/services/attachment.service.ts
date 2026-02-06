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
    // Set upload directory to backend/uploads/attachments using __dirname for correct path
    this.uploadDir = path.resolve(__dirname, '../../uploads/attachments');
    console.log('[AttachmentService] Upload directory:', this.uploadDir);
    this.ensureUploadDir();
  }

  private async ensureUploadDir() {
    try {
      await fs.mkdir(this.uploadDir, { recursive: true });
      console.log('[AttachmentService] Upload directory ensured:', this.uploadDir);
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
    console.log('[AttachmentService.saveFile] Starting upload for user:', userId);
    console.log('[AttachmentService.saveFile] File info:', {
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      hasBuffer: !!file.buffer,
      bufferLength: file.buffer?.length
    });
    
    this.validateFile(file);

    // Generate unique filename
    const fileExtension = path.extname(file.originalname);
    const uniqueFileName = `${randomUUID()}${fileExtension}`;
    const filePath = path.join(this.uploadDir, uniqueFileName);

    console.log('[AttachmentService.saveFile] Saving to:', filePath);

    // Save file to disk
    await fs.writeFile(filePath, file.buffer);
    console.log('[AttachmentService.saveFile] File saved successfully');

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
   * For images, returns base64 encoded data with mime type
   */
  async getFileContent(attachmentId: string): Promise<{ type: 'text' | 'image'; content: string; mimeType?: string }> {
    console.log('[AttachmentService.getFileContent] Getting content for attachment:', attachmentId);
    
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
      console.error('[AttachmentService.getFileContent] Attachment not found:', attachmentId);
      throw new ApiErrorClass(
        'ATTACHMENT_NOT_FOUND',
        'Attachment not found',
        404
      );
    }

    console.log('[AttachmentService.getFileContent] Attachment found:', {
      id: attachment.id,
      fileName: attachment.fileName,
      mimeType: attachment.mimeType
    });

    // 修复文件路径：使用 uploads 目录而不是 public
    const filePath = path.join(this.uploadDir, attachment.fileName);
    console.log('[AttachmentService.getFileContent] File path:', filePath);

    // For text files, read content
    if (attachment.mimeType === 'text/plain') {
      try {
        const content = await fs.readFile(filePath, 'utf-8');
        console.log('[AttachmentService.getFileContent] Text file read successfully, length:', content.length);
        return { type: 'text', content };
      } catch (error) {
        console.error('[AttachmentService.getFileContent] Failed to read text file:', error);
        return { type: 'text', content: `[Error reading text file: ${attachment.originalName}]` };
      }
    }

    // For images, read and return base64 encoded data
    if (attachment.mimeType.startsWith('image/')) {
      try {
        console.log('[AttachmentService.getFileContent] Reading image file...');
        const imageBuffer = await fs.readFile(filePath);
        const base64Data = imageBuffer.toString('base64');
        console.log('[AttachmentService.getFileContent] Image read successfully, base64 length:', base64Data.length);
        return { 
          type: 'image', 
          content: base64Data, 
          mimeType: attachment.mimeType 
        };
      } catch (error) {
        console.error('[AttachmentService.getFileContent] Failed to read image file:', error);
        return { type: 'text', content: `[Error reading image file: ${attachment.originalName}]` };
      }
    }

    // For other files, return metadata
    console.log('[AttachmentService.getFileContent] Unsupported file type, returning metadata');
    return { 
      type: 'text', 
      content: `[File: ${attachment.originalName} (${(attachment.fileSize / 1024).toFixed(1)} KB, ${attachment.mimeType})]` 
    };
  }

  /**
   * Get attachment details with file data for AI processing
   */
  async getAttachmentForAI(attachmentId: string): Promise<{
    id: string;
    fileName: string;
    originalName: string;
    mimeType: string;
    type: 'text' | 'image';
    content: string;
  }> {
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
      throw new ApiErrorClass('ATTACHMENT_NOT_FOUND', 'Attachment not found', 404);
    }

    const fileContent = await this.getFileContent(attachmentId);
    
    return {
      id: attachment.id,
      fileName: attachment.fileName,
      originalName: attachment.originalName,
      mimeType: attachment.mimeType,
      type: fileContent.type,
      content: fileContent.content,
    };
  }

  /**
   * Get multiple file contents for AI context (legacy - returns text only)
   */
  async getAttachmentsContent(attachmentIds: string[]): Promise<string> {
    const contents: string[] = [];

    for (const id of attachmentIds) {
      try {
        const content = await this.getFileContent(id);
        if (content.type === 'text') {
          contents.push(content.content);
        } else {
          contents.push(`[Image: ${id}]`);
        }
      } catch (error) {
        console.error(`Failed to get content for attachment ${id}:`, error);
        contents.push(`[Error loading attachment ${id}]`);
      }
    }

    return contents.join('\n\n');
  }

  /**
   * Get all attachments with their data for multimodal AI
   */
  async getAttachmentsForAI(attachmentIds: string[]): Promise<{
    texts: string[];
    images: { mimeType: string; data: string }[];
  }> {
    const texts: string[] = [];
    const images: { mimeType: string; data: string }[] = [];

    for (const id of attachmentIds) {
      try {
        const content = await this.getFileContent(id);
        if (content.type === 'text') {
          texts.push(content.content);
        } else if (content.type === 'image' && content.mimeType) {
          images.push({
            mimeType: content.mimeType,
            data: content.content,
          });
        }
      } catch (error) {
        console.error(`Failed to get content for attachment ${id}:`, error);
        texts.push(`[Error loading attachment ${id}]`);
      }
    }

    return { texts, images };
  }
}

export const attachmentService = new AttachmentService();
