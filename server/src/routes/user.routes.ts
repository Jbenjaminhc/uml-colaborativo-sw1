import express from 'express';
import {
  getUserProfile,
  updateUserProfile,
  changeUserPassword,
  deleteUserProfile,
} from '../controllers/userController';
import { withAuthSimple } from '../middleware/auth';

const router = express.Router();

// All user routes require authentication
router.use(withAuthSimple);

/**
 * Get current user profile
 * @route GET /api/user/profile
 */
router.get('/profile', getUserProfile);

/**
 * Update user profile
 * @route PUT /api/user/profile
 */
router.put('/profile', updateUserProfile);

/**
 * Change user password
 * @route PUT /api/user/password
 */
router.put('/password', changeUserPassword);

/**
 * Delete user profile
 * @route DELETE /api/user/profile
 */
router.delete('/profile', deleteUserProfile);

export default router;
