import { prisma } from '../config/database';
import { ApiErrorClass } from '../utils/response';

export class TagsService {
  /**
   * Get all tags for user
   */
  async list(userId: string, workspaceId?: string) {
    const tags = await prisma.tag.findMany({
      where: {
        OR: [
          { workspaceId: null },
          { workspaceId: workspaceId },
          { workspace: { members: { some: { userId } } } },
        ],
      },
      include: {
        _count: {
          select: { noteTags: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    return tags;
  }

  /**
   * Get single tag by ID
   */
  async getById(userId: string, tagId: string) {
    const tag = await prisma.tag.findFirst({
      where: {
        id: tagId,
        OR: [
          { workspaceId: null },
          { workspace: { members: { some: { userId } } } },
        ],
      },
      include: {
        noteTags: {
          where: {
            note: {
              isDeleted: false,
              OR: [
                { authorId: userId },
                { workspace: { members: { some: { userId } } } },
              ],
            },
          },
          include: {
            note: {
              include: {
                content: true,
              },
            },
          },
        },
        _count: {
          select: { noteTags: true },
        },
      },
    });

    if (!tag) {
      throw new ApiErrorClass(
        'TAG_NOT_FOUND',
        'Tag not found',
        404
      );
    }

    return tag;
  }

  /**
   * Create new tag
   */
  async create(userId: string, data: {
    name: string;
    color?: string;
    workspaceId?: string;
  }) {
    // Check if tag with same name already exists in workspace
    const existing = await prisma.tag.findFirst({
      where: {
        name: data.name,
        workspaceId: data.workspaceId || null,
      },
    });

    if (existing) {
      throw new ApiErrorClass(
        'TAG_EXISTS',
        'A tag with this name already exists',
        409
      );
    }

    // Verify workspace if provided
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

    const tag = await prisma.tag.create({
      data: {
        name: data.name,
        color: data.color || '#6b7280',
        workspaceId: data.workspaceId || null,
      },
    });

    return tag;
  }

  /**
   * Update tag
   */
  async update(userId: string, tagId: string, data: {
    name?: string;
    color?: string;
  }) {
    // Check if tag exists and user has access
    const existing = await prisma.tag.findFirst({
      where: {
        id: tagId,
        OR: [
          { workspaceId: null },
          { workspace: { members: { some: { userId } } } },
        ],
      },
    });

    if (!existing) {
      throw new ApiErrorClass(
        'TAG_NOT_FOUND',
        'Tag not found',
        404
      );
    }

    // Check for duplicate name if changing
    if (data.name && data.name !== existing.name) {
      const duplicate = await prisma.tag.findFirst({
        where: {
          name: data.name,
          workspaceId: existing.workspaceId,
          id: { not: tagId },
        },
      });

      if (duplicate) {
        throw new ApiErrorClass(
          'TAG_EXISTS',
          'A tag with this name already exists',
          409
        );
      }
    }

    const tag = await prisma.tag.update({
      where: { id: tagId },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.color !== undefined && { color: data.color }),
      },
    });

    return tag;
  }

  /**
   * Delete tag
   */
  async delete(userId: string, tagId: string) {
    const tag = await prisma.tag.findFirst({
      where: {
        id: tagId,
        OR: [
          { workspaceId: null },
          { workspace: { members: { some: { userId } } } },
        ],
      },
    });

    if (!tag) {
      throw new ApiErrorClass(
        'TAG_NOT_FOUND',
        'Tag not found',
        404
      );
    }

    // Delete note-tag associations
    await prisma.noteOnTag.deleteMany({
      where: { tagId },
    });

    // Delete tag
    await prisma.tag.delete({
      where: { id: tagId },
    });

    return { success: true };
  }

  /**
   * Add tag to note
   */
  async addToNote(userId: string, noteId: string, tagId: string) {
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

    // Verify tag exists
    const tag = await prisma.tag.findUnique({
      where: { id: tagId },
    });

    if (!tag) {
      throw new ApiErrorClass(
        'TAG_NOT_FOUND',
        'Tag not found',
        404
      );
    }

    // Check if already tagged
    const existing = await prisma.noteOnTag.findUnique({
      where: {
        noteId_tagId: {
          noteId,
          tagId,
        },
      },
    });

    if (existing) {
      throw new ApiErrorClass(
        'ALREADY_TAGGED',
        'Note already has this tag',
        400
      );
    }

    await prisma.noteOnTag.create({
      data: {
        noteId,
        tagId,
      },
    });

    return { success: true };
  }

  /**
   * Remove tag from note
   */
  async removeFromNote(userId: string, noteId: string, tagId: string) {
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

    await prisma.noteOnTag.deleteMany({
      where: {
        noteId,
        tagId,
      },
    });

    return { success: true };
  }

  /**
   * Get notes by tag
   */
  async getNotes(userId: string, tagId: string) {
    const tag = await prisma.tag.findFirst({
      where: {
        id: tagId,
        OR: [
          { workspaceId: null },
          { workspace: { members: { some: { userId } } } },
        ],
      },
      include: {
        noteTags: {
          where: {
            note: {
              isDeleted: false,
              OR: [
                { authorId: userId },
                { workspace: { members: { some: { userId } } } },
              ],
            },
          },
          include: {
            note: {
              include: {
                content: true,
                folder: true,
                tags: {
                  include: { tag: true },
                },
              },
            },
          },
        },
      },
    });

    if (!tag) {
      throw new ApiErrorClass(
        'TAG_NOT_FOUND',
        'Tag not found',
        404
      );
    }

    return tag.noteTags.map((nt) => nt.note);
  }
}

export const tagsService = new TagsService();
