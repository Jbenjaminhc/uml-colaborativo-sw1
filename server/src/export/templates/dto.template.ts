import { JavaClass } from '../types';

export function generateDto(
  cls: JavaClass,
  packageName: string,
  classMap: Map<string, JavaClass>
): string {
  const lines: string[] = [];
  lines.push(`package ${packageName};`);
  lines.push('');
  lines.push('import lombok.Getter;');
  lines.push('import lombok.Setter;');
  lines.push('import lombok.NoArgsConstructor;');

  const needsList =
    cls.relationFields.some((r) => r.isCollection) ||
    cls.fields.some((f) => f.javaType.includes('List<'));
  const needsLocalDate = cls.fields.some((f) => f.javaType === 'LocalDate');
  const needsLocalDateTime = cls.fields.some(
    (f) => f.javaType === 'LocalDateTime'
  );
  const needsSet = cls.fields.some((f) => f.javaType.includes('Set<'));
  const needsNotNull = cls.relationFields.some((rel) =>
    rel.annotations.some(
      (a) => a.includes('nullable = false') || a.includes('optional = false')
    )
  );

  if (needsList) lines.push('import java.util.List;');
  if (needsLocalDate) lines.push('import java.time.LocalDate;');
  if (needsLocalDateTime) lines.push('import java.time.LocalDateTime;');
  if (needsSet) lines.push('import java.util.Set;');
  if (needsNotNull)
    lines.push('import jakarta.validation.constraints.NotNull;');

  lines.push('');
  lines.push('@Getter');
  lines.push('@Setter');
  lines.push('@NoArgsConstructor');

  const extendsClause = cls.extendsClass
    ? ` extends ${cls.extendsClass}Dto`
    : '';
  lines.push(`public class ${cls.className}Dto${extendsClause} {`);
  lines.push('');

  // Scalar fields
  for (const field of cls.fields) {
    lines.push(`    private ${field.javaType} ${field.name};`);
  }

  // Relation to-one ' <fieldName>Id as Long
  for (const rel of cls.relationFields) {
    if (!rel.isCollection) {
      const isMandatory = rel.annotations.some(
        (a) => a.includes('nullable = false') || a.includes('optional = false')
      );
      if (isMandatory) {
        lines.push('    @NotNull');
      }
      lines.push(`    private Long ${rel.fieldName}Id;`);
    }
  }

  // Relation to-many ' <fieldName>Ids as List<Long>
  for (const rel of cls.relationFields) {
    if (rel.isCollection) {
      const isMandatory = rel.annotations.some(
        (a) => a.includes('nullable = false') || a.includes('optional = false')
      );
      if (isMandatory) {
        lines.push('    @NotNull');
      }
      lines.push(`    private List<Long> ${rel.fieldName}Ids;`);
    }
  }

  lines.push('');
  lines.push('}');
  return lines.join('\n');
}
