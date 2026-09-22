/* eslint-disable */
import { XMLParser } from 'fast-xml-parser';

export async function parseXmiToDiagram(xmlString: string) {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '',
    isArray: (name, jpath, isLeafNode, isAttribute) => {
      // Ensure specific elements are always arrays to simplify processing
      const arrayTags = [
        'packagedElement',
        'ownedAttribute',
        'ownedOperation',
        'ownedLiteral',
        'ownedParameter',
        'generalization',
        'interfaceRealization',
        'memberEnd',
        'ownedEnd',
        'element',
      ];
      return arrayTags.includes(name);
    },
  });

  const parsed = parser.parse(xmlString);
  const xmi = parsed['xmi:XMI'] || parsed;

  // Helper for arrays
  const toArray = (obj: any) => {
    if (!obj) return [];
    return Array.isArray(obj) ? obj : [obj];
  };

  // Navigate to uml:Model -> packagedElement (Package) -> packagedElement (Classes, etc)
  // XMI might have various hierarchies. We will recursively search for packagedElements.
  const allPackagedElements: any[] = [];

  function extractPackagedElements(obj: any) {
    if (!obj) return;
    if (obj.packagedElement) {
      if (Array.isArray(obj.packagedElement)) {
        allPackagedElements.push(...obj.packagedElement);
        obj.packagedElement.forEach(extractPackagedElements);
      }
    }
    // Drill down inside model
    if (obj['uml:Model']) extractPackagedElements(obj['uml:Model']);
  }

  extractPackagedElements(xmi);

  // EA Geometry Map (EAID -> { x, y })
  const eaGeomMap = new Map<string, { x: number; y: number }>();
  try {
    const ext = xmi['xmi:Extension'];
    if (ext && ext.diagrams && ext.diagrams.diagram) {
      const diagrams = toArray(ext.diagrams.diagram);
      for (const diag of diagrams) {
        if (diag.elements && diag.elements.element) {
          const elements = toArray(diag.elements.element);
          for (const el of elements) {
            if (el.subject && el.geometry) {
              const leftMatch = el.geometry.match(/Left=([\d-]+)/);
              const topMatch = el.geometry.match(/Top=([\d-]+)/);
              if (leftMatch && topMatch) {
                // EA coordinates are very compact (e.g. 110px width). UML2Code React Flow nodes are larger (e.g. 250px width).
                // We scale the X and Y coordinates by 2.0 to prevent nodes from overlapping into a "centralized" mess.
                eaGeomMap.set(el.subject, {
                  x: Math.round(parseInt(leftMatch[1], 10) * 2.0),
                  y: Math.round(parseInt(topMatch[1], 10) * 2.0),
                });
              }
            }
          }
        }
      }
    }
  } catch (e) {
    console.warn('Could not parse EA geometry', e);
  }

  const entities: any[] = [];
  const relationships: any[] = [];

  // EAID -> MongoDB-like ObjectID maps
  const idMapping = new Map<string, string>();

  const generateTempId = () =>
    Math.random().toString(16).substring(2, 14) +
    Math.random().toString(16).substring(2, 14);

  // Helper to dynamically assign orthogonal handles based on spatial placement
  const addRelationship = (rel: any) => {
    const srcEnt = entities.find((e) => e.id === rel.source);
    const tgtEnt = entities.find((e) => e.id === rel.target);
    if (srcEnt && tgtEnt && srcEnt.position && tgtEnt.position) {
      const dx = tgtEnt.position.x - srcEnt.position.x;
      const dy = tgtEnt.position.y - srcEnt.position.y;
      if (Math.abs(dx) > Math.abs(dy)) {
        if (dx > 0) {
          rel.sourceHandle = 'right-middle';
          rel.targetHandle = 'left-middle';
        } else {
          rel.sourceHandle = 'left-middle';
          rel.targetHandle = 'right-middle';
        }
      } else if (dy > 0) {
        rel.sourceHandle = 'bottom-middle';
        rel.targetHandle = 'top-middle';
      } else {
        rel.sourceHandle = 'top-middle';
        rel.targetHandle = 'bottom-middle';
      }
    } else {
      rel.sourceHandle = 'bottom-middle';
      rel.targetHandle = 'top-middle';
    }
    relationships.push(rel);
  };

  // 1. First pass: Create entities and assign temporary IDs
  let gridX = 100;
  let gridY = 100;

  for (const pe of allPackagedElements) {
    const type = pe['xmi:type'];
    if (['uml:Class', 'uml:Interface', 'uml:Enumeration'].includes(type)) {
      const eaId = pe['xmi:id'];
      const tempId = generateTempId();
      if (eaId) idMapping.set(eaId, tempId);

      const entityTypeRaw = type.split(':')[1].toLowerCase();
      const entityType =
        entityTypeRaw === 'enumeration' ? 'enum' : entityTypeRaw;

      const pos = eaGeomMap.get(eaId) || { x: gridX, y: gridY };
      if (!eaGeomMap.has(eaId)) {
        gridX += 250;
        if (gridX > 1000) {
          gridX = 100;
          gridY += 200;
        }
      }

      const entity = {
        id: tempId,
        type: entityType,
        position: pos,
        data: {
          name: pe.name || 'Unnamed',
          isAbstract: pe.isAbstract === 'true',
          attributes: [],
          methods: [],
          constants: [],
        },
      };
      entities.push(entity);
    }
  }

  // Helper to resolve types
  const resolveType = (attr: any): string => {
    let typeName = 'int';
    if (attr.type) {
      // either a primitive string or idref
      if (typeof attr.type === 'string') typeName = attr.type;
      else if (attr.type['xmi:idref']) {
        // try to find in mapped entities
        const refId = attr.type['xmi:idref'];
        // Look up the name of the referenced element
        const referencedPe = allPackagedElements.find(
          (e) => e['xmi:id'] === refId
        );
        if (referencedPe && referencedPe.name) {
          typeName = referencedPe.name;
        } else {
          // Check if it's an EAJava_ or EAID_STUB_ type
          if (refId.startsWith('EAJava_')) typeName = refId.substring(7);
          else if (refId.startsWith('EAID_STUB_')) typeName = 'Object'; // Fallback for stubs if we don't have the EAStub block parsed
        }
      }
    }
    return typeName;
  };

  // Helper to map visibility
  const mapVisibility = (vis: string) => {
    if (vis === 'private') return '—'; // Mongoose schema uses Em Dash U+2014
    if (vis === 'protected') return '#';
    return '+'; // default public
  };

  // Pre-build map of all properties/ends for Association resolution
  const allEnds = new Map<string, any>();
  for (const pe of allPackagedElements) {
    for (const attr of toArray(pe.ownedAttribute))
      allEnds.set(attr['xmi:id'], attr);
    for (const end of toArray(pe.ownedEnd)) allEnds.set(end['xmi:id'], end);
  }

  // 2. Second pass: Properties, Methods and internal relationships
  for (const pe of allPackagedElements) {
    const type = pe['xmi:type'];
    if (['uml:Class', 'uml:Interface', 'uml:Enumeration'].includes(type)) {
      const eaId = pe['xmi:id'];
      const tempId = idMapping.get(eaId);
      if (!tempId) continue;

      const entity = entities.find((e) => e.id === tempId);
      if (!entity) continue;

      // Attributes
      if (pe.ownedAttribute) {
        let attrId = 1;
        for (const attr of pe.ownedAttribute) {
          // Skip association ends which lack a name
          if (!attr.name) continue;

          entity.data.attributes.push({
            id: attrId++,
            name: attr.name,
            type: resolveType(attr),
            visibility: mapVisibility(attr.visibility),
          });
        }
      }

      // Methods
      if (pe.ownedOperation) {
        let methId = 1;
        for (const meth of pe.ownedOperation) {
          // Parameters
          let returnType = 'void';
          if (meth.ownedParameter) {
            // fast-xml-parser usually creates an array, but sometimes it's a single object
            const params = Array.isArray(meth.ownedParameter)
              ? meth.ownedParameter
              : [meth.ownedParameter];
            const retParam = params.find((p: any) => p.direction === 'return');
            if (retParam) {
              returnType = resolveType(retParam);
            }
          }

          entity.data.methods.push({
            id: methId++,
            name: meth.name,
            returnType,
            visibility: mapVisibility(meth.visibility),
          });
        }
      }

      // Constants (Enums)
      if (type === 'uml:Enumeration' && pe.ownedLiteral) {
        let constId = 1;
        const literals = Array.isArray(pe.ownedLiteral)
          ? pe.ownedLiteral
          : [pe.ownedLiteral];
        for (const lit of literals) {
          entity.data.constants.push({
            id: constId++,
            name: lit.name,
            type: entity.data.name, // Use the enum's own name as the type
          });
        }
      }

      // Generalizations (Inheritance)
      if (pe.generalization) {
        for (const gen of toArray(pe.generalization)) {
          const generalId = gen.general;
          if (generalId && idMapping.has(generalId)) {
            addRelationship({
              id: generateTempId(),
              type: 'Inheritance',
              source: tempId, // Child
              target: idMapping.get(generalId), // Parent
              data: {},
            });
          }
        }
      }

      // Interface Realizations
      if (pe.interfaceRealization) {
        for (const impl of toArray(pe.interfaceRealization)) {
          const contractId = impl.contract;
          if (contractId && idMapping.has(contractId)) {
            addRelationship({
              id: generateTempId(),
              type: 'Implementation',
              source: tempId, // Class
              target: idMapping.get(contractId), // Interface
              data: {},
            });
          }
        }
      }
    }
  }

  // 3. Third pass: Associations & Dependencies
  for (const pe of allPackagedElements) {
    if (pe['xmi:type'] === 'uml:Association') {
      if (pe.memberEnd && pe.memberEnd.length >= 2) {
        const id1 = pe.memberEnd[0]['xmi:idref'];
        const id2 = pe.memberEnd[1]['xmi:idref'];

        const e1 = allEnds.get(id1);
        const e2 = allEnds.get(id2);

        if (e1 && e2) {
          // e1.type points to the class it references
          const cls1 = e1.type?.['xmi:idref'];
          const cls2 = e2.type?.['xmi:idref'];

          if (cls1 && cls2 && idMapping.has(cls1) && idMapping.has(cls2)) {
            let relType = 'Association';
            let sourceCls = cls1;
            let targetCls = cls2;
            let srcMult = '1';
            let tgtMult = '1';

            // Multiplicities (EA puts lowerValue/upperValue on ends)
            const getMult = (e: any) => {
              if (e.lowerValue && e.upperValue) {
                const low =
                  e.lowerValue.value !== undefined ? e.lowerValue.value : '0';
                const up =
                  e.upperValue.value !== undefined
                    ? e.upperValue.value
                    : e.upperValue['xmi:type']?.includes('Unlimited')
                    ? '*'
                    : '1';
                return low === up ? low : `${low}..${up}`;
              }
              return '1';
            };

            // In UML, if the end pointing to class X has aggregation='composite', it means class X is the Part.
            // Therefore, the other class is the Whole (sourceCls in UML2Code).
            if (
              e1.aggregation === 'composite' ||
              e2.aggregation === 'composite'
            ) {
              relType = 'Composition';
              if (e1.aggregation === 'composite') {
                sourceCls = cls2;
                targetCls = cls1;
              } else {
                sourceCls = cls1;
                targetCls = cls2;
              }
            } else if (
              e1.aggregation === 'shared' ||
              e2.aggregation === 'shared'
            ) {
              relType = 'Aggregation';
              if (e1.aggregation === 'shared') {
                sourceCls = cls2;
                targetCls = cls1;
              } else {
                sourceCls = cls1;
                targetCls = cls2;
              }
            }

            // The multiplicity on e1 belongs to cls1. The multiplicity on e2 belongs to cls2.
            const mult1 = getMult(e1);
            const mult2 = getMult(e2);

            srcMult = sourceCls === cls1 ? mult1 : mult2;
            tgtMult = targetCls === cls1 ? mult1 : mult2;

            addRelationship({
              id: generateTempId(),
              type: relType,
              source: idMapping.get(sourceCls),
              target: idMapping.get(targetCls),
              data: {
                label: pe.name || '',
                srcMultiplicity: srcMult,
                tgtMultiplicity: tgtMult,
              },
            });
          }
        }
      }
    } else if (pe['xmi:type'] === 'uml:Dependency') {
      const getRef = (node: any) => {
        if (!node) return null;
        if (typeof node === 'string') return node.split(' ')[0]; // Take first if space separated
        if (node['xmi:idref']) return node['xmi:idref'];
        return null;
      };

      const client = getRef(pe.client);
      const supplier = getRef(pe.supplier);

      if (
        client &&
        supplier &&
        idMapping.has(client) &&
        idMapping.has(supplier)
      ) {
        addRelationship({
          id: generateTempId(),
          type: 'Dependency',
          source: idMapping.get(client),
          target: idMapping.get(supplier),
          data: { label: pe.name || '' },
        });
      }
    }
  }

  // Process EAStubs if any
  try {
    const ext = xmi['xmi:Extension'];
    if (ext && ext.elements && ext.elements.element) {
      // Fallback processed implicitly
    }
  } catch (e) {}

  return { entities, relationships };
}
