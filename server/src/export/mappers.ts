import { Warning } from './types';

export const mapType = (
  diagramType: string,
  enumNames: string[]
): { javaType: string; warning?: Warning } => {
  const lowerType = diagramType.toLowerCase();

  // Check enums first
  const enumMatch = enumNames.find((e) => e.toLowerCase() === lowerType);
  if (enumMatch) {
    return { javaType: enumMatch };
  }

  switch (lowerType) {
    case 'string':
    case 'str':
    case 'text':
      return { javaType: 'String' };
    case 'int':
    case 'integer':
      return { javaType: 'Integer' };
    case 'long':
      return { javaType: 'Long' };
    case 'float':
      return { javaType: 'Float' };
    case 'double':
    case 'decimal':
      return { javaType: 'Double' };
    case 'boolean':
    case 'bool':
      return { javaType: 'Boolean' };
    case 'char':
      return { javaType: 'Character' };
    case 'date':
      return { javaType: 'LocalDate' };
    case 'datetime':
    case 'timestamp':
      return { javaType: 'LocalDateTime' };
    default:
      return {
        javaType: 'String',
        warning: {
          code: 'UNKNOWN_TYPE',
          element: diagramType,
          message: `Unknown type '${diagramType}', mapped to String.`,
        },
      };
  }
};

export const mapReturnType = (
  diagramType: string,
  enumNames: string[]
): { javaType: string; warning?: Warning } => {
  if (!diagramType) {
    return { javaType: 'void' };
  }

  const lowerType = diagramType.trim().toLowerCase();

  if (lowerType === 'void') {
    return { javaType: 'void' };
  }

  // Check enums first
  const enumMatch = enumNames.find((e) => e.toLowerCase() === lowerType);
  if (enumMatch) {
    return { javaType: enumMatch };
  }

  switch (lowerType) {
    case 'int':
    case 'integer':
      return { javaType: 'int' };
    case 'long':
      return { javaType: 'long' };
    case 'float':
      return { javaType: 'float' };
    case 'double':
    case 'decimal':
      return { javaType: 'double' };
    case 'boolean':
    case 'bool':
      return { javaType: 'boolean' };
    case 'char':
    case 'character':
      return { javaType: 'char' };
    case 'string':
    case 'str':
    case 'text':
      return { javaType: 'String' };
    default:
      return {
        javaType: 'String',
        warning: {
          code: 'UNKNOWN_TYPE',
          element: diagramType,
          message: `Unknown return type '${diagramType}', mapped to String.`,
        },
      };
  }
};

export const mapVisibility = (
  vis: string
): 'public' | 'private' | 'protected' => {
  if (vis === '+') return 'public';
  if (vis === '#') return 'protected';
  if (vis === '—') return 'private'; // U+2014 em dash
  return 'private';
};

interface Attribute {
  name: string;
  normalizedName: string;
  javaType: string;
  annotations: string[];
  visibility: string;
}

export const resolvePrimaryKey = (
  className: string,
  attributes: Attribute[],
  rootClassName?: string
): { attributes: Attribute[]; warnings: Warning[] } => {
  const warnings: Warning[] = [];
  const idIndex = attributes.findIndex(
    (a) => a.normalizedName.toLowerCase() === 'id'
  );
  const idClassIndex = attributes.findIndex(
    (a) => a.normalizedName.toLowerCase() === `id${className.toLowerCase()}`
  );

  if (rootClassName) {
    if (idIndex !== -1) {
      warnings.push({
        code: 'SUBCLASS_ID_IGNORED',
        element: `${className}.${attributes[idIndex].name}`,
        message: `${className}.${attributes[idIndex].name}: las subclases heredan la clave primaria de ${rootClassName}; se gener\u00f3 como columna normal.`,
      });
    }
    if (idClassIndex !== -1 && idClassIndex !== idIndex) {
      warnings.push({
        code: 'SUBCLASS_ID_IGNORED',
        element: `${className}.${attributes[idClassIndex].name}`,
        message: `${className}.${attributes[idClassIndex].name}: las subclases heredan la clave primaria de ${rootClassName}; se gener\u00f3 como columna normal.`,
      });
    }
    return { attributes: [...attributes], warnings };
  }

  let promotedIndex = -1;

  if (idIndex !== -1) {
    promotedIndex = idIndex;
    if (idClassIndex !== -1 && idClassIndex !== idIndex) {
      warnings.push({
        code: 'MULTIPLE_PK_CANDIDATES',
        element: `${className}.${attributes[idClassIndex].normalizedName}`,
        message: `Se prioriz�ó 'id' como clave primaria. El atributo '${attributes[idClassIndex].normalizedName}' no fue promovido.`,
      });
    }
  } else if (idClassIndex !== -1) {
    promotedIndex = idClassIndex;
  }

  const finalAttributes = [...attributes];

  if (promotedIndex !== -1) {
    const idAttr = finalAttributes[promotedIndex];
    const originalType = idAttr.javaType.toLowerCase();
    if (!['integer', 'long'].includes(originalType)) {
      warnings.push({
        code: 'PK_TYPE_CHANGED',
        element: `${className}.${idAttr.normalizedName}`,
        message: `Primary key type changed from ${idAttr.javaType} to Long.`,
      });
    }

    const newAttr: Attribute = {
      ...idAttr,
      name: 'id',
      normalizedName: 'id',
      javaType: 'Long',
      annotations: [
        ...idAttr.annotations,
        '@Id',
        '@GeneratedValue(strategy = GenerationType.IDENTITY)',
      ],
    };

    finalAttributes[promotedIndex] = newAttr;

    // Ensure id is first
    if (promotedIndex !== 0) {
      finalAttributes.splice(promotedIndex, 1);
      finalAttributes.unshift(newAttr);
    }
  } else {
    const newId: Attribute = {
      name: 'id',
      normalizedName: 'id',
      javaType: 'Long',
      annotations: [
        '@Id',
        '@GeneratedValue(strategy = GenerationType.IDENTITY)',
      ],
      visibility: 'private',
    };
    finalAttributes.unshift(newId);
  }

  return { attributes: finalAttributes, warnings };
};
