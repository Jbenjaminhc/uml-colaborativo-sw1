import { create } from 'xmlbuilder2';
import { XMLBuilder } from 'xmlbuilder2/lib/interfaces';
import { EntityModel } from '../models/entity.model';
import { RelationshipModel } from '../models/relationship.model';
import { DiagramModel } from '../models/diagram.model';
import { EntityDoc, RelationshipDoc } from './transformer';

// ═══════════════════════════════════════════════════════════════════
// ID generation — deterministic, derived from MongoDB ObjectIds
// ═══════════════════════════════════════════════════════════════════

function formatGuid(hex32: string): string {
  const upper = hex32.toUpperCase();
  return `${upper.slice(0, 8)}_${upper.slice(8, 12)}_${upper.slice(
    12,
    16
  )}_${upper.slice(16, 20)}_${upper.slice(20, 32)}`;
}

function toXmiId(mongoId: string): string {
  const padded = mongoId.padEnd(32, '0').slice(0, 32);
  return `EAID_${formatGuid(padded)}`;
}

function toXmiPkgId(mongoId: string): string {
  const padded = mongoId.padEnd(32, '0').slice(0, 32);
  return `EAPK_${formatGuid(padded)}`;
}

function toSubId(mongoId: string, namespace: string, index: number): string {
  const idx = index.toString(16).padStart(4, '0');
  const padded = `${mongoId}${namespace}${idx}0000`.slice(0, 32);
  return `EAID_${formatGuid(padded)}`;
}

function toAttrId(entityId: string, index: number): string {
  return toSubId(entityId, 'A', index);
}

function toMethodId(entityId: string, index: number): string {
  return toSubId(entityId, 'B', index);
}

function toEnumLitId(entityId: string, index: number): string {
  return toSubId(entityId, 'C', index);
}

function toReturnId(entityId: string, index: number): string {
  return toSubId(entityId, 'D', index);
}

function deriveSrcEnd(assocXmiId: string): string {
  // EAID_XXXXXXXX_rest → EAID_srcXXXXX_rest
  const parts = assocXmiId.split('_');
  parts[1] = `src${parts[1].slice(3)}`;
  return parts.join('_');
}

function deriveDstEnd(assocXmiId: string): string {
  const parts = assocXmiId.split('_');
  parts[1] = `dst${parts[1].slice(3)}`;
  return parts.join('_');
}

function deriveLiteralId(parentXmiId: string, seq: number): string {
  const parts = parentXmiId.split('_');
  parts[1] = `LI${seq.toString().padStart(6, '0')}`;
  return parts.join('_');
}

// ═══════════════════════════════════════════════════════════════════
// Type Registry for EA Stubs and Classifiers
// ═══════════════════════════════════════════════════════════════════

export class TypeRegistry {
  private stubIds = new Map<string, string>();

  private classifierIdsByName = new Map<string, string>();

  private nextStubIndex = 1;

  constructor(entities: EntityDoc[]) {
    // Register all known classifiers in this diagram
    for (const ent of entities) {
      if (ent.data.name) {
        this.classifierIdsByName.set(
          ent.data.name.toLowerCase().trim(),
          toXmiId(ent._id)
        );
      }
    }
  }

  public resolve(typeName: string): string {
    if (!typeName || typeName.trim() === '') return 'EAnone_void';

    const normalized = typeName.trim();
    const lower = normalized.toLowerCase();

    if (lower === 'void') return 'EAnone_void';

    // 1. If it's a classifier in this diagram, use its real xmi:id
    if (this.classifierIdsByName.has(lower)) {
      return this.classifierIdsByName.get(lower)!;
    }

    // 2. Otherwise, treat as primitive/external and map to an EAStub
    if (!this.stubIds.has(normalized)) {
      const idx = this.nextStubIndex.toString(16).padStart(4, '0');
      const padded = `EAID_STUB_0000_0000_0000_00000000${idx}`;
      this.stubIds.set(normalized, padded);
      this.nextStubIndex++;
    }

    return this.stubIds.get(normalized)!;
  }

  public getStubs(): Map<string, string> {
    return this.stubIds;
  }
}

// ═══════════════════════════════════════════════════════════════════
// Visibility mapping
// ═══════════════════════════════════════════════════════════════════

