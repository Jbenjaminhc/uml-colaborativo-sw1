import { DatabaseConfig } from '../types';

export function generateApplicationProperties(
  dbConfig: DatabaseConfig,
  artifactId: string
): string {
  const lines: string[] = [];
  lines.push(`# ${artifactId} - Application Properties`);
  lines.push(`spring.application.name=${artifactId}`);
  lines.push('');
  lines.push('# Database Configuration');
  lines.push(`spring.datasource.url=${dbConfig.url}`);
  lines.push(`spring.datasource.username=${dbConfig.username}`);
  lines.push(`spring.datasource.password=${dbConfig.password}`);
  lines.push('');
  lines.push('# JPA / Hibernate');
  lines.push('spring.jpa.hibernate.ddl-auto=update');
  lines.push(`spring.jpa.database-platform=${dbConfig.dialect}`);
  lines.push('spring.jpa.show-sql=true');
  if (dbConfig.driverArtifactId === 'h2') {
    lines.push('');
    lines.push('# Data initialization');
    lines.push('spring.jpa.defer-datasource-initialization=true');
    lines.push('spring.sql.init.mode=always');
  }

  if (dbConfig.enableH2Console) {
    lines.push('');
    lines.push('# H2 Console');
    lines.push('spring.h2.console.enabled=true');
    lines.push('spring.h2.console.path=/h2-console');
  }

  lines.push('');
  return lines.join('\n');
}
