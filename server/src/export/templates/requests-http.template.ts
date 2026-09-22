import { JavaClass } from '../types';

export function generateRequestsHttp(classes: JavaClass[]): string {
  const lines: string[] = [];
  lines.push('### Generated HTTP requests for testing');
  lines.push('### Use with VS Code REST Client or IntelliJ HTTP Client');
  lines.push('');
  lines.push('@baseUrl = http://localhost:8080');
  lines.push('');

  for (const cls of classes) {
    if (cls.isAbstract) continue;

    lines.push(`### GET all ${cls.className}`);
    lines.push(`GET {{baseUrl}}${cls.restPath}`);
    lines.push('');
    lines.push('###');
    lines.push('');

    lines.push(`### POST create ${cls.className}`);
    lines.push(`POST {{baseUrl}}${cls.restPath}`);
    lines.push('Content-Type: application/json');
    lines.push('');

    const body: Record<string, unknown> = {};
    for (const f of cls.fields) {
      if (!f.isId) {
        body[f.name] = sampleValue(f.javaType);
      }
    }
    lines.push(JSON.stringify(body, null, 2));
    lines.push('');
    lines.push('###');
    lines.push('');
  }

  return lines.join('\n');
}

function sampleValue(javaType: string): unknown {
  switch (javaType) {
    case 'String':
      return 'ejemplo';
    case 'Integer':
    case 'Long':
      return 1;
    case 'Float':
    case 'Double':
      return 1.5;
    case 'Boolean':
      return true;
    case 'Character':
      return 'A';
    case 'LocalDate':
      return '2024-01-01';
    case 'LocalDateTime':
      return '2024-01-01T10:00:00';
    default:
      return 'valor';
  }
}
