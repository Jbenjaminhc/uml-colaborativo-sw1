"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.withAuthSimple = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const diagram_model_1 = require("../models/diagram.model");
const user_model_1 = require("../models/user.model");
const withAuthSimple = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token)
            throw new Error('No token provided');
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        if (decoded.userId === undefined) {
            console.log('Decoded user id is undefined');
            throw new Error();
        }
        if (decoded.type !== 'auth') {
            console.log('Token type is not auth');
            throw new Error();
        }
        const user = await user_model_1.UserModel.findById(decoded.userId);
        if (!user || user.verified === false) {
            throw new Error();
        }
        req.userId = decoded.userId;
        next();
    }
    catch (e) {
        res.status(401).json({ message: 'Unauthorized' });
        console.log(e);
    }
};
exports.withAuthSimple = withAuthSimple;
const withAuth = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token)
            throw new Error('No token provided');
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        if (decoded.userId === undefined) {
            console.log('Decoded user id is undefined');
            throw new Error();
        }
        if (decoded.type !== 'auth') {
            console.log('Token type is not auth');
            throw new Error();
        }
        const user = await user_model_1.UserModel.findById(decoded.userId);
        if (!user || user.verified === false) {
            throw new Error();
        }
        req.userId = decoded.userId;
        const targetDiagramId = req.query.diagramId || req.params.diagramId;
        if (targetDiagramId) {
            let diagram;
            if (req.method === 'GET') {
                diagram = await diagram_model_1.DiagramModel.findOne({
                    _id: targetDiagramId,
                    $or: [{ userId: req.userId }, { 'collaborators.userId': req.userId }],
                });
            }
            else {
                diagram = await diagram_model_1.DiagramModel.findOne({
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
            req.diagram = diagram;
        }
        next();
    }
    catch (e) {
        res.status(401).json({ message: 'Unauthorized' });
        console.log(e);
    }
};
exports.default = withAuth;
//# sourceMappingURL=auth.js.map