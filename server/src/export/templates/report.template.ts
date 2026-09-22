import { Warning } from '../types';

export function generateReport(warnings: Warning[]): string {
  const lines: string[] = [];
  lines.push('# Informe de Generaci\u00f3n');
  lines.push('');

  if (warnings.length === 0) {
    lines.push(
      '\u00c9xito. No se generaron advertencias. El modelo est\u00e1 limpio.'
    );
    return lines.join('\n');
  }

  lines.push(`Se generaron **${warnings.length}** advertencia(s):`);
  lines.push('');

  // Group by element
  const grouped = new Map<string, Warning[]>();
  for (const w of warnings) {
    const key = w.element || 'General';
    const list = grouped.get(key) || [];
    list.push(w);
    grouped.set(key, list);
  }

  for (const [element, warns] of grouped) {
    lines.push(`## ${element}`);
    lines.push('');
    for (const w of warns) {
      lines.push(`- **[${w.code}]** ${w.message}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}
