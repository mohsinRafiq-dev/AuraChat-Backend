import { Router } from 'express';
import * as messageController from '../controllers/message.controller.js';
import { validateQuery } from '../middleware/validate.js';
import { listMessagesQuerySchema } from '../validators/schemas.js';

const router = Router();

router.get('/:conversationId', validateQuery(listMessagesQuerySchema), messageController.listByConversation);

export default router;
