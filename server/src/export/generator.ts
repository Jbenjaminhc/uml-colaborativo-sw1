import archiver from 'archiver';
import { PassThrough } from 'stream';
import fs from 'fs';
import path from 'path';
import { EntityModel } from '../models/entity.model';
import { RelationshipModel } from '../models/relationship.model';
import { DiagramModel } from '../models/diagram.model';
import { transform } from './transformer';
import {
  DATABASE_CONFIGS,
  validateGenerationParams,
  getDefaultArtifactId,
} from './config';
import {
  generateEntityClass,
  generateInterface,
  generateEnum,
  generateDto,
  generateRepository,
  generateService,
  generateController,
  generatePom,
  generateApplicationProperties,
  generateDataSql,
  generateApplication,
  generateCorsConfig,
  generateReadme,
  generateReport,
  generateRequestsHttp,
  generateGlobalExceptionHandler,
  generatePostmanCollection,
} from './templates/index';
import {
  JavaClass,
  PreviewResult,
  GenerationParams,
  IntermediateModel,
} from './types';

interface EntityDoc {
  _id: string;
  type: 'class' | 'interface' | 'enum';
  data: {
    name: string;
    isAbstract?: boolean;
    constants?: Array<{ id: number; name: string; type: string }>;
    attributes?: Array<{
      id: number;
      name: string;
      visibility: string;
      type: string;
    }>;
    methods?: Array<{
      id: number;
      name: string;
      returnType: string;
      visibility: string;
      isStatic: boolean;
    }>;
  };
}

interface RelationshipDoc {
  _id: string;
  type:
    | 'Inheritance'
    | 'Association'
    | 'Aggregation'
    | 'Composition'
    | 'Implementation'
    | 'Dependency';
  source: string;
  target: string;
  data: {
    srcMultiplicity?: string;
    tgtMultiplicity?: string;
    label?: string;
  };
}

async function loadDiagramData(
  diagramId: string
): Promise<{ entities: EntityDoc[]; relationships: RelationshipDoc[] }> {
  const rawEntities = await EntityModel.find({ diagramId }).lean();
  const rawRelationships = await RelationshipModel.find({ diagramId }).lean();

  const entities: EntityDoc[] = rawEntities.map((e) => ({
    _id: String(e._id),
    type: e.type as 'class' | 'interface' | 'enum',
    data: {
      name: e.data.name,
      isAbstract: e.data.isAbstract,
      constants: e.data.constants,
      attributes: e.data.attributes,
      methods: e.data.methods,
    },
  }));

  const relationships: RelationshipDoc[] = rawRelationships.map((r) => ({
    _id: String(r._id),
    type: r.type as RelationshipDoc['type'],
    source: String(r.source),
    target: String(r.target),
    data: {
      srcMultiplicity: r.data?.srcMultiplicity,
      tgtMultiplicity: r.data?.tgtMultiplicity,
      label: r.data?.label,
    },
  }));

  return { entities, relationships };
}

function countFiles(model: IntermediateModel): number {
  let count = 0;
  // pom.xml, README.md, GENERATION_REPORT.md, requests.http, Application.java, CorsConfig.java, GlobalExceptionHandler.java, application.properties, data.sql
  // + mvnw, mvnw.cmd, maven-wrapper.properties, .gitignore, .gitattributes, ApplicationTests.java
  count += 15;
  // Per class: entity + dto + repository + service + controller
  count += model.classes.filter((c) => !c.isAbstract).length * 5;
  // Abstract classes: just the entity
  count += model.classes.filter((c) => c.isAbstract).length;
  // Interfaces
  count += model.interfaces.length;
  // Enums
  count += model.enums.length;
  return count;
}

export async function generatePreview(
  diagramId: string
): Promise<PreviewResult> {
  const diagram = await DiagramModel.findById(diagramId);
  if (!diagram) {
    throw new Error('Diagrama no encontrado');
  }

  const { entities, relationships } = await loadDiagramData(diagramId);

  if (entities.length === 0) {
    throw new Error('El diagrama no tiene entidades');
  }

  if (entities.length > 100) {
    throw new Error('El diagrama excede el límite de 100 entidades');
  }

  if (relationships.length > 200) {
    throw new Error('El diagrama excede el límite de 200 relaciones');
  }

  const model = transform(entities, relationships);

  return {
    warnings: model.warnings,
    entityCount: entities.length,
    relationshipCount: relationships.length,
    fileCount: countFiles(model),
  };
}

