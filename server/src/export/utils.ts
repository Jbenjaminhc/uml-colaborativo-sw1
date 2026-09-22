import { JavaClass, JavaEnum, Warning } from './types';

export function sampleValueRaw(
  javaType: string,
  fieldName: string,
  index: number,
  enums: JavaEnum[] = []
): any {
  // Check if it's an enum
  const enumDef = enums.find((e) => e.enumName === javaType);
  if (enumDef && enumDef.constants.length > 0) {
    return enumDef.constants[0];
  }

  const lowerType = javaType.toLowerCase();
  if (lowerType === 'string') return `${fieldName}_${index}`;
  if (lowerType === 'integer' || lowerType === 'int') return 10 * index;
  if (lowerType === 'long') return 100 * index;
  if (lowerType === 'double' || lowerType === 'float') return 10.5 * index;
  if (lowerType === 'boolean') return index % 2 === 0;
  if (lowerType === 'char' || lowerType === 'character')
    return String.fromCharCode(64 + (index % 26 || 26));
  if (lowerType === 'localdate') return `2024-01-0${index}`;
  if (lowerType === 'localdatetime') return `2024-01-0${index}T10:00:00`;

  return `sample_${index}`;
}

export function sortClassesTopologically(
  concreteClasses: JavaClass[],
  classMap: Map<string, JavaClass>
): { sorted: JavaClass[]; warnings: Warning[] } {
  const adj = new Map<string, Set<string>>();
  const inDegree = new Map<string, number>();

  concreteClasses.forEach((c) => {
    adj.set(c.className, new Set());
    inDegree.set(c.className, 0);
  });

  for (const cls of concreteClasses) {
    for (const rel of cls.relationFields) {
      const joinColAnn = rel.annotations.find((a) => a.includes('@JoinColumn'));
      if (joinColAnn && classMap.has(rel.relatedClassName)) {
        const deps = adj.get(cls.className)!;
        if (!deps.has(rel.relatedClassName)) {
          deps.add(rel.relatedClassName);
        }
      }
    }
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

  const warnings: Warning[] = [];
  if (edgesProcessed !== totalEdges) {
    warnings.push({
      code: 'SEED_CYCLE_DETECTED',
      element: 'postman',
      message:
        'Se ha detectado un ciclo en las dependencias de claves for�neas.',
    });
  }

  return { sorted, warnings };
}
