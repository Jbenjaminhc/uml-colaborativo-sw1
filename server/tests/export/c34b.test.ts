import { transform } from '../../src/export/transformer';
import { generateDataSql } from '../../src/export/templates/data-sql.template';
import { generateEntityClass } from '../../src/export/templates/entity.template';

describe('C34: full generator flow', () => {
  it('T-C34b: verify strings', () => {
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
    const sql = generateDataSql(model.classes);
    console.log('SQL:', sql.content);

    const vehiculo = model.classes.find((c) => c.className === 'Vehiculo');
    const code = generateEntityClass(vehiculo!, 'com.test');
    console.log('CODE:', code);
  });
});
