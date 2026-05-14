import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import authRoutes from './auth.routes.js';
import conversationRoutes from './conversation.routes.js';
import messageRoutes from './message.routes.js';
import groupRoutes from './group.routes.js';
import userRoutes from './user.routes.js';
import statusRoutes from './status.routes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/conversations', authenticate, conversationRoutes);
router.use('/messages', authenticate, messageRoutes);
router.use('/groups', authenticate, groupRoutes);
router.use('/users', authenticate, userRoutes);
router.use('/statuses', authenticate, statusRoutes);

export default router;
