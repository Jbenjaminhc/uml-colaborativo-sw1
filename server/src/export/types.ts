/* eslint-disable import/prefer-default-export */

// ─── Warning ────────────────────────────────────────────────────
export interface Warning {
  code: string;
  element: string;
  message: string;
}

// ─── Intermediate model produced by the transformer ─────────────

export interface JavaField {
  name: string;
  javaType: string;
  annotations: string[];
  javadoc?: string;
  isId: boolean;
}

export interface JavaMethodParam {
  name: string;
  javaType: string;
}

export interface JavaMethod {
  name: string;
  returnType: string;
  visibility: 'public' | 'private' | 'protected';
  isStatic: boolean;
  body: string;
  javadoc?: string;
}

export interface JavaRelationField {
  fieldName: string;
  fieldType: string;
  relatedClassName: string;
  annotations: string[];
  javadoc?: string;
  isCollection: boolean;
  collectionType?: 'List' | 'Set';
}

export interface JavaClass {
  className: string;
  tableName: string;
  restPath: string;
  isAbstract: boolean;
  extendsClass?: string;
  implementsInterfaces: string[];
  fields: JavaField[];
  relationFields: JavaRelationField[];
  methods: JavaMethod[];
  discriminatorAnnotations: string[];
  isSubclass: boolean;
}

export interface JavaInterface {
  interfaceName: string;
  methods: JavaMethod[];
}

export interface JavaEnum {
  enumName: string;
  constants: string[];
}

export interface IntermediateModel {
  classes: JavaClass[];
  interfaces: JavaInterface[];
  enums: JavaEnum[];
  warnings: Warning[];
}

// ─── Generation parameters ──────────────────────────────────────

export type SupportedDatabase = 'h2' | 'postgresql';

export interface GenerationParams {
  database: SupportedDatabase;
  groupId: string;
  artifactId: string;
  name: string;
  description: string;
  packageName: string;
  javaVersion: string;
}

export interface DatabaseConfig {
  driverGroupId: string;
  driverArtifactId: string;
  dialect: string;
  url: string;
  username: string;
  password: string;
  enableH2Console: boolean;
}

// ─── Preview result ─────────────────────────────────────────────

export interface PreviewResult {
  warnings: Warning[];
  entityCount: number;
  relationshipCount: number;
  fileCount: number;
}

// ─── Multiplicity ───────────────────────────────────────────────

export type Multiplicity = 'ONE' | 'MANY' | 'UNDEFINED';

// ─── Relationship types from the Mongo model (PascalCase) ──────

export type RelationshipType =
  | 'Inheritance'
  | 'Association'
  | 'Aggregation'
  | 'Composition'
  | 'Implementation'
  | 'Dependency';

// ─── Cascade configuration ──────────────────────────────────────

export interface CascadeConfig {
  cascade: string; // JPA cascade string or empty
  orphanRemoval: boolean;
}
