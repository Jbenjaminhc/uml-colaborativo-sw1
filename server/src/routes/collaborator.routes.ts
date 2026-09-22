import { Router } from 'express';
import {
  addCollaborator,
  getCollaborators,
  removeCollaborator,
  updateCollaboratorRole,
} from '../controllers/collaborator.controller';
import { withAuthSimple } from '../middleware/auth';

const router = Router({ mergeParams: true });

router.post('/', withAuthSimple, addCollaborator);
router.get('/', withAuthSimple, getCollaborators);
router.put('/:userId', withAuthSimple, updateCollaboratorRole);
router.delete('/:userId', withAuthSimple, removeCollaborator);

export default router;
