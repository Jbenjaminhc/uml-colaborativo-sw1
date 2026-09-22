import { RequestHandler } from 'express';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { DiagramModel } from '../models/diagram.model';
import { UserModel } from '../models/user.model';

export const withAuthSimple: RequestHandler = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) throw new Error('No token provided');

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET as string
    ) as JwtPayload;
    if (decoded.userId === undefined) {
      console.log('Decoded user id is undefined');
      throw new Error();
    }
    if (decoded.type !== 'auth') {
      console.log('Token type is not auth');
      throw new Error();
    }
    const user = await UserModel.findById(decoded.userId);
    if (!user || user.verified === false) {
      throw new Error();
    }
    req.userId = decoded.userId;
    next();
  } catch (e) {
    res.status(401).json({ message: 'Unauthorized' });
    console.log(e);
  }
};

const withAuth: RequestHandler = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) throw new Error('No token provided');

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET as string
    ) as JwtPayload;
    if (decoded.userId === undefined) {
      console.log('Decoded user id is undefined');
      throw new Error();
    }
    if (decoded.type !== 'auth') {
      console.log('Token type is not auth');
      throw new Error();
    }
    const user = await UserModel.findById(decoded.userId);
    if (!user || user.verified === false) {
      throw new Error();
    }
    req.userId = decoded.userId;

    const targetDiagramId = req.query.diagramId || req.params.diagramId;
    if (targetDiagramId) {
      let diagram;
      if (req.method === 'GET') {
        diagram = await DiagramModel.findOne({
          _id: targetDiagramId,
          $or: [{ userId: req.userId }, { 'collaborators.userId': req.userId }],
        });
      } else {
        diagram = await DiagramModel.findOne({
          _id: targetDiagramId,
          $or: [
            { userId: req.userId },
            {
              'collaborators.userId': req.userId,
              'collaborators.role': 'editor',
            },
          ],
        });
      }

      if (!diagram) {
        res.status(404).json({ message: 'Diagram not found' });
        return;
      }
      (req as any).diagram = diagram;
    }
    next();
  } catch (e) {
    res.status(401).json({ message: 'Unauthorized' });
    console.log(e);
  }
};

export default withAuth;