function mapVisibility(symbol: string): string {
  if (symbol === '+') return 'public';
  if (symbol === '\u2014') return 'private'; // em-dash U+2014
  if (symbol === '#') return 'protected';
  return 'private'; // default
}

// ═══════════════════════════════════════════════════════════════════
// Multiplicity parsing
// ═══════════════════════════════════════════════════════════════════

interface MultBounds {
  lower: number;
  upper: number; // -1 = unlimited
  isUpperUnlimited: boolean;
}

function parseMultiplicity(text: string): MultBounds | null {
  if (!text || text.trim() === '') return null;

  const trimmed = text.trim();

  // Single star "*"
  if (trimmed === '*') {
    return { lower: 0, upper: -1, isUpperUnlimited: true };
  }

  // Range "n..m" or "n..*"
  const rangeMatch = trimmed.match(/^(\d+)\.\.(\*|\d+)$/);
  if (rangeMatch) {
    const lo = parseInt(rangeMatch[1], 10);
    if (rangeMatch[2] === '*') {
      return { lower: lo, upper: -1, isUpperUnlimited: true };
    }
    const hi = parseInt(rangeMatch[2], 10);
    return { lower: lo, upper: hi, isUpperUnlimited: false };
  }

  // Single number "n"
  const singleMatch = trimmed.match(/^(\d+)$/);
  if (singleMatch) {
    const n = parseInt(singleMatch[1], 10);
    return { lower: n, upper: n, isUpperUnlimited: false };
  }

  return null;
}

// ═══════════════════════════════════════════════════════════════════
// XML generation
// ═══════════════════════════════════════════════════════════════════

function addMultiplicity(
  parent: XMLBuilder,
  parentXmiId: string,
  bounds: MultBounds | null
): void {
  if (!bounds) return;

  parent
    .ele('lowerValue')
    .att('xmi:type', 'uml:LiteralInteger')
    .att('xmi:id', deriveLiteralId(parentXmiId, 1))
    .att('value', String(bounds.lower))
    .up();

  if (bounds.isUpperUnlimited) {
    parent
      .ele('upperValue')
      .att('xmi:type', 'uml:LiteralUnlimitedNatural')
      .att('xmi:id', deriveLiteralId(parentXmiId, 2))
      .att('value', '-1')
      .up();
  } else {
    parent
      .ele('upperValue')
      .att('xmi:type', 'uml:LiteralInteger')
      .att('xmi:id', deriveLiteralId(parentXmiId, 2))
      .att('value', String(bounds.upper))
      .up();
  }
}

function addAttribute(
  parent: XMLBuilder,
  entityId: string,
  attr: { id: number; name: string; visibility: string; type: string },
  index: number,
  registry: TypeRegistry
): void {
  const attrId = toAttrId(entityId, index);
  const el = parent
    .ele('ownedAttribute')
    .att('xmi:type', 'uml:Property')
    .att('xmi:id', attrId)
    .att('name', attr.name)
    .att('visibility', mapVisibility(attr.visibility))
    .att('isStatic', 'false')
    .att('isReadOnly', 'false')
    .att('isDerived', 'false')
    .att('isOrdered', 'false')
    .att('isUnique', 'true')
    .att('isDerivedUnion', 'false');

  // Order: lowerValue, upperValue, type (as in real EA project)
  addMultiplicity(el, attrId, { lower: 1, upper: 1, isUpperUnlimited: false });

  el.ele('type').att('xmi:idref', registry.resolve(attr.type)).up();

  el.up();
}

function addOperation(
  parent: XMLBuilder,
  entityId: string,
  method: {
    id: number;
    name: string;
    returnType: string;
    visibility: string;
    isStatic: boolean;
  },
  index: number,
  registry: TypeRegistry
): void {
  const methodId = toMethodId(entityId, index);
  const returnId = toReturnId(entityId, index);
  const returnTypeRef = registry.resolve(method.returnType);

  const op = parent
    .ele('ownedOperation')
    .att('xmi:id', methodId)
    .att('name', method.name)
    .att('visibility', mapVisibility(method.visibility))
    .att('concurrency', 'sequential');

  if (method.isStatic) {
    op.att('isStatic', 'true');
  }

  // Return parameter
  if (method.returnType.toLowerCase() === 'void' || method.returnType === '') {
    op.ele('ownedParameter')
      .att('xmi:id', returnId)
      .att('name', 'return')
      .att('direction', 'return')
      .att('type', 'EAnone_void')
      .up();
  } else {
    const param = op
      .ele('ownedParameter')
      .att('xmi:id', returnId)
      .att('name', 'return')
      .att('direction', 'return');

    param.ele('type').att('xmi:idref', returnTypeRef).up();

    param.up();
  }

  op.up();
}

