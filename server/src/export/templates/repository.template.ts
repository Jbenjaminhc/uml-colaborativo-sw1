import { JavaClass } from '../types';

export function generateRepository(
  cls: JavaClass,
  packageName: string
): string {
  const lines: string[] = [];
  lines.push(`package ${packageName};`);
  lines.push('');
  lines.push(
    `import ${packageName.replace('.repository', '.model')}.${cls.className};`
  );
  lines.push('import org.springframework.data.jpa.repository.JpaRepository;');
  lines.push('import org.springframework.stereotype.Repository;');
  lines.push('');
  lines.push('@Repository');
  lines.push(
    `public interface ${cls.className}Repository extends JpaRepository<${cls.className}, Long> {`
  );
  lines.push('}');
  return lines.join('\n');
}