export async function generateZip(
  diagramId: string,
  params: GenerationParams
): Promise<{ stream: PassThrough; artifactId: string }> {
  const diagram = await DiagramModel.findById(diagramId);
  if (!diagram) {
    throw new Error('Diagrama no encontrado');
  }

  const { entities, relationships } = await loadDiagramData(diagramId);

  if (entities.length === 0) {
    throw new Error('El diagrama no tiene entidades');
  }

  if (entities.length > 100) {
    throw new Error('El diagrama excede el límite de 100 entidades');
  }

  if (relationships.length > 200) {
    throw new Error('El diagrama excede el límite de 200 relaciones');
  }

  const model = transform(entities, relationships);
  const dbConfig = DATABASE_CONFIGS[params.database];
  const artifactId = params.artifactId || getDefaultArtifactId(diagram.name);
  const { groupId, name, description, packageName, javaVersion } = params;

  // Base package path is now correctly derived from packageName instead of groupId
  const basePath = packageName.replace(/\./g, '/');

  const passthrough = new PassThrough();
  const archive = archiver('zip', { zlib: { level: 9 } });
  archive.pipe(passthrough);

  archive.append(
    generatePom(artifactId, groupId, name, description, javaVersion, dbConfig),
    { name: `${artifactId}/pom.xml` }
  );
  archive.append(generateReadme(artifactId, dbConfig, model.classes), {
    name: `${artifactId}/README.md`,
  });
  archive.append(generateReport(model.warnings), {
    name: `${artifactId}/GENERATION_REPORT.md`,
  });
  archive.append(generateRequestsHttp(model.classes), {
    name: `${artifactId}/requests.http`,
  });

  // Application.java
  archive.append(generateApplication(packageName), {
    name: `${artifactId}/src/main/java/${basePath}/Application.java`,
  });

  // CorsConfig.java
  archive.append(generateCorsConfig(packageName), {
    name: `${artifactId}/src/main/java/${basePath}/config/CorsConfig.java`,
  });

  // GlobalExceptionHandler.java (C25)
  archive.append(generateGlobalExceptionHandler(`${packageName}.config`), {
    name: `${artifactId}/src/main/java/${basePath}/config/GlobalExceptionHandler.java`,
  });

  // application.properties
  archive.append(generateApplicationProperties(dbConfig, artifactId), {
    name: `${artifactId}/src/main/resources/application.properties`,
  });

  // Empty static and templates folders
  archive.append('', {
    name: `${artifactId}/src/main/resources/static/`,
  });
  archive.append('', {
    name: `${artifactId}/src/main/resources/templates/`,
  });

  // data.sql (Only for H2)
  if (dbConfig.driverArtifactId === 'h2') {
    const dataSqlResult = generateDataSql(model.classes);
    if (dataSqlResult.warnings.length > 0) {
      model.warnings.push(...dataSqlResult.warnings);
    }
    if (dataSqlResult.content) {
      archive.append(dataSqlResult.content, {
        name: `${artifactId}/src/main/resources/data.sql`,
      });
    }
  }

  // Entities, DTOs, Repositories, Services, Controllers
  const classMap = new Map<string, JavaClass>(
    model.classes.map((c) => [c.className, c])
  );
  for (const cls of model.classes) {
    archive.append(generateEntityClass(cls, `${packageName}.model`), {
      name: `${artifactId}/src/main/java/${basePath}/model/${cls.className}.java`,
    });

    if (!cls.isAbstract) {
      archive.append(generateDto(cls, `${packageName}.dto`, classMap), {
        name: `${artifactId}/src/main/java/${basePath}/dto/${cls.className}Dto.java`,
      });
      archive.append(generateRepository(cls, `${packageName}.repository`), {
        name: `${artifactId}/src/main/java/${basePath}/repository/${cls.className}Repository.java`,
      });
      archive.append(generateService(cls, `${packageName}.service`, classMap), {
        name: `${artifactId}/src/main/java/${basePath}/service/${cls.className}Service.java`,
      });
      archive.append(
        generateController(cls, `${packageName}.controller`, classMap),
        {
          name: `${artifactId}/src/main/java/${basePath}/controller/${cls.className}Controller.java`,
        }
      );
    }
  }

  // Interfaces
  for (const iface of model.interfaces) {
    archive.append(generateInterface(iface, `${packageName}.model`), {
      name: `${artifactId}/src/main/java/${basePath}/model/${iface.interfaceName}.java`,
    });
  }

  // Enums
  for (const enumDef of model.enums) {
    archive.append(generateEnum(enumDef, `${packageName}.model`), {
      name: `${artifactId}/src/main/java/${basePath}/model/${enumDef.enumName}.java`,
    });
  }

  // C6: Maven Wrapper
  const wrapperDir = path.join(__dirname, 'resources', 'wrapper');
  if (fs.existsSync(wrapperDir)) {
    archive.append(fs.createReadStream(path.join(wrapperDir, 'mvnw')), {
      name: `${artifactId}/mvnw`,
      mode: 0o755,
    });
    archive.append(fs.createReadStream(path.join(wrapperDir, 'mvnw.cmd')), {
      name: `${artifactId}/mvnw.cmd`,
      mode: 0o644,
    });
    archive.append(
      fs.createReadStream(
        path.join(wrapperDir, '.mvn', 'wrapper', 'maven-wrapper.properties')
      ),
      {
        name: `${artifactId}/.mvn/wrapper/maven-wrapper.properties`,
        mode: 0o644,
      }
    );
    archive.append(fs.createReadStream(path.join(wrapperDir, '.gitignore')), {
      name: `${artifactId}/.gitignore`,
      mode: 0o644,
    });
    archive.append(
      fs.createReadStream(path.join(wrapperDir, '.gitattributes')),
      {
        name: `${artifactId}/.gitattributes`,
        mode: 0o644,
      }
    );
  }

  // C7: ApplicationTests.java
  const appTests = `package ${packageName};

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest
class ApplicationTests {
    @Test
    void contextLoads() { }
}
`;
  archive.append(appTests, {
    name: `${artifactId}/src/test/java/${basePath}/ApplicationTests.java`,
    mode: 0o644,
  });

  const postmanResult = generatePostmanCollection(
    model.classes,
    model.enums,
    classMap,
    params,
    diagram.name
  );
  if (postmanResult) {
    if (postmanResult.warnings.length > 0) {
      model.warnings.push(...postmanResult.warnings);
    }
    archive.append(postmanResult.content, {
      name: `${artifactId}/postman/${artifactId}.postman_collection.json`,
    });
  }

  archive.finalize();

  return { stream: passthrough, artifactId };
}

export { validateGenerationParams };