function addOwnedEnd(
  assocEl: XMLBuilder,
  endId: string,
  assocId: string,
  targetClassXmiId: string,
  aggregation: string,
  multiplicity: MultBounds | null
): void {
  const end = assocEl
    .ele('ownedEnd')
    .att('xmi:type', 'uml:Property')
    .att('xmi:id', endId)
    .att('visibility', 'public')
    .att('association', assocId)
    .att('isStatic', 'false')
    .att('isReadOnly', 'false')
    .att('isDerived', 'false')
    .att('isOrdered', 'false')
    .att('isUnique', 'true')
    .att('isDerivedUnion', 'false')
    .att('aggregation', aggregation);

  end.ele('type').att('xmi:idref', targetClassXmiId).up();

  addMultiplicity(end, endId, multiplicity);

  end.up();
}

// ═══════════════════════════════════════════════════════════════════
// Main generation function (pure, no DB access)
// ═══════════════════════════════════════════════════════════════════

export function generateXmiContent(
  entities: EntityDoc[],
  relationships: RelationshipDoc[],
  diagramName: string,
  diagramId: string,
  warnings: string[] = []
): string {
  // Sort deterministically by _id for reproducible output (T-C43l)
  const sortedEntities = [...entities].sort((a, b) =>
    a._id.localeCompare(b._id)
  );
  const sortedRels = [...relationships].sort((a, b) =>
    a._id.localeCompare(b._id)
  );

  // Build entity lookup and type registry
  const entityMap = new Map<string, EntityDoc>();
  for (const ent of sortedEntities) {
    entityMap.set(ent._id, ent);
  }

  const typeRegistry = new TypeRegistry(sortedEntities);

  // Filter out orphan relationships
  const validRels = sortedRels.filter(
    (r) => entityMap.has(r.source) && entityMap.has(r.target)
  );

  // Categorize relationships
  const inheritanceRels: RelationshipDoc[] = [];
  const implementationRels: RelationshipDoc[] = [];
  const associationRels: RelationshipDoc[] = []; // includes Aggregation, Composition
  const dependencyRels: RelationshipDoc[] = [];

  for (const rel of validRels) {
    switch (rel.type) {
      case 'Inheritance':
        inheritanceRels.push(rel);
        break;
      case 'Implementation':
        implementationRels.push(rel);
        break;
      case 'Association':
      case 'Aggregation':
      case 'Composition':
        associationRels.push(rel);
        break;
      case 'Dependency':
        dependencyRels.push(rel);
        break;
      default:
        break;
    }
  }

  // Build lookup: target entity → [inheritance rels, implementation rels]
  const inheritanceByTarget = new Map<string, RelationshipDoc[]>();
  for (const rel of inheritanceRels) {
    const existing = inheritanceByTarget.get(rel.target) || [];
    existing.push(rel);
    inheritanceByTarget.set(rel.target, existing);
  }

  const implementationByTarget = new Map<string, RelationshipDoc[]>();
  for (const rel of implementationRels) {
    const existing = implementationByTarget.get(rel.target) || [];
    existing.push(rel);
    implementationByTarget.set(rel.target, existing);
  }

  // ── Build XML ──────────────────────────────────────────────────
  const doc = create({ version: '1.0', encoding: 'UTF-8' })
    .ele('xmi:XMI')
    .att('xmi:version', '2.1')
    .att('xmlns:uml', 'http://schema.omg.org/spec/UML/2.1')
    .att('xmlns:xmi', 'http://schema.omg.org/spec/XMI/2.1');

  doc
    .ele('xmi:Documentation')
    .att('exporter', 'Enterprise Architect')
    .att('exporterVersion', '6.5')
    .att('exporterID', '1554')
    .up();

  const model = doc
    .ele('uml:Model')
    .att('xmi:type', 'uml:Model')
    .att('name', 'EA_Model')
    .att('visibility', 'public');

  const pkg = model
    .ele('packagedElement')
    .att('xmi:type', 'uml:Package')
    .att('xmi:id', toXmiPkgId(diagramId))
    .att('name', diagramName)
    .att('visibility', 'public');

  // ── 1. Classes ─────────────────────────────────────────────────
  const classes = sortedEntities.filter((e) => e.type === 'class');
  for (const cls of classes) {
    const classId = toXmiId(cls._id);
    const el = pkg
      .ele('packagedElement')
      .att('xmi:type', 'uml:Class')
      .att('xmi:id', classId)
      .att('name', cls.data.name)
      .att('visibility', 'public');

    if (cls.data.isAbstract) {
      el.att('isAbstract', 'true');
    }

    // Generalizations (Inheritance) — inside child class
    const inhRels = inheritanceByTarget.get(cls._id) || [];
    for (const rel of inhRels) {
      el.ele('generalization')
        .att('xmi:type', 'uml:Generalization')
        .att('xmi:id', toXmiId(rel._id))
        .att('general', toXmiId(rel.source))
        .up();
    }

    // InterfaceRealizations — inside implementing class
    const implRels = implementationByTarget.get(cls._id) || [];
    for (const rel of implRels) {
      el.ele('interfaceRealization')
        .att('xmi:type', 'uml:InterfaceRealization')
        .att('xmi:id', toXmiId(rel._id))
        .att('contract', toXmiId(rel.source))
        .up();
    }

    // Attributes
    let attrIndex = 1;
    for (const attr of cls.data.attributes || []) {
      addAttribute(el, cls._id, attr, attrIndex++, typeRegistry);
    }

    // Methods
    let methodIndex = 1;
    for (const meth of cls.data.methods || []) {
      addOperation(el, cls._id, meth, methodIndex++, typeRegistry);
    }

    el.up();
  }

  // ── 2. Interfaces ──────────────────────────────────────────────
  const interfaces = sortedEntities.filter((e) => e.type === 'interface');
  for (const iface of interfaces) {
    const el = pkg
      .ele('packagedElement')
      .att('xmi:type', 'uml:Interface')
      .att('xmi:id', toXmiId(iface._id))
      .att('name', iface.data.name)
      .att('visibility', 'public');

    let attrIndex = 1;
    for (const attr of iface.data.attributes || []) {
      addAttribute(el, iface._id, attr, attrIndex++, typeRegistry);
    }
    let methodIndex = 1;
    for (const meth of iface.data.methods || []) {
      addOperation(el, iface._id, meth, methodIndex++, typeRegistry);
    }
    el.up();
  }

  // ── 3. Enums ───────────────────────────────────────────────────
  const enums = sortedEntities.filter((e) => e.type === 'enum');
  for (const en of enums) {
    const el = pkg
      .ele('packagedElement')
      .att('xmi:type', 'uml:Enumeration')
      .att('xmi:id', toXmiId(en._id))
      .att('name', en.data.name)
      .att('visibility', 'public');

    let litIndex = 1;
    for (const lit of en.data.constants || []) {
      el.ele('ownedLiteral')
        .att('xmi:type', 'uml:EnumerationLiteral')
        .att('xmi:id', toEnumLitId(en._id, litIndex++))
        .att('name', lit.name)
        .att('visibility', 'public')
        .up();
    }
    el.up();
  }

  // ── 4. Associations / Dependencies ─────────────────────────────
  for (const rel of associationRels) {
    const assocId = toXmiId(rel._id);
    const srcEndId = deriveSrcEnd(assocId);
    const dstEndId = deriveDstEnd(assocId);

    const el = pkg
      .ele('packagedElement')
      .att('xmi:type', 'uml:Association')
      .att('xmi:id', assocId)
      .att('visibility', 'public');

    if (rel.data?.label) {
      el.att('name', rel.data.label);
    }

    el.ele('memberEnd').att('xmi:idref', srcEndId).up();
    el.ele('memberEnd').att('xmi:idref', dstEndId).up();

    const aggType =
      rel.type === 'Composition'
        ? 'composite'
        : rel.type === 'Aggregation'
        ? 'shared'
        : 'none';

    // Target end (owned by Association)
    addOwnedEnd(
      el,
      dstEndId,
      assocId,
      toXmiId(rel.target),
      'none',
      parseMultiplicity(rel.data?.tgtMultiplicity || '')
    );

    // Source end (owned by Association)
    // EA handles aggregation on the source end natively in the connector block, but in standard UML property ends,
    // the aggregation="composite" should point to the PART (the target).
    let srcMult = parseMultiplicity(rel.data?.srcMultiplicity || '');
    if (!srcMult && aggType !== 'none') {
      srcMult = { lower: 1, upper: 1, isUpperUnlimited: false };
    }
    addOwnedEnd(el, srcEndId, assocId, toXmiId(rel.source), 'none', srcMult);

    el.up();
  }

  for (const rel of dependencyRels) {
    pkg
      .ele('packagedElement')
      .att('xmi:type', 'uml:Dependency')
      .att('xmi:id', toXmiId(rel._id))
      .att('client', toXmiId(rel.source))
      .att('supplier', toXmiId(rel.target))
      .up();
  }

  // ── 6. EA Extension (Diagram) ──────────────────────────────────
  const extension = doc
    .ele('xmi:Extension')
    .att('extender', 'Enterprise Architect')
    .att('extenderID', '6.5');

  const extElements = extension.ele('elements');

  extElements
    .ele('element')
    .att('xmi:idref', toXmiPkgId(diagramId))
    .att('xmi:type', 'uml:Package')
    .att('name', diagramName)
    .att('scope', 'public')
    .ele('model')
    .att('package2', toXmiId(diagramId))
    .att('package', 'EAPK_11111111_2222_3333_4444_555555555555')
    .att('ea_localid', '2')
    .att('ea_eleType', 'package')
    .up()
    .ele('properties')
    .att('sType', 'Package')
    .up();

  let elementLocalId = 3;
  for (const ent of sortedEntities) {
    const sType =
      ent.type === 'class'
        ? 'Class'
        : ent.type === 'interface'
        ? 'Interface'
        : 'Enumeration';
    const umlType =
      ent.type === 'class'
        ? 'uml:Class'
        : ent.type === 'interface'
        ? 'uml:Interface'
        : 'uml:Enumeration';
    const classEl = extElements
      .ele('element')
      .att('xmi:idref', toXmiId(ent._id))
      .att('xmi:type', umlType)
      .att('name', ent.data.name)
      .att('scope', 'public');

    classEl
      .ele('model')
      .att('package', toXmiPkgId(diagramId))
      .att('ea_localid', String(elementLocalId++))
      .att('ea_eleType', 'element')
      .up();

    classEl.ele('properties').att('sType', sType).up();

    // Export attributes to EA extension
    if (ent.data.attributes && ent.data.attributes.length > 0) {
      const attrsEl = classEl.ele('attributes');
      let attrIndex = 1;
      for (const attr of ent.data.attributes) {
        const attrId = toAttrId(ent._id, attrIndex++);
        attrsEl
          .ele('attribute')
          .att('xmi:idref', attrId)
          .att('name', attr.name)
          .att('scope', mapVisibility(attr.visibility))
          .ele('properties')
          .att('type', attr.type || 'int')
          .up()
          .up();
      }
      attrsEl.up();
    }

    // Export operations to EA extension
    if (ent.data.methods && ent.data.methods.length > 0) {
      const opsEl = classEl.ele('operations');
      let methodIndex = 1;
      for (const meth of ent.data.methods) {
        const methodId = toMethodId(ent._id, methodIndex);
        const returnId = toReturnId(ent._id, methodIndex);
        methodIndex++;

        const retType = meth.returnType || 'void';

        const opEl = opsEl
          .ele('operation')
          .att('xmi:idref', methodId)
          .att('name', meth.name)
          .att('scope', mapVisibility(meth.visibility));

        opEl.ele('type').att('type', retType).up();

        const paramsEl = opEl.ele('parameters');
        paramsEl
          .ele('parameter')
          .att('xmi:idref', returnId)
          .att('visibility', 'public')
          .ele('properties')
          .att('pos', '0')
          .att('type', retType)
          .up()
          .up();

        // Note: Normal IN parameters would be registered here too if they existed in the model
        paramsEl.up();

        opEl.up();
      }
      opsEl.up();
    }

    classEl.up();
  }
  extElements.up(); // close elements

  const extConnectors = extension.ele('connectors');
  for (const rel of validRels) {
    let eaType = 'Association';
    let direction = 'Unspecified';

    if (rel.type === 'Aggregation' || rel.type === 'Composition') {
      eaType = 'Aggregation';
      direction = 'Source -> Destination';
    } else if (rel.type === 'Inheritance') {
      eaType = 'Generalization';
      direction = 'Source -> Destination';
    } else if (rel.type === 'Implementation') {
      eaType = 'Realisation';
      direction = 'Source -> Destination';
    } else if (rel.type === 'Dependency') {
      eaType = 'Dependency';
      direction = 'Source -> Destination';
    } else if (rel.type === 'Association') {
      eaType = 'Association';
      direction = 'Source -> Destination';
    }

    // In UML2Code, Inheritance/Implementation source is the Parent and target is the Child.
    // However, UML visual semantics (and EA connectors) draw the arrow FROM Child TO Parent.
    // Therefore, we must invert source and target in the connector for these types.
    const isInverted =
      rel.type === 'Inheritance' || rel.type === 'Implementation';

    const eaSource = isInverted ? rel.target : rel.source;
    const eaTarget = isInverted ? rel.source : rel.target;

    // Determine EA aggregation strings
    let sourceAgg = 'none';
    let targetAgg = 'none';
    if (rel.type === 'Composition') {
      sourceAgg = isInverted ? 'composite' : 'none';
      targetAgg = isInverted ? 'none' : 'composite';
    } else if (rel.type === 'Aggregation') {
      sourceAgg = isInverted ? 'shared' : 'none';
      targetAgg = isInverted ? 'none' : 'shared';
    }

    // Determine multiplicities
    const srcMult = (rel.data.srcMultiplicity || '').trim();
    const tgtMult = (rel.data.tgtMultiplicity || '').trim();
    const eaSourceMult = isInverted ? tgtMult : srcMult;
    const eaTargetMult = isInverted ? srcMult : tgtMult;

    const connEl = extConnectors
      .ele('connector')
      .att('xmi:idref', toXmiId(rel._id))
      .att('name', rel.data.label || '');

    // Source end definition
    const srcEl = connEl.ele('source').att('xmi:idref', toXmiId(eaSource));
    const srcTypeEl = srcEl.ele('type').att('aggregation', sourceAgg);
    if (eaSourceMult) srcTypeEl.att('multiplicity', eaSourceMult);
    srcTypeEl.up();
    srcEl.up();

    // Target end definition
    const tgtEl = connEl.ele('target').att('xmi:idref', toXmiId(eaTarget));
    const tgtTypeEl = tgtEl.ele('type').att('aggregation', targetAgg);
    if (eaTargetMult) tgtTypeEl.att('multiplicity', eaTargetMult);
    tgtTypeEl.up();
    tgtEl.up();

    // EA Properties
    connEl
      .ele('properties')
      .att('ea_type', eaType)
      .att('direction', direction)
      .up();

    // EA Labels (Multiplicity on the diagram)
    const labelsEl = connEl.ele('labels');
    if (eaSourceMult) labelsEl.att('lb', eaSourceMult);
    if (eaTargetMult) labelsEl.att('rb', eaTargetMult);
    if (rel.data.label) labelsEl.att('mt', rel.data.label);
    labelsEl.up();

    connEl.up();
  }
  extConnectors.up(); // close connectors

  // primitive types block
  const prim = extension.ele('primitivetypes');
  prim
    .ele('packagedElement')
    .att('xmi:type', 'uml:Package')
    .att('xmi:id', 'EAPrimitiveTypesPackage')
    .att('name', 'EA_PrimitiveTypes_Package')
    .att('visibility', 'public')
    .up();
  prim.up();

  // EAStubs for external/primitive types
  for (const [stubName, stubId] of typeRegistry.getStubs().entries()) {
    extension
      .ele('EAStub')
      .att('xmi:id', stubId)
      .att('name', stubName)
      .att('UMLType', 'PrimitiveType')
      .up();
  }

  extension.ele('profiles').up();

  const eaDiagramId = toXmiId(`${diagramId}d1a9`);
  const diagrams = extension.ele('diagrams');

  const diagramEl = diagrams.ele('diagram').att('xmi:id', eaDiagramId);

  diagramEl
    .ele('model')
    .att('package', toXmiPkgId(diagramId))
    .att('localID', '1')
    .att('owner', toXmiPkgId(diagramId))
    .up();

  diagramEl
    .ele('properties')
    .att('name', diagramName)
    .att('type', 'Logical')
    .up();

  const now = '2026-09-17 00:00:00';
  diagramEl
    .ele('project')
    .att('author', 'UML2Code')
    .att('version', '1.0')
    .att('created', now)
    .att('modified', now)
    .up();

  diagramEl
    .ele('style1')
    .att(
      'value',
      'ShowPrivate=1;ShowProtected=1;ShowPublic=1;HideRelationships=0;Locked=0;Border=1;HighlightForeign=1;PackageContents=1;SequenceNotes=0;ScalePrintImage=0;PPgs.cx=0;PPgs.cy=0;DocSize.cx=795;DocSize.cy=1138;ShowDetails=0;Orientation=P;Zoom=100;ShowTags=0;OpParams=1;VisibleAttributeDetail=0;ShowOpRetType=1;ShowIcons=1;CollabNums=0;HideProps=0;ShowReqs=0;ShowCons=0;PaperSize=9;HideParents=0;UseAlias=0;HideAtts=0;HideOps=0;HideStereo=0;HideElemStereo=0;ShowTests=0;ShowMaint=0;ConnectorNotation=UML 2.1;ExplicitNavigability=0;ShowShape=1;AllDockable=0;AdvancedElementProps=1;AdvancedFeatureProps=1;AdvancedConnectorProps=1;m_bElementClassifier=1;SPT=1;ShowNotes=0;SuppressBrackets=0;SuppConnectorLabels=0;PrintPageHeadFoot=0;ShowAsList=0;'
    )
    .up();
  diagramEl
    .ele('style2')
    .att(
      'value',
      'ExcludeRTF=0;DocAll=0;HideQuals=0;AttPkg=1;ShowTests=0;ShowMaint=0;SuppressFOC=1;MatrixActive=0;SwimlanesActive=1;KanbanActive=0;MatrixLineWidth=1;MatrixLineClr=0;MatrixLocked=0;TConnectorNotation=UML 2.1;TExplicitNavigability=0;AdvancedElementProps=1;AdvancedFeatureProps=1;AdvancedConnectorProps=1;m_bElementClassifier=1;SPT=1;MDGDgm=;STBLDgm=;ShowNotes=0;VisibleAttributeDetail=0;ShowOpRetType=1;SuppressBrackets=0;SuppConnectorLabels=0;PrintPageHeadFoot=0;ShowAsList=0;SuppressedCompartments=;Theme=:119;SaveTag=6F49BC35;'
    )
    .up();
  diagramEl
    .ele('swimlanes')
    .att(
      'value',
      'locked=false;orientation=0;width=0;inbar=false;names=false;color=-1;bold=false;fcol=0;tcol=-1;ofCol=-1;ufCol=-1;hl=0;ufh=0;hh=0;cls=0;bw=0;hli=0;SwimlaneFont=lfh:-10,lfw:0,lfi:0,lfu:0,lfs:0,lfface:Calibri,lfe:0,lfo:0,lfchar:1,lfop:0,lfcp:0,lfq:0,lfpf=0,lfWidth=0;'
    )
    .up();
  diagramEl
    .ele('matrixitems')
    .att(
      'value',
      'locked=false;matrixactive=false;swimlanesactive=true;kanbanactive=false;width=1;clrLine=0;'
    )
    .up();
  diagramEl.ele('extendedProperties').up();

  const elementsEl = diagramEl.ele('elements');

  // Calculate bounding box to ensure ALL coordinates are positive
  // EA 6.5 parser may silently fail on negative geometry values
  let minX = Infinity;
  let minY = Infinity;
  for (const ent of sortedEntities) {
    if (
      ent.position &&
      typeof ent.position.x === 'number' &&
      typeof ent.position.y === 'number'
    ) {
      if (ent.position.x < minX) minX = ent.position.x;
      if (ent.position.y < minY) minY = ent.position.y;
    }
  }

  const offsetX = minX < 50 ? 50 - minX : 0;
  const offsetY = minY < 50 ? 50 - minY : 0;

  let gridX = 50;
  let gridY = 50;
  let seqno = 1;

  for (const ent of sortedEntities) {
    let x: number;
    let y: number;

    if (
      ent.position &&
      typeof ent.position.x === 'number' &&
      typeof ent.position.y === 'number'
    ) {
      x = Math.round(ent.position.x + offsetX);
      y = Math.round(ent.position.y + offsetY);
    } else {
      x = gridX;
      y = gridY;
      gridX += 200;
      if (gridX > 1000) {
        gridX = 50;
        gridY += 150;
      }
      warnings.push(
        `La entidad '${ent.data.name}' no tiene posición; se le asignó una posición en grilla.`
      );
    }

    let maxNameLen = ent.data.name.length;
    let membersCount = 0;

    if (ent.data.attributes) {
      for (const attr of ent.data.attributes) {
        if (attr.name.length > maxNameLen) maxNameLen = attr.name.length;
      }
      membersCount += ent.data.attributes.length;
    }
    if (ent.data.methods) {
      for (const meth of ent.data.methods) {
        if (meth.name.length > maxNameLen) maxNameLen = meth.name.length;
      }
      membersCount += ent.data.methods.length;
    }
    if (ent.data.constants) {
      for (const c of ent.data.constants) {
        if (c.name.length > maxNameLen) maxNameLen = c.name.length;
      }
      membersCount += ent.data.constants.length;
    }

    const ancho = Math.max(120, 8 * maxNameLen);
    const alto = 40 + 16 * membersCount;

    const left = x;
    const top = y;
    const right = left + ancho;
    const bottom = top + alto;

    // EA requires DUID in style
    const duid = toXmiId(ent._id).substring(5, 13);

    elementsEl
      .ele('element')
      .att(
        'geometry',
        `Left=${left};Top=${top};Right=${right};Bottom=${bottom};`
      )
      .att('subject', toXmiId(ent._id))
      .att('seqno', String(seqno))
      .att('style', `DUID=${duid};`)
      .up();

    seqno++;
  }

  // Draw relationship lines on the diagram
  for (const rel of validRels) {
    const isInverted =
      rel.type === 'Inheritance' || rel.type === 'Implementation';

    const eaSource = isInverted ? rel.target : rel.source;
    const eaTarget = isInverted ? rel.source : rel.target;

    const srcDuid = toXmiId(eaSource).substring(5, 13);
    const dstDuid = toXmiId(eaTarget).substring(5, 13);

    elementsEl
      .ele('element')
      .att(
        'geometry',
        'SX=0;SY=0;EX=0;EY=0;EDGE=3;$LLB=;LLT=;LMT=;LMB=;LRT=;LRB=;IRHS=;ILHS=;Path=;'
      )
      .att('subject', toXmiId(rel._id))
      .att(
        'style',
        `Mode=3;EOID=${dstDuid};SOID=${srcDuid};Color=-1;LWidth=0;Hidden=0;`
      )
      .up();
  }

  extension.up();

  pkg.up(); // close diagram package
  model.up(); // close model

  const xml = doc.end({
    prettyPrint: true,
    indent: '  ',
    newline: '\r\n',
  });

  return xml;
}

