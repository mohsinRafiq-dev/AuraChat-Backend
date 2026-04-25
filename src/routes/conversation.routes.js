import { Router } from 'express';
import * as conversationController from '../controllers/conversation.controller.js';
import { validateBody } from '../middleware/validate.js';
import { createConversationSchema } from '../validators/schemas.js';

const router = Router();

router.get('/', conversationController.list);
router.post('/', validateBody(createConversationSchema), conversationController.create);
router.delete('/:conversationId', conversationController.remove);

export default router;
