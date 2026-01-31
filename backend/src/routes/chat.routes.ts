import { Router } from 'express';
import { chatController } from '../controllers/chat.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/users', chatController.listUsers);
router.get('/rooms', chatController.getMyRooms);
router.get('/rooms/:roomId/messages', chatController.getRoomMessages);
router.post('/rooms/direct', chatController.startDirectChat);
router.post('/rooms/group', chatController.createGroupChat);
router.patch('/rooms/:roomId', chatController.updateGroupName);
router.post('/rooms/:roomId/members', chatController.addGroupMembers);
router.delete('/rooms/:roomId/members/:memberId', chatController.removeGroupMember);
router.patch('/rooms/:roomId/members/:memberId', chatController.updateMemberRole);
router.post('/rooms/:roomId/leave', chatController.leaveRoom);
router.delete('/messages/:messageId', chatController.deleteMessage);
router.patch('/messages/:messageId', chatController.updateMessage);
router.post('/rooms/:roomId/announcement', chatController.postAnnouncement);
router.get('/rooms/:roomId/pinned', chatController.getPinnedMessage);
router.post('/rooms/:roomId/pin/:messageId', chatController.pinMessage);
router.post('/rooms/:roomId/unpin', chatController.unpinMessage);
router.post('/rooms/:roomId/read', chatController.markRoomRead);
router.get('/rooms/:roomId/files', chatController.getRoomFiles);
router.post('/rooms/:roomId/files/purge', chatController.purgeRoomFiles);
router.post('/rooms/:roomId/system/purge', chatController.purgeSystemMessages);
router.post('/upload', chatController.uploadFile);

export default router;
