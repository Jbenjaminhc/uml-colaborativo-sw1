import {
  transform,
  EntityDoc,
  RelationshipDoc,
} from '../../src/export/transformer.js';
import {
  IntermediateModel,
  JavaClass,
  JavaInterface,
  JavaEnum,
} from '../../src/export/types.js';

describe('transformer', () => {
  it('should transform a basic class with attributes and methods', () => {
    const entities: EntityDoc[] = [
      {
        _id: '1',
        type: 'class',
        data: {
          name: 'User',
          attributes: [
            { id: 1, name: 'username', visibility: 'public', type: 'String' },
          ],
          methods: [
            {
              id: 1,
              name: 'login',
              returnType: 'boolean',
              visibility: 'public',
              isStatic: false,
            },
          ],
        },
      },
    ];

    const model = transform(entities, []);
    expect(model.classes).toHaveLength(1);
    expect(model.classes[0].className).toBe('User');
    expect(model.classes[0].fields).toHaveLength(2); // ID + username
    expect(model.classes[0].methods).toHaveLength(1);
    expect(model.classes[0].methods[0].name).toBe('login');
  });

  it('should transform an abstract class', () => {
    const entities: EntityDoc[] = [
      {
        _id: '1',
        type: 'class',
        data: {
          name: 'BaseEntity',
          isAbstract: true,
          attributes: [
            { id: 1, name: 'id', visibility: 'private', type: 'Long' },
          ],
        },
      },
    ];

    const model = transform(entities, []);
    expect(model.classes[0].isAbstract).toBe(true);
  });

  it('should transform an interface', () => {
    const entities: EntityDoc[] = [
      {
        _id: '1',
        type: 'interface',
        data: {
          name: 'Runnable',
          methods: [
            {
              id: 1,
              name: 'run',
              returnType: 'void',
              visibility: 'public',
              isStatic: false,
            },
          ],
        },
      },
    ];

    const model = transform(entities, []);
    expect(model.interfaces).toHaveLength(1);
    expect(model.interfaces[0].interfaceName).toBe('Runnable');
    expect(model.interfaces[0].methods).toHaveLength(1);
  });

  it('should transform an enum with constants', () => {
    const entities: EntityDoc[] = [
      {
        _id: '1',
        type: 'enum',
        data: {
          name: 'Status',
          constants: [
            { id: 1, name: 'active', type: '' },
            { id: 2, name: 'IN_ACTIVE', type: '' },
          ],
        },
      },
    ];

    const model = transform(entities, []);
    expect(model.enums).toHaveLength(1);
    expect(model.enums[0].enumName).toBe('Status');
    expect(model.enums[0].constants).toEqual(['ACTIVE', 'IN_ACTIVE']);
  });

  it('should process inheritance relationship', () => {
    const entities: EntityDoc[] = [
      {
        _id: '1',
        type: 'class',
        data: {
          name: 'Parent',
          attributes: [
            { id: 1, name: 'id', visibility: 'private', type: 'Long' },
          ],
        },
      },
      {
        _id: '2',
        type: 'class',
        data: {
          name: 'Child',
          attributes: [
            { id: 1, name: 'id', visibility: 'private', type: 'Long' },
          ],
        },
      },
    ];
    const rels: RelationshipDoc[] = [
      { _id: 'r1', type: 'Inheritance', source: '1', target: '2', data: {} },
    ];

    const model = transform(entities, rels);
    const parent = model.classes.find(
      (c: JavaClass) => c.className === 'Parent'
    )!;
    const child = model.classes.find(
      (c: JavaClass) => c.className === 'Child'
    )!;

    expect(child.extendsClass).toBe('Parent');
    expect(child.isSubclass).toBe(true);
    expect(child.discriminatorAnnotations).toContain(
      '@DiscriminatorValue("Child")'
    );
    expect(parent.discriminatorAnnotations).toContain(
      '@Inheritance(strategy = InheritanceType.SINGLE_TABLE)'
    );
    expect(parent.discriminatorAnnotations).toContain(
      '@DiscriminatorColumn(name = "dtype")'
    );
  });

  it('should process implementation relationship', () => {
    const entities: EntityDoc[] = [
      {
        _id: '1',
        type: 'class',
        data: {
          name: 'Worker',
          attributes: [
            { id: 1, name: 'id', visibility: 'private', type: 'Long' },
          ],
        },
      },
      { _id: '2', type: 'interface', data: { name: 'Runnable' } },
    ];
    const rels: RelationshipDoc[] = [
      { _id: 'r1', type: 'Implementation', source: '2', target: '1', data: {} },
    ];

    const model = transform(entities, rels);
    const worker = model.classes.find(
      (c: JavaClass) => c.className === 'Worker'
    )!;
    expect(worker.implementsInterfaces).toContain('Runnable');
  });

  it('should add warning for implementation with non-interface target', () => {
    const entities: EntityDoc[] = [
      {
        _id: '1',
        type: 'class',
        data: {
          name: 'Worker',
          attributes: [
            { id: 1, name: 'id', visibility: 'private', type: 'Long' },
          ],
        },
      },
      {
        _id: '2',
        type: 'class',
        data: {
          name: 'NotInterface',
          attributes: [
            { id: 1, name: 'id', visibility: 'private', type: 'Long' },
          ],
        },
      },
    ];
    const rels: RelationshipDoc[] = [
      { _id: 'r1', type: 'Implementation', source: '2', target: '1', data: {} },
    ];

    const model = transform(entities, rels);
    expect(model.warnings).toContainEqual(
      expect.objectContaining({ code: 'INVALID_IMPLEMENTATION' })
    );
  });

  it('should process dependency relationship', () => {
    const entities: EntityDoc[] = [
      {
        _id: '1',
        type: 'class',
        data: {
          name: 'A',
          attributes: [
            { id: 1, name: 'id', visibility: 'private', type: 'Long' },
          ],
        },
      },
      {
        _id: '2',
        type: 'class',
        data: {
          name: 'B',
          attributes: [
            { id: 1, name: 'id', visibility: 'private', type: 'Long' },
          ],
        },
      },
    ];
    const rels: RelationshipDoc[] = [
      { _id: 'r1', type: 'Dependency', source: '1', target: '2', data: {} },
    ];

    const model = transform(entities, rels);
    expect(model.warnings).toContainEqual(
      expect.objectContaining({ code: 'DEPENDENCY_MAPPED_AS_COMMENT' })
    );
  });

  it('should process association with 1-*', () => {
    const entities: EntityDoc[] = [
      {
        _id: '1',
        type: 'class',
        data: {
          name: 'Department',
          attributes: [
            { id: 1, name: 'id', visibility: 'private', type: 'Long' },
          ],
        },
      },
      {
        _id: '2',
        type: 'class',
        data: {
          name: 'Employee',
          attributes: [
            { id: 1, name: 'id', visibility: 'private', type: 'Long' },
          ],
        },
      },
    ];
    const rels: RelationshipDoc[] = [
      {
        _id: 'r1',
        type: 'Association',
        source: '1',
        target: '2',
        data: { srcMultiplicity: '1', tgtMultiplicity: '*' },
      },
    ];

    const model = transform(entities, rels);
    const dept = model.classes.find(
      (c: JavaClass) => c.className === 'Department'
    )!;
    const emp = model.classes.find(
      (c: JavaClass) => c.className === 'Employee'
    )!;

    expect(dept.relationFields).toHaveLength(1);
    expect(dept.relationFields[0].fieldType).toBe('List<Employee>');
    expect(emp.relationFields).toHaveLength(1);
    expect(emp.relationFields[0].fieldType).toBe('Department');
  });

  it('should add warning for relation to nonexistent entity', () => {
    const entities: EntityDoc[] = [
      {
        _id: '1',
        type: 'class',
        data: {
          name: 'A',
          attributes: [
            { id: 1, name: 'id', visibility: 'private', type: 'Long' },
          ],
        },
      },
    ];
    const rels: RelationshipDoc[] = [
      { _id: 'r1', type: 'Association', source: '1', target: '99', data: {} },
    ];

    const model = transform(entities, rels);
    expect(model.warnings).toContainEqual(
      expect.objectContaining({ code: 'MISSING_ENTITY' })
    );
  });

  it('should break cyclic inheritance and add warning', () => {
    const entities: EntityDoc[] = [
      {
        _id: '1',
        type: 'class',
        data: {
          name: 'A',
          attributes: [
            { id: 1, name: 'id', visibility: 'private', type: 'Long' },
          ],
        },
      },
      {
        _id: '2',
        type: 'class',
        data: {
          name: 'B',
          attributes: [
            { id: 1, name: 'id', visibility: 'private', type: 'Long' },
          ],
        },
      },
    ];
    const rels: RelationshipDoc[] = [
      { _id: 'r1', type: 'Inheritance', source: '1', target: '2', data: {} },
      { _id: 'r2', type: 'Inheritance', source: '2', target: '1', data: {} },
    ];

    const model = transform(entities, rels);
    expect(model.warnings).toContainEqual(
      expect.objectContaining({ code: 'CYCLIC_INHERITANCE' })
    );
  });

  it('should handle multiple inheritance by keeping first and adding warning', () => {
    const entities: EntityDoc[] = [
      {
        _id: '1',
        type: 'class',
        data: {
          name: 'Child',
          attributes: [
            { id: 1, name: 'id', visibility: 'private', type: 'Long' },
          ],
        },
      },
      {
        _id: '2',
        type: 'class',
        data: {
          name: 'Parent1',
          attributes: [
            { id: 1, name: 'id', visibility: 'private', type: 'Long' },
          ],
        },
      },
      {
        _id: '3',
        type: 'class',
        data: {
          name: 'Parent2',
          attributes: [
            { id: 1, name: 'id', visibility: 'private', type: 'Long' },
          ],
        },
      },
    ];
    const rels: RelationshipDoc[] = [
      { _id: 'r1', type: 'Inheritance', source: '2', target: '1', data: {} },
      { _id: 'r2', type: 'Inheritance', source: '3', target: '1', data: {} },
    ];
    const model = transform(entities, rels);
    const child = model.classes.find(
      (c: JavaClass) => c.className === 'Child'
    )!;
    console.log('EXTENDS CLASS IS:', child.extendsClass);
    expect(child.extendsClass).toBe('Parent1');
    expect(model.warnings).toContainEqual(
      expect.objectContaining({ code: 'MULTIPLE_INHERITANCE' })
    );
  });

  it('should handle class without attributes', () => {
    const entities: EntityDoc[] = [
      { _id: '1', type: 'class', data: { name: 'EmptyClass' } },
    ];

    const model = transform(entities, []);
    const cls = model.classes[0];
    expect(cls.fields).toHaveLength(1); // just PK
    expect(cls.fields[0].isId).toBe(true);
    expect(model.warnings).toContainEqual(
      expect.objectContaining({ code: 'NO_ATTRIBUTES' })
    );
  });

  it('should handle attribute without name', () => {
    const entities: EntityDoc[] = [
      {
        _id: '1',
        type: 'class',
        data: {
          name: 'A',
          attributes: [
            { id: 1, name: '', visibility: 'private', type: 'String' },
          ],
        },
      },
    ];

    const model = transform(entities, []);
    const cls = model.classes[0];
    expect(cls.fields).toHaveLength(1); // PK only, skipped empty attr
    expect(model.warnings).toContainEqual(
      expect.objectContaining({ code: 'INVALID_ATTRIBUTE' })
    );
  });

  it('should handle duplicate relations between same pair', () => {
    const entities: EntityDoc[] = [
      {
        _id: '1',
        type: 'class',
        data: {
          name: 'A',
          attributes: [
            { id: 1, name: 'id', visibility: 'private', type: 'Long' },
          ],
        },
      },
      {
        _id: '2',
        type: 'class',
        data: {
          name: 'B',
          attributes: [
            { id: 1, name: 'id', visibility: 'private', type: 'Long' },
          ],
        },
      },
    ];
    const rels: RelationshipDoc[] = [
      {
        _id: 'r1',
        type: 'Association',
        source: '1',
        target: '2',
        data: { srcMultiplicity: '1', tgtMultiplicity: '*' },
      },
      {
        _id: 'r2',
        type: 'Association',
        source: '1',
        target: '2',
        data: { srcMultiplicity: '1', tgtMultiplicity: '*' },
      },
    ];

    const model = transform(entities, rels);
    expect(model.warnings).toContainEqual(
      expect.objectContaining({ code: 'DUPLICATE_RELATION' })
    );
  });
});
