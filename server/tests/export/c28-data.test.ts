import { generateDataSql } from '../../src/export/templates/data-sql.template';
import { JavaClass } from '../../src/export/types';

describe('C28: data.sql duplicates for OneToOne', () => {
  it('alternates FK values when multiple relations point to the same target', () => {
    const classes = [
      {
        className: 'Ruta',
        tableName: 'ruta',
        isAbstract: false,
        fields: [
          {
            name: 'id',
            javaType: 'Long',
            isId: true,
            annotations: [],
            javadoc: '',
          },
        ],
        relationFields: [],
        methods: [],
        implementsInterfaces: [],
        restPath: '',
        discriminatorAnnotations: [],
        isSubclass: false,
        javadoc: '',
        annotations: [],
      },
      {
        className: 'Parada',
        tableName: 'parada',
        isAbstract: false,
        fields: [
          {
            name: 'id',
            javaType: 'Long',
            isId: true,
            annotations: [],
            javadoc: '',
          },
        ],
        relationFields: [
          {
            fieldName: 'rutaOrigen',
            fieldType: 'Ruta',
            relatedClassName: 'Ruta',

            annotations: [
              '@JoinColumn(name = "ruta_origen_id", nullable = false)',
            ],
            isCollection: false,
          },
          {
            fieldName: 'rutaDestino',
            fieldType: 'Ruta',
            relatedClassName: 'Ruta',

            annotations: [
              '@JoinColumn(name = "ruta_destino_id", nullable = false)',
            ],
            isCollection: false,
          },
        ],
        methods: [],
        implementsInterfaces: [],
        restPath: '',
        discriminatorAnnotations: [],
        isSubclass: false,
        javadoc: '',
        annotations: [],
      },
    ] as any as JavaClass[];

    const result = generateDataSql(classes);
    const sql = result.content;

    // Check that we have INSERT INTO parada
    const inserts = sql
      .split('\n')
      .filter((l) => l.includes('INSERT INTO parada'));
    expect(inserts.length).toBe(2);

    // Row 1: INSERT INTO parada (id, ruta_origen_id, ruta_destino_id) VALUES (1001, 1001, 1002);
    expect(inserts[0]).toMatch(/VALUES \(1001, 1001, 1002\)/);

    // Row 2: INSERT INTO parada (id, ruta_origen_id, ruta_destino_id) VALUES (1002, 1002, 1001);
    expect(inserts[1]).toMatch(/VALUES \(1002, 1002, 1001\)/);
  });
});
