import { prisma } from '../config/database';
import { ApiErrorClass } from '../utils/response';

export class FoldersService {
  /**
   * Get folder tree for user
   */
  async getTree(userId: string, workspaceId?: string) {
    const folders = await prisma.folder.findMany({
      where: {
        authorId: userId,
        workspaceId: workspaceId || null,
      },
      include: {
        _count: {
          select: { notes: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    // Build tree structure
    const folderMap = new Map();
    folders.forEach((folder) => {
      folderMap.set(folder.id, { ...folder, children: [] });
    });

    const rootFolders: any[] = [];
    folders.forEach((folder) => {
      const folderWithChildren = folderMap.get(folder.id);
      if (folder.parentId) {
        const parent = folderMap.get(folder.parentId);
        if (parent) {
          parent.children.push(folderWithChildren);
        }
      } else {
        rootFolders.push(folderWithChildren);
      }
    });

    return rootFolders;
  }

  /**
   * Get single folder by ID
   */
  async getById(userId: string, folderId: string) {
    const folder = await prisma.folder.findFirst({
      where: {
        id: folderId,
        authorId: userId,
      },
      include: {
        parent: true,
        children: true,
        notes: {
          where: { isDeleted: false },
          include: {
            content: true,
            tags: {
              include: { tag: true },
            },
          },
        },
        _count: {
          select: { notes: true },
        },
      },
    });

    if (!folder) {
      throw new ApiErrorClass(
        'FOLDER_NOT_FOUND',
        'Folder not found',
        404
      );
    }

    return folder;
  }

  /**
   * Create new folder
   */
  async create(userId: string, data: {
    name: string;
    parentId?: string;
    workspaceId?: string;
    icon?: string;
    color?: string;
  }) {
    // Verify parent folder exists if provided
    if (data.parentId) {
      const parent = await prisma.folder.findFirst({
        where: {
          id: data.parentId,
          authorId: userId,
        },
      });

      if (!parent) {
        throw new ApiErrorClass(
          'PARENT_FOLDER_NOT_FOUND',
          'Parent folder not found',
          404
        );
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

    const folder = await prisma.folder.create({
      data: {
        name: data.name,
        parentId: data.parentId,
        workspaceId: data.workspaceId,
        authorId: userId,
        icon: data.icon || 'folder',
        color: data.color || '#6b7280',
      },
    });

    return folder;
  }

  /**
   * Update folder
   */
  async update(userId: string, folderId: string, data: {
    name?: string;
    parentId?: string;
    icon?: string;
    color?: string;
  }) {
    // Check if folder exists and user has access
    const existing = await prisma.folder.findFirst({
      where: {
        id: folderId,
        authorId: userId,
      },
    });

    if (!existing) {
      throw new ApiErrorClass(
        'FOLDER_NOT_FOUND',
        'Folder not found',
        404
      );
    }

    // Prevent setting parent to self or descendant
    if (data.parentId) {
      if (data.parentId === folderId) {
        throw new ApiErrorClass(
          'INVALID_PARENT',
          'Cannot set folder as its own parent',
          400
        );
      }

      // Check for circular reference
      const isDescendant = await this.isDescendant(folderId, data.parentId);
      if (isDescendant) {
        throw new ApiErrorClass(
          'INVALID_PARENT',
          'Cannot set descendant folder as parent',
          400
        );
      }
    }

    const folder = await prisma.folder.update({
      where: { id: folderId },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.parentId !== undefined && { parentId: data.parentId }),
        ...(data.icon !== undefined && { icon: data.icon }),
        ...(data.color !== undefined && { color: data.color }),
      },
    });

    return folder;
  }

  /**
   * Delete folder
   */
  async delete(userId: string, folderId: string) {
    const folder = await prisma.folder.findFirst({
      where: {
        id: folderId,
        authorId: userId,
      },
      include: {
        notes: true,
        children: true,
      },
    });

    if (!folder) {
      throw new ApiErrorClass(
        'FOLDER_NOT_FOUND',
        'Folder not found',
        404
      );
    }

    // Move notes to parent or root
    if (folder.notes.length > 0) {
      await prisma.note.updateMany({
        where: { folderId },
        data: { folderId: folder.parentId },
      });
    }

    // Move children to parent or root
    if (folder.children.length > 0) {
      await prisma.folder.updateMany({
        where: { parentId: folderId },
        data: { parentId: folder.parentId },
      });
    }

    // Delete folder
    await prisma.folder.delete({
      where: { id: folderId },
    });

    return { success: true };
  }

  /**
   * Check if folder is descendant of another folder
   */
  private async isDescendant(ancestorId: string, descendantId: string): Promise<boolean> {
    let currentId = descendantId;
    while (currentId) {
      if (currentId === ancestorId) {
        return true;
      }

      const folder = await prisma.folder.findUnique({
        where: { id: currentId },
        select: { parentId: true },
      });

      currentId = folder?.parentId || '';
    }

    return false;
  }
}

export const foldersService = new FoldersService();
