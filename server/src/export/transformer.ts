import {
  normalizeClassName,
  normalizeAttributeName,
  normalizeMethodName,
  toRestPath,
  toTableName,
  toEnumConstant,
  deduplicateNames,
} from './normalizers';
import {
  mapType,
  mapReturnType,
  mapVisibility,
  resolvePrimaryKey,
} from './mappers';
import {
  normalizeMultiplicity,
  resolveRelationshipAnnotations,
} from './relationships';
import {
  IntermediateModel,
  JavaClass,
  JavaInterface,
  JavaEnum,
  JavaField,
  JavaMethod,
  Warning,
  JavaRelationField,
  Multiplicity,
  RelationshipType,
} from './types';

export interface EntityDoc {
  _id: string;
  type: 'class' | 'interface' | 'enum';
  position?: { x: number; y: number };
  data: {
    name: string;
    isAbstract?: boolean;
    constants?: Array<{ id: number; name: string; type: string }>;
    attributes?: Array<{
      id: number;
      name: string;
      visibility: string;
      type: string;
    }>;
    methods?: Array<{
      id: number;
      name: string;
      returnType: string;
      visibility: string;
      isStatic: boolean;
    }>;
  };
}

export interface RelationshipDoc {
  _id: string;
  type: RelationshipType;
  source: string;
  target: string;
  data: {
    srcMultiplicity?: string;
    tgtMultiplicity?: string;
    label?: string;
  };
}

