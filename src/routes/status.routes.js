import { Router } from 'express';
import * as statusController from '../controllers/status.controller.js';

const router = Router();

router.post('/', statusController.createStatus);
router.get('/', statusController.getStatuses);
router.post('/:id/view', statusController.viewStatus);
router.delete('/:id', statusController.deleteStatus);

export default router;
