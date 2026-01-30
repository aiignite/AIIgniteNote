import { prisma } from '../config/database';
import { ApiErrorClass } from '../utils/response';
import { NoteCreateInput, NoteUpdateInput, NotesListParams } from '../types';

// Helper function to validate UUID format
function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

export class NotesService {
  /**
   * Create a new note
   */
  async create(userId: string, data: NoteCreateInput) {
    // Handle folder - support both folderId (UUID) and folder name
    let folderIdToUse = data.folderId;

    if (data.folderId) {
      // Check if folderId is a valid UUID
      if (isValidUUID(data.folderId)) {
        // Verify folder exists if provided
        const folder = await prisma.folder.findFirst({
          where: {
            id: data.folderId,
            OR: [
              { authorId: userId },
              { workspace: { members: { some: { userId } } } },
            ],
          },
        });

        if (!folder) {
          throw new ApiErrorClass(
            'FOLDER_NOT_FOUND',
            'Folder not found or access denied',
            404
          );
        }
      } else {
        // Treat as folder name, look up or create folder
        const existingFolder = await prisma.folder.findFirst({
          where: {
            name: data.folderId,
            authorId: userId,
            workspaceId: data.workspaceId || null,
          },
        });

        if (existingFolder) {
          folderIdToUse = existingFolder.id;
        } else {
          // Create new folder with the provided name
          const newFolder = await prisma.folder.create({
            data: {
              name: data.folderId,
              authorId: userId,
              workspaceId: data.workspaceId || null,
              icon: 'folder',
              color: '#6b7280',
            },
          });
          folderIdToUse = newFolder.id;
        }
      }
    }

    // Verify workspace exists if provided
    if (data.workspaceId) {
      const workspace = await prisma.workspace.findFirst({
        where: {
          id: data.workspaceId,
          members: { some: { userId } },
        },
      });

      if (!workspace) {
        throw new ApiErrorClass(
          'WORKSPACE_NOT_FOUND',
          'Workspace not found or access denied',
          404
        );
      }
    }

    // Create note with content
    const note = await prisma.note.create({
      data: {
        title: data.title,
        type: data.noteType,
        authorId: userId,
        folderId: folderIdToUse,
        workspaceId: data.workspaceId,
        content: {
          create: {
            content: data.content,
          },
        },
      },
      include: {
        content: true,
        folder: true,
        tags: {
          include: {
            tag: true,
          },
        },
      },
    });

    return note;
  }

