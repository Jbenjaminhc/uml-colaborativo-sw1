import {
  transform,
  EntityDoc,
  RelationshipDoc,
} from '../../src/export/transformer';

describe('C31: Herencia Invertida', () => {
  const vehiculoId = '6aa59fb5684e242c8a914e3d';
  const camionId = '6aa59fb5684e242c8a914e3e';
  const autoId = '6aa59fb5684e242c8a914e3f';
  const biciId = '6aa59fb5684e242c8a914e40';

  const getEntities = (): EntityDoc[] => [
    {
      _id: vehiculoId,
      type: 'class',
      data: {
        name: 'Vehiculo',
        attributes: [
          { id: 1, name: 'dummy', type: 'string', visibility: 'private' },
        ],
      },
    },
    {
      _id: camionId,
      type: 'class',
      data: {
        name: 'Camion',
        attributes: [
          { id: 1, name: 'dummy', type: 'string', visibility: 'private' },
        ],
      },
    },
    {
      _id: autoId,
      type: 'class',
      data: {
        name: 'Auto',
        attributes: [
          { id: 1, name: 'dummy', type: 'string', visibility: 'private' },
        ],
      },
    },
    {
      _id: biciId,
      type: 'class',
      data: {
        name: 'Bici',
        attributes: [
          { id: 1, name: 'dummy', type: 'string', visibility: 'private' },
        ],
      },
    },
  ];

  it('T-C31a: UNA sola herencia (Camion -> Vehiculo)', () => {
    const rels: RelationshipDoc[] = [
      {
        _id: 'r1',
        type: 'Inheritance',
        source: vehiculoId,
        target: camionId,
        data: {},
      },
    ];
    const { classes, warnings } = transform(getEntities(), rels);

    const vehiculo = classes.find((c) => c.className === 'Vehiculo')!;
    const camion = classes.find((c) => c.className === 'Camion')!;

    // Vehiculo
    expect(vehiculo.discriminatorAnnotations).toContain(
      '@Inheritance(strategy = InheritanceType.SINGLE_TABLE)'
    );
    expect(vehiculo.discriminatorAnnotations).toContain(
      '@DiscriminatorColumn(name = "dtype")'
    );
    expect(vehiculo.isSubclass).toBe(false);
    expect(vehiculo.extendsClass).toBeUndefined();

    // Camion
    expect(camion.extendsClass).toBe('Vehiculo');
    expect(camion.discriminatorAnnotations).toContain(
      '@DiscriminatorValue("Camion")'
    );
    expect(camion.isSubclass).toBe(true);

    // Sin advertencias
    expect(warnings.length).toBe(0);
  });

  it('T-C31b: DOS subclases de la misma superclase (Camion -> Vehiculo, Auto -> Vehiculo)', () => {
    const rels: RelationshipDoc[] = [
      {
        _id: 'r1',
        type: 'Inheritance',
        source: vehiculoId,
        target: camionId,
        data: {},
      },
      {
        _id: 'r2',
        type: 'Inheritance',
        source: vehiculoId,
        target: autoId,
        data: {},
      },
    ];
    const { classes, warnings } = transform(getEntities(), rels);

    const camion = classes.find((c) => c.className === 'Camion')!;
    const auto = classes.find((c) => c.className === 'Auto')!;

    expect(camion.extendsClass).toBe('Vehiculo');
    expect(camion.discriminatorAnnotations).toContain(
      '@DiscriminatorValue("Camion")'
    );

    expect(auto.extendsClass).toBe('Vehiculo');
    expect(auto.discriminatorAnnotations).toContain(
      '@DiscriminatorValue("Auto")'
    );

    expect(warnings.length).toBe(0);
  });

  it('T-C31c: Herencia multiple REAL (una clase SOURCE de dos relaciones Inheritance)', () => {
    const rels: RelationshipDoc[] = [
      {
        _id: 'r1',
        type: 'Inheritance',
        source: vehiculoId,
        target: camionId,
        data: {},
      },
      {
        _id: 'r2',
        type: 'Inheritance',
        source: autoId,
        target: camionId,
        data: {},
      },
    ];
    const { classes, warnings } = transform(getEntities(), rels);

    const camion = classes.find((c) => c.className === 'Camion')!;

    // Conserva la primera
    expect(camion.extendsClass).toBe('Auto');

    expect(warnings.length).toBe(1);
    expect(warnings[0].code).toBe('MULTIPLE_INHERITANCE');
    expect(warnings[0].element).toBe('Camion'); // Not ObjectId
  });

  it('T-C31d: Jerarquia de tres niveles (Camion -> Auto, Auto -> Vehiculo)', () => {
    const rels: RelationshipDoc[] = [
      {
        _id: 'r1',
        type: 'Inheritance',
        source: autoId,
        target: camionId,
        data: {},
      },
      {
        _id: 'r2',
        type: 'Inheritance',
        source: vehiculoId,
        target: autoId,
        data: {},
      },
    ];
    const { classes, warnings } = transform(getEntities(), rels);

    const vehiculo = classes.find((c) => c.className === 'Vehiculo')!;
    const auto = classes.find((c) => c.className === 'Auto')!;
    const camion = classes.find((c) => c.className === 'Camion')!;

    expect(camion.extendsClass).toBe('Auto');
    expect(auto.extendsClass).toBe('Vehiculo');
    expect(vehiculo.extendsClass).toBeUndefined();

    // @Inheritance goes only in the root (Vehiculo)
    expect(vehiculo.discriminatorAnnotations).toContain(
      '@Inheritance(strategy = InheritanceType.SINGLE_TABLE)'
    );
    expect(
      auto.discriminatorAnnotations.some((a) => a.startsWith('@Inheritance'))
    ).toBeFalsy();
    expect(
      camion.discriminatorAnnotations.some((a) => a.startsWith('@Inheritance'))
    ).toBeFalsy();
  });

  it('T-C31e: Implementation: source implements target', () => {
    const intfId = '6aa59fb5684e242c8a914fff';
    const rels: RelationshipDoc[] = [
      {
        _id: 'r1',
        type: 'Implementation',
        source: intfId,
        target: camionId,
        data: {},
      },
    ];
    const entities = [
      ...getEntities(),
      {
        _id: intfId,
        type: 'interface',
        data: {
          name: 'Movable',
          attributes: [
            { id: 1, name: 'dummy', type: 'string', visibility: 'private' },
          ],
        },
      },
    ] as EntityDoc[];

    const { classes } = transform(entities, rels);
    const camion = classes.find((c) => c.className === 'Camion')!;

    expect(camion.implementsInterfaces).toContain('Movable');
  });

  it('T-C31f: Superclase ABSTRACTA con dos subclases', () => {
    const rels: RelationshipDoc[] = [
      {
        _id: 'r1',
        type: 'Inheritance',
        source: vehiculoId,
        target: camionId,
        data: {},
      },
    ];
    const entities = getEntities();
    // Make Vehiculo abstract (simulate missing if not natively supported, maybe modifier exists?)
    entities[0].data.isAbstract = true;

    const { classes } = transform(entities, rels);
    const vehiculo = classes.find((c) => c.className === 'Vehiculo')!;

    expect(vehiculo.isAbstract).toBe(true);
    // Should NOT have @DiscriminatorValue
    expect(
      vehiculo.discriminatorAnnotations.some((a) =>
        a.startsWith('@DiscriminatorValue')
      )
    ).toBeFalsy();
  });

  it('T-C31h: Ninguna advertencia tiene un ObjectId en element ni en message', () => {
    const rels: RelationshipDoc[] = [
      {
        _id: 'r1',
        type: 'Inheritance',
        source: vehiculoId,
        target: camionId,
        data: {},
      },
      {
        _id: 'r2',
        type: 'Inheritance',
        source: autoId,
        target: camionId,
        data: {},
      },
    ];
    const { warnings } = transform(getEntities(), rels);

    expect(warnings.length).toBe(1);
    expect(warnings[0].element).not.toContain(camionId);
    expect(warnings[0].message).not.toContain(camionId);
    expect(warnings[0].element).toBe('Camion');
  });
});
