import { JavaClass, Warning } from '../types';
import { sampleValueRaw, sortClassesTopologically } from '../utils';

function toColumnName(str: string): string {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

function sampleValue(
  javaType: string,
  fieldName: string,
  index: number
): string {
  const lowerType = javaType.toLowerCase();
  if (lowerType === 'string') return `'${fieldName}_${index}'`;
  if (lowerType === 'integer' || lowerType === 'int') return `${10 * index}`;
  if (lowerType === 'long') return `${100 * index}`;
  if (lowerType === 'double' || lowerType === 'float') return `${10.5 * index}`;
  if (lowerType === 'boolean') return index % 2 === 0 ? 'true' : 'false';
  if (lowerType === 'char' || lowerType === 'character')
    return `'${String.fromCharCode(64 + (index % 26 || 26))}'`;
  if (lowerType === 'localdate') return `'2024-01-0${index}'`;
  if (lowerType === 'localdatetime') return `'2024-01-0${index} 10:00:00'`;
  return `'sample_${index}'`;
}

export function generateDataSql(classes: JavaClass[]): {
  content: string;
  warnings: Warning[];
} {
  const warnings: Warning[] = [];
  const lines: string[] = [];

  const concreteClasses = classes.filter((c) => !c.isAbstract);
  const classMap = new Map(classes.map((c) => [c.className, c]));

  const adj = new Map<string, Set<string>>();
  const inDegree = new Map<string, number>();

  concreteClasses.forEach((c) => {
    adj.set(c.className, new Set());
    inDegree.set(c.className, 0);
  });

  const getRoot = (className: string): string => {
    let curr = classMap.get(className);
    while (curr && curr.extendsClass) {
      curr = classMap.get(curr.extendsClass);
    }
    return curr ? curr.className : className;
  };

  const isSingleTable = (rootName: string): boolean => {
    const root = classMap.get(rootName);
    if (!root) return false;
    return root.discriminatorAnnotations.some((a) =>
      a.includes('InheritanceType.SINGLE_TABLE')
    );
  };

  const getClassHierarchyCols = (className: string) => {
    const cols = new Set<string>();
    let curr = classMap.get(className);
    while (curr) {
      for (const currF of curr.fields) {
        if (!currF.isId) cols.add(toColumnName(currF.name));
      }
      for (const rel of curr.relationFields) {
        const joinColAnn = rel.annotations.find((a) =>
          a.includes('@JoinColumn')
        );
        if (joinColAnn) {
          const match = joinColAnn.match(/name\s*=\s*"([^"]+)"/);
          const col = match ? match[1] : toColumnName(rel.fieldName);
          cols.add(col);
        }
      }
      curr = curr.extendsClass ? classMap.get(curr.extendsClass) : undefined;
    }
    return cols;
  };

  const classFkInfo = new Map<
    string,
    Array<{
      col: string;
      mandatory: boolean;
      target: string;
      targetRoot: string;
    }>
  >();

  for (const cls of concreteClasses) {
    const fks: Array<{
      col: string;
      mandatory: boolean;
      target: string;
      targetRoot: string;
    }> = [];

    for (const rel of cls.relationFields) {
      const joinColAnn = rel.annotations.find((a) => a.includes('@JoinColumn'));
      if (joinColAnn) {
        const match = joinColAnn.match(/name\s*=\s*"([^"]+)"/);
        const col = match ? match[1] : toColumnName(rel.fieldName);

        const mandatory =
          joinColAnn.includes('nullable = false') ||
          rel.annotations.some((a) => a.includes('optional = false'));

        const targetRoot = getRoot(rel.relatedClassName);
        fks.push({ col, mandatory, target: rel.relatedClassName, targetRoot });

        if (classMap.has(rel.relatedClassName)) {
          const deps = adj.get(cls.className)!;
          if (!deps.has(rel.relatedClassName)) {
            deps.add(rel.relatedClassName);
          }
        }
      }
    }
    classFkInfo.set(cls.className, fks);
  }

  const graph = new Map<string, string[]>();
  concreteClasses.forEach((c) => graph.set(c.className, []));

  for (const [a, deps] of adj.entries()) {
    for (const b of deps) {
      graph.get(b)!.push(a);
      inDegree.set(a, inDegree.get(a)! + 1);
    }
  }

  const queue: string[] = [];
  for (const [name, deg] of inDegree.entries()) {
    if (deg === 0) queue.push(name);
  }

  const sorted: JavaClass[] = [];
  let edgesProcessed = 0;
  let totalEdges = 0;
  graph.forEach((list) => {
    totalEdges += list.length;
  });

  while (queue.length > 0) {
    const node = queue.shift()!;
    sorted.push(classMap.get(node)!);
    for (const neighbor of graph.get(node)!) {
      edgesProcessed++;
      const deg = inDegree.get(neighbor)! - 1;
      inDegree.set(neighbor, deg);
      if (deg === 0) queue.push(neighbor);
    }
  }

  if (edgesProcessed !== totalEdges) {
    warnings.push({
      code: 'SEED_CYCLE_DETECTED',
      element: 'data.sql',
      message:
        'Se ha detectado un ciclo en las dependencias de claves for�neas. El data.sql ha sido omitido.',
    });
    return { content: '', warnings };
  }

  lines.push('-- Sample data generated by UML2Code');
  lines.push('-- Inserted in FK order');
  lines.push('');

  const hierarchyIdOffset = new Map<string, number>();

  for (const cls of sorted) {
    const rootName = getRoot(cls.className);
    const rootClass = classMap.get(rootName)!;
    const singleTable = isSingleTable(rootName);

    const tableName = singleTable ? rootClass.tableName : cls.tableName;

    let curr = cls;
    let idField = curr.fields.find((f) => f.isId);
    while (!idField && curr.extendsClass) {
      curr = classMap.get(curr.extendsClass)!;
      idField = curr.fields.find((f) => f.isId);
    }

    if (!idField) continue;

    const cols: string[] = [];
    cols.push(toColumnName(idField.name));

    if (singleTable) {
      cols.push('dtype');
    }

    const hierarchyCols = new Set<string>();
    if (singleTable) {
      concreteClasses.forEach((c) => {
        if (getRoot(c.className) === rootName) {
          getClassHierarchyCols(c.className).forEach((col) =>
            hierarchyCols.add(col)
          );
        }
      });
    } else {
      getClassHierarchyCols(cls.className).forEach((col) =>
        hierarchyCols.add(col)
      );
    }

    const colsList = Array.from(hierarchyCols);
    cols.push(...colsList);

    if (cols.length === 0) continue;

    const myCols = getClassHierarchyCols(cls.className);

    let currentOffset = hierarchyIdOffset.get(tableName) || 0;

    for (let i = 1; i <= 2; i++) {
      currentOffset++;
      const vals: string[] = [];
      const rowId = 1000 + currentOffset;

      vals.push(String(rowId));

      if (singleTable) {
        let dtype = cls.className;
        const discAnn = cls.discriminatorAnnotations.find((a) =>
          a.includes('@DiscriminatorValue')
        );
        if (discAnn) {
          const match = discAnn.match(/"([^"]+)"/);
        }
        vals.push(`'${dtype}'`);
      }

      const fkCounts = new Map<string, number>();
      const fks = classFkInfo.get(cls.className) || [];

      for (const colName of colsList) {
        if (!myCols.has(colName)) {
          vals.push('NULL');
          continue;
        }

        const fkFound = fks.find((fkey) => fkey.col === colName);
        if (fkFound) {
          const targetCount = fkCounts.get(fkFound.target) || 0;
          const targetId = 1001 + ((currentOffset - 1 + targetCount) % 2);

          if (fkFound.mandatory) {
            vals.push(String(targetId));
          } else {
            vals.push(currentOffset % 2 === 1 ? String(targetId) : 'NULL');
          }
          fkCounts.set(fkFound.target, targetCount + 1);
        } else {
          let info = null;
          let cField = classMap.get(cls.className);
          while (cField) {
            const fldFound = cField.fields.find(
              (fieldItem) =>
                toColumnName(fieldItem.name) === colName && !fieldItem.isId
            );
            if (fldFound) {
              info = {
                type: fldFound.javaType,
                name: fldFound.name,
                field: fldFound,
              };
              break;
            }
            cField = cField.extendsClass
              ? classMap.get(cField.extendsClass)
              : undefined;
          }
          if (info) {
            vals.push(sampleValue(info.type, info.name, currentOffset));
          } else {
            vals.push('NULL');
          }
        }
      }

      lines.push(
        `INSERT INTO ${tableName} (${cols.join(', ')}) VALUES (${vals.join(
          ', '
        )});`
      );
    }

    hierarchyIdOffset.set(tableName, currentOffset);

    const idFieldAnn = idField.annotations.find((a) =>
      a.includes('@GeneratedValue')
    );
    if (
      idFieldAnn &&
      idFieldAnn.includes('strategy = GenerationType.IDENTITY')
    ) {
      lines.push(
        `ALTER TABLE ${tableName} ALTER COLUMN ${toColumnName(
          idField.name
        )} RESTART WITH ${1001 + currentOffset};`
      );
    }
    lines.push('');
  }

  return { content: lines.join('\n'), warnings };
}