  /**
   * Get notes list with pagination and filtering
   */
  async list(userId: string, params: NotesListParams) {
    console.log('[NotesService.list] Starting...', { userId, params });

    const page = params.page || 1;
    const limit = Math.min(params.limit || 20, 100);
    const skip = (page - 1) * limit;

    const where: any = {
      isDeleted: false,
      OR: [
        { authorId: userId },
        { workspace: { members: { some: { userId } } } },
      ],
    };

    console.log('[NotesService.list] Initial WHERE clause:', JSON.stringify(where, null, 2));

    // Apply filters
    if (params.folderId) {
      where.folderId = params.folderId;
      console.log('[NotesService.list] Applied folderId filter:', params.folderId);
    }

    if (params.workspaceId) {
      where.workspaceId = params.workspaceId;
      console.log('[NotesService.list] Applied workspaceId filter:', params.workspaceId);
    }

    if (params.isFavorite !== undefined) {
      where.isFavorite = params.isFavorite;
      console.log('[NotesService.list] Applied isFavorite filter:', params.isFavorite);
    }

    if (params.search) {
      where.OR = [
        { title: { contains: params.search, mode: 'insensitive' } },
        { content: { content: { contains: params.search, mode: 'insensitive' } } },
      ];
      console.log('[NotesService.list] Applied search filter:', params.search);
    }

    // Determine sort order
    let orderBy: any = { updatedAt: 'desc' };
    if (params.sortBy === 'createdAt') {
      orderBy = { createdAt: params.sortOrder || 'desc' };
    } else if (params.sortBy === 'title') {
      orderBy = { title: params.sortOrder || 'asc' };
    } else if (params.sortBy === 'updatedAt') {
      orderBy = { updatedAt: params.sortOrder || 'desc' };
    }

    console.log('[NotesService.list] Order by:', orderBy);
    console.log('[NotesService.list] Pagination:', { page, limit, skip });

    // Get total count
    console.log('[NotesService.list] Counting total notes...');
    const total = await prisma.note.count({ where });
    console.log('[NotesService.list] Total notes count:', total);

    // Get notes
    console.log('[NotesService.list] Fetching notes from database...');
    const notes = await prisma.note.findMany({
      where,
      include: {
        content: true,
        folder: true,
        tags: {
          include: {
            tag: true,
          },
        },
      },
      orderBy,
      skip,
      take: limit,
    });

    console.log('[NotesService.list] Fetched notes count:', notes.length);
    console.log('[NotesService.list] First note sample:', notes[0] ? JSON.stringify(notes[0], null, 2) : 'No notes found');

    return {
      notes,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get single note by ID
   */
  async getById(userId: string, noteId: string) {
    const note = await prisma.note.findFirst({
      where: {
        id: noteId,
        isDeleted: false,
        OR: [
          { authorId: userId },
          { workspace: { members: { some: { userId } } } },
        ],
      },
      include: {
        content: true,
        folder: true,
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        tags: {
          include: {
            tag: true,
          },
        },
      },
    });

    if (!note) {
      throw new ApiErrorClass(
        'NOTE_NOT_FOUND',
        'Note not found or access denied',
        404
      );
    }

    // Increment view count
    await prisma.note.update({
      where: { id: noteId },
      data: { viewCount: { increment: 1 } },
    });

    return note;
  }

  /**
   * Update note
   */
  async update(userId: string, noteId: string, data: NoteUpdateInput) {
    // Check if note exists and user has access
    const existingNote = await prisma.note.findFirst({
      where: {
        id: noteId,
        isDeleted: false,
        OR: [
          { authorId: userId },
          { workspace: { members: { some: { userId, role: { in: ['OWNER', 'ADMIN', 'EDITOR'] } } } } },
        ],
      },
    });

    if (!existingNote) {
      throw new ApiErrorClass(
        'NOTE_NOT_FOUND',
        'Note not found or access denied',
        404
      );
    }

    // Update note
    const updateData: any = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.noteType !== undefined) updateData.type = data.noteType;
    if (data.isFavorite !== undefined) updateData.isFavorite = data.isFavorite;
    if (data.folderId !== undefined) updateData.folderId = data.folderId;

    const note = await prisma.note.update({
      where: { id: noteId },
      data: updateData,
      include: {
        content: true,
        folder: true,
        tags: {
          include: {
            tag: true,
          },
        },
      },
    });

    // Update content if provided
    if (data.content !== undefined) {
      await prisma.noteContent.update({
        where: { noteId },
        data: { content: data.content },
      });
      if (note.content) {
        note.content = { ...note.content, content: data.content };
      }
    }

    return note;
  }

  /**
   * Soft delete note
   */
  async delete(userId: string, noteId: string) {
    // Check if note exists and user has access
    const note = await prisma.note.findFirst({
      where: {
        id: noteId,
        isDeleted: false,
        OR: [
          { authorId: userId },
          { workspace: { members: { some: { userId, role: { in: ['OWNER', 'ADMIN'] } } } } },
        ],
      },
    });

    if (!note) {
      throw new ApiErrorClass(
        'NOTE_NOT_FOUND',
        'Note not found or access denied',
        404
      );
    }

    // Soft delete
    await prisma.note.update({
      where: { id: noteId },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
      },
    });

    return { success: true };
  }

  /**
   * Get note versions
   */
  async getVersions(userId: string, noteId: string) {
    // Check access
    const note = await prisma.note.findFirst({
      where: {
        id: noteId,
        OR: [
          { authorId: userId },
          { workspace: { members: { some: { userId } } } },
        ],
      },
    });

    if (!note) {
      throw new ApiErrorClass(
        'NOTE_NOT_FOUND',
        'Note not found or access denied',
        404
      );
    }

    const versions = await prisma.noteVersion.findMany({
      where: { noteId },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { version: 'desc' },
    });

    return versions;
  }

  /**
   * Toggle favorite status
   */
  async toggleFavorite(userId: string, noteId: string) {
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
        'Note not found or access denied',
        404
      );
    }

    const updated = await prisma.note.update({
      where: { id: noteId },
      data: { isFavorite: !note.isFavorite },
      select: { id: true, isFavorite: true },
    });

    return updated;
  }
}

export const notesService = new NotesService();
