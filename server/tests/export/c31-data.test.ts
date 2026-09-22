import { generateDataSql } from '../../src/export/templates/data-sql.template';
import { JavaClass } from '../../src/export/types';

describe('C31: data.sql para SINGLE_TABLE', () => {
  it('T-C31g: Inserta todo en la tabla de la superclase con columna dtype y IDs unicos', () => {
    const vehiculo: any = {
      className: 'Vehiculo',
      discriminatorAnnotations: [
        '@Inheritance(strategy = InheritanceType.SINGLE_TABLE)',
      ],
      methods: [],

      isAbstract: false,
      implementsInterfaces: [],
      relationFields: [],
      tableName: 'vehiculo',
      fields: [
        { name: 'id', javaType: 'Long', isId: true, annotations: ['@Id'] },
      ],

      restPath: '/api/vehiculo',

      isSubclass: false,
    };

    const camion: any = {
      className: 'Camion',
      discriminatorAnnotations: ['@DiscriminatorValue("Camion")'],
      methods: [],

      isAbstract: false,
      implementsInterfaces: [],
      relationFields: [],
      tableName: 'camion', // Even if it has one, it shouldn't be used
      extendsClass: 'Vehiculo',
      isSubclass: true,
      fields: [
        {
          name: 'ejes',
          javaType: 'Integer',
          annotations: [],
          isId: false,
          isCollection: false,
        },
      ],

      restPath: '/api/camion',
    };

    const auto: any = {
      className: 'Auto',
      discriminatorAnnotations: ['@DiscriminatorValue("Auto")'],
      methods: [],

      isAbstract: false,
      implementsInterfaces: [],
      relationFields: [],
      tableName: 'auto',
      extendsClass: 'Vehiculo',
      isSubclass: true,
      fields: [
        { name: 'id', javaType: 'Long', isId: true, annotations: ['@Id'] },
      ],

      restPath: '/api/auto',
    };

    const classes = [vehiculo, camion, auto];
    const sql = generateDataSql(classes);

    const lines = sql.content.split('\n');
    const inserts = lines.filter((l: string) => l.startsWith('INSERT INTO'));

    console.log(sql.content);
    expect(inserts.length).toBe(6); // 2 per class
    // Vehiculo goes to vehiculo, no dtype
    // Wait, Vehiculo DOES need a dtype if it is instantiable.
    // If it's SINGLE_TABLE, it should all go into the root table!
    expect(
      inserts.every((l: string) => l.includes('INSERT INTO vehiculo'))
    ).toBeTruthy();

    // IDs should be unique.
    const ids = inserts
      .map((l: string) => {
        const match = l.match(/VALUES \((100\d)/);
        return match ? match[1] : null;
      })
      .filter(Boolean);

    expect(new Set(ids).size).toBe(6);
    expect(ids).toContain('1001');
    expect(ids).toContain('1006');

    // Check for dtype insertion
    // Vehiculo row: VALUES (1001, 'Vehiculo'
    expect(inserts.some((l: string) => l.includes("'Vehiculo'"))).toBeTruthy();
    expect(inserts.some((l: string) => l.includes("'Camion'"))).toBeTruthy();
    expect(inserts.some((l: string) => l.includes("'Auto'"))).toBeTruthy();
  });
});
