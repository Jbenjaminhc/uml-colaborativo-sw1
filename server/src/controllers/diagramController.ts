import { isValidObjectId } from 'mongoose';
import { DiagramModel } from '../models/diagram.model';
import { EntityModel } from '../models/entity.model';
import { RelationshipModel } from '../models/relationship.model';
import { UserModel } from '../models/user.model';
import {
  reformatClass,
  reformatEnum,
  reformatInterface,
} from './entityServices';
import { reformatRelationship } from './relationshipService';

/** Get all diagrams for a userId
 * @param userId of the user to get diagrams for
 * @returns all diagrams for the user
 */
const getDiagramsForUser = async (userId: string) => {
  const diagrams = await DiagramModel.find({
    $or: [{ userId }, { 'collaborators.userId': userId }],
  });

  return diagrams.map((d) => {
    const isOwner = d.userId === userId;
    const collaborator = d.collaborators?.find(
      (c) => c.userId.toString() === userId
    );

    return {
      id: d._id,
      name: d.name,
      modified: d.updatedAt,
      isOwner,
      role: isOwner ? 'owner' : collaborator ? collaborator.role : 'viewer',
    };
  });
};

/**
 * Retrieves all entities and relationships of a diagram, and
 * returns them in a format that can be used by the client
 * @param id id of the diagram to retrieve
 * @returns the entities and relationships of the diagram
 */
const getDiagramContents = async (id: string) => {
  if (!isValidObjectId(id)) throw new Error('Diagram not found');
  const diagram = await DiagramModel.findById(id);
  if (!diagram) throw new Error('Diagram not found');

  const entities = await EntityModel.find({ diagramId: diagram._id });
  const classes = entities
    .filter((entity) => entity.type === 'class')
    .map((c) => reformatClass(c));
  const interfaces = entities
    .filter((entity) => entity.type === 'interface')
    .map((i) => reformatInterface(i));
  const enums = entities
    .filter((entity) => entity.type === 'enum')
    .map((e) => reformatEnum(e));

  const relationships = await RelationshipModel.find({
    diagramId: diagram._id,
  });

  return {
    diagramId: diagram.id,
    name: diagram.name,
    entities: [...classes, ...interfaces, ...enums],
    relationships: relationships.map((r) => reformatRelationship(r)),
  };
};

/**
 * Get the contents of a public diagram. Errors if diagram is private
 * @param id of diagram to get
 * @returns the entities and relationships of the diagram
 */
const getDiagramContentsPublic = async (id: string) => {
  const diagram = await DiagramModel.findById(id);
  if (!diagram) throw new Error('Diagram not found');
  if (!diagram.isPublic) throw new Error('Diagram is private');

  return getDiagramContents(id);
};

/**
 * Creates a diagram
 * @param userId of the user creating the diagram
 * @returns the created diagram
 * @throws an error if the password is invalid
 * @throws an error if the diagram could not be created
 */
const createDiagram = async (userId: string) => {
  if (!userId) throw new Error('Invalid user id');
  const user = UserModel.findById(userId);
  if (!user) throw new Error('User not found');

  const diagram = new DiagramModel({
    isPublic: false,
    userId,
  });
  await diagram.save();
  return diagram;
};

const renameDiagram = async (id: string, name: string) => {
  if (!name) throw new Error('Invalid name');
  if (!isValidObjectId(id)) throw new Error('Diagram not found');

  const diagram = await DiagramModel.findById(id);
  if (!diagram) throw new Error('Diagram not found');
  diagram.name = name.trim();
  await diagram.save();
};

/**
 * @param id of the diagram to retrieve
 * @returns true if the diagram is public, false if it is private
 */
const getDiagramPrivacy = async (id: string) => {
  if (!isValidObjectId(id)) throw new Error('Diagram not found');
  const diagram = await DiagramModel.findById(id);
  if (!diagram) throw new Error('Diagram not found');
  return diagram.isPublic;
};

const setDiagramPrivacy = async (id: string, isPublic: boolean) => {
  if (!isValidObjectId(id)) throw new Error('Diagram not found');
  if (isPublic === undefined) throw new Error('Invalid privacy value');
  await DiagramModel.findByIdAndUpdate(id, { isPublic });
};

const deleteDiagram = async (id: string) => {
  if (!isValidObjectId(id)) throw new Error('Diagram not found');
  await DiagramModel.findByIdAndDelete(id);
  await EntityModel.deleteMany({ diagramId: id });
  await RelationshipModel.deleteMany({ diagramId: id });
};

/**
 * Clear all entities and relationships from a diagram
 * @param id id of the diagram to clear
 */
const clearDiagram = async (id: string) => {
  if (!id || !isValidObjectId(id)) {
    throw new Error('Diagram id is missing or invalid');
  }

  // Delete all entities and relationships associated with the diagram
  await EntityModel.deleteMany({ diagramId: id });
  await RelationshipModel.deleteMany({ diagramId: id });
};

/**
 * Update multiple entity positions at once (bulk update)
 * @param id diagram id
 * @param updates array of { entityId, position: { x, y } }
 */
const updateDiagramPositions = async (
  id: string,
  updates: { entityId: string; position: { x: number; y: number } }[]
) => {
  if (!id || !isValidObjectId(id)) {
    throw new Error('Diagram id is missing or invalid');
  }

  const bulkOps = updates.map((update) => ({
    updateOne: {
      filter: { _id: update.entityId, diagramId: id },
      update: { $set: { position: update.position } },
    },
  }));

  if (bulkOps.length > 0) {
    await EntityModel.bulkWrite(bulkOps);
  }
};

export {
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
};
