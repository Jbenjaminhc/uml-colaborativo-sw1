import {
  Multiplicity,
  RelationshipType,
  CascadeConfig,
  JavaRelationField,
  Warning,
} from './types';
import { toTableName, normalizeAttributeName } from './normalizers';

export function normalizeMultiplicity(
  value: string | undefined | null
): Multiplicity {
  if (!value) return 'UNDEFINED';

  const val = value.trim().toLowerCase();

  const onePatterns = ['1', '0..1', '1..1', '0,1'];
  const manyPatterns = [
    '*',
    '0..*',
    '1..*',
    'n',
    '0..n',
    '1..n',
    'many',
    'muchos',
  ];

  if (onePatterns.includes(val)) return 'ONE';
  if (manyPatterns.includes(val)) return 'MANY';

  if (/^\d+$/.test(val)) {
    const num = parseInt(val, 10);
    if (num === 1) return 'ONE';
    if (num > 1) return 'MANY';
  }

  if (/^\d+\.\.\d+$/.test(val)) {
    const upper = parseInt(val.split('..')[1], 10);
    if (upper === 1) return 'ONE';
    if (upper > 1) return 'MANY';
  }

  return 'UNDEFINED';
}

function parseMultiplicity(val: string | undefined | null): {
  type: Multiplicity;
  mandatory: boolean;
} {
  if (!val) return { type: 'UNDEFINED', mandatory: false };
  const str = val.trim().toLowerCase();
  const type = normalizeMultiplicity(str);

  let mandatory = false;
  if (str === '1' || str === '1..1' || str === '1..*' || str === '1..n') {
    mandatory = true;
  } else if (/^[1-9]\d*\.\./.test(str)) {
    mandatory = true; // e.g. "2..5" -> minimum is > 0
  } else if (/^\d+$/.test(str)) {
    mandatory = parseInt(str, 10) > 0; // exactly > 0 means mandatory
  }

  return { type, mandatory };
}

export function getCascadeConfig(relType: RelationshipType): CascadeConfig {
  switch (relType) {
    case 'Aggregation':
      return {
        cascade: 'CascadeType.PERSIST, CascadeType.MERGE',
        orphanRemoval: false,
      };
    case 'Composition':
      return { cascade: 'CascadeType.ALL', orphanRemoval: true };
    case 'Association':
    default:
      return { cascade: '', orphanRemoval: false };
  }
}

function toCamelCase(str: string): string {
  if (!str) return '';
  return str.charAt(0).toLowerCase() + str.slice(1);
}

function buildAnnotationParams(params: string[]): string {
  if (params.length === 0) return '';
  return `(${params.join(', ')})`;
}

function formatJavadoc(text?: string): string | undefined {
  if (!text) return undefined;
  return `/** ${text.replace(/\*\//g, '*\\/')} */`;
}

