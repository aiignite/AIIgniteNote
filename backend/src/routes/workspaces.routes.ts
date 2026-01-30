import { Router } from 'express';
import { workspacesController } from '../controllers/workspaces.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

/**
 * @route   GET /api/workspaces
 * @desc    Get all workspaces for user
 * @access  Private
 */
router.get('/', authenticate, workspacesController.getAll);

/**
 * @route   GET /api/workspaces/:id
 * @desc    Get workspace by ID
 * @access  Private
 */
router.get('/:id', authenticate, workspacesController.getById);

/**
 * @route   GET /api/workspaces/:id/stats
 * @desc    Get workspace statistics
 * @access  Private
 */
router.get('/:id/stats', authenticate, workspacesController.getStats);

/**
 * @route   POST /api/workspaces
 * @desc    Create new workspace
 * @access  Private
 * @body    { name: string, description?: string }
 */
router.post('/', authenticate, workspacesController.create);

/**
 * @route   PUT /api/workspaces/:id
 * @desc    Update workspace
 * @access  Private (Owner/Admin only)
 * @body    { name?: string, description?: string }
 */
router.put('/:id', authenticate, workspacesController.update);

/**
 * @route   DELETE /api/workspaces/:id
 * @desc    Delete workspace
 * @access  Private (Owner only)
 */
router.delete('/:id', authenticate, workspacesController.delete);

/**
 * @route   POST /api/workspaces/:id/members
 * @desc    Add member to workspace
 * @access  Private (Owner/Admin only)
 * @body    { email: string, role: WorkspaceRole }
 */
router.post('/:id/members', authenticate, workspacesController.addMember);

/**
 * @route   PUT /api/workspaces/:id/members/:memberId
 * @desc    Update member role
 * @access  Private (Owner only)
 * @body    { role: WorkspaceRole }
 */
router.put('/:id/members/:memberId', authenticate, workspacesController.updateMemberRole);

/**
 * @route   DELETE /api/workspaces/:id/members/:memberId
 * @desc    Remove member from workspace
 * @access  Private (Owner/Admin only)
 */
router.delete('/:id/members/:memberId', authenticate, workspacesController.removeMember);

/**
 * @route   POST /api/workspaces/:id/leave
 * @desc    Leave workspace
 * @access  Private
 */
router.post('/:id/leave', authenticate, workspacesController.leaveWorkspace);

export default router;
