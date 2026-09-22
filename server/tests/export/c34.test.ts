import { transform } from '../../src/export/transformer';

describe('C34: ATRIBUTO DUPLICADO Y ATRIBUTO PERDIDO EN LA SUPERCLASE', () => {
  it('T-C34a: Superclase con 4 atributos y DOS subclases no duplica ni omite atributos', () => {
    const entities: any[] = [
      {
        _id: 'vehiculo',
        type: 'class',
        data: {
          name: 'Vehiculo',
          attributes: [
            { id: 1, name: 'placa', type: 'string', visibility: 'private' },
            { id: 2, name: 'marca', type: 'string', visibility: 'private' },
            { id: 3, name: 'modelo', type: 'string', visibility: 'private' },
            { id: 4, name: 'ano', type: 'int', visibility: 'private' },
          ],
        },
      },
      { _id: 'camion', type: 'class', data: { name: 'Camion' } },
      { _id: 'auto', type: 'class', data: { name: 'Auto' } },
    ];

    const rels: any[] = [
      {
        _id: 'r1',
        type: 'Inheritance',
        source: 'vehiculo',
        target: 'camion',
        data: {},
      },
      {
        _id: 'r2',
        type: 'Inheritance',
        source: 'vehiculo',
        target: 'auto',
        data: {},
      },
    ];

    const model = transform(entities, rels);
    const vehiculo = model.classes.find((c) => c.className === 'Vehiculo');
    expect(vehiculo).toBeDefined();

    const fieldNames = vehiculo!.fields.map((f) => f.name);
    // id is prepended automatically by resolvePrimaryKey
    expect(fieldNames).toEqual(['id', 'placa', 'marca', 'modelo', 'ano']);
  });
});
