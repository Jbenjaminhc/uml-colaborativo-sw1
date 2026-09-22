import { DatabaseConfig, JavaClass } from '../types';

export function generateReadme(
  artifactId: string,
  dbConfig: DatabaseConfig,
  classes: JavaClass[]
): string {
  const firstClass = classes.length > 0 ? classes[0] : null;
  const lines: string[] = [];

  lines.push(`# ${artifactId}`);
  lines.push('');
  lines.push('Proyecto Spring Boot generado automáticamente por UML2Code.');
  lines.push('');
  lines.push('## Primeros pasos');
  lines.push('');
  lines.push('1. Extraer el archivo .zip');
  lines.push('2. Importar como proyecto Maven en tu IDE');
  lines.push('3. Ejecutar `mvn spring-boot:run`');
  lines.push('');
  lines.push(
    '> **⚠️ ADVERTENCIA sobre Lombok**: Sin el plugin de Lombok instalado en el IDE,'
  );
  lines.push('> IntelliJ y Eclipse marcan errores aunque Maven compile bien.');
  lines.push(
    '> Instalar el plugin de Lombok en tu IDE antes de trabajar con el proyecto.'
  );
  lines.push('');
  lines.push('## URLs');
  lines.push('');
  lines.push('- **API**: http://localhost:8080');
  lines.push('- **Swagger UI**: http://localhost:8080/swagger-ui.html');

  if (dbConfig.enableH2Console) {
    lines.push('- **H2 Console**: http://localhost:8080/h2-console');
    lines.push('  - JDBC URL: `jdbc:h2:mem:testdb`');
    lines.push('  - Usuario: `sa`');
    lines.push('  - Contraseña: (vacía)');
    lines.push('  - Los datos se reinician en cada arranque.');
  } else {
    lines.push('');
    lines.push('### PostgreSQL');
    lines.push('');
    lines.push('Antes de arrancar:');
    lines.push('1. Crear la base de datos vacía en PostgreSQL');
    lines.push('2. Completar las credenciales en `application.properties`');
    lines.push('');
    lines.push(
      '> **Nota:** Los datos de ejemplo (`data.sql`) solo se generan para bases de datos en memoria (H2) para evitar colisiones de clave primaria. Si necesitas datos iniciales en PostgreSQL, debes insertarlos manualmente o configurar migraciones.'
    );
  }

  lines.push('');
  lines.push('## Advertencia sobre ddl-auto=update');
  lines.push('');
  lines.push(
    'Hibernate crea las tablas y columnas que falten, pero no elimina ni altera'
  );
  lines.push(
    'las existentes. Si modificás el diagrama y regenerás sobre la misma base,'
  );
  lines.push(
    'conviene borrarla. Para datos que importen, cambiar a `validate` y usar migraciones.'
  );
  lines.push('');

  if (firstClass) {
    lines.push('## Ejemplos con curl');
    lines.push('');
    lines.push('```bash');
    lines.push(`# GET lista de ${firstClass.className}`);
    lines.push(`curl http://localhost:8080${firstClass.restPath}`);
    lines.push('');
    lines.push(`# POST crear ${firstClass.className}`);
    lines.push(`curl -X POST http://localhost:8080${firstClass.restPath} \\`);
    lines.push('  -H "Content-Type: application/json" \\');
    const sampleFields: Record<string, string> = {};
    for (const f of firstClass.fields) {
      if (!f.isId) {
        sampleFields[f.name] = sampleJsonValue(f.javaType);
      }
    }
    lines.push(`  -d '${JSON.stringify(sampleFields)}'`);
    lines.push('```');
  }

  return lines.join('\n');
}

function sampleJsonValue(javaType: string): string {
  switch (javaType) {
    case 'String':
      return 'ejemplo';
    case 'Integer':
    case 'Long':
      return '1';
    case 'Float':
    case 'Double':
      return '1.0';
    case 'Boolean':
      return 'true';
    default:
      return 'valor';
  }
}
