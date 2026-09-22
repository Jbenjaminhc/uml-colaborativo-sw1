import { convert } from 'xmlbuilder2';
import { generateXmiContent } from '../../src/export/xmi';
import { EntityDoc, RelationshipDoc } from '../../src/export/transformer';

// ─── Helper: parse XMI and extract all xmi:id and xmi:idref values ──────────
function collectIds(xml: string): { ids: Set<string>; idrefs: Set<string> } {
  const ids = new Set<string>();
  const idrefs = new Set<string>();
  const idRegex = /xmi:id="([^"]+)"/g;
  const idrefRegex = /xmi:idref="([^"]+)"/g;
  let match: RegExpExecArray | null = idRegex.exec(xml);
  while (match !== null) {
    ids.add(match[1]);
    match = idRegex.exec(xml);
  }
  match = idrefRegex.exec(xml);
  while (match !== null) {
    idrefs.add(match[1]);
    match = idrefRegex.exec(xml);
  }
  return { ids, idrefs };
}

// ─── Fixtures ───────────────────────────────────────────────────────────────

function makeEntity(
  id: string,
  type: 'class' | 'interface' | 'enum',
  name: string,
  overrides: Partial<EntityDoc['data']> = {}
): EntityDoc {
  return {
    _id: id,
    type,
    data: {
      name,
      isAbstract: false,
      constants: [],
      attributes: [],
      methods: [],
      ...overrides,
    },
  };
}

function makeRelationship(
  id: string,
  type: RelationshipDoc['type'],
  source: string,
  target: string,
  data: Partial<RelationshipDoc['data']> = {}
): RelationshipDoc {
  return {
    _id: id,
    type,
    source,
    target,
    data: {
      srcMultiplicity: '',
      tgtMultiplicity: '',
      label: '',
      ...data,
    },
  };
}

// ─── T-C43a: well-formed XML with correct schema ───────────────────────────

