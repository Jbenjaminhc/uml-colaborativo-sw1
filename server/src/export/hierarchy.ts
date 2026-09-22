import { JavaClass, JavaField, JavaRelationField } from './types';

export function getHierarchy(
  cls: JavaClass,
  classMap: Map<string, JavaClass>
): JavaClass[] {
  const hierarchy: JavaClass[] = [];
  let curr: JavaClass | undefined = cls;
  while (curr) {
    hierarchy.unshift(curr);
    curr = curr.extendsClass ? classMap.get(curr.extendsClass) : undefined;
  }
  return hierarchy;
}

export function getAllFields(
  cls: JavaClass,
  classMap: Map<string, JavaClass>
): JavaField[] {
  const hierarchy = getHierarchy(cls, classMap);
  const fields: JavaField[] = [];
  for (const c of hierarchy) {
    fields.push(...c.fields);
  }
  return fields;
}

export function getAllRelationFields(
  cls: JavaClass,
  classMap: Map<string, JavaClass>
): JavaRelationField[] {
  const hierarchy = getHierarchy(cls, classMap);
  const relations: JavaRelationField[] = [];
  for (const c of hierarchy) {
    relations.push(...c.relationFields);
  }
  return relations;
}
