import {
  transform,
  EntityDoc,
  RelationshipDoc,
} from '../../src/export/transformer.js';

describe('C26: Relaciones multiples', () => {
  const rutaId = '6aa4c9621c0f6359059743eb';
  const paradaId = '6aa4c97c1c0f6359059743fb';
  const empleadoId = '6aa4c97c1c0f6359059743fc';

  const getEntities = (): EntityDoc[] => [
    { _id: rutaId, type: 'class', data: { name: 'Ruta' } },
    { _id: paradaId, type: 'class', data: { name: 'Parada' } },
    { _id: empleadoId, type: 'class', data: { name: 'Empleado' } },
  ];

  it('T-C26a: Dos relaciones entre el mismo par con labels distintos se generan ambas y desempatan', () => {
    const relationships: RelationshipDoc[] = [
      {
        _id: 'r1',
        type: 'Composition',
        source: rutaId,
        target: paradaId,
        data: { label: 'origen', srcMultiplicity: '1', tgtMultiplicity: '*' },
      },
      {
        _id: 'r2',
        type: 'Composition',
        source: rutaId,
        target: paradaId,
        data: { label: 'destino', srcMultiplicity: '1', tgtMultiplicity: '*' },
      },
    ];
    const { classes, warnings } = transform(getEntities(), relationships);
    const ruta = classes.find((c) => c.className === 'Ruta');
    const parada = classes.find((c) => c.className === 'Parada');

    // Ruta es Whole, Parada es Part
    // Parada (lado Target) deberia tener: rutaOrigen y rutaDestino
    expect(parada?.relationFields.length).toBe(2);
    expect(parada?.relationFields.map((f) => f.fieldName)).toEqual([
      'rutaOrigen',
      'rutaDestino',
    ]);

    // Ruta (lado Source) deberia tener: paradasOrigen y paradasDestino
    expect(ruta?.relationFields.length).toBe(2);
    expect(ruta?.relationFields.map((f) => f.fieldName)).toEqual([
      'paradasOrigen',
      'paradasDestino',
    ]);

    // mappedBy deberia apuntar a la parte
    const origenRel = ruta?.relationFields.find(
      (f) => f.fieldName === 'paradasOrigen'
    );
    expect(
      origenRel?.annotations.find((a) => a.includes('mappedBy'))
    ).toContain('mappedBy = "rutaOrigen"');

    // Warning
    expect(
      warnings.find((w) => w.code === 'FIELD_NAME_COLLISION')
    ).toBeDefined();
  });

  it('T-C26c: Dos relaciones id�nticas en todo, se descarta una y se advierte', () => {
    const relationships: RelationshipDoc[] = [
      {
        _id: 'r1',
        type: 'Composition',
        source: rutaId,
        target: paradaId,
        data: { label: 'origen', srcMultiplicity: '1', tgtMultiplicity: '*' },
      },
      {
        _id: 'r2',
        type: 'Composition',
        source: rutaId,
        target: paradaId,
        data: { label: 'origen', srcMultiplicity: '1', tgtMultiplicity: '*' },
      },
    ];
    const { classes, warnings } = transform(getEntities(), relationships);
    const ruta = classes.find((c) => c.className === 'Ruta');

    expect(ruta?.relationFields.length).toBe(1);

    const warning = warnings.find((w) => w.code === 'DUPLICATE_RELATION');
    expect(warning).toBeDefined();
    expect(warning?.message).toContain('Ruta');
    expect(warning?.message).toContain('Parada');
    expect(warning?.message).not.toContain(rutaId); // T-C26e
    // T-C26f (Spanish)
    expect(warning?.message).toContain('duplicada entre');
  });

  it('T-C26d: Dos relaciones sin label se generan con sufijo num�rico', () => {
    const relationships: RelationshipDoc[] = [
      {
        _id: 'r1',
        type: 'Composition',
        source: rutaId,
        target: paradaId,
        data: { srcMultiplicity: '1', tgtMultiplicity: '*' },
      },
      {
        _id: 'r2',
        type: 'Composition',
        source: rutaId,
        target: paradaId,
        data: { srcMultiplicity: '1', tgtMultiplicity: '1' },
      },
    ];
    const { classes } = transform(getEntities(), relationships);
    const parada = classes.find((c) => c.className === 'Parada');

    expect(parada?.relationFields.length).toBe(2);
    expect(parada?.relationFields.map((f) => f.fieldName)).toEqual([
      'ruta',
      'ruta2',
    ]);
  });

  it('T-C26g: Tres relaciones entre el mismo par con tres labels distintos', () => {
    const relationships: RelationshipDoc[] = [
      {
        _id: 'r1',
        type: 'Association',
        source: rutaId,
        target: paradaId,
        data: { label: 'uno', srcMultiplicity: '1', tgtMultiplicity: '1' },
      },
      {
        _id: 'r2',
        type: 'Association',
        source: rutaId,
        target: paradaId,
        data: { label: 'dos', srcMultiplicity: '1', tgtMultiplicity: '1' },
      },
      {
        _id: 'r3',
        type: 'Association',
        source: rutaId,
        target: paradaId,
        data: { label: 'tres', srcMultiplicity: '1', tgtMultiplicity: '1' },
      },
    ];
    const { classes } = transform(getEntities(), relationships);
    const parada = classes.find((c) => c.className === 'Parada');

    expect(parada?.relationFields.length).toBe(3);
    expect(parada?.relationFields.map((f) => f.fieldName)).toEqual([
      'rutaUno',
      'rutaDos',
      'rutaTres',
    ]);
  });

  it('T-C26h: Auto-referencia con dos labels distintos', () => {
    const relationships: RelationshipDoc[] = [
      {
        _id: 'r1',
        type: 'Association',
        source: empleadoId,
        target: empleadoId,
        data: { label: 'jefe', srcMultiplicity: '1', tgtMultiplicity: '*' },
      },
      {
        _id: 'r2',
        type: 'Association',
        source: empleadoId,
        target: empleadoId,
        data: {
          label: 'subordinados',
          srcMultiplicity: '1',
          tgtMultiplicity: '*',
        },
      },
    ];
    const { classes } = transform(getEntities(), relationships);
    const emp = classes.find((c) => c.className === 'Empleado');

    expect(emp?.relationFields.length).toBe(4); // each relation adds 2 fields (source and target)

    // Check that fields dont overlap or name exactly "empleado"
    const names = emp?.relationFields.map((f) => f.fieldName) || [];
    expect(names).toContain('empleadoJefe'); // e.g. the part field
    expect(names).not.toContain('empleado');
  });
});
