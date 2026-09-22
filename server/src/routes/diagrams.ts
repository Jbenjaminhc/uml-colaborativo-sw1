import express from 'express';
import multer from 'multer';
import {
  clearDiagram,
  updateDiagramPositions,
  createDiagram,
  deleteDiagram,
  getDiagramContents,
  getDiagramContentsPublic,
  getDiagramPrivacy,
  getDiagramsForUser,
  renameDiagram,
  setDiagramPrivacy,
} from '../controllers/diagramController';
import withAuth from '../middleware/auth';
import { getErrorMessage } from '../utils';

import { DiagramModel } from '../models/diagram.model';
import {
  importXmiDiagram,
  importJsonDiagram,
} from '../controllers/importController';

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

/** POST import XMI diagram
 * @route POST /api/diagram/import/xmi
 * @access Private
 */
router.post('/import/xmi', withAuth, upload.single('file'), importXmiDiagram);

/** POST import JSON diagram
 * @route POST /api/diagram/import/json
 * @access Private
 */
router.post('/import/json', withAuth, upload.single('file'), importJsonDiagram);

/** GET all diagrams for a user
 * @route GET /api/diagram
 * @access Private
 * @returns {object} 200 - list of Diagram object
 */
router.get('/', withAuth, async (req, res) => {
  try {
    const diagrams = await getDiagramsForUser(req.userId);
    res.status(200).json(diagrams);
  } catch (e) {
    res.status(400).json({ message: getErrorMessage(e) });
    console.log(getErrorMessage(e));
  }
});

/** GET diagram contents by id.
 * @route GET /api/diagram/:diagramId/contents
 * @access Private
 * @returns {object} 200 - Diagram contents object
 * @returns {Error}  404 - Diagram not found
 * @returns {Error}  404 - Invalid Diagram id
 * @example response - 200 - Diagram contents object
 * {
 *  "diagramId": "1000",
 *  "entities": [],
 * "relationships": []
 */
router.get('/:diagramId/contents', withAuth, async (req, res) => {
  try {
    const result = await getDiagramContents(req.params.diagramId);
    res.status(200).json(result);
  } catch (e) {
    res.status(404).json({ message: getErrorMessage(e) });
    console.log(getErrorMessage(e));
  }
});

/** GET diagram contents by id.
 * @route GET /api/diagram/:diagramId/public/contents
 * @access Public
 * @returns {object} 200 - Diagram contents object
 * @returns {Error}  404 - Diagram not found
 * @returns {Error}  404 - Invalid Diagram id
 * @returns {Error}  404 - Diagram is private
 */
router.get('/:diagramId/public/contents', async (req, res) => {
  try {
    const result = await getDiagramContentsPublic(req.params.diagramId);
    res.status(200).json(result);
  } catch (e) {
    res.status(404).json({ message: getErrorMessage(e) });
    console.log(getErrorMessage(e));
  }
});

/** Creates a diagram
 * @route POST /api/diagram
 * @access Public
 * @returns {object} 201 - Diagram object
 * @returns {Error}  400 - Could not create a diagram
 * @example response - 200 - Success message
 */
router.post('/', withAuth, async (req, res) => {
  try {
    const diagram = await createDiagram(req.body.userId);
    res.status(201).json({ id: diagram._id });
  } catch (e) {
    res.status(400).json({ message: getErrorMessage(e) });
    console.log(getErrorMessage(e));
  }
});

/**
 * Renames a diagram
 * @route POST /api/diagram/:diagramId/rename
 * @access Private
 * @returns {object} 200 - Success message
 * @returns {Error}  404 - Diagram not found
 * @returns {Error}  404 - Invalid name
 */
router.put('/:diagramId/rename', withAuth, async (req, res) => {
  try {
    await renameDiagram(req.params.diagramId, req.body.name);
    const diagram = await DiagramModel.findById(req.params.diagramId);
    if (diagram) {
      const io = req.app.get('io');
      if (io) {
        io.to(`user:${diagram.userId}`).emit('diagram:dashboard-updated');
        diagram.collaborators?.forEach((c) => {
          io.to(`user:${c.userId}`).emit('diagram:dashboard-updated');
        });
      }
    }
    res.status(200).json({ message: 'OK' });
  } catch (e) {
    res.status(404).json({ message: getErrorMessage(e) });
    console.log(getErrorMessage(e));
  }
});

/**
 * Retrieves the privacy of a diagram
 * @route GET /api/diagram/:diagramId/privacy
 * @access Private
 * @returns {object} 200 - True if public, false if private
 * @returns {Error}  404 - Diagram not found
 * @returns {Error}  404 - Invalid Diagram id
 */
router.get('/:diagramId/privacy', withAuth, async (req, res) => {
  try {
    const result = await getDiagramPrivacy(req.params.diagramId);
    res.status(200).json({ isPublic: result });
  } catch (e) {
    res.status(404).json({ message: getErrorMessage(e) });
    console.log(getErrorMessage(e));
  }
});

/**
 * sets the privacy of a diagram to public or private
 * @route PUT /api/diagram/:diagramId/privacy
 * @access Private
 */
router.put('/:diagramId/privacy', withAuth, async (req, res) => {
  try {
    await setDiagramPrivacy(req.params.diagramId, req.body.isPublic);
    res.status(200).json({ message: 'OK' });
  } catch (e) {
    res.status(404).json({ message: getErrorMessage(e) });
    console.log(getErrorMessage(e));
  }
});

router.delete('/:diagramId', withAuth, async (req, res) => {
  try {
    await deleteDiagram(req.params.diagramId);
    res.status(200).json({ message: 'OK' });
  } catch (e) {
    res.status(404).json({ message: 'Could not delete diagram' });
    console.log(getErrorMessage(e));
  }
});

/**
 * Clears all entities and relationships from a diagram
 * @route DELETE /api/diagram/:id/clear
 * @access Private
 * @param {string} id - diagram id
 */
router.delete('/:id/clear', withAuth, async (req, res) => {
  const { id } = req.params;
  try {
    await clearDiagram(id);
    res.status(200).json({ message: 'Diagram cleared successfully' });
  } catch (e) {
    res.status(404).json({ message: 'Could not clear diagram' });
    console.log(getErrorMessage(e));
  }
});

/**
 * Bulk updates positions of multiple entities
 * @route PUT /api/diagram/:id/positions
 * @access Private
 * @param {string} id - diagram id
 * @body { updates: { entityId: string, position: { x: number, y: number } }[] }
 */
router.put('/:id/positions', withAuth, async (req, res) => {
  const { id } = req.params;
  const { updates } = req.body;
  if (!updates || !Array.isArray(updates)) {
    return res.status(400).json({ message: 'Invalid updates array' });
  }

  try {
    await updateDiagramPositions(id, updates);
    res.status(200).json({ message: 'Positions updated successfully' });
  } catch (e) {
    res.status(400).json({ message: 'Could not update positions' });
    console.log(getErrorMessage(e));
  }
});

export default router;
