import { Response } from 'express';
import { searchService } from '../services/search.service';
import { AuthRequest } from '../types';
import { success, error } from '../utils/response';
import { z } from 'zod';

// Search query validation schema
const searchQuerySchema = z.object({
  query: z.string().min(1, 'Search query is required'),
  folderId: z.string().optional(),
  tagIds: z.array(z.string()).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  sortBy: z.enum(['relevance', 'createdAt', 'updatedAt', 'title']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
});

// Search suggestions validation schema
const suggestionsSchema = z.object({
  q: z.string().min(2, 'Query must be at least 2 characters'),
  limit: z.coerce.number().int().positive().max(20).optional(),
});

export class SearchController {
  /**
   * GET /api/search
   * Full-text search for notes
   */
  search = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.userId) {
        error(res, 'UNAUTHORIZED', 'Authentication required', 401);
        return;
      }

      // Validate query parameters
      const validationResult = searchQuerySchema.safeParse(req.query);
      if (!validationResult.success) {
        error(
          res,
          'VALIDATION_ERROR',
          validationResult.error.errors[0].message,
          400
        );
        return;
      }

      const {
        query,
        folderId,
        tagIds,
        startDate,
        endDate,
        sortBy,
        sortOrder,
        page,
        limit,
      } = validationResult.data;

      const result = await searchService.search({
        query,
        userId: req.userId,
        folderId,
        tagIds,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        sortBy,
        sortOrder,
        page: page || 1,
        limit: limit || 20,
      });

      success(res, result.notes, {
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          totalPages: result.totalPages,
        },
      });
    } catch (err) {
      if (err instanceof Error) {
        const apiErr = err as any;
        error(
          res,
          apiErr.code || 'SEARCH_FAILED',
          apiErr.message || 'Search failed',
          apiErr.statusCode || 500
        );
      } else {
        error(res, 'SEARCH_FAILED', 'Search failed', 500);
      }
    }
  };

  /**
   * GET /api/search/suggestions
   * Get search suggestions based on partial query
   */
  suggestions = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.userId) {
        error(res, 'UNAUTHORIZED', 'Authentication required', 401);
        return;
      }

      // Validate query parameters
      const validationResult = suggestionsSchema.safeParse(req.query);
      if (!validationResult.success) {
        error(
          res,
          'VALIDATION_ERROR',
          validationResult.error.errors[0].message,
          400
        );
        return;
      }

      const { q, limit = 5 } = validationResult.data;

      const suggestions = await searchService.getSearchSuggestions(
        req.userId,
        q,
        limit
      );

      success(res, { suggestions });
    } catch (err) {
      if (err instanceof Error) {
        const apiErr = err as any;
        error(
          res,
          apiErr.code || 'SUGGESTIONS_FAILED',
          apiErr.message || 'Failed to get suggestions',
          apiErr.statusCode || 500
        );
      } else {
        error(res, 'SUGGESTIONS_FAILED', 'Failed to get suggestions', 500);
      }
    }
  };

  /**
   * GET /api/search/recent
   * Get recent searches for user
   */
  recent = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.userId) {
        error(res, 'UNAUTHORIZED', 'Authentication required', 401);
        return;
      }

      const limit = z.number().int().positive().max(20).default(10).safeParse(req.query.limit ? Number(req.query.limit) : undefined);

      if (limit.success) {
        const recent = await searchService.getRecentSearches(
          req.userId,
          limit.data
        );
        success(res, { recent });
      } else {
        const recent = await searchService.getRecentSearches(req.userId);
        success(res, { recent });
      }
    } catch (err) {
      if (err instanceof Error) {
        const apiErr = err as any;
        error(
          res,
          apiErr.code || 'RECENT_SEARCHES_FAILED',
          apiErr.message || 'Failed to get recent searches',
          apiErr.statusCode || 500
        );
      } else {
        error(res, 'RECENT_SEARCHES_FAILED', 'Failed to get recent searches', 500);
      }
    }
  };
}

export const searchController = new SearchController();