export function resolveRelationshipAnnotations(
  rawSrcMult: string | undefined | null,
  rawTgtMult: string | undefined | null,
  sourceClassName: string, // Whole
  targetClassName: string, // Part
  relType: RelationshipType,
  label?: string,
  existingSourceFields: string[] = [],
  existingTargetFields: string[] = [],
  forceTieBreak = false
): {
  sourceField?: JavaRelationField;
  targetField?: JavaRelationField;
  warnings: Warning[];
} {
  const warnings: Warning[] = [];

  let effectiveRelType = relType;
  let srcInfo = parseMultiplicity(rawSrcMult);
  const tgtInfo = parseMultiplicity(rawTgtMult);

  if (
    effectiveRelType === 'Aggregation' ||
    effectiveRelType === 'Composition'
  ) {
    if (srcInfo.type === 'MANY') {
      warnings.push({
        code: 'INVALID_MULTIPLICITY_FOR_RELATION_TYPE',
        element: `${sourceClassName}-${targetClassName}`,
        message: `Se esperaba UNO en el lado del todo para ${effectiveRelType}, se degrada a Association sin cascada.`,
      });
      effectiveRelType = 'Association';
    } else {
      srcInfo = { type: 'ONE', mandatory: effectiveRelType === 'Composition' };
    }
  }

  if (
    (effectiveRelType === 'Association' && srcInfo.type === 'UNDEFINED') ||
    tgtInfo.type === 'UNDEFINED'
  ) {
    warnings.push({
      code: 'MULTIPLICITY_UNDEFINED',
      element: `${sourceClassName}-${targetClassName}`,
      message: `${sourceClassName} -> ${targetClassName}: falta la multiplicidad ${
        tgtInfo.type === 'UNDEFINED'
          ? 'del lado de la parte'
          : 'del lado del origen'
      }.`,
    });
    return { warnings };
  }

  const cascadeConfig = getCascadeConfig(effectiveRelType);

  const rawPartName = toCamelCase(sourceClassName);
  const rawWholeName = toCamelCase(targetClassName);

  let basePartFieldName =
    srcInfo.type === 'MANY' && !rawPartName.endsWith('s')
      ? `${rawPartName}s`
      : rawPartName;
  let baseWholeFieldName =
    tgtInfo.type === 'MANY' && !rawWholeName.endsWith('s')
      ? `${rawWholeName}s`
      : rawWholeName;

  // Collision detection
  let partFieldName = basePartFieldName;
  let wholeFieldName = baseWholeFieldName;

  const isSelfRef = sourceClassName === targetClassName;

  // 1. Apply label if forceTieBreak or if we just want to try it
  let labelSuffix = '';
  if (label) {
    const { result: normLabel } = normalizeAttributeName(label);
    if (normLabel) {
      labelSuffix = normLabel.charAt(0).toUpperCase() + normLabel.slice(1);
    }
  }

  let collisionOccurred = false;

  if (forceTieBreak && labelSuffix) {
    partFieldName += labelSuffix;
    wholeFieldName += labelSuffix;
    collisionOccurred = true;
  }

  // 2. Fallback to numeric suffix if still colliding
  // For target/part field:
  let pSuffix = 2;
  let pUsedLabel = forceTieBreak && !!labelSuffix;
  while (existingTargetFields.includes(partFieldName)) {
    if (labelSuffix && !pUsedLabel) {
      partFieldName = basePartFieldName + labelSuffix;
      pUsedLabel = true;
    } else {
      partFieldName = basePartFieldName + (labelSuffix || '') + pSuffix;
      pSuffix++;
    }
    collisionOccurred = true;
  }

  // For source/whole field:
  let wSuffix = 2;
  let wUsedLabel = forceTieBreak && !!labelSuffix;
  while (
    existingSourceFields.includes(wholeFieldName) ||
    (isSelfRef && wholeFieldName === partFieldName)
  ) {
    if (labelSuffix && !wUsedLabel) {
      wholeFieldName = baseWholeFieldName + labelSuffix;
      wUsedLabel = true;
    } else {
      wholeFieldName = baseWholeFieldName + (labelSuffix || '') + wSuffix;
      wSuffix++;
    }
  }

  const fkColumn = `${toTableName(partFieldName)}_id`;

  let sourceField: JavaRelationField;
  let targetField: JavaRelationField;

  const sourceParams: string[] = [];
  const targetParams: string[] = [];
  const joinColumnParams: string[] = [`name = "${fkColumn}"`];

  // (a) Obligatoriedad de la PARTE -> anotación en el TODO (Source). Sale de tgtMultiplicity
  if (tgtInfo.mandatory && tgtInfo.type === 'ONE') {
    sourceParams.push('optional = false');
  }

  // (b) Obligatoriedad del TODO -> anotación en la PARTE (Target). Sale de srcInfo / RelationshipType
  if (srcInfo.mandatory && srcInfo.type === 'ONE') {
    targetParams.push('optional = false');
    joinColumnParams.push('nullable = false');
  }

  if (cascadeConfig.cascade) {
    const isMultiple = cascadeConfig.cascade.includes(',');
    sourceParams.push(
      `cascade = ${
        isMultiple ? `{${cascadeConfig.cascade}}` : cascadeConfig.cascade
      }`
    );
  }

  const javadocStr = formatJavadoc(label);

  if (srcInfo.type === 'ONE' && tgtInfo.type === 'ONE') {
    joinColumnParams.push('unique = true');
    if (cascadeConfig.orphanRemoval) sourceParams.push('orphanRemoval = true');
    sourceParams.push(`mappedBy = "${partFieldName}"`);

    sourceField = {
      fieldName: wholeFieldName,
      fieldType: targetClassName,
      relatedClassName: targetClassName,
      annotations: [`@OneToOne${buildAnnotationParams(sourceParams)}`],
      javadoc: javadocStr,
      isCollection: false,
    };
    targetField = {
      fieldName: partFieldName,
      fieldType: sourceClassName,
      relatedClassName: sourceClassName,
      annotations: [
        `@OneToOne${buildAnnotationParams(targetParams)}`,
        `@JoinColumn${buildAnnotationParams(joinColumnParams)}`,
      ],
      isCollection: false,
    };
  } else if (srcInfo.type === 'ONE' && tgtInfo.type === 'MANY') {
    if (cascadeConfig.orphanRemoval) sourceParams.push('orphanRemoval = true');
    sourceParams.push(`mappedBy = "${partFieldName}"`);

    sourceField = {
      fieldName: wholeFieldName,
      fieldType: `List<${targetClassName}>`,
      relatedClassName: targetClassName,
      annotations: [`@OneToMany${buildAnnotationParams(sourceParams)}`],
      javadoc: javadocStr,
      isCollection: true,
      collectionType: 'List',
    };
    targetField = {
      fieldName: partFieldName,
      fieldType: sourceClassName,
      relatedClassName: sourceClassName,
      annotations: [
        `@ManyToOne${buildAnnotationParams(targetParams)}`,
        `@JoinColumn${buildAnnotationParams(joinColumnParams)}`,
      ],
      isCollection: false,
    };
  } else if (srcInfo.type === 'MANY' && tgtInfo.type === 'ONE') {
    // Association many-to-one
    const srcJoinColumnParams = [`name = "${toTableName(wholeFieldName)}_id"`];
    if (tgtInfo.mandatory) srcJoinColumnParams.push('nullable = false');

    sourceField = {
      fieldName: wholeFieldName,
      fieldType: targetClassName,
      relatedClassName: targetClassName,
      annotations: [
        `@ManyToOne${buildAnnotationParams(sourceParams)}`,
        `@JoinColumn${buildAnnotationParams(srcJoinColumnParams)}`,
      ],
      javadoc: javadocStr,
      isCollection: false,
    };

    const mappedByParams = [`mappedBy = "${wholeFieldName}"`];
    targetField = {
      fieldName: partFieldName,
      fieldType: `List<${sourceClassName}>`,
      relatedClassName: sourceClassName,
      annotations: [`@OneToMany${buildAnnotationParams(mappedByParams)}`],
      isCollection: true,
      collectionType: 'List',
    };
  } else {
    // MANY to MANY
    sourceField = {
      fieldName: wholeFieldName,
      fieldType: `Set<${targetClassName}>`,
      relatedClassName: targetClassName,
      annotations: [
        `@ManyToMany${buildAnnotationParams(sourceParams)}`,
        `@JoinTable`,
      ],
      javadoc: javadocStr,
      isCollection: true,
      collectionType: 'Set',
    };

    const mappedByParams = [`mappedBy = "${wholeFieldName}"`];
    targetField = {
      fieldName: partFieldName,
      fieldType: `Set<${sourceClassName}>`,
      relatedClassName: sourceClassName,
      annotations: [`@ManyToMany${buildAnnotationParams(mappedByParams)}`],
      isCollection: true,
      collectionType: 'Set',
    };
  }

  return {
    sourceField,
    targetField,
    warnings,
  };
}