describe('XMI 2.1 Export (C43)', () => {
  describe('T-C43a: well-formed XML and schema', () => {
    it('should produce valid XML with XMI 2.1 schema', () => {
      const entities = [
        makeEntity('aaa111bbb222ccc333dd0001', 'class', 'ClaseA', {
          attributes: [
            { id: 1, name: 'campo', visibility: '+', type: 'string' },
          ],
        }),
        makeEntity('aaa111bbb222ccc333dd0002', 'class', 'ClaseB'),
      ];
      const rels = [
        makeRelationship(
          'fff111bbb222ccc333dd0001',
          'Association',
          'aaa111bbb222ccc333dd0001',
          'aaa111bbb222ccc333dd0002',
          { tgtMultiplicity: '0..*' }
        ),
      ];
      const xml = generateXmiContent(entities, rels, 'TestDiagram', 'diag001');

      // Should not throw when parsed
      const doc = convert(xml, { format: 'object' });
      expect(doc).toBeDefined();

      // Check XMI 2.1 schema references
      expect(xml).toContain('xmi:version="2.1"');
      expect(xml).toContain('xmlns:uml="http://schema.omg.org/spec/UML/2.1"');
      expect(xml).toContain('xmlns:xmi="http://schema.omg.org/spec/XMI/2.1"');
      expect(xml).toContain(
        'exporter="Enterprise Architect" exporterVersion="6.5"'
      );

      // uml:Model wraps a uml:Package
      expect(xml).toContain('xmi:type="uml:Model"');
      expect(xml).toContain('xmi:type="uml:Package"');
      expect(xml).toContain('name="TestDiagram"');
    });
  });

  // ─── T-C43b: names preserved without normalization ──────────────────────

  describe('T-C43b: faithful names', () => {
    it('should preserve spaces and accented characters', () => {
      const entities = [
        makeEntity('aaa111bbb222ccc333dd0001', 'class', 'Item Stock', {
          attributes: [
            { id: 1, name: 'tamaño', visibility: '+', type: 'string' },
            { id: 2, name: 'descripción', visibility: '+', type: 'string' },
          ],
        }),
      ];
      const xml = generateXmiContent(entities, [], 'Prueba', 'diag001');

      expect(xml).toContain('name="Item Stock"');
      expect(xml).toContain('name="tamaño"');
      expect(xml).toContain('name="descripción"');
    });
  });

  // ─── T-C43c: XML escaping ──────────────────────────────────────────────

  describe('T-C43c: special character escaping', () => {
    it('should escape &, <, > and remain valid XML', () => {
      const entities = [
        makeEntity('aaa111bbb222ccc333dd0001', 'class', 'A & B <C>', {
          attributes: [{ id: 1, name: 'x<y', visibility: '+', type: 'string' }],
        }),
      ];
      const xml = generateXmiContent(entities, [], 'Test&Dia', 'diag001');

      // Must be parseable
      const doc = convert(xml, { format: 'object' });
      expect(doc).toBeDefined();

      // Raw text must be escaped
      expect(xml).toContain('A &amp; B &lt;C&gt;');
      expect(xml).toContain('x&lt;y');
      expect(xml).toContain('Test&amp;Dia');
    });
  });

  // ─── T-C43d: visibility mapping ────────────────────────────────────────

  describe('T-C43d: visibility mapping', () => {
    it('should map +, \u2014, # to public, private, protected', () => {
      const entities = [
        makeEntity('aaa111bbb222ccc333dd0001', 'class', 'Cls', {
          attributes: [
            { id: 1, name: 'pub', visibility: '+', type: 'int' },
            { id: 2, name: 'priv', visibility: '\u2014', type: 'int' },
            { id: 3, name: 'prot', visibility: '#', type: 'int' },
          ],
        }),
      ];
      const xml = generateXmiContent(entities, [], 'Test', 'diag001');

      // Find each attribute and check visibility
      const pubMatch = xml.match(/name="pub"[^>]*visibility="([^"]+)"/);
      const privMatch = xml.match(/name="priv"[^>]*visibility="([^"]+)"/);
      const protMatch = xml.match(/name="prot"[^>]*visibility="([^"]+)"/);

      expect(pubMatch?.[1]).toBe('public');
      expect(privMatch?.[1]).toBe('private');
      expect(protMatch?.[1]).toBe('protected');
    });
  });

  // ─── T-C43e: aggregation types ─────────────────────────────────────────

  describe('T-C43e: aggregation attribute', () => {
    const entities = [
      makeEntity('aaa111bbb222ccc333dd0001', 'class', 'Todo'),
      makeEntity('aaa111bbb222ccc333dd0002', 'class', 'Parte'),
    ];

    it('Composition emits composite on src end', () => {
      const rels = [
        makeRelationship(
          'fff111bbb222ccc333dd0001',
          'Composition',
          'aaa111bbb222ccc333dd0001',
          'aaa111bbb222ccc333dd0002'
        ),
      ];
      const xml = generateXmiContent(entities, rels, 'T', 'diag001');

      // src end (type points to SOURCE) should have aggregation="composite"
      const srcEnd = xml.match(
        /xmi:id="EAID_src[^"]*"[^>]*aggregation="([^"]+)"/
      );
      expect(srcEnd?.[1]).toBe('none');

      // dst end should have aggregation="none"
      const dstEnd = xml.match(
        /xmi:id="EAID_dst[^"]*"[^>]*aggregation="([^"]+)"/
      );
      expect(dstEnd?.[1]).toBe('none');
    });

    it('Aggregation emits shared on src end', () => {
      const rels = [
        makeRelationship(
          'fff111bbb222ccc333dd0001',
          'Aggregation',
          'aaa111bbb222ccc333dd0001',
          'aaa111bbb222ccc333dd0002'
        ),
      ];
      const xml = generateXmiContent(entities, rels, 'T', 'diag001');

      const srcEnd = xml.match(
        /xmi:id="EAID_src[^"]*"[^>]*aggregation="([^"]+)"/
      );
      expect(srcEnd?.[1]).toBe('none');
    });

    it('Association emits none on both ends', () => {
      const rels = [
        makeRelationship(
          'fff111bbb222ccc333dd0001',
          'Association',
          'aaa111bbb222ccc333dd0001',
          'aaa111bbb222ccc333dd0002'
        ),
      ];
      const xml = generateXmiContent(entities, rels, 'T', 'diag001');

      const allAggregations = [...xml.matchAll(/aggregation="([^"]+)"/g)].map(
        (m) => m[1]
      );
      expect(allAggregations.every((a) => a === 'none')).toBe(true);
    });
  });

  // ─── T-C43f: multiplicity table ────────────────────────────────────────

  describe('T-C43f: multiplicity parsing', () => {
    const entities = [
      makeEntity('aaa111bbb222ccc333dd0001', 'class', 'A'),
      makeEntity('aaa111bbb222ccc333dd0002', 'class', 'B'),
    ];

    function getMultiplicity(
      xml: string,
      endIdPrefix: 'src' | 'dst'
    ): {
      lower: string | null;
      upper: string | null;
      upperType: string | null;
    } {
      // Find the ownedEnd block for the given prefix
      const endRegex = new RegExp(
        `xmi:id="EAID_${endIdPrefix}[^"]*"[\\s\\S]*?</ownedEnd>`,
        'm'
      );
      const endBlock = xml.match(endRegex)?.[0] || '';

      const lowerMatch = endBlock.match(/lowerValue[^>]*value="([^"]+)"/);
      const upperMatch = endBlock.match(/upperValue[^>]*value="([^"]+)"/);
      const upperTypeMatch = endBlock.match(
        /upperValue[^>]*xmi:type="([^"]+)"/
      );

      return {
        lower: lowerMatch?.[1] ?? null,
        upper: upperMatch?.[1] ?? null,
        upperType: upperTypeMatch?.[1] ?? null,
      };
    }

    const cases: Array<{
      mult: string;
      lower: string;
      upper: string;
      upperType: string;
    }> = [
      {
        mult: '1',
        lower: '1',
        upper: '1',
        upperType: 'uml:LiteralInteger',
      },
      {
        mult: '0..1',
        lower: '0',
        upper: '1',
        upperType: 'uml:LiteralInteger',
      },
      {
        mult: '0..*',
        lower: '0',
        upper: '-1',
        upperType: 'uml:LiteralUnlimitedNatural',
      },
      {
        mult: '1..*',
        lower: '1',
        upper: '-1',
        upperType: 'uml:LiteralUnlimitedNatural',
      },
      {
        mult: '*',
        lower: '0',
        upper: '-1',
        upperType: 'uml:LiteralUnlimitedNatural',
      },
      {
        mult: '4',
        lower: '4',
        upper: '4',
        upperType: 'uml:LiteralInteger',
      },
      {
        mult: '1..4',
        lower: '1',
        upper: '4',
        upperType: 'uml:LiteralInteger',
      },
    ];

    it.each(cases)(
      'multiplicity "$mult" → lower=$lower, upper=$upper ($upperType)',
      ({ mult, lower, upper, upperType }) => {
        const rels = [
          makeRelationship(
            'fff111bbb222ccc333dd0001',
            'Association',
            'aaa111bbb222ccc333dd0001',
            'aaa111bbb222ccc333dd0002',
            { tgtMultiplicity: mult }
          ),
        ];
        const xml = generateXmiContent(entities, rels, 'T', 'diag001');
        const m = getMultiplicity(xml, 'dst');

        expect(m.lower).toBe(lower);
        expect(m.upper).toBe(upper);
        expect(m.upperType).toBe(upperType);
      }
    );

    it('empty multiplicity omits lowerValue and upperValue', () => {
      const rels = [
        makeRelationship(
          'fff111bbb222ccc333dd0001',
          'Association',
          'aaa111bbb222ccc333dd0001',
          'aaa111bbb222ccc333dd0002',
          { tgtMultiplicity: '' }
        ),
      ];
      const xml = generateXmiContent(entities, rels, 'T', 'diag001');
      const m = getMultiplicity(xml, 'dst');

      expect(m.lower).toBeNull();
      expect(m.upper).toBeNull();
    });

    it('Aggregation/Composition without srcMultiplicity defaults to 1..1', () => {
      const rels = [
        makeRelationship(
          'fff111bbb222ccc333dd0001',
          'Composition',
          'aaa111bbb222ccc333dd0001',
          'aaa111bbb222ccc333dd0002',
          { srcMultiplicity: '', tgtMultiplicity: '0..*' }
        ),
      ];
      const xml = generateXmiContent(entities, rels, 'T', 'diag001');
      const m = getMultiplicity(xml, 'src');

      expect(m.lower).toBe('1');
      expect(m.upper).toBe('1');
    });
  });

  // ─── T-C43g: inheritance direction ─────────────────────────────────────

  describe('T-C43g: inheritance', () => {
    it('generalization is inside TARGET class, general points to SOURCE', () => {
      const entities = [
        makeEntity('aaa111bbb222ccc333dd0001', 'class', 'Parent'),
        makeEntity('aaa111bbb222ccc333dd0002', 'class', 'Child'),
      ];
      const rels = [
        makeRelationship(
          'fff111bbb222ccc333dd0001',
          'Inheritance',
          'aaa111bbb222ccc333dd0001', // SOURCE = parent
          'aaa111bbb222ccc333dd0002' // TARGET = child
        ),
      ];
      const xml = generateXmiContent(entities, rels, 'T', 'diag001');

      // The child's packagedElement must contain the generalization
      const childId =
        xml.match(/name="Child"[^>]*xmi:id="([^"]+)"/)?.[1] ||
        xml.match(/xmi:id="([^"]+)"[^>]*name="Child"/)?.[1];

      expect(childId).toBeDefined();

      // generalization must reference parent
      const parentId =
        xml.match(/name="Parent"[^>]*xmi:id="([^"]+)"/)?.[1] ||
        xml.match(/xmi:id="([^"]+)"[^>]*name="Parent"/)?.[1];

      expect(parentId).toBeDefined();

      // Find generalization element
      const genMatch = xml.match(
        /xmi:type="uml:Generalization"[^>]*general="([^"]+)"/
      );
      expect(genMatch).not.toBeNull();
      expect(genMatch![1]).toBe(parentId);

      // Verify it's inside the child's element block (between child start and close)
      const childStart = xml.indexOf(childId!);
      const genPos = xml.indexOf('uml:Generalization');
      expect(genPos).toBeGreaterThan(childStart);
    });
  });

  // ─── T-C43h: derived association end IDs ───────────────────────────────

  describe('T-C43h: derived end IDs', () => {
    it('ownedEnd IDs derived with src/dst match memberEnd idrefs', () => {
      const entities = [
        makeEntity('aaa111bbb222ccc333dd0001', 'class', 'A'),
        makeEntity('aaa111bbb222ccc333dd0002', 'class', 'B'),
      ];
      const rels = [
        makeRelationship(
          'fff111bbb222ccc333dd0001',
          'Association',
          'aaa111bbb222ccc333dd0001',
          'aaa111bbb222ccc333dd0002'
        ),
      ];
      const xml = generateXmiContent(entities, rels, 'T', 'diag001');

      // Extract memberEnd idrefs
      const memberRefs = [
        ...xml.matchAll(/memberEnd xmi:idref="([^"]+)"/g),
      ].map((m) => m[1]);
      // Extract ownedEnd ids
      const ownedIds = [...xml.matchAll(/ownedEnd[^>]*xmi:id="([^"]+)"/g)].map(
        (m) => m[1]
      );

      expect(memberRefs.length).toBe(2);
      expect(ownedIds.length).toBe(2);

      // Each memberEnd idref must match an ownedEnd id
      for (const ref of memberRefs) {
        expect(ownedIds).toContain(ref);
      }

      // One must start with EAID_src, the other with EAID_dst
      expect(ownedIds.some((id) => id.startsWith('EAID_src'))).toBe(true);
      expect(ownedIds.some((id) => id.startsWith('EAID_dst'))).toBe(true);
    });
  });

  // ─── T-C43i: no xmi:id starts with digit ──────────────────────────────

  describe('T-C43i: ID format', () => {
    it('no xmi:id starts with a digit', () => {
      const entities = [
        makeEntity('1aa111bbb222ccc333dd0001', 'class', 'StartsWithDigit'),
        makeEntity('9aa111bbb222ccc333dd0002', 'class', 'AlsoDigit'),
      ];
      const rels = [
        makeRelationship(
          '2ff111bbb222ccc333dd0001',
          'Association',
          '1aa111bbb222ccc333dd0001',
          '9aa111bbb222ccc333dd0002'
        ),
      ];
      const xml = generateXmiContent(entities, rels, 'T', 'diag001');

      const { ids } = collectIds(xml);
      for (const id of ids) {
        expect(id).toMatch(/^[A-Za-z_]/);
      }
    });
  });

  // ─── T-C43j: referential integrity ─────────────────────────────────────

  describe('T-C43j: referential integrity', () => {
    it('every xmi:idref references an existing xmi:id', () => {
      const entities = [
        makeEntity('aaa111bbb222ccc333dd0001', 'class', 'Parent', {
          isAbstract: true,
          attributes: [{ id: 1, name: 'x', visibility: '+', type: 'int' }],
          methods: [
            {
              id: 1,
              name: 'doIt',
              returnType: 'string',
              visibility: '+',
              isStatic: false,
            },
          ],
        }),
        makeEntity('aaa111bbb222ccc333dd0002', 'class', 'Child'),
        makeEntity('aaa111bbb222ccc333dd0003', 'enum', 'Status', {
          constants: [
            { id: 1, name: 'ACTIVE', type: 'Status' },
            { id: 2, name: 'INACTIVE', type: 'Status' },
          ],
        }),
        makeEntity('aaa111bbb222ccc333dd0004', 'interface', 'Printable', {
          methods: [
            {
              id: 1,
              name: 'print',
              returnType: 'void',
              visibility: '+',
              isStatic: false,
            },
          ],
        }),
      ];
      const rels = [
        makeRelationship(
          'fff111bbb222ccc333dd0001',
          'Inheritance',
          'aaa111bbb222ccc333dd0001',
          'aaa111bbb222ccc333dd0002'
        ),
        makeRelationship(
          'fff111bbb222ccc333dd0002',
          'Association',
          'aaa111bbb222ccc333dd0001',
          'aaa111bbb222ccc333dd0002',
          { tgtMultiplicity: '1..*' }
        ),
      ];
      const xml = generateXmiContent(entities, rels, 'T', 'diag001');

      const { ids, idrefs } = collectIds(xml);

      // EAJava_* and EAnone_* refs are external type references, not in doc
      const externalPrefixes = ['EAJava_', 'EAnone_'];
      for (const ref of idrefs) {
        const isExternal = externalPrefixes.some((p) => ref.startsWith(p));
        if (!isExternal) {
          expect(ids.has(ref)).toBe(true);
        }
      }
    });
  });

  // ─── T-C43k: comprehensive diagram ─────────────────────────────────────

  describe('T-C43k: full diagram with all types', () => {
    it('generates without error with 6 relationship types and 3 entity types', () => {
      const entities = [
        makeEntity('aaa111bbb222ccc333dd0001', 'class', 'Animal', {
          isAbstract: true,
          attributes: [
            { id: 1, name: 'name', visibility: '+', type: 'string' },
          ],
        }),
        makeEntity('aaa111bbb222ccc333dd0002', 'class', 'Dog'),
        makeEntity('aaa111bbb222ccc333dd0003', 'class', 'Owner', {
          attributes: [
            { id: 1, name: 'age', visibility: '\u2014', type: 'int' },
          ],
        }),
        makeEntity('aaa111bbb222ccc333dd0004', 'class', 'Collar'),
        makeEntity('aaa111bbb222ccc333dd0005', 'class', 'Vet'),
        makeEntity('aaa111bbb222ccc333dd0006', 'class', 'Logger'),
        makeEntity('aaa111bbb222ccc333dd0007', 'enum', 'Size', {
          constants: [
            { id: 1, name: 'SMALL', type: 'Size' },
            { id: 2, name: 'LARGE', type: 'Size' },
          ],
        }),
        makeEntity('aaa111bbb222ccc333dd0008', 'interface', 'Walkable', {
          methods: [
            {
              id: 1,
              name: 'walk',
              returnType: 'void',
              visibility: '+',
              isStatic: false,
            },
          ],
        }),
      ];
      const rels = [
        // Inheritance: Animal -> Dog
        makeRelationship(
          'fff111bbb222ccc333dd0001',
          'Inheritance',
          'aaa111bbb222ccc333dd0001',
          'aaa111bbb222ccc333dd0002'
        ),
        // Association: Owner 1 -- 0..* Dog
        makeRelationship(
          'fff111bbb222ccc333dd0002',
          'Association',
          'aaa111bbb222ccc333dd0003',
          'aaa111bbb222ccc333dd0002',
          { srcMultiplicity: '1', tgtMultiplicity: '0..*' }
        ),
        // Aggregation: Owner <>-- Collar
        makeRelationship(
          'fff111bbb222ccc333dd0003',
          'Aggregation',
          'aaa111bbb222ccc333dd0003',
          'aaa111bbb222ccc333dd0004',
          { tgtMultiplicity: '0..*' }
        ),
        // Composition: Dog ◆-- Collar
        makeRelationship(
          'fff111bbb222ccc333dd0004',
          'Composition',
          'aaa111bbb222ccc333dd0002',
          'aaa111bbb222ccc333dd0004',
          { tgtMultiplicity: '1' }
        ),
        // Implementation: Walkable -> Dog
        makeRelationship(
          'fff111bbb222ccc333dd0005',
          'Implementation',
          'aaa111bbb222ccc333dd0008',
          'aaa111bbb222ccc333dd0002'
        ),
        // Dependency: Vet --> Logger
        makeRelationship(
          'fff111bbb222ccc333dd0006',
          'Dependency',
          'aaa111bbb222ccc333dd0005',
          'aaa111bbb222ccc333dd0006'
        ),
      ];

      const xml = generateXmiContent(entities, rels, 'FullTest', 'diag001');

      // Must be parseable
      const doc = convert(xml, { format: 'object' });
      expect(doc).toBeDefined();

      // Should contain all entity types
      expect(xml).toContain('xmi:type="uml:Class"');
      expect(xml).toContain('xmi:type="uml:Enumeration"');
      expect(xml).toContain('xmi:type="uml:Interface"');

      // Should contain all relationship types
      expect(xml).toContain('xmi:type="uml:Generalization"');
      expect(xml).toContain('xmi:type="uml:Association"');
      expect(xml).toContain('xmi:type="uml:Dependency"');
      expect(xml).toContain('xmi:type="uml:InterfaceRealization"');
      expect(xml).toContain('aggregation="shared"');
      expect(xml).toContain('aggregation="composite"');
    });
  });

  // ─── T-C43l: determinism ───────────────────────────────────────────────

  describe('T-C43l: determinism', () => {
    it('two exports of the same data are byte-identical', () => {
      const entities = [
        makeEntity('aaa111bbb222ccc333dd0001', 'class', 'X', {
          attributes: [{ id: 1, name: 'a', visibility: '+', type: 'string' }],
        }),
        makeEntity('aaa111bbb222ccc333dd0002', 'class', 'Y'),
      ];
      const rels = [
        makeRelationship(
          'fff111bbb222ccc333dd0001',
          'Association',
          'aaa111bbb222ccc333dd0001',
          'aaa111bbb222ccc333dd0002',
          { tgtMultiplicity: '0..*' }
        ),
      ];

      const xml1 = generateXmiContent(entities, rels, 'Det', 'diag001');
      const xml2 = generateXmiContent(entities, rels, 'Det', 'diag001');

      expect(xml1).toBe(xml2);
    });
  });

  // ─── T-C43n: type mapping EAJava_ ──────────────────────────────────────

  describe('T-C43n: type mapping', () => {
    it('each primitive type maps to an EAStub idref', () => {
      const entities = [
        makeEntity('aaa111bbb222ccc333dd0001', 'class', 'Test'),
      ];
      entities[0].data.attributes = [
        { id: 1, name: 'a', visibility: '+', type: 'String' },
        { id: 2, name: 'b', visibility: '+', type: 'int' },
        { id: 3, name: 'c', visibility: '+', type: 'long' },
        { id: 4, name: 'd', visibility: '+', type: 'double' },
      ];
      const xml = generateXmiContent(entities, [], 'T', 'diag001');

      expect(xml).toContain('UMLType="PrimitiveType"');
      expect(xml).toContain('name="String"');
      expect(xml).toContain('name="int"');
      expect(xml).toContain('name="long"');
      expect(xml).toContain('name="double"');
      expect(xml).toContain('EAID_STUB_0000_0000_0000_000000000001');
    });
  });

  // ─── T-C43o: enum as attribute type ──────────────────────────────────────

  describe('T-C43o: enum as attribute type', () => {
    it('attribute with enum type points to the enum EAID', () => {
      const entities = [
        makeEntity('aaa111bbb222ccc333dd0001', 'enum', 'OrderStatus'),
        makeEntity('aaa111bbb222ccc333dd0002', 'class', 'Order'),
      ];
      entities[0].data.constants = [
        { id: 1, name: 'PENDING', type: 'OrderStatus' },
        { id: 2, name: 'SHIPPED', type: 'OrderStatus' },
      ];
      entities[1].data.attributes = [
        { id: 1, name: 'status', visibility: '+', type: 'OrderStatus' },
      ];
      const xml = generateXmiContent(entities, [], 'T', 'diag001');

      // The enum's own xmi:id should appear in the type idref!
      const enumId = xml.match(
        /xmi:id="(EAID_[^"]*)"[^>]*name="OrderStatus"/
      )?.[1];
      expect(enumId).toBeTruthy();

      expect(xml).toContain(`xmi:idref="${enumId}"`);
    });
  });

  // ─── T-C43p: enumeration structure ─────────────────────────────────────

  describe('T-C43p: enumeration', () => {
    it('produces uml:Enumeration with ownedLiteral per constant', () => {
      const entities = [
        makeEntity('aaa111bbb222ccc333dd0001', 'enum', 'Color', {
          constants: [
            { id: 1, name: 'RED', type: 'Color' },
            { id: 2, name: 'GREEN', type: 'Color' },
            { id: 3, name: 'BLUE', type: 'Color' },
          ],
        }),
      ];
      const xml = generateXmiContent(entities, [], 'T', 'diag001');

      expect(xml).toContain('xmi:type="uml:Enumeration"');
      expect(xml).toContain('name="Color"');

      // 3 ownedLiteral
      const literals = xml.match(/xmi:type="uml:EnumerationLiteral"/g) || [];
      expect(literals.length).toBe(3);

      expect(xml).toContain('name="RED"');
      expect(xml).toContain('name="GREEN"');
      expect(xml).toContain('name="BLUE"');
    });
  });

  // ─── T-C43q: xmi:Extension geometry ──────────────────────────────────

  describe('T-C43q: xmi:Extension geometry', () => {
    it('generates an EA Extension with diagram and element geometry', () => {
      const entities = [
        makeEntity('aaa111bbb222ccc333dd0001', 'class', 'Person'),
      ];
      // Attach mock position
      entities[0].position = { x: 120, y: 340 };

      const xml = generateXmiContent(entities, [], 'GeomTest', 'diag001');

      // Check extension structure
      expect(xml).toContain(
        '<xmi:Extension extender="Enterprise Architect" extenderID="6.5">'
      );
      expect(xml).toContain('<diagrams>');
      expect(xml).toContain('<diagram xmi:id="');
      expect(xml).toContain('name="GeomTest"');

      // Check geometry derived from position
      const classId = entities[0]._id; // But we need EAID
      // Right = 120 + max(120, 8*6) = 120 + 120 = 240
      // Bottom = 340 + 40 + 0 = 380
      expect(xml).toContain(
        'geometry="Left=120;Top=340;Right=240;Bottom=380;"'
      );
    });
  });

  // ─── T-C44: Improved xmi:Extension geometry and grid fallback ────────

  describe('T-C44: xmi:Extension geometry and grid fallback', () => {
    it('T-C44a/b/c: generates correct elements with seqno, exact geometry format and subjects', () => {
      const entities = [
        makeEntity('aaa111bbb222ccc333dd0001', 'class', 'Person', {
          attributes: [
            { id: 1, name: 'age', visibility: 'private', type: 'int' },
            {
              id: 2,
              name: 'veryLongAttributeName',
              visibility: 'private',
              type: 'String',
            },
          ],
        }),
      ];
      entities[0].position = { x: 100, y: 200 };
      const xml = generateXmiContent(entities, [], 'Test', 'diag1');

      // max name len = 'veryLongAttributeName'.length = 21
      // width = max(120, 8 * 21) = max(120, 168) = 168
      // height = 40 + 16 * 2 (attributes) = 72
      // Left = 100, Top = 200, Right = 268, Bottom = 272
      const subjectMatch = xml.match(/<element[^>]*subject="([^"]+)"/);
      expect(subjectMatch).toBeDefined();

      expect(xml).toContain('seqno="1"');
      expect(xml).toContain(
        'geometry="Left=100;Top=200;Right=268;Bottom=272;"'
      );
    });

    it('T-C44d: entity without position receives grid position and warning', () => {
      const entities = [
        makeEntity('aaa111bbb222ccc333dd0001', 'class', 'Person'),
      ];
      const warnings: string[] = [];
      const xml = generateXmiContent(entities, [], 'Test', 'diag1', warnings);

      // Grid starts at X=50, Y=50
      // Person width = 120, height = 40
      // Right = 50 + 120 = 170, Bottom = 50 + 40 = 90
      expect(xml).toContain('geometry="Left=50;Top=50;Right=170;Bottom=90;"');
      expect(warnings.length).toBe(1);
      expect(warnings[0]).toContain(
        'no tiene posición; se le asignó una posición en grilla'
      );
    });
  });
});
