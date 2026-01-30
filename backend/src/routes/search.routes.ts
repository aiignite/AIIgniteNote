import { Router } from 'express';
import { searchController } from '../controllers/search.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

/**
 * @route   GET /api/search
 * @desc    Full-text search for notes
 * @access  Private
 * @query   query - Search query string (required)
 * @query   folderId - Filter by folder ID
 * @query   tagIds - Filter by tag IDs (comma-separated)
 * @query   startDate - Filter by start date (ISO 8601)
 * @query   endDate - Filter by end date (ISO 8601)
 * @query   sortBy - Sort by field (relevance, createdAt, updatedAt, title)
 * @query   sortOrder - Sort order (asc, desc)
 * @query   page - Page number (default: 1)
 * @query   limit - Items per page (default: 20, max: 100)
 */
router.get('/', authenticate, searchController.search);

/**
 * @route   GET /api/search/suggestions
 * @desc    Get search suggestions based on partial query
 * @access  Private
 * @query   q - Partial search query (min 2 characters)
 * @query   limit - Number of suggestions (default: 5, max: 20)
 */
router.get('/suggestions', authenticate, searchController.suggestions);

/**
 * @route   GET /api/search/recent
 * @desc    Get recent searches for user
 * @access  Private
 * @query   limit - Number of recent searches (default: 10, max: 20)
 */
router.get('/recent', authenticate, searchController.recent);

export default router;
