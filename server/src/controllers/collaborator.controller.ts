import { Request, Response } from 'express';
import { DiagramModel } from '../models/diagram.model';
import { UserModel } from '../models/user.model';

export const addCollaborator = async (req: Request, res: Response) => {
  try {
    const { diagramId } = req.params;
    const { email, role } = req.body;

    // Find diagram and check ownership
    const diagram = await DiagramModel.findById(diagramId);
    if (!diagram) {
      return res.status(404).json({ message: 'Diagram not found' });
    }
    if (diagram.userId.toString() !== req.userId) {
      return res
        .status(403)
        .json({ message: 'Only owner can add collaborators' });
    }

    // Find user by email
    const user = await UserModel.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if user is already a collaborator or the owner
    if (user.id === req.userId) {
      return res
        .status(400)
        .json({ message: 'Owner cannot be added as a collaborator' });
    }

    const isCollaborator = diagram.collaborators?.some(
      (c) => c.userId.toString() === user.id
    );
    if (isCollaborator) {
      return res
        .status(400)
        .json({ message: 'User is already a collaborator' });
    }

    // Add collaborator
    const newCollaborator = {
      userId: user.id,
      role: role || 'editor',
      addedAt: new Date(),
    };

    if (!diagram.collaborators) {
      diagram.collaborators = [];
    }
    diagram.collaborators.push(newCollaborator);
    await diagram.save();

    const io = req.app.get('io');
    if (io) {
      io.to(`user:${user.id}`).emit('diagram:dashboard-updated');
    }

    return res.status(200).json({
      collaborator: {
        userId: user.id,
        email: user.email,
        username: user.username,
        role: newCollaborator.role,
        addedAt: newCollaborator.addedAt,
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const getCollaborators = async (req: Request, res: Response) => {
  try {
    const { diagramId } = req.params;
    const diagram = await DiagramModel.findById(diagramId).populate(
      'collaborators.userId',
      'username email'
    );

    if (!diagram) {
      return res.status(404).json({ message: 'Diagram not found' });
    }

    const isAuthorized =
      diagram.userId.toString() === req.userId ||
      diagram.collaborators?.some(
        (c) => c.userId._id.toString() === req.userId
      );

    if (!isAuthorized) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const collaborators =
      diagram.collaborators?.map((c) => ({
        userId: (c.userId as any)._id,
        username: (c.userId as any).username,
        email: (c.userId as any).email,
        role: c.role,
        addedAt: c.addedAt,
      })) || [];

    return res.status(200).json(collaborators);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const updateCollaboratorRole = async (req: Request, res: Response) => {
  try {
    const { diagramId, userId } = req.params;
    const { role } = req.body;

    const diagram = await DiagramModel.findById(diagramId);
    if (!diagram) {
      return res.status(404).json({ message: 'Diagram not found' });
    }
    if (diagram.userId.toString() !== req.userId) {
      return res.status(403).json({ message: 'Only owner can update roles' });
    }

    if (!diagram.collaborators) {
      return res.status(404).json({ message: 'Collaborator not found' });
    }

    const colIndex = diagram.collaborators.findIndex(
      (c) => c.userId.toString() === userId
    );
    if (colIndex === -1) {
      return res.status(404).json({ message: 'Collaborator not found' });
    }

    diagram.collaborators[colIndex].role = role;
    diagram.markModified('collaborators');
    await diagram.save();

    return res.status(200).json({ message: 'Role updated' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const removeCollaborator = async (req: Request, res: Response) => {
  try {
    const { diagramId, userId } = req.params;

    const diagram = await DiagramModel.findById(diagramId);
    if (!diagram) {
      return res.status(404).json({ message: 'Diagram not found' });
    }

    // Allow owner to remove anyone, or a collaborator to remove themselves
    if (diagram.userId.toString() !== req.userId && req.userId !== userId) {
      return res
        .status(403)
        .json({ message: 'Only owner can remove collaborators' });
    }

    if (!diagram.collaborators) {
      return res.status(404).json({ message: 'Collaborator not found' });
    }

    diagram.collaborators = diagram.collaborators.filter(
      (c) => c.userId.toString() !== userId
    );
    await diagram.save();

    const io = req.app.get('io');
    if (io) {
      io.to(`user:${userId}`).emit('diagram:dashboard-updated');
    }

    return res.status(200).json({ message: 'Collaborator removed' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};
