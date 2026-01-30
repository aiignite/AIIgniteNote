import { prisma } from '../config/database';
import { ApiErrorClass } from '../utils/response';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { config } from '../config';

export class AttachmentsService {
  /**
   * Upload file and create attachment record
   */
  async upload(
    userId: string,
    noteId: string,
    file: Express.Multer.File
  ) {
    // Verify note exists and user has access
    const note = await prisma.note.findFirst({
      where: {
        id: noteId,
        isDeleted: false,
        OR: [
          { authorId: userId },
          { workspace: { members: { some: { userId, role: { in: ['OWNER', 'ADMIN', 'EDITOR'] } } } } },
        ],
      },
    });

    if (!note) {
      // Delete uploaded file
      fs.unlinkSync(file.path);

      throw new ApiErrorClass(
        'NOTE_NOT_FOUND',
        'Note not found or access denied',
        404
      );
    }

    // Calculate file hash
    const fileBuffer = fs.readFileSync(file.path);
    const fileHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');

    // Create attachment record
    const attachment = await prisma.attachment.create({
      data: {
        noteId,
        fileName: file.originalname,
        fileUrl: `/uploads/${file.filename}`,
        fileSize: file.size,
        mimeType: file.mimetype,
        fileHash,
        uploadedBy: userId,
      },
    });

    return attachment;
  }

  /**
   * Get attachment by ID
   */
  async getById(userId: string, attachmentId: string) {
    const attachment = await prisma.attachment.findUnique({
      where: { id: attachmentId },
      include: {
        note: true,
      },
    });

    if (!attachment) {
      throw new ApiErrorClass(
        'ATTACHMENT_NOT_FOUND',
        'Attachment not found',
        404
      );
    }

    // Verify user has access to the note
    const hasAccess = attachment.note.authorId === userId ||
      (attachment.note.workspaceId && await prisma.workspaceMember.findFirst({
        where: {
          workspaceId: attachment.note.workspaceId,
          userId,
        },
      }));

    if (!hasAccess) {
      throw new ApiErrorClass(
        'ACCESS_DENIED',
        'You do not have permission to access this attachment',
        403
      );
    }

    return attachment;
  }

  /**
   * Get all attachments for a note
   */
  async getByNote(userId: string, noteId: string) {
    // Verify note exists and user has access
    const note = await prisma.note.findFirst({
      where: {
        id: noteId,
        isDeleted: false,
        OR: [
          { authorId: userId },
          { workspace: { members: { some: { userId } } } },
        ],
      },
    });

    if (!note) {
      throw new ApiErrorClass(
        'NOTE_NOT_FOUND',
        'Note not found',
        404
      );
    }

    const attachments = await prisma.attachment.findMany({
      where: { noteId },
      orderBy: { createdAt: 'desc' },
    });

    return attachments;
  }

  /**
   * Delete attachment
   */
  async delete(userId: string, attachmentId: string) {
    const attachment = await prisma.attachment.findUnique({
      where: { id: attachmentId },
      include: {
        note: true,
      },
    });

    if (!attachment) {
      throw new ApiErrorClass(
        'ATTACHMENT_NOT_FOUND',
        'Attachment not found',
        404
      );
    }

    // Verify user has permission (note author or workspace admin/owner)
    const hasPermission = attachment.note.authorId === userId ||
      (attachment.note.workspaceId && await prisma.workspaceMember.findFirst({
        where: {
          workspaceId: attachment.note.workspaceId,
          userId,
          role: { in: ['OWNER', 'ADMIN'] },
        },
      }));

    if (!hasPermission) {
      throw new ApiErrorClass(
        'ACCESS_DENIED',
        'You do not have permission to delete this attachment',
        403
      );
    }

    // Delete physical file
    const filePath = path.resolve(process.cwd(), config.uploadDir, path.basename(attachment.fileUrl));
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (err) {
      console.error('Failed to delete file:', err);
    }

    // Delete database record
    await prisma.attachment.delete({
      where: { id: attachmentId },
    });

    return { success: true };
  }

  /**
   * Get file path for serving
   */
  getFilePath(fileUrl: string): string {
    const filename = path.basename(fileUrl);
    return path.resolve(process.cwd(), config.uploadDir, filename);
  }

  /**
   * Validate file exists
   */
  fileExists(fileUrl: string): boolean {
    const filePath = this.getFilePath(fileUrl);
    return fs.existsSync(filePath);
  }
}

export const attachmentsService = new AttachmentsService();
