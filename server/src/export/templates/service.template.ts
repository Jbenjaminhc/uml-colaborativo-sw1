import { JavaClass } from '../types';

export function generateService(
  cls: JavaClass,
  packageName: string,
  classMap: Map<string, JavaClass>
): string {
  const modelPkg = packageName.replace('.service', '.model');
  const repoPkg = packageName.replace('.service', '.repository');
  const n = cls.className;
  const varName = n.charAt(0).toLowerCase() + n.slice(1);

  const lines: string[] = [];
  lines.push(`package ${packageName};`);
  lines.push('');
  lines.push(`import ${modelPkg}.${n};`);
  lines.push(`import ${repoPkg}.${n}Repository;`);
  lines.push('import org.springframework.stereotype.Service;');
  lines.push(
    'import org.springframework.transaction.annotation.Transactional;'
  );
  lines.push('import java.util.List;');
  lines.push('import java.util.Optional;');
  lines.push('');
  lines.push('@Service');
  lines.push('@Transactional');
  lines.push(`public class ${n}Service {`);
  lines.push('');
  lines.push(`    private final ${n}Repository ${varName}Repository;`);
  lines.push('');
  lines.push(`    public ${n}Service(${n}Repository ${varName}Repository) {`);
  lines.push(`        this.${varName}Repository = ${varName}Repository;`);
  lines.push('    }');
  lines.push('');
  lines.push(`    public List<${n}> findAll() {`);
  lines.push(`        return ${varName}Repository.findAll();`);
  lines.push('    }');
  lines.push('');
  lines.push(`    public Optional<${n}> findById(Long id) {`);
  lines.push(`        return ${varName}Repository.findById(id);`);
  lines.push('    }');
  lines.push('');
  lines.push(`    public ${n} save(${n} ${varName}) {`);
  lines.push(`        return ${varName}Repository.save(${varName});`);
  lines.push('    }');
  lines.push('');
  // Unassign logic for Aggregations / referenced Associations (C25)
  const unassignRelations = cls.relationFields.filter((rel) => {
    const isComposition = rel.annotations.some((a) =>
      a.includes('orphanRemoval')
    );
    if (isComposition) return false;

    const mappedByRegex = /mappedBy\s*=\s*"([^"]+)"/;
    const match = rel.annotations
      .find((a) => mappedByRegex.test(a))
      ?.match(mappedByRegex);
    const wholeFieldName = match ? match[1] : null;

    if (!wholeFieldName) return false;

    const reverseClass = classMap.get(rel.relatedClassName);
    if (!reverseClass) return false;

    const reverseField = reverseClass.relationFields.find(
      (f) => f.fieldName === wholeFieldName
    );
    if (!reverseField) return false;

    const isManyToMany = rel.annotations.some((a) => a.includes('@ManyToMany'));
    if (isManyToMany) return false;

    const isMandatory = reverseField.annotations.some(
      (a) => a.includes('nullable = false') || a.includes('optional = false')
    );
    return !isMandatory;
  });

  lines.push('    public void deleteById(Long id) {');
  if (unassignRelations.length > 0) {
    lines.push(
      `        ${varName}Repository.findById(id).ifPresent(entity -> {`
    );
    for (const rel of unassignRelations) {
      const mappedByRegex = /mappedBy\s*=\s*"([^"]+)"/;
      const match = rel.annotations
        .find((a) => mappedByRegex.test(a))
        ?.match(mappedByRegex);
      const wholeFieldName = match ? match[1] : null;
      if (wholeFieldName) {
        const setterPart = `set${wholeFieldName
          .charAt(0)
          .toUpperCase()}${wholeFieldName.slice(1)}`;
        const getterRel = `get${rel.fieldName
          .charAt(0)
          .toUpperCase()}${rel.fieldName.slice(1)}`;

        if (rel.isCollection) {
          lines.push(
            `            entity.${getterRel}().forEach(p -> p.${setterPart}(null));`
          );
          lines.push(`            entity.${getterRel}().clear();`);
        } else {
          lines.push(`            if (entity.${getterRel}() != null) {`);
          lines.push(
            `                entity.${getterRel}().${setterPart}(null);`
          );
          lines.push(
            `                entity.set${rel.fieldName
              .charAt(0)
              .toUpperCase()}${rel.fieldName.slice(1)}(null);`
          );
          lines.push(`            }`);
        }
      }
    }
    lines.push(`            ${varName}Repository.delete(entity);`);
    lines.push(`        });`);
  } else {
    lines.push(`        ${varName}Repository.deleteById(id);`);
  }
  lines.push('    }');
  lines.push('}');
  return lines.join('\n');
}
