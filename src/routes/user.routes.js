import { Router } from 'express';
import * as userController from '../controllers/user.controller.js';

const router = Router();

router.get('/search', userController.searchUsers);
router.get('/blocked', userController.getBlockedUsers);
router.get('/:id', userController.getUserProfile);
router.post('/:id/block', userController.blockUser);
router.delete('/:id/block', userController.unblockUser);

export default router;
