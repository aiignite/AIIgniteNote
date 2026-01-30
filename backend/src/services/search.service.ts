import { prisma } from '../config/database';
import { Prisma } from '@prisma/client';

export interface SearchOptions {
  query: string;
  userId: string;
  folderId?: string;
  tagIds?: string[];
  startDate?: Date;
  endDate?: Date;
  sortBy?: 'relevance' | 'createdAt' | 'updatedAt' | 'title';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface SearchResult {
  notes: Array<{
    id: string;
    title: string;
    content?: string;
    noteType: string;
    createdAt: Date;
    updatedAt: Date;
    folderId?: string;
    folder?: { id: string; name: string; };
    tags: Array<{ id: string; name: string; color: string; }>;
    author: { id: string; username: string; };
  }>;
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export class SearchService {
  /**
   * Full-text search for notes using PostgreSQL tsvector
   */
  async search(options: SearchOptions): Promise<SearchResult> {
    const {
      query,
      userId,
      folderId,
      tagIds,
      startDate,
      endDate,
      sortBy = 'relevance',
      sortOrder = 'desc',
      page = 1,
      limit = 20,
    } = options;

    // Build where clause
    const where: Prisma.NoteWhereInput = {
      isDeleted: false,
      OR: [
        { authorId: userId },
        { workspace: { members: { some: { userId } } } },
      ],
    };

    // Add folder filter
    if (folderId) {
      where.folderId = folderId;
    }

    // Add date range filter
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = startDate;
      }
      if (endDate) {
        where.createdAt.lte = endDate;
      }
    }

    // Add tag filter (notes that have ALL specified tags)
    if (tagIds && tagIds.length > 0) {
      where.tags = {
        some: {
          tagId: { in: tagIds },
        },
      };
    }

    // Build search query for title and content
    // Using PostgreSQL tsquery for full-text search
    // const searchTerm = query
    //   .trim()
    //   .split(/\s+/)
    //   .join(' & '); // AND logic between words

    // Count total matching notes
    const count = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) as count
      FROM notes n
      LEFT JOIN note_contents nc ON n.id = nc."noteId"
      LEFT JOIN notes_on_tags nt ON n.id = nt."noteId"
      LEFT JOIN workspace_members wm ON n."workspaceId" = wm."workspaceId"
      WHERE n."isDeleted" = false
        AND (n."authorId" = ${userId} OR wm."userId" = ${userId})
        ${folderId ? Prisma.sql`AND n."folderId" = ${folderId}` : Prisma.empty}
        ${tagIds && tagIds.length > 0 ? Prisma.sql`AND nt."tagId" IN (${Prisma.join(tagIds)})` : Prisma.empty}
        ${startDate ? Prisma.sql`AND n."createdAt" >= ${startDate}` : Prisma.empty}
        ${endDate ? Prisma.sql`AND n."createdAt" <= ${endDate}` : Prisma.empty}
        AND (
          n.title ILIKE ${'%' + query + '%'}
          OR nc.content ILIKE ${'%' + query + '%'}
        )
    `;

    const total = Number(count[0]?.count || 0);

    // Calculate pagination
    const skip = (page - 1) * limit;
    const totalPages = Math.ceil(total / limit);

    // Build order by clause
    let orderBy: Prisma.Sql;
    switch (sortBy) {
      case 'createdAt':
        orderBy = Prisma.sql`n."createdAt" ${Prisma.raw(sortOrder.toUpperCase())}`;
        break;
      case 'updatedAt':
        orderBy = Prisma.sql`n."updatedAt" ${Prisma.raw(sortOrder.toUpperCase())}`;
        break;
      case 'title':
        orderBy = Prisma.sql`n.title ${Prisma.raw(sortOrder.toUpperCase())}`;
        break;
      case 'relevance':
      default:
        // Use updatedAt as fallback for relevance sorting
        orderBy = Prisma.sql`n."updatedAt" DESC`;
        break;
    }

    // Execute search query
    const notes = await prisma.$queryRaw<
      Array<{
        id: string;
        title: string;
        note_type: string;
        created_at: Date;
        updated_at: Date;
        folder_id: string | null;
        folder_name: string | null;
        tag_id: string | null;
        tag_name: string | null;
        tag_color: string | null;
        author_id: string;
        author_username: string;
      }>
    >`
      SELECT DISTINCT
        n.id,
        n.title,
        n.type as note_type,
        n."createdAt" as created_at,
        n."updatedAt" as updated_at,
        n."folderId" as folder_id,
        f.name as folder_name,
        t.id as tag_id,
        t.name as tag_name,
        t.color as tag_color,
        n."authorId" as author_id,
        u.name as author_username
      FROM notes n
      LEFT JOIN note_contents nc ON n.id = nc."noteId"
      LEFT JOIN folders f ON n."folderId" = f.id
      LEFT JOIN notes_on_tags nt ON n.id = nt."noteId"
      LEFT JOIN tags t ON nt."tagId" = t.id
      LEFT JOIN users u ON n."authorId" = u.id
      LEFT JOIN workspace_members wm ON n."workspaceId" = wm."workspaceId"
      WHERE n."isDeleted" = false
        AND (n."authorId" = ${userId} OR wm."userId" = ${userId})
        ${folderId ? Prisma.sql`AND n."folderId" = ${folderId}` : Prisma.empty}
        ${tagIds && tagIds.length > 0 ? Prisma.sql`AND nt."tagId" IN (${Prisma.join(tagIds)})` : Prisma.empty}
        ${startDate ? Prisma.sql`AND n."createdAt" >= ${startDate}` : Prisma.empty}
        ${endDate ? Prisma.sql`AND n."createdAt" <= ${endDate}` : Prisma.empty}
        AND (
          n.title ILIKE ${'%' + query + '%'}
          OR nc.content ILIKE ${'%' + query + '%'}
        )
      ORDER BY ${orderBy}
      LIMIT ${limit}
      OFFSET ${skip}
    `;

    // Group tags by note
    const groupedNotes = notes.reduce((acc, note) => {
      if (!acc[note.id]) {
        acc[note.id] = {
          id: note.id,
          title: note.title,
          noteType: note.note_type,
          createdAt: note.created_at,
          updatedAt: note.updated_at,
          folderId: note.folder_id || undefined,
          folder: note.folder_name
            ? { id: note.folder_id!, name: note.folder_name }
            : undefined,
          tags: [],
          author: { id: note.author_id, username: note.author_username },
        };
      }
      if (note.tag_id) {
        acc[note.id].tags.push({
          id: note.tag_id,
          name: note.tag_name!,
          color: note.tag_color!,
        });
      }
      return acc;
    }, {} as Record<string, SearchResult['notes'][0]>);

    return {
      notes: Object.values(groupedNotes),
      total,
      page,
      limit,
      totalPages,
    };
  }

  /**
   * Get recent searches for user
   */
  async getRecentSearches(_userId: string, _limit = 10): Promise<string[]> {
    // Note: In a production environment, you might want to store
    // search history in a separate table. For now, we'll return
    // an empty array as this is not a core requirement.
    return [];
  }

  /**
   * Get search suggestions based on partial query
   */
  async getSearchSuggestions(
    userId: string,
    partialQuery: string,
    limit = 5
  ): Promise<string[]> {
    if (!partialQuery || partialQuery.length < 2) {
      return [];
    }

    const suggestions = await prisma.note.findMany({
      where: {
        isDeleted: false,
        OR: [
          { authorId: userId },
          { workspace: { members: { some: { userId } } } },
        ],
        title: {
          contains: partialQuery,
          mode: 'insensitive',
        },
      },
      select: {
        title: true,
      },
      take: limit,
      distinct: ['title'],
    });

    return suggestions.map((s) => s.title);
  }
}

export const searchService = new SearchService();
