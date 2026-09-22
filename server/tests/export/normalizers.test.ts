import { Warning } from '../../src/export/types.js';
import {
  normalizeClassName,
  normalizeAttributeName,
  normalizeMethodName,
  toRestPath,
  toTableName,
  toEnumConstant,
  deduplicateNames,
} from '../../src/export/normalizers.js';

describe('Name Normalizers', () => {
  describe('normalizeClassName', () => {
    it('should convert to PascalCase and remove non-alphanumeric characters', () => {
      const { result, warnings } = normalizeClassName('Food Items');
      expect(result).toBe('FoodItems');
      expect(warnings).toHaveLength(0);
    });

    it('should preserve plural forms', () => {
      const { result, warnings } = normalizeClassName('Rooms');
      expect(result).toBe('Rooms');
      expect(warnings).toHaveLength(0);
    });

    it('should prefix with underscore if starts with digit', () => {
      const { result, warnings } = normalizeClassName('2Fast');
      expect(result).toBe('_2Fast');
      expect(warnings).toHaveLength(1);
      expect(warnings[0].message).toContain('digit');
    });

    it('should suffix with underscore if reserved word', () => {
      const { result, warnings } = normalizeClassName('class');
      expect(result).toBe('Class_');
      expect(warnings).toHaveLength(1);
      expect(warnings[0].message).toContain('reserved');
    });

    it('should return empty string and warning for empty input after normalization', () => {
      const { result, warnings } = normalizeClassName('   ');
      expect(result).toBe('');
      expect(warnings).toHaveLength(1);
    });
  });

  describe('normalizeAttributeName', () => {
    it('should convert to camelCase', () => {
      const { result, warnings } = normalizeAttributeName('PhoneNo');
      expect(result).toBe('phoneNo');
      expect(warnings).toHaveLength(0);
    });

    it('should handle reserved words', () => {
      const { result, warnings } = normalizeAttributeName('class');
      expect(result).toBe('class_');
      expect(warnings).toHaveLength(1);
    });

    it('should handle digits at start', () => {
      const { result, warnings } = normalizeAttributeName('2val');
      expect(result).toBe('_2val');
      expect(warnings).toHaveLength(1);
    });
  });

  describe('normalizeMethodName', () => {
    it('should convert to camelCase and strip special chars', () => {
      const { result, warnings } = normalizeMethodName('Check-In()');
      expect(result).toBe('checkIn');
      expect(warnings).toHaveLength(0);
    });
  });

  describe('toRestPath', () => {
    it('should convert to kebab-case and prepend /api/', () => {
      expect(toRestPath('Guest')).toBe('/api/guest');
      expect(toRestPath('Rooms')).toBe('/api/rooms');
      expect(toRestPath('FoodItems')).toBe('/api/food-items');
      expect(toRestPath('Cliente')).toBe('/api/cliente');
    });
  });

  describe('toTableName', () => {
    it('should convert to snake_case', () => {
      expect(toTableName('FoodItems')).toBe('food_items');
    });
  });

  describe('toEnumConstant', () => {
    it('should convert to UPPER_SNAKE_CASE', () => {
      expect(toEnumConstant('myValue')).toBe('MY_VALUE');
    });
  });

  describe('deduplicateNames', () => {
    it('should suffix duplicates with incremental numbers', () => {
      const { result, warnings } = deduplicateNames([
        'Guest',
        'Guest',
        'Guest',
        'Room',
      ]);
      expect(result).toEqual(['Guest', 'Guest2', 'Guest3', 'Room']);
      expect(warnings).toHaveLength(2);
    });
  });
});