// ═══════════════════════════════════════════════════════════════════
// Async wrapper — reads from MongoDB (used by the endpoint)
// ═══════════════════════════════════════════════════════════════════

export async function generateXmiFromDiagram(
  diagramId: string
): Promise<{ content: string; diagramName: string; warnings: string[] }> {
  const diagram = await DiagramModel.findById(diagramId);
  if (!diagram) {
    throw new Error('Diagrama no encontrado');
  }

  const rawEntities = await EntityModel.find({ diagramId }).lean();
  const rawRelationships = await RelationshipModel.find({
    diagramId,
  }).lean();

  if (rawEntities.length === 0) {
    throw new Error('El diagrama no tiene entidades');
  }

  const entities: EntityDoc[] = rawEntities.map((e) => ({
    _id: String(e._id),
    type: e.type as 'class' | 'interface' | 'enum',
    position: e.position as { x: number; y: number } | undefined,
    data: {
      name: e.data.name,
      isAbstract: e.data.isAbstract,
      constants: e.data.constants,
      attributes: e.data.attributes,
      methods: e.data.methods,
    },
  }));

  const relationships: RelationshipDoc[] = rawRelationships.map((r) => ({
    _id: String(r._id),
    type: r.type as RelationshipDoc['type'],
    source: String(r.source),
    target: String(r.target),
    data: {
      srcMultiplicity: r.data?.srcMultiplicity,
      tgtMultiplicity: r.data?.tgtMultiplicity,
      label: r.data?.label,
    },
  }));

  const warnings: string[] = [];
  const content = generateXmiContent(
    entities,
    relationships,
    diagram.name,
    diagramId,
    warnings
  );

  return { content, diagramName: diagram.name, warnings };
}
