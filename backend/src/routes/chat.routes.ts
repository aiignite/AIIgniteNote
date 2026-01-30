import { Router } from 'express';
import { chatController } from '../controllers/chat.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/rooms', chatController.getMyRooms);
router.get('/rooms/:roomId/messages', chatController.getRoomMessages);
router.post('/rooms/direct', chatController.startDirectChat);

export default router;
