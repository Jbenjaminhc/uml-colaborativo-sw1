import { Edge, Node } from 'reactflow';

export type Diagram = {
  id: string;
  name: string;
  modified: string;
};

export type DiagramContents = {
  diagramId: string;
  name: string;
  entities: Entity[];
  relationships: Relationship[];
};

export type DataType =
  | ''
  | 'int'
  | 'float'
  | 'long'
  | 'double'
  | 'boolean'
  | 'string'
  | 'char'
  | 'date'
  | 'datetime'
  | 'void';

export type Visibility = '+' | '—' | '#';

// Entity is a node in the graph where its data can be a class, interface, or enum
export type Entity = Node<NodeData>;

export type NodeData = Klass | Interface | Enum;

export type Klass = {
  name: string;
  isAbstract: boolean;
  constants?: Constant[];
  attributes?: Attribute[];
  methods?: Method[];
};

export type Interface = {
  name: string;
  constants?: Constant[];
  methods?: Method[];
};

export type Enum = {
  name: string;
  values: EnumValue[];
};

// field type definitions
export type Constant = {
  id: number;
  name: string;
  type: string;
};

export type Attribute = {
  id: number;
  name: string;
  type: string;
  visibility: Visibility;
};

export type Method = {
  id: number;
  name: string;
  returnType: string;
  visibility: Visibility;
  isStatic: boolean;
};

export type EnumValue = {
  id: number;
  name: string;
};

export type RelationshipType =
  | 'Inheritance'
  | 'Association'
  | 'Aggregation'
  | 'Composition'
  | 'Implementation'
  | 'Dependency';

export type Relationship = Edge<RelationshipData | undefined>;

export type RelationshipData = {
  label: string;
  srcMultiplicity: string;
  tgtMultiplicity: string;
};

export interface ActiveUser {
  userId: string;
  username: string;
  socketId: string;
  color: string;
  activity?: {
    action: string;
    target?: string;
  };
}

export interface CollaboratorInfo {
  userId: string;
  email: string;
  username: string;
  role: 'editor' | 'viewer';
}

export interface ChatMessage {
  id: string;
  userId: string;
  username: string;
  color: string;
  text: string;
  timestamp: number;
}
