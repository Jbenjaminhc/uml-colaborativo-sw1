/* eslint-disable */
import { Request, Response } from 'express';
import { DiagramModel } from '../models/diagram.model';
import { getErrorMessage } from '../utils';
import { parseXmiToDiagram } from '../import/xmiParser';
import { EntityModel } from '../models/entity.model';
import { RelationshipModel } from '../models/relationship.model';

export const importXmiDiagram = async (req: Request, res: Response) => {
  try {
    const { userId } = req;
    if (!userId) {
      return res.status(401).json({ message: 'No autenticado.' });
    }

    if (!req.file) {
      return res
        .status(400)
        .json({ message: 'Debes seleccionar un archivo XMI.' });
    }

    // Límite de seguridad 10MB
    if (req.file.size > 10 * 1024 * 1024) {
      return res
        .status(400)
        .json({ message: 'El archivo XMI supera el límite de 10 MB.' });
    }

    const xmlContent = req.file.buffer.toString('utf-8');
    const baseName = req.file.originalname.replace(/\.(xmi|xml)$/i, '');

    // Parsear
    const { entities, relationships } = await parseXmiToDiagram(xmlContent);

    let savedDiagram;
    if (req.body.diagramId) {
      // Usar diagrama existente
      savedDiagram = await DiagramModel.findById(req.body.diagramId);
      if (
        !savedDiagram ||
        (savedDiagram.userId !== userId &&
          !savedDiagram.collaborators?.find((c: any) => c.userId === userId))
      ) {
        return res.status(403).json({
          message: 'No tienes permiso para sobreescribir este diagrama.',
        });
      }
      savedDiagram.name = `Importado: ${baseName}`;
      await savedDiagram.save();

      // Limpiar lienzo anterior
      await EntityModel.deleteMany({ diagramId: savedDiagram._id });
      await RelationshipModel.deleteMany({ diagramId: savedDiagram._id });
    } else {
      // Crear Diagrama base nuevo
      const newDiagram = new DiagramModel({
        name: `Importado: ${baseName}`,
        userId,
        collaborators: [],
      });
      savedDiagram = await newDiagram.save();
    }

    // Map para remapear IDs temporales del parser a ObjectIds reales
    const idMap = new Map<string, string>();

    // Guardar Entidades
    for (const ent of entities) {
      const tempId = ent.id;
      delete ent.id;
      ent.diagramId = savedDiagram._id;

      const newEntity = new EntityModel(ent);
      const saved = await newEntity.save();
      idMap.set(tempId, saved._id.toString());
    }

    // Guardar Relaciones
    for (const rel of relationships) {
      delete rel.id;
      rel.diagramId = savedDiagram._id;
      // Remapear origen y destino
      if (idMap.has(rel.source)) rel.source = idMap.get(rel.source);
      if (idMap.has(rel.target)) rel.target = idMap.get(rel.target);

      const newRel = new RelationshipModel(rel);
      await newRel.save();
    }

    const io = req.app.get('io');
    if (io && req.body.diagramId) {
      io.to(req.body.diagramId).emit('diagram:imported');
    }

    res.status(201).json({ diagramId: savedDiagram._id });
  } catch (error) {
    console.error('Error importing XMI:', error);
    res.status(400).json({ message: getErrorMessage(error) });
  }
};

export const importJsonDiagram = async (req: Request, res: Response) => {
  try {
    const { userId } = req;
    if (!userId) {
      return res.status(401).json({ message: 'No autenticado.' });
    }

    if (!req.file) {
      return res
        .status(400)
        .json({ message: 'Debes seleccionar un archivo JSON.' });
    }

    if (req.file.size > 10 * 1024 * 1024) {
      return res
        .status(400)
        .json({ message: 'El archivo JSON supera el límite de 10 MB.' });
    }

    const jsonContent = req.file.buffer.toString('utf-8');
    const parsedData = JSON.parse(jsonContent);
    const baseName = req.file.originalname.replace(/\.json$/i, '');

    const entities = parsedData.entities || [];
    const relationships = parsedData.relationships || [];

    let savedDiagram;
    if (req.body.diagramId) {
      savedDiagram = await DiagramModel.findById(req.body.diagramId);
      if (
        !savedDiagram ||
        (savedDiagram.userId !== userId &&
          !savedDiagram.collaborators?.find((c: any) => c.userId === userId))
      ) {
        return res.status(403).json({
          message: 'No tienes permiso para sobreescribir este diagrama.',
        });
      }
      savedDiagram.name = `Importado: ${baseName}`;
      await savedDiagram.save();

      await EntityModel.deleteMany({ diagramId: savedDiagram._id });
      await RelationshipModel.deleteMany({ diagramId: savedDiagram._id });
    } else {
      const newDiagram = new DiagramModel({
        name: `Importado: ${baseName}`,
        userId,
        collaborators: [],
      });
      savedDiagram = await newDiagram.save();
    }

    const idMap = new Map<string, string>();

    for (const ent of entities) {
      const tempId = ent.id;
      delete ent.id;
      delete ent._id;
      ent.diagramId = savedDiagram._id;

      const newEntity = new EntityModel(ent);
      const saved = await newEntity.save();
      if (tempId) {
        idMap.set(tempId.toString(), saved._id.toString());
      }
    }

    for (const rel of relationships) {
      delete rel.id;
      delete rel._id;
      rel.diagramId = savedDiagram._id;

      if (rel.source && idMap.has(rel.source.toString())) {
        rel.source = idMap.get(rel.source.toString());
      }
      if (rel.target && idMap.has(rel.target.toString())) {
        rel.target = idMap.get(rel.target.toString());
      }

      const newRel = new RelationshipModel(rel);
      await newRel.save();
    }

    const io = req.app.get('io');
    if (io && req.body.diagramId) {
      io.to(req.body.diagramId).emit('diagram:imported');
    }

    res.status(201).json({ diagramId: savedDiagram._id });
  } catch (error) {
    console.error('Error importing JSON:', error);
    res.status(400).json({ message: getErrorMessage(error) });
  }
};
