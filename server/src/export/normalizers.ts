import { Warning } from './types';

const javaReservedWords = new Set([
  'abstract',
  'assert',
  'boolean',
  'break',
  'byte',
  'case',
  'catch',
  'char',
  'class',
  'const',
  'continue',
  'default',
  'do',
  'double',
  'else',
  'enum',
  'extends',
  'final',
  'finally',
  'float',
  'for',
  'goto',
  'if',
  'implements',
  'import',
  'instanceof',
  'int',
  'interface',
  'long',
  'native',
  'new',
  'package',
  'private',
  'protected',
  'public',
  'return',
  'short',
  'static',
  'strictfp',
  'super',
  'switch',
  'synchronized',
  'this',
  'throw',
  'throws',
  'transient',
  'try',
  'void',
  'volatile',
  'while',
]);

function toWords(name: string): string[] {
  const unaccented = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return unaccented.split(/[^a-zA-Z0-9]+/).filter((w) => w.length > 0);
}

function handleEdgeCases(
  name: string,
  type: string,
  originalName: string
): { result: string; warnings: Warning[] } {
  const warnings: Warning[] = [];
  let result = name;

  if (!result) {
    warnings.push({
      code: 'EMPTY_NAME',
      element: type,
      message: `Name '${originalName}' became empty after normalization`,
    });
    return { result: '', warnings };
  }

  if (/^\d/.test(result)) {
    result = `_${result}`;
    warnings.push({
      code: 'STARTS_WITH_DIGIT',
      element: type,
      message: `Name '${originalName}' started with a digit, prefixed with underscore`,
    });
  }

  if (javaReservedWords.has(result.toLowerCase())) {
    const originalResult = result;
    result += '_';
    warnings.push({
      code: 'RESERVED_WORD',
      element: type,
      message: `Name '${originalName}' normalized to reserved word '${originalResult}', suffixed with underscore`,
    });
  }

  return { result, warnings };
}

export function normalizeClassName(name: string): {
  result: string;
  warnings: Warning[];
} {
  const words = toWords(name);
  const pascalCase = words
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join('');
  return handleEdgeCases(pascalCase, 'Class', name);
}

export function normalizeAttributeName(name: string): {
  result: string;
  warnings: Warning[];
} {
  const words = toWords(name);
  if (words.length === 0) return handleEdgeCases('', 'Attribute', name);

  const camelCase =
    words[0].charAt(0).toLowerCase() +
    words[0].slice(1) +
    words
      .slice(1)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join('');
  return handleEdgeCases(camelCase, 'Attribute', name);
}

export function normalizeMethodName(name: string): {
  result: string;
  warnings: Warning[];
} {
  const words = toWords(name);
  if (words.length === 0) return handleEdgeCases('', 'Method', name);

  const camelCase =
    words[0].charAt(0).toLowerCase() +
    words[0].slice(1) +
    words
      .slice(1)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join('');
  return handleEdgeCases(camelCase, 'Method', name);
}

export function toRestPath(className: string): string {
  const kebab = className.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
  return `/api/${kebab}`;
}

export function toTableName(className: string): string {
  return className.replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase();
}

export function toEnumConstant(name: string): string {
  const snake = name.replace(/([a-z])([A-Z])/g, '$1_$2');
  return snake.replace(/[^a-zA-Z0-9]+/g, '_').toUpperCase();
}

export function deduplicateNames(names: string[]): {
  result: string[];
  warnings: Warning[];
} {
  const result: string[] = [];
  const warnings: Warning[] = [];
  const counts = new Map<string, number>();

  for (const name of names) {
    if (counts.has(name)) {
      const count = counts.get(name)! + 1;
      counts.set(name, count);
      result.push(`${name}${count}`);
      warnings.push({
        code: 'DUPLICATE_NAME',
        element: name,
        message: `Duplicate name '${name}' renamed to '${name}${count}'`,
      });
    } else {
      counts.set(name, 1);
      result.push(name);
    }
  }

  return { result, warnings };
}