export function transform(
  entities: EntityDoc[],
  relationships: RelationshipDoc[]
): IntermediateModel {
  const warnings: Warning[] = [];

  // C14: Sorting
  const entitiesMapForSort = new Map(entities.map((e) => [e._id, e]));
  relationships.sort((a, b) => {
    const sa = entitiesMapForSort.get(a.source);
    const ta = entitiesMapForSort.get(a.target);
    const sb = entitiesMapForSort.get(b.source);
    const tb = entitiesMapForSort.get(b.target);
    const nsa = sa ? normalizeClassName(sa.data.name).result : '';
    const nsb = sb ? normalizeClassName(sb.data.name).result : '';
    if (nsa !== nsb) return nsa.localeCompare(nsb);
    const nta = ta ? normalizeClassName(ta.data.name).result : '';
    const ntb = tb ? normalizeClassName(tb.data.name).result : '';
    if (nta !== ntb) return nta.localeCompare(ntb);
    return a.type.localeCompare(b.type);
  });

  entities.sort((a, b) => {
    return normalizeClassName(a.data.name).result.localeCompare(
      normalizeClassName(b.data.name).result
    );
  });

  const entitiesMap = new Map<string, EntityDoc>();
  entities.forEach((e) => entitiesMap.set(e._id, e));

  const allNames = [];
  for (const entity of entities) {
    const { result, warnings: w } = normalizeClassName(entity.data.name || '');
    warnings.push(...w);
    allNames.push(result);
  }

  const { result: dedupedNames, warnings: dw } = deduplicateNames(allNames);
  warnings.push(...dw);

  const normalizedNamesMap = new Map<string, string>();
  entities.forEach((e, i) => {
    normalizedNamesMap.set(e._id, dedupedNames[i]);
  });

  const enumNames = entities
    .filter((e) => e.type === 'enum')
    .map((e) => normalizedNamesMap.get(e._id)!);

  const processedPairs = new Set<string>();
  const inheritanceMap = new Map<string, string>(); // child -> parent

  let globalMethodParamsWarningEmitted = false;

  const validRelationships: RelationshipDoc[] = [];

  for (const rel of relationships) {
    if (!entitiesMap.has(rel.source) || !entitiesMap.has(rel.target)) {
      warnings.push({
        code: 'MISSING_ENTITY',
        element: rel._id,
        message: `La relaci\u00f3n apunta a una entidad inexistente`,
      });
      continue;
    }

    const pairKey = `${rel.source}-${rel.target}-${rel.type}-${
      rel.data?.srcMultiplicity || ''
    }-${rel.data?.tgtMultiplicity || ''}-${rel.data?.label || ''}`;
    if (processedPairs.has(pairKey)) {
      warnings.push({
        code: 'DUPLICATE_RELATION',
        element: rel._id,
        message: `Relaci\u00f3n duplicada entre ${normalizedNamesMap.get(
          rel.source
        )} y ${normalizedNamesMap.get(rel.target)}`,
      });
      continue;
    }
    processedPairs.add(pairKey);

    if (rel.type === 'Inheritance') {
      if (inheritanceMap.has(rel.target)) {
        warnings.push({
          code: 'MULTIPLE_INHERITANCE',
          element: normalizedNamesMap.get(rel.target) || rel._id,
          message: `Herencia m\u00faltiple para ${normalizedNamesMap.get(
            rel.target
          )}`,
        });
        continue;
      }

      let curr = rel.source;
      let isCyclic = false;
      while (curr) {
        if (curr === rel.target) {
          isCyclic = true;
          break;
        }
        curr = inheritanceMap.get(curr)!;
      }

      if (isCyclic) {
        warnings.push({
          code: 'CYCLIC_INHERITANCE',
          element: normalizedNamesMap.get(rel.target) || rel._id,
          message: `Herencia c\u00edclica para ${normalizedNamesMap.get(
            rel.target
          )}`,
        });
        continue;
      }

      inheritanceMap.set(rel.target, rel.source);
    }
    validRelationships.push(rel);
  }

  const subclasses = new Set(Array.from(inheritanceMap.keys()));
  const parentclasses = new Set(Array.from(inheritanceMap.values()));

  const classes: JavaClass[] = [];
  const interfaces: JavaInterface[] = [];
  const enums: JavaEnum[] = [];
  const javaClassesMap = new Map<string, JavaClass>();
  const relationPairCounts = new Map<string, number>();

  for (const rel of validRelationships) {
    if (['Association', 'Aggregation', 'Composition'].includes(rel.type)) {
      const ids = [rel.source, rel.target].sort();
      const pairKey = `${ids[0]}-${ids[1]}`;
      relationPairCounts.set(
        pairKey,
        (relationPairCounts.get(pairKey) || 0) + 1
      );
    }
  }

  const processedEntities = new Set<string>();

  for (const entity of entities) {
    if (processedEntities.has(entity._id)) continue;
    processedEntities.add(entity._id);

    const name = normalizedNamesMap.get(entity._id)!;

    if (entity.type === 'enum') {
      const constants = [];
      for (const c of entity.data.constants || []) {
        constants.push(toEnumConstant(c.name));
      }
      enums.push({ enumName: name, constants });
    } else if (entity.type === 'interface') {
      const methods: JavaMethod[] = [];
      for (const m of entity.data.methods || []) {
        const nm = normalizeMethodName(m.name);
        warnings.push(...nm.warnings);

        if (!globalMethodParamsWarningEmitted) {
          warnings.push({
            code: 'METHOD_PARAMS_NOT_SUPPORTED',
            element: '(global)',
            message:
              'Los parámetros de méMtodo no se conservan porque el editor no los almacena. Las firmas generadas están vacías y deben completarse manualmente.',
          });
          globalMethodParamsWarningEmitted = true;
        }

        const retType = mapReturnType(m.returnType, enumNames);
        if (retType.warning) warnings.push(retType.warning);
        methods.push({
          name: nm.result,
          returnType: retType.javaType,
          visibility: mapVisibility(m.visibility),
          isStatic: m.isStatic,
          body: '',
        });
      }
      interfaces.push({ interfaceName: name, methods });
    } else if (entity.type === 'class') {
      const rawAttrs = entity.data.attributes || [];
      if (rawAttrs.length === 0) {
        warnings.push({
          code: 'NO_ATTRIBUTES',
          element: name,
          message: 'Clase sin atributos',
        });
      }

      const attributes = [];
      const seenAttrs = new Set<string>();
      for (const a of rawAttrs) {
        if (!a.name || !a.type) {
          warnings.push({
            code: 'INVALID_ATTRIBUTE',
            element: a.name || 'unnamed',
            message: 'Atributo sin nombre o tipo',
          });
          continue;
        }
        const na = normalizeAttributeName(a.name);
        if (seenAttrs.has(na.result)) continue;
        seenAttrs.add(na.result);

        warnings.push(...na.warnings);
        const ty = mapType(a.type, enumNames);
        if (ty.warning) warnings.push(ty.warning);

        attributes.push({
          name: a.name,
          normalizedName: na.result,
          javaType: ty.javaType,
          annotations: [],
          visibility: mapVisibility(a.visibility),
        });
      }

      const isSubclass = subclasses.has(entity._id);
      let rootClassName;

      if (isSubclass) {
        let curr = entity._id;
        while (inheritanceMap.has(curr)) {
          curr = inheritanceMap.get(curr)!;
        }
        rootClassName = normalizedNamesMap.get(curr);
      }

      const { attributes: finalAttrs, warnings: pw } = resolvePrimaryKey(
        name,
        attributes,
        rootClassName
      );
      warnings.push(...pw);

      const fields: JavaField[] = finalAttrs.map((a) => ({
        name: a.normalizedName,
        javaType: a.javaType,
        annotations: a.annotations,
        isId: !isSubclass && a.normalizedName === 'id',
      }));

      const methods: JavaMethod[] = [];
      for (const m of entity.data.methods || []) {
        const nm = normalizeMethodName(m.name);
        warnings.push(...nm.warnings);

        if (nm.result === name) {
          warnings.push({
            code: 'CONSTRUCTOR_SKIPPED',
            element: `${name}.${nm.result}`,
            message: `MéM\u00e9todo ${nm.result} se omiti\u00f3ó: Es un constructor, JPA y Lombok (@NoArgsConstructor) ya lo gestionan.`,
          });
          continue;
        }

        let skippedAsAccessor = false;
        for (const f of fields) {
          const capName = f.name.charAt(0).toUpperCase() + f.name.slice(1);
          const isBool = f.javaType.toLowerCase() === 'boolean';
          if (
            nm.result === `get${capName}` ||
            (isBool && nm.result === `is${capName}`) ||
            nm.result === `set${capName}`
          ) {
            warnings.push({
              code: 'ACCESSOR_SKIPPED',
              element: `${name}.${nm.result}`,
              message: `MéM\u00e9todo ${nm.result} se omiti\u00f3ó: Lombok ya lo genera a partir del atributo ${f.name}.`,
            });
            skippedAsAccessor = true;
            break;
          }
        }
        if (skippedAsAccessor) continue;

        if (!globalMethodParamsWarningEmitted) {
          warnings.push({
            code: 'METHOD_PARAMS_NOT_SUPPORTED',
            element: '(global)',
            message:
              'Los parámetros de méM�todo no se conservan porque el editor no los almacena. Las firmas generadas están vacías y deben completarse manualmente.',
          });
          globalMethodParamsWarningEmitted = true;
        }

        const retType = mapReturnType(m.returnType, enumNames);
        if (retType.warning) warnings.push(retType.warning);
        methods.push({
          name: nm.result,
          returnType: retType.javaType,
          visibility: mapVisibility(m.visibility),
          isStatic: m.isStatic,
          body: '',
        });
      }

      const clazz: JavaClass = {
        className: name,
        tableName: toTableName(name),
        restPath: toRestPath(name),
        isAbstract: !!entity.data.isAbstract,
        implementsInterfaces: [],
        fields,
        relationFields: [],
        methods,
        discriminatorAnnotations: [],
        isSubclass: subclasses.has(entity._id),
      };

      if (subclasses.has(entity._id)) {
        const parentId = inheritanceMap.get(entity._id)!;
        clazz.extendsClass = normalizedNamesMap.get(parentId);
        clazz.discriminatorAnnotations.push(`@DiscriminatorValue("${name}")`);
      }

      if (parentclasses.has(entity._id) && !subclasses.has(entity._id)) {
        if (!entity.data.isAbstract) {
          clazz.discriminatorAnnotations.push(`@DiscriminatorValue("${name}")`);
        }
        clazz.discriminatorAnnotations.push(
          '@Inheritance(strategy = InheritanceType.SINGLE_TABLE)'
        );
        clazz.discriminatorAnnotations.push(
          '@DiscriminatorColumn(name = "dtype")'
        );
      }

      classes.push(clazz);
      javaClassesMap.set(entity._id, clazz);
    }
  }

  for (const rel of validRelationships) {
    if (rel.type === 'Inheritance') continue; // already handled

    const sourceClass = javaClassesMap.get(rel.source);
    if (!sourceClass) {
      if (rel.type !== 'Dependency' && rel.type !== 'Implementation') {
        // Might be enum/interface acting as source? Ignore or warning
      }
    }

    if (rel.type === 'Implementation') {
      const sourceEnt = entitiesMap.get(rel.source);
      const targetEnt = entitiesMap.get(rel.target);
      if (sourceEnt?.type === 'interface' && targetEnt?.type === 'class') {
        const interfaceName = normalizedNamesMap.get(rel.source)!;
        const targetClass = javaClassesMap.get(rel.target);
        if (targetClass) targetClass.implementsInterfaces.push(interfaceName);
      } else {
        warnings.push({
          code: 'INVALID_IMPLEMENTATION',
          element: rel._id,
          message:
            'Implementaci\u00f3n con un objetivo que no es clase o source no es interfaz',
        });
      }
    } else if (rel.type === 'Dependency') {
      warnings.push({
        code: 'DEPENDENCY_MAPPED_AS_COMMENT',
        element: rel._id,
        message: 'Dependencia mapeada como comentario',
      });
    } else if (
      ['Association', 'Aggregation', 'Composition'].includes(rel.type)
    ) {
      const sourceName = normalizedNamesMap.get(rel.source)!;
      const targetName = normalizedNamesMap.get(rel.target)!;
      const ids = [rel.source, rel.target].sort();
      const pairKey = `${ids[0]}-${ids[1]}`;
      const forceTieBreak =
        (relationPairCounts.get(pairKey) || 0) > 1 || rel.source === rel.target;

      const {
        sourceField,
        targetField,
        warnings: rw,
      } = resolveRelationshipAnnotations(
        rel.data.srcMultiplicity,
        rel.data.tgtMultiplicity,
        sourceName,
        targetName,
        rel.type,
        rel.data.label,
        sourceClass?.relationFields.map((f) => f.fieldName) || [],
        javaClassesMap
          .get(rel.target)
          ?.relationFields.map((f) => f.fieldName) || [],
        forceTieBreak
      );

      warnings.push(...rw);

      const tClass = javaClassesMap.get(rel.target);

      if (sourceClass && sourceField)
        sourceClass.relationFields.push(sourceField);
      if (tClass && targetField) tClass.relationFields.push(targetField);
    }
  }

  // Evaluate collisions
  for (const cls of javaClassesMap.values()) {
    const groupedByTarget = new Map<string, string[]>();
    for (const f of cls.relationFields) {
      if (!groupedByTarget.has(f.relatedClassName)) {
        groupedByTarget.set(f.relatedClassName, []);
      }
      groupedByTarget.get(f.relatedClassName)!.push(f.fieldName);
    }
    for (const [targetName, fields] of groupedByTarget.entries()) {
      if (fields.length > 1) {
        warnings.push({
          code: 'FIELD_NAME_COLLISION',
          element: `${cls.className}-${targetName}`,
          message: `Colisi\u00f3n resuelta en ${cls.className}: ${fields.join(
            ', '
          )}`,
        });
      }
    }
  }

  warnings.sort((a, b) => {
    if (a.code !== b.code) return a.code.localeCompare(b.code);
    return a.element.localeCompare(b.element);
  });

  return { classes, interfaces, enums, warnings };
}
