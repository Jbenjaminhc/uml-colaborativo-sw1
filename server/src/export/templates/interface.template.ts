import { JavaInterface } from '../types';

export function generateInterface(
  iface: JavaInterface,
  packageName: string
): string {
  const lines: string[] = [];
  lines.push(`package ${packageName};`);
  lines.push('');

  const needsList = iface.methods.some((m) => m.returnType.includes('List<'));
  const needsLocalDate = iface.methods.some((m) =>
    m.returnType.includes('LocalDate')
  );
  const needsLocalDateTime = iface.methods.some((m) =>
    m.returnType.includes('LocalDateTime')
  );

  if (needsList) lines.push('import java.util.List;');
  if (needsLocalDate) lines.push('import java.time.LocalDate;');
  if (needsLocalDateTime) lines.push('import java.time.LocalDateTime;');

  if (needsList || needsLocalDate || needsLocalDateTime) {
    lines.push('');
  }

  lines.push(`public interface ${iface.interfaceName} {`);
  lines.push('');

  for (const method of iface.methods) {
    const staticKw = method.isStatic ? 'static ' : '';
    lines.push(
      `    ${method.visibility} ${staticKw}${method.returnType} ${method.name}();`
    );
    lines.push('');
  }

  lines.push('}');
  return lines.join('\n');
}
