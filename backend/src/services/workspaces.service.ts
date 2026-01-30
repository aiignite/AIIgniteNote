import { prisma } from '../config/database';
import { ApiErrorClass } from '../utils/response';
import { WorkspaceRole } from '@prisma/client';

export interface CreateWorkspaceInput {
  name: string;
  description?: string;
}

export interface UpdateWorkspaceInput {
  name?: string;
  description?: string;
}

export interface InviteMemberInput {
  email: string;
  role: WorkspaceRole;
}

export class WorkspacesService {
  /**
   * Get all workspaces for user
   */
  async getAll(userId: string) {
    const workspaces = await prisma.workspace.findMany({
      where: {
        members: {
          some: {
            userId,
          },
        },
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
              },
            },
          },
        },
        _count: {
          select: {
            notes: true,
            members: true,
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    return workspaces;
  }

  /**
   * Get workspace by ID
   */
  async getById(userId: string, workspaceId: string) {
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
              },
            },
          },
          orderBy: {
            user: {
              name: 'asc',
            },
          },
        },
        notes: {
          where: {
            isDeleted: false,
          },
          include: {
            author: {
              select: {
                id: true,
                name: true,
                image: true,
              },
            },
            tags: true,
            folder: true,
          },
          orderBy: {
            updatedAt: 'desc',
          },
          take: 20,
        },
        _count: {
          select: {
            notes: true,
            members: true,
          },
        },
      },
    });

    if (!workspace) {
      throw new ApiErrorClass(
        'WORKSPACE_NOT_FOUND',
        'Workspace not found',
        404
      );
    }

    // Check if user is a member
    const member = workspace.members.find((m: any) => m.userId === userId);
    if (!member) {
      throw new ApiErrorClass(
        'ACCESS_DENIED',
        'You do not have access to this workspace',
        403
      );
    }

    return workspace;
  }

  /**
   * Create new workspace
   */
  async create(userId: string, input: CreateWorkspaceInput) {
    const workspace = await prisma.workspace.create({
      data: {
        name: input.name,
        description: input.description,
        ownerId: userId,
        members: {
          create: {
            userId,
            role: WorkspaceRole.OWNER,
          },
        },
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
              },
            },
          },
        },
      },
    });

    return workspace;
  }

  /**
   * Update workspace
   */
  async update(userId: string, workspaceId: string, input: UpdateWorkspaceInput) {
    // Check if user is owner or admin
    const member = await prisma.workspaceMember.findFirst({
      where: {
        workspaceId,
        userId,
        role: {
          in: [WorkspaceRole.OWNER, WorkspaceRole.ADMIN],
        },
      },
    });

    if (!member) {
      throw new ApiErrorClass(
        'ACCESS_DENIED',
        'Only workspace owners and admins can update the workspace',
        403
      );
    }

    const workspace = await prisma.workspace.update({
      where: { id: workspaceId },
      data: {
        ...(input.name && { name: input.name }),
        ...(input.description !== undefined && { description: input.description }),
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
              },
            },
          },
        },
      },
    });

    return workspace;
  }

  /**
   * Delete workspace
   */
  async delete(userId: string, workspaceId: string) {
    // Check if user is owner
    const member = await prisma.workspaceMember.findFirst({
      where: {
        workspaceId,
        userId,
        role: WorkspaceRole.OWNER,
      },
    });

    if (!member) {
      throw new ApiErrorClass(
        'ACCESS_DENIED',
        'Only workspace owners can delete the workspace',
        403
      );
    }

    // Delete workspace (cascade will handle members and notes)
    await prisma.workspace.delete({
      where: { id: workspaceId },
    });

    return { success: true };
  }

  /**
   * Add member to workspace
   */
  async addMember(
    userId: string,
    workspaceId: string,
    input: InviteMemberInput
  ) {
    // Check if user has permission (owner or admin)
    const invoker = await prisma.workspaceMember.findFirst({
      where: {
        workspaceId,
        userId,
        role: {
          in: [WorkspaceRole.OWNER, WorkspaceRole.ADMIN],
        },
      },
    });

    if (!invoker) {
      throw new ApiErrorClass(
        'ACCESS_DENIED',
        'Only workspace owners and admins can invite members',
        403
      );
    }

    // Find user by email
    const targetUser = await prisma.user.findUnique({
      where: { email: input.email },
    });

    if (!targetUser) {
      throw new ApiErrorClass(
        'USER_NOT_FOUND',
        'User with this email does not exist',
        404
      );
    }

    // Check if user is already a member
    const existingMember = await prisma.workspaceMember.findFirst({
      where: {
        workspaceId,
        userId: targetUser.id,
      },
    });

    if (existingMember) {
      throw new ApiErrorClass(
        'ALREADY_MEMBER',
        'User is already a member of this workspace',
        400
      );
    }

    // Add member
    const member = await prisma.workspaceMember.create({
      data: {
        workspaceId,
        userId: targetUser.id,
        role: input.role,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
    });

    return member;
  }

  /**
   * Update member role
   */
  async updateMemberRole(
    userId: string,
    workspaceId: string,
    memberId: string,
    role: WorkspaceRole
  ) {
    // Check if user is owner
    const invoker = await prisma.workspaceMember.findFirst({
      where: {
        workspaceId,
        userId,
        role: WorkspaceRole.OWNER,
      },
    });

    if (!invoker) {
      throw new ApiErrorClass(
        'ACCESS_DENIED',
        'Only workspace owners can update member roles',
        403
      );
    }

    // Check if target member exists
    const targetMember = await prisma.workspaceMember.findFirst({
      where: {
        id: memberId,
        workspaceId,
      },
    });

    if (!targetMember) {
      throw new ApiErrorClass(
        'MEMBER_NOT_FOUND',
        'Member not found in this workspace',
        404
      );
    }

    // Cannot change owner role if there's only one owner
    if (targetMember.role === WorkspaceRole.OWNER && role !== WorkspaceRole.OWNER) {
      const ownerCount = await prisma.workspaceMember.count({
        where: {
          workspaceId,
          role: WorkspaceRole.OWNER,
        },
      });

      if (ownerCount <= 1) {
        throw new ApiErrorClass(
          'LAST_OWNER',
          'Cannot change the role of the last owner',
          400
        );
      }
    }

    // Update member role
    const member = await prisma.workspaceMember.update({
      where: { id: memberId },
      data: { role },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
    });

    return member;
  }

  /**
   * Remove member from workspace
   */
  async removeMember(userId: string, workspaceId: string, memberId: string) {
    // Check if user is owner or admin
    const invoker = await prisma.workspaceMember.findFirst({
      where: {
        workspaceId,
        userId,
        role: {
          in: [WorkspaceRole.OWNER, WorkspaceRole.ADMIN],
        },
      },
    });

    if (!invoker) {
      throw new ApiErrorClass(
        'ACCESS_DENIED',
        'Only workspace owners and admins can remove members',
        403
      );
    }

    // Check if target member exists
    const targetMember = await prisma.workspaceMember.findFirst({
      where: {
        id: memberId,
        workspaceId,
      },
    });

    if (!targetMember) {
      throw new ApiErrorClass(
        'MEMBER_NOT_FOUND',
        'Member not found in this workspace',
        404
      );
    }

    // Cannot remove the last owner
    if (targetMember.role === WorkspaceRole.OWNER) {
      const ownerCount = await prisma.workspaceMember.count({
        where: {
          workspaceId,
          role: WorkspaceRole.OWNER,
        },
      });

      if (ownerCount <= 1) {
        throw new ApiErrorClass(
          'LAST_OWNER',
          'Cannot remove the last owner',
          400
        );
      }
    }

    // Remove member
    await prisma.workspaceMember.delete({
      where: { id: memberId },
    });

    return { success: true };
  }

  /**
   * Leave workspace
   */
  async leaveWorkspace(userId: string, workspaceId: string) {
    const member = await prisma.workspaceMember.findFirst({
      where: {
        workspaceId,
        userId,
      },
    });

    if (!member) {
      throw new ApiErrorClass(
        'NOT_MEMBER',
        'You are not a member of this workspace',
        404
      );
    }

    // Cannot leave if you're the last owner
    if (member.role === WorkspaceRole.OWNER) {
      const ownerCount = await prisma.workspaceMember.count({
        where: {
          workspaceId,
          role: WorkspaceRole.OWNER,
        },
      });

      if (ownerCount <= 1) {
        throw new ApiErrorClass(
          'LAST_OWNER',
          'Cannot leave workspace as the last owner. Transfer ownership or delete the workspace.',
          400
        );
      }
    }

    // Remove member
    await prisma.workspaceMember.delete({
      where: { id: member.id },
    });

    return { success: true };
  }

  /**
   * Get workspace statistics
   */
  async getStats(userId: string, workspaceId: string) {
    // Check if user is a member
    const member = await prisma.workspaceMember.findFirst({
      where: {
        workspaceId,
        userId,
      },
    });

    if (!member) {
      throw new ApiErrorClass(
        'NOT_MEMBER',
        'You are not a member of this workspace',
        404
      );
    }

    const [noteCount, memberCount, recentActivity] = await Promise.all([
      prisma.note.count({
        where: {
          workspaceId,
          isDeleted: false,
        },
      }),
      prisma.workspaceMember.count({
        where: { workspaceId },
      }),
      prisma.note.findMany({
        where: {
          workspaceId,
          isDeleted: false,
        },
        select: {
          id: true,
          title: true,
          updatedAt: true,
          author: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: {
          updatedAt: 'desc',
        },
        take: 10,
      }),
    ]);

    return {
      noteCount,
      memberCount,
      recentActivity,
    };
  }
}

export const workspacesService = new WorkspacesService();
