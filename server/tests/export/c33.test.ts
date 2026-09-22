import {
  transform,
  EntityDoc,
  RelationshipDoc,
} from '../../src/export/transformer';
import { JavaClass } from '../../src/export/types';

describe('C33: CLAVE PRIMARIA REDUNDANTE EN SUBCLASES', () => {
  const rootId = 'root_id';
  const childId = 'child_id';
  const childId2 = 'child_id2';

  it('T-C33a En una jerarquia, solo la raiz emite @Id. Las subclases no.', () => {
    const entities: EntityDoc[] = [
      {
        _id: rootId,
        type: 'class',
        data: {
          name: 'Vehiculo',
        },
      },
      {
        _id: childId,
        type: 'class',
        data: {
          name: 'Camion',
        },
      },
    ];

    const rels: RelationshipDoc[] = [
      {
        _id: 'r1',
        type: 'Inheritance',
        source: rootId,
        target: childId,
        data: {},
      },
    ];

    const model = transform(entities, rels);

    const vehiculo = model.classes.find(
      (c: JavaClass) => c.className === 'Vehiculo'
    )!;
    const camion = model.classes.find(
      (c: JavaClass) => c.className === 'Camion'
    )!;

    // Root should have id
    expect(vehiculo.fields.find((f) => f.name === 'id')?.isId).toBe(true);

    // Subclass should not have id
    expect(camion.fields.find((f) => f.name === 'id')).toBeUndefined();
  });

  it('T-C33b Una subclase con un atributo dibujado "id" no lo promueve y advierte.', () => {
    const entities: EntityDoc[] = [
      {
        _id: rootId,
        type: 'class',
        data: {
          name: 'Vehiculo',
        },
      },
      {
        _id: childId,
        type: 'class',
        data: {
          name: 'Camion',
          attributes: [
            { id: 1, name: 'id', type: 'int', visibility: 'private' },
            { id: 2, name: 'idCamion', type: 'int', visibility: 'private' },
          ],
        },
      },
    ];

    const rels: RelationshipDoc[] = [
      {
        _id: 'r1',
        type: 'Inheritance',
        source: rootId,
        target: childId,
        data: {},
      },
    ];

    const model = transform(entities, rels);

    const vehiculo = model.classes.find(
      (c: JavaClass) => c.className === 'Vehiculo'
    )!;
    const camion = model.classes.find(
      (c: JavaClass) => c.className === 'Camion'
    )!;

    // Vehiculo has auto-generated id
    expect(vehiculo.fields.find((f) => f.name === 'id')?.isId).toBe(true);

    // Camion's 'id' is NOT an @Id, it's just a regular attribute.
    const camionIdField = camion.fields.find((f) => f.name === 'id');
    expect(camionIdField).toBeDefined();
    expect(camionIdField?.isId).toBe(false); // isId should be false because the C11 promotion was skipped
    // Also it shouldn't have '@Id' annotation
    expect(camionIdField?.annotations).not.toContain('@Id');

    const camionIdCamionField = camion.fields.find(
      (f) => f.name === 'idCamion'
    );
    expect(camionIdCamionField).toBeDefined();
    expect(camionIdCamionField?.isId).toBe(false);

    // Warning should be emitted
    const warnings = model.warnings.filter(
      (w) => w.code === 'SUBCLASS_ID_IGNORED'
    );
    expect(warnings.length).toBe(2);
    expect(warnings[0].element).toBe('Camion.id');
    expect(warnings[0].message).toBe(
      'Camion.id: las subclases heredan la clave primaria de Vehiculo; se gener\u00f3 como columna normal.'
    );
    expect(warnings[1].element).toBe('Camion.idCamion');
    expect(warnings[1].message).toBe(
      'Camion.idCamion: las subclases heredan la clave primaria de Vehiculo; se gener\u00f3 como columna normal.'
    );
  });
});
