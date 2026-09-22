import { JavaEnum } from '../types';

export function generateEnum(enumDef: JavaEnum, packageName: string): string {
  const lines: string[] = [];
  lines.push(`package ${packageName};`);
  lines.push('');
  lines.push(`public enum ${enumDef.enumName} {`);
  lines.push(`    ${enumDef.constants.join(',\n    ')}`);
  lines.push('}');
  return lines.join('\n');
}
