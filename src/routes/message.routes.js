import { Router } from 'express';
import * as messageController from '../controllers/message.controller.js';
import { validateQuery } from '../middleware/validate.js';
import { listMessagesQuerySchema } from '../validators/schemas.js';

const router = Router();

router.get('/starred', messageController.getStarredMessages);
router.get('/search', messageController.searchMessages);
router.get('/:conversationId', validateQuery(listMessagesQuerySchema), messageController.listByConversation);

router.patch('/:id', messageController.editMessage);
router.delete('/:id', messageController.deleteMessage);
router.post('/:id/react', messageController.reactToMessage);
router.post('/:id/pin', messageController.pinMessage);
router.delete('/:id/pin', messageController.unpinMessage);
router.post('/:id/star', messageController.starMessage);
router.delete('/:id/star', messageController.unstarMessage);

export default router;
