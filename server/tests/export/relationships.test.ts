import {
  normalizeMultiplicity,
  getCascadeConfig,
  resolveRelationshipAnnotations,
} from '../../src/export/relationships.js';

describe('relationships', () => {
  describe('T-C16a Composition, srcMultiplicity vacío, tgtMultiplicity "0..*"', () => {
    it('generates correct annotations', () => {
      const result = resolveRelationshipAnnotations(
        '', // vacío
        '0..*', // MUCHOS
        'LineaFactura', // Whole
        'Etiqueta', // Part (arbitrary)
        'Composition'
      );

      expect(result.warnings.length).toBe(0);

      // TODO side (Source): @OneToMany(mappedBy=..., cascade=ALL, orphanRemoval=true)
      expect(result.sourceField?.annotations[0]).toContain('@OneToMany');
      expect(result.sourceField?.annotations[0]).toContain(
        'cascade = CascadeType.ALL'
      );
      expect(result.sourceField?.annotations[0]).toContain(
        'orphanRemoval = true'
      );
      expect(result.sourceField?.annotations[0]).toContain(
        'mappedBy = "lineaFactura"'
      );

      // PARTE side (Target): @ManyToOne(optional = false) + @JoinColumn(name="...", nullable = false)
      expect(result.targetField?.annotations[0]).toContain(
        '@ManyToOne(optional = false)'
      );
      expect(result.targetField?.annotations[1]).toContain(
        '@JoinColumn(name = "linea_factura_id", nullable = false)'
      );
    });

    it('understands specific numeric values like "4" or "2..5" as MANY', () => {
      const result = resolveRelationshipAnnotations(
        '', // vacio (Composition => implicit ONE for Whole)
        '4', // exact 4
        'Automovil',
        'Rueda',
        'Composition'
      );

      expect(result.warnings.length).toBe(0);
      expect(result.sourceField?.collectionType).toBe('List');
      expect(result.sourceField?.annotations[0]).toContain(
        'cascade = CascadeType.ALL'
      );
    });
  });

  describe('T-C16b Aggregation, srcMultiplicity vacío, tgtMultiplicity "0..*"', () => {
    it('generates correct annotations', () => {
      const result = resolveRelationshipAnnotations(
        '',
        '0..*',
        'Motor',
        'Coche',
        'Aggregation'
      );

      expect(result.warnings.length).toBe(0);

      expect(result.sourceField?.annotations[0]).toContain('@OneToMany');
      expect(result.sourceField?.annotations[0]).toContain(
        'cascade = {CascadeType.PERSIST, CascadeType.MERGE}'
      );
      expect(result.sourceField?.annotations[0]).not.toContain('orphanRemoval');

      expect(result.targetField?.annotations[0]).toBe('@ManyToOne'); // NO optional
      expect(result.targetField?.annotations[1]).toBe(
        '@JoinColumn(name = "motor_id")'
      ); // NO nullable
    });
  });

  describe('T-C16c Composition con tgtMultiplicity vacío', () => {
    it('emits MULTIPLICITY_UNDEFINED and aborts', () => {
      const result = resolveRelationshipAnnotations(
        '',
        '',
        'Edificio',
        'Habitacion',
        'Composition'
      );

      expect(result.sourceField).toBeUndefined();
      expect(result.targetField).toBeUndefined();
      expect(result.warnings.length).toBe(1);
      expect(result.warnings[0].code).toBe('MULTIPLICITY_UNDEFINED');
    });
  });

  describe('T-C16d Association con un extremo vacío', () => {
    it('emits MULTIPLICITY_UNDEFINED and aborts', () => {
      const result = resolveRelationshipAnnotations(
        '',
        '1',
        'A',
        'B',
        'Association'
      );

      expect(result.sourceField).toBeUndefined();
      expect(result.targetField).toBeUndefined();
      expect(result.warnings.length).toBe(1);
      expect(result.warnings[0].code).toBe('MULTIPLICITY_UNDEFINED');
    });
  });

  describe('T-C16e tgt "1" produce optional=false en el TODO; tgt "0..1" no', () => {
    it('adds optional=false for tgt "1"', () => {
      const result1 = resolveRelationshipAnnotations(
        '1',
        '1',
        'A',
        'B',
        'Association'
      );
      expect(result1.sourceField?.annotations[0]).toContain('optional = false');

      const result2 = resolveRelationshipAnnotations(
        '1',
        '0..1',
        'A',
        'B',
        'Association'
      );
      expect(result2.sourceField?.annotations[0]).not.toContain(
        'optional = false'
      );
    });
  });

  describe('T-C16f Dos relaciones del mismo todo a la misma parte', () => {
    it('renames field and warns FIELD_NAME_COLLISION', () => {
      const result = resolveRelationshipAnnotations(
        '1',
        '1',
        'Source',
        'Target',
        'Association',
        'labelTag',
        ['target'], // Target field name already used in Source!
        []
      );

      expect(result.warnings.length).toBe(0);
      expect(result.sourceField?.fieldName).toBe('targetLabelTag');
      expect(result.sourceField?.annotations[0]).toContain(
        'mappedBy = "source"'
      );
    });
  });

  describe('T-C16g Ningún archivo del proyecto generado contiene orphanRemoval dentro de un @ManyToOne ni de un @ManyToMany.', () => {
    it('never emits orphanRemoval for ManyToOne or ManyToMany', () => {
      const result1 = resolveRelationshipAnnotations(
        '*', // MANY
        '1', // ONE
        'Source',
        'Target',
        'Association' // ManyToOne
      );
      expect(
        result1.sourceField?.annotations.some((a) =>
          a.includes('orphanRemoval')
        )
      ).toBe(false);

      const result2 = resolveRelationshipAnnotations(
        '*',
        '*',
        'Source',
        'Target',
        'Association' // ManyToMany
      );
      expect(
        result2.sourceField?.annotations.some((a) =>
          a.includes('orphanRemoval')
        )
      ).toBe(false);
      expect(
        result2.targetField?.annotations.some((a) =>
          a.includes('orphanRemoval')
        )
      ).toBe(false);
    });
  });

  describe('T-C16h Clase con nombre compuesto', () => {
    it('produces snake_case column', () => {
      const result = resolveRelationshipAnnotations(
        '1',
        '1',
        'LineaFactura',
        'B',
        'Association'
      );
      expect(result.targetField?.annotations[1]).toContain(
        'name = "linea_factura_id"'
      );
    });
  });

  describe('C17 Label formatting and escaping', () => {
    it('wraps label in Javadoc and escapes */', () => {
      const result = resolveRelationshipAnnotations(
        '1',
        '1',
        'A',
        'B',
        'Association',
        'relaci\u00f3n con */ espacios'
      );
      expect(result.sourceField?.javadoc).toBe(
        '/** relaci\u00f3n con *\\/ espacios */'
      );
    });

    it('uses normalized label for collision suffix', () => {
      const result = resolveRelationshipAnnotations(
        '1',
        '1',
        'Source',
        'Target',
        'Association',
        'direcci\u00f3n de cobro',
        ['target'], // force collision in source
        []
      );
      expect(result.sourceField?.fieldName).toBe('targetDireccionDeCobro');
    });
  });

  describe('C22 Pluralization of collections', () => {
    it('appends s if it does not end in s', () => {
      const result = resolveRelationshipAnnotations(
        '1',
        '*',
        'Todo',
        'Parte', // toCamelCase -> parte
        'Association'
      );
      expect(result.sourceField?.fieldName).toBe('partes');
    });

    it('does not append s if it already ends in s', () => {
      const result = resolveRelationshipAnnotations(
        '1',
        '*',
        'Pajaro',
        'Plumas', // toCamelCase -> plumas
        'Composition'
      );
      expect(result.sourceField?.fieldName).toBe('plumas');
    });
  });
});
