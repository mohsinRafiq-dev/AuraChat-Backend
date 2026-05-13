import { Router } from 'express';
import * as groupController from '../controllers/group.controller.js';

const router = Router();

router.post('/', groupController.createGroup);
router.patch('/:id', groupController.updateGroup);
router.post('/:id/members', groupController.addMember);
router.delete('/:id/members/:userId', groupController.removeMember);
router.post('/:id/leave', groupController.leaveGroup);
router.patch('/:id/admins/:userId', groupController.changeAdmin);

export default router;
