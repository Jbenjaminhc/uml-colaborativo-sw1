import { JavaClass } from '../types';

export function generateEntityClass(
  cls: JavaClass,
  packageName: string
): string {
  const lines: string[] = [];
  lines.push(`package ${packageName};`);
  lines.push('');
  lines.push('import jakarta.persistence.*;');
  lines.push('import lombok.Getter;');
  lines.push('import lombok.Setter;');
  lines.push('import lombok.NoArgsConstructor;');

  // Conditional imports
  const needsList =
    cls.relationFields.some(
      (r) => r.isCollection && r.collectionType === 'List'
    ) || cls.fields.some((f) => f.javaType.includes('List<'));
  const needsSet =
    cls.relationFields.some(
      (r) => r.isCollection && r.collectionType === 'Set'
    ) || cls.fields.some((f) => f.javaType.includes('Set<'));
  const needsLocalDate = cls.fields.some((f) => f.javaType === 'LocalDate');
  const needsLocalDateTime = cls.fields.some(
    (f) => f.javaType === 'LocalDateTime'
  );

  if (needsList) lines.push('import java.util.List;');
  if (needsSet) lines.push('import java.util.Set;');
  if (needsLocalDate) lines.push('import java.time.LocalDate;');
  if (needsLocalDateTime) lines.push('import java.time.LocalDateTime;');

  lines.push('');

  // Class annotations
  lines.push('@Entity');
  if (!cls.isSubclass) lines.push(`@Table(name = "${cls.tableName}")`);
  lines.push('@Getter');
  lines.push('@Setter');
  lines.push('@NoArgsConstructor');

  // Discriminator annotations for inheritance
  for (const ann of cls.discriminatorAnnotations) {
    lines.push(ann);
  }

  // Class declaration
  const abstractKw = cls.isAbstract ? 'abstract ' : '';
  let decl = `public ${abstractKw}class ${cls.className}`;
  if (cls.extendsClass) {
    decl += ` extends ${cls.extendsClass}`;
  }
  if (cls.implementsInterfaces.length > 0) {
    decl += ` implements ${cls.implementsInterfaces.join(', ')}`;
  }
  decl += ' {';
  lines.push(decl);
  lines.push('');

  // Fields
  for (const field of cls.fields) {
    if (field.javadoc) {
      lines.push(`    ${field.javadoc}`);
    }
    for (const ann of field.annotations) {
      lines.push(`    ${ann}`);
    }
    lines.push(`    private ${field.javaType} ${field.name};`);
    lines.push('');
  }

  // Relation fields
  for (const rel of cls.relationFields) {
    if (rel.javadoc) {
      lines.push(`    ${rel.javadoc}`);
    }
    for (const ann of rel.annotations) {
      lines.push(`    ${ann}`);
    }
    if (rel.isCollection) {
      lines.push(
        `    private ${rel.collectionType}<${rel.relatedClassName}> ${rel.fieldName};`
      );
    } else {
      lines.push(`    private ${rel.relatedClassName} ${rel.fieldName};`);
    }
    lines.push('');
  }

  // Methods
  for (const method of cls.methods) {
    lines.push('    // TODO: lógica no especificada en el diagrama');
    const staticKw = method.isStatic ? 'static ' : '';
    lines.push(
      `    ${method.visibility} ${staticKw}${method.returnType} ${method.name}() {`
    );
    if (method.returnType !== 'void') {
      let retVal = 'null';
      if (
        ['int', 'long', 'char', 'float', 'double'].includes(method.returnType)
      ) {
        retVal = '0';
      } else if (method.returnType === 'boolean') {
        retVal = 'false';
      }
      lines.push(`        return ${retVal};`);
    }
    lines.push('    }');
    lines.push('');
  }

  lines.push('}');
  return lines.join('\n');
}
