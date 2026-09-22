import {
  mapType,
  mapReturnType,
  mapVisibility,
  resolvePrimaryKey,
} from '../../src/export/mappers.js';
import { Warning } from '../../src/export/types.js';

describe('Type mappers', () => {
  describe('mapType', () => {
    it('should map diagram types to Java types correctly', () => {
      expect(mapType('string', []).javaType).toBe('String');
      expect(mapType('str', []).javaType).toBe('String');
      expect(mapType('text', []).javaType).toBe('String');

      expect(mapType('int', []).javaType).toBe('Integer');
      expect(mapType('integer', []).javaType).toBe('Integer');

      expect(mapType('long', []).javaType).toBe('Long');

      expect(mapType('float', []).javaType).toBe('Float');

      expect(mapType('double', []).javaType).toBe('Double');
      expect(mapType('decimal', []).javaType).toBe('Double');

      expect(mapType('boolean', []).javaType).toBe('Boolean');
      expect(mapType('bool', []).javaType).toBe('Boolean');

      expect(mapType('char', []).javaType).toBe('Character');

      expect(mapType('date', []).javaType).toBe('LocalDate');

      expect(mapType('datetime', []).javaType).toBe('LocalDateTime');
      expect(mapType('timestamp', []).javaType).toBe('LocalDateTime');
    });

    it('should handle case insensitivity', () => {
      expect(mapType('STRING', []).javaType).toBe('String');
      expect(mapType('String', []).javaType).toBe('String');
      expect(mapType('string', []).javaType).toBe('String');
    });

    it('should match enum names', () => {
      expect(mapType('Status', ['Status', 'Priority']).javaType).toBe('Status');
      expect(mapType('priority', ['Status', 'Priority']).javaType).toBe(
        'Priority'
      );
    });

    it('should return String and a warning for unknown types', () => {
      const result = mapType('moneda', []);
      expect(result.javaType).toBe('String');
      expect(result.warning).toBeDefined();
      expect(result.warning?.code).toBe('UNKNOWN_TYPE');
    });
  });

  describe('mapReturnType', () => {
    it('should map return types correctly to primitives and void', () => {
      expect(mapReturnType('void', []).javaType).toBe('void');
      expect(mapReturnType('int', []).javaType).toBe('int');
      expect(mapReturnType('integer', []).javaType).toBe('int');
      expect(mapReturnType('long', []).javaType).toBe('long');
      expect(mapReturnType('float', []).javaType).toBe('float');
      expect(mapReturnType('double', []).javaType).toBe('double');
      expect(mapReturnType('boolean', []).javaType).toBe('boolean');
      expect(mapReturnType('bool', []).javaType).toBe('boolean');
      expect(mapReturnType('char', []).javaType).toBe('char');
      expect(mapReturnType('string', []).javaType).toBe('String');
    });

    it('should return String and a warning for unknown types', () => {
      const result = mapReturnType('moneda', []);
      expect(result.javaType).toBe('String');
      expect(result.warning).toBeDefined();
      expect(result.warning?.code).toBe('UNKNOWN_TYPE');
    });
  });

  describe('mapVisibility', () => {
    it('should map visibility characters to Java keywords', () => {
      expect(mapVisibility('+')).toBe('public');
      expect(mapVisibility('—')).toBe('private'); // em dash
      expect(mapVisibility('#')).toBe('protected');
    });

    it('should default to private for unknown characters', () => {
      expect(mapVisibility('?')).toBe('private');
      expect(mapVisibility('-')).toBe('private'); // hyphen
      expect(mapVisibility('')).toBe('private');
    });
  });

  describe('resolvePrimaryKey', () => {
    it('should promote an existing id attribute and not emit a warning if it is integer-like', () => {
      const attributes = [
        {
          name: 'id',
          normalizedName: 'id',
          javaType: 'Integer',
          annotations: [],
          visibility: 'private',
        },
        {
          name: 'name',
          normalizedName: 'name',
          javaType: 'String',
          annotations: [],
          visibility: 'private',
        },
      ];
      const result = resolvePrimaryKey('User', attributes);
      expect(result.warnings.length).toBe(0);
      expect(result.attributes[0].normalizedName).toBe('id');
      expect(result.attributes[0].javaType).toBe('Long');
      expect(result.attributes[0].annotations).toContain('@Id');
      expect(result.attributes[0].annotations).toContain(
        '@GeneratedValue(strategy = GenerationType.IDENTITY)'
      );
    });

    it('should promote an existing id attribute and emit a warning if it is not integer-like', () => {
      const attributes = [
        {
          name: 'id',
          normalizedName: 'id',
          javaType: 'String',
          annotations: [],
          visibility: 'private',
        },
        {
          name: 'name',
          normalizedName: 'name',
          javaType: 'String',
          annotations: [],
          visibility: 'private',
        },
      ];
      const result = resolvePrimaryKey('User', attributes);
      expect(result.warnings.length).toBe(1);
      expect(result.warnings[0].code).toBe('PK_TYPE_CHANGED');
      expect(result.attributes[0].normalizedName).toBe('id');
      expect(result.attributes[0].javaType).toBe('Long');
      expect(result.attributes[0].annotations).toContain('@Id');
    });

    it('should prepend a new id attribute if none exists', () => {
      const attributes = [
        {
          name: 'name',
          normalizedName: 'name',
          javaType: 'String',
          annotations: [],
          visibility: 'private',
        },
      ];
      const result = resolvePrimaryKey('User', attributes);
      expect(result.warnings.length).toBe(0);
      expect(result.attributes.length).toBe(2);
      expect(result.attributes[0].normalizedName).toBe('id');
      expect(result.attributes[0].javaType).toBe('Long');
      expect(result.attributes[0].visibility).toBe('private');
      expect(result.attributes[0].annotations).toContain('@Id');
      expect(result.attributes[0].annotations).toContain(
        '@GeneratedValue(strategy = GenerationType.IDENTITY)'
      );
      expect(result.attributes[1].normalizedName).toBe('name');
    });
  });
});
