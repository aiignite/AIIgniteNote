import { prisma } from '../config/database';
import { ApiErrorClass } from '../utils/response';

export interface TemplatesListParams {
  page?: number;
  limit?: number;
  category?: string;
  isPublic?: boolean;
  search?: string;
}

export class TemplateService {
  /**
   * Get all templates
   */
  async list(userId: string | undefined, params: TemplatesListParams) {
    const page = params.page || 1;
    const limit = Math.min(params.limit || 20, 100);
    const skip = (page - 1) * limit;

    const where: any = {
      isActive: true,
    };

    // 如果用户已登录，查询用户自己的模板和公开模板
    // 如果用户未登录，只查询系统模板（userId 为 null 且 isPublic 为 true）
    if (userId) {
      where.OR = [
        { userId },
        { isPublic: true },
      ];
    } else {
      where.userId = null;
      where.isPublic = true;
    }

    // Apply filters
    if (params.category) {
      where.category = params.category;
    }

    // 注意：不要覆盖上面的isPublic条件
    // if (params.isPublic !== undefined) {
    //   where.isPublic = params.isPublic;
    // }

    if (params.search) {
      where.AND = [
        {
          OR: [
            { name: { contains: params.search, mode: 'insensitive' } },
            { description: { contains: params.search, mode: 'insensitive' } },
            { prompt: { contains: params.search, mode: 'insensitive' } },
          ],
        },
      ];
    }

    console.log('Template query where:', JSON.stringify(where, null, 2));

    // Get total count
    const total = await prisma.aITemplate.count({ where });

    // Get templates
    const templates = await prisma.aITemplate.findMany({
      where,
      orderBy: [
        { isPublic: 'desc' },
        { usageCount: 'desc' },
        { updatedAt: 'desc' },
      ],
      skip,
      take: limit,
    });

    console.log(`Found ${templates.length} templates out of ${total} total`);

    return {
      templates,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get single template by ID
   */
  async getById(userId: string, templateId: string) {
    const template = await prisma.aITemplate.findFirst({
      where: {
        id: templateId,
        OR: [
          { userId },
          { isPublic: true },
        ],
      },
    });

    if (!template) {
      throw new ApiErrorClass(
        'TEMPLATE_NOT_FOUND',
        'Template not found',
        404
      );
    }

    return template;
  }

  /**
   * Create new template
   */
  async create(userId: string, data: {
    name: string;
    description?: string;
    prompt: string;
    category?: string;
    icon?: string;
    noteType?: string;
    workspaceId?: string;
    isPublic?: boolean;
  }) {
    const template = await prisma.aITemplate.create({
      data: {
        name: data.name,
        description: data.description,
        prompt: data.prompt,
        category: data.category || 'General',
        icon: data.icon || 'auto_awesome',
        noteType: (data.noteType as any) || 'MARKDOWN',
        isPublic: data.isPublic || false,
        userId,
        workspaceId: data.workspaceId,
      },
    });

    return template;
  }

  /**
   * Update existing template
   */
  async update(userId: string, templateId: string, data: {
    name?: string;
    description?: string;
    prompt?: string;
    category?: string;
    icon?: string;
    noteType?: string;
    isPublic?: boolean;
    isActive?: boolean;
  }) {
    // Check ownership
    const existing = await prisma.aITemplate.findFirst({
      where: {
        id: templateId,
        userId,
      },
    });

    if (!existing) {
      throw new ApiErrorClass(
        'TEMPLATE_NOT_FOUND',
        'Template not found or you do not have permission',
        404
      );
    }

    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.prompt !== undefined) updateData.prompt = data.prompt;
    if (data.category !== undefined) updateData.category = data.category;
    if (data.icon !== undefined) updateData.icon = data.icon;
    if (data.noteType !== undefined) updateData.noteType = data.noteType;
    if (data.isPublic !== undefined) updateData.isPublic = data.isPublic;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    const template = await prisma.aITemplate.update({
      where: { id: templateId },
      data: updateData,
    });

    return template;
  }

  /**
   * Delete template
   */
  async delete(userId: string, templateId: string) {
    // Check ownership
    const existing = await prisma.aITemplate.findFirst({
      where: {
        id: templateId,
        userId,
      },
    });

    if (!existing) {
      throw new ApiErrorClass(
        'TEMPLATE_NOT_FOUND',
        'Template not found or you do not have permission',
        404
      );
    }

    await prisma.aITemplate.delete({
      where: { id: templateId },
    });

    return { success: true };
  }

  /**
   * Increment template usage count
   */
  async incrementUsage(templateId: string) {
    await prisma.aITemplate.update({
      where: { id: templateId },
      data: {
        usageCount: {
          increment: 1,
        },
      },
    });
  }

  /**
   * Import template from JSON
   */
  async importTemplate(userId: string, data: any, _workspaceId?: string) {
    const template = await prisma.aITemplate.create({
      data: {
        name: data.name || 'Imported Template',
        description: data.description,
        prompt: data.prompt,
        category: data.category || 'General',
        icon: data.icon || 'auto_awesome',
        isPublic: false, // Imported templates are private by default
        userId,
        workspaceId: data.workspaceId,
      },
    });

    return template;
  }

  /**
   * Get system templates (pre-defined)
   */
  async getSystemTemplates() {
    const templates = await prisma.aITemplate.findMany({
      where: {
        userId: null, // System templates have no userId
        isActive: true,
      },
      orderBy: {
        usageCount: 'desc',
      },
    });

    return templates;
  }
}

export const templateService = new TemplateService();
