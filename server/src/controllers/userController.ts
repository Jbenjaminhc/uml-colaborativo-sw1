import bcrypt from 'bcrypt';
import { Request, Response } from 'express';
import { UserModel } from '../models/user.model';
import { DiagramModel } from '../models/diagram.model';
import { getErrorMessage } from '../utils';

/**
 * Gets the profile of the currently logged in user
 */
export const getUserProfile = async (req: Request, res: Response) => {
  try {
    const { userId } = req as any;
    const user = await UserModel.findById(userId).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: getErrorMessage(error) });
  }
};

/**
 * Updates the user's profile (username and/or email)
 */
export const updateUserProfile = async (req: Request, res: Response) => {
  try {
    const { userId } = req as any;
    const { username, email } = req.body;

    const user = await UserModel.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (username && username !== user.username) {
      const duplicateUsername = await UserModel.findOne({ username });
      if (duplicateUsername) {
        return res.status(400).json({ message: 'Username is already taken' });
      }
      user.username = username;
    }

    if (email && email !== user.email) {
      const duplicateEmail = await UserModel.findOne({ email });
      if (duplicateEmail) {
        return res.status(400).json({ message: 'Email is already taken' });
      }
      user.email = email;
    }

    await user.save();
    res.status(200).json({
      userId: user._id,
      username: user.username,
      email: user.email,
    });
  } catch (error) {
    res.status(500).json({ message: getErrorMessage(error) });
  }
};

/**
 * Changes the user's password
 */
export const changeUserPassword = async (req: Request, res: Response) => {
  try {
    const { userId } = req as any;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res
        .status(400)
        .json({ message: 'Please provide both current and new passwords' });
    }

    const user = await UserModel.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Incorrect current password' });
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedNewPassword;
    await user.save();

    res.status(200).json({ message: 'Password updated successfully' });
  } catch (error) {
    res.status(500).json({ message: getErrorMessage(error) });
  }
};

/**
 * Deletes the user profile and all their diagrams
 */
export const deleteUserProfile = async (req: Request, res: Response) => {
  try {
    const { userId } = req as any;

    const user = await UserModel.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Delete all diagrams owned by this user
    await DiagramModel.deleteMany({ userId });

    // Remove user from collaborators in other diagrams if needed (optional cleanup)
    // await DiagramModel.updateMany(
    //   { 'collaborators.userId': userId },
    //   { $pull: { collaborators: { userId } } }
    // );

    await user.deleteOne();
    res
      .status(200)
      .json({ message: 'User account and associated diagrams deleted' });
  } catch (error) {
    res.status(500).json({ message: getErrorMessage(error) });
  }
};
