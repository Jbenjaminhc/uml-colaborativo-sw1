"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const multer_1 = __importDefault(require("multer"));
const diagramController_1 = require("../controllers/diagramController");
const auth_1 = __importDefault(require("../middleware/auth"));
const utils_1 = require("../utils");
const diagram_model_1 = require("../models/diagram.model");
const importController_1 = require("../controllers/importController");
const router = express_1.default.Router();
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 },
});
/** POST import XMI diagram
 * @route POST /api/diagram/import/xmi
 * @access Private
 */
router.post('/import/xmi', auth_1.default, upload.single('file'), importController_1.importXmiDiagram);
/** POST import JSON diagram
 * @route POST /api/diagram/import/json
 * @access Private
 */
router.post('/import/json', auth_1.default, upload.single('file'), importController_1.importJsonDiagram);
/** GET all diagrams for a user
 * @route GET /api/diagram
 * @access Private
 * @returns {object} 200 - list of Diagram object
 */
router.get('/', auth_1.default, async (req, res) => {
    try {
        const diagrams = await (0, diagramController_1.getDiagramsForUser)(req.userId);
        res.status(200).json(diagrams);
    }
    catch (e) {
        res.status(400).json({ message: (0, utils_1.getErrorMessage)(e) });
        console.log((0, utils_1.getErrorMessage)(e));
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
router.get('/:diagramId/contents', auth_1.default, async (req, res) => {
    try {
        const result = await (0, diagramController_1.getDiagramContents)(req.params.diagramId);
        res.status(200).json(result);
    }
    catch (e) {
        res.status(404).json({ message: (0, utils_1.getErrorMessage)(e) });
        console.log((0, utils_1.getErrorMessage)(e));
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
        const result = await (0, diagramController_1.getDiagramContentsPublic)(req.params.diagramId);
        res.status(200).json(result);
    }
    catch (e) {
        res.status(404).json({ message: (0, utils_1.getErrorMessage)(e) });
        console.log((0, utils_1.getErrorMessage)(e));
    }
});
/** Creates a diagram
 * @route POST /api/diagram
 * @access Public
 * @returns {object} 201 - Diagram object
 * @returns {Error}  400 - Could not create a diagram
 * @example response - 200 - Success message
 */
router.post('/', auth_1.default, async (req, res) => {
    try {
        const diagram = await (0, diagramController_1.createDiagram)(req.body.userId);
        res.status(201).json({ id: diagram._id });
    }
    catch (e) {
        res.status(400).json({ message: (0, utils_1.getErrorMessage)(e) });
        console.log((0, utils_1.getErrorMessage)(e));
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
router.put('/:diagramId/rename', auth_1.default, async (req, res) => {
    try {
        await (0, diagramController_1.renameDiagram)(req.params.diagramId, req.body.name);
        const diagram = await diagram_model_1.DiagramModel.findById(req.params.diagramId);
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
    }
    catch (e) {
        res.status(404).json({ message: (0, utils_1.getErrorMessage)(e) });
        console.log((0, utils_1.getErrorMessage)(e));
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
router.get('/:diagramId/privacy', auth_1.default, async (req, res) => {
    try {
        const result = await (0, diagramController_1.getDiagramPrivacy)(req.params.diagramId);
        res.status(200).json({ isPublic: result });
    }
    catch (e) {
        res.status(404).json({ message: (0, utils_1.getErrorMessage)(e) });
        console.log((0, utils_1.getErrorMessage)(e));
    }
});
/**
 * sets the privacy of a diagram to public or private
 * @route PUT /api/diagram/:diagramId/privacy
 * @access Private
 */
router.put('/:diagramId/privacy', auth_1.default, async (req, res) => {
    try {
        await (0, diagramController_1.setDiagramPrivacy)(req.params.diagramId, req.body.isPublic);
        res.status(200).json({ message: 'OK' });
    }
    catch (e) {
        res.status(404).json({ message: (0, utils_1.getErrorMessage)(e) });
        console.log((0, utils_1.getErrorMessage)(e));
    }
});
router.delete('/:diagramId', auth_1.default, async (req, res) => {
    try {
        await (0, diagramController_1.deleteDiagram)(req.params.diagramId);
        res.status(200).json({ message: 'OK' });
    }
    catch (e) {
        res.status(404).json({ message: 'Could not delete diagram' });
        console.log((0, utils_1.getErrorMessage)(e));
    }
});
/**
 * Clears all entities and relationships from a diagram
 * @route DELETE /api/diagram/:id/clear
 * @access Private
 * @param {string} id - diagram id
 */
router.delete('/:id/clear', auth_1.default, async (req, res) => {
    const { id } = req.params;
    try {
        await (0, diagramController_1.clearDiagram)(id);
        res.status(200).json({ message: 'Diagram cleared successfully' });
    }
    catch (e) {
        res.status(404).json({ message: 'Could not clear diagram' });
        console.log((0, utils_1.getErrorMessage)(e));
    }
});
/**
 * Bulk updates positions of multiple entities
 * @route PUT /api/diagram/:id/positions
 * @access Private
 * @param {string} id - diagram id
 * @body { updates: { entityId: string, position: { x: number, y: number } }[] }
 */
router.put('/:id/positions', auth_1.default, async (req, res) => {
    const { id } = req.params;
    const { updates } = req.body;
    if (!updates || !Array.isArray(updates)) {
        return res.status(400).json({ message: 'Invalid updates array' });
    }
    try {
        await (0, diagramController_1.updateDiagramPositions)(id, updates);
        res.status(200).json({ message: 'Positions updated successfully' });
    }
    catch (e) {
        res.status(400).json({ message: 'Could not update positions' });
        console.log((0, utils_1.getErrorMessage)(e));
    }
});
exports.default = router;
//# sourceMappingURL=diagrams.js.map