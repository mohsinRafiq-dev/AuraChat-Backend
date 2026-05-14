import { Router } from 'express';
import * as conversationController from '../controllers/conversation.controller.js';
import { validateBody } from '../middleware/validate.js';
import { createConversationSchema } from '../validators/schemas.js';

const router = Router();

router.get('/', conversationController.list);
router.post('/', validateBody(createConversationSchema), conversationController.create);
router.delete('/:conversationId', conversationController.remove);
router.post('/:conversationId/archive', conversationController.archive);
router.delete('/:conversationId/archive', conversationController.unarchive);
router.patch('/:conversationId/disappearing', conversationController.setDisappearing);

export default router;
