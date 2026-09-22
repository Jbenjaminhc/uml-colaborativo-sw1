import { generateEntityClass } from '../../src/export/templates/entity.template.js';
import { generateDto } from '../../src/export/templates/dto.template.js';
import { generatePom } from '../../src/export/templates/pom.template.js';
import { generateApplicationProperties } from '../../src/export/templates/application-properties.template.js';
import { generateController } from '../../src/export/templates/controller.template.js';
import { generateReport } from '../../src/export/templates/report.template.js';
import { JavaClass, DatabaseConfig } from '../../src/export/types.js';

const dummyClass: JavaClass = {
  className: 'User',
  tableName: 'users',
  restPath: '/api/user',
  isAbstract: false,
  implementsInterfaces: [],
  fields: [
    {
      name: 'id',
      javaType: 'Long',
      annotations: [
        '@Id',
        '@GeneratedValue(strategy = GenerationType.IDENTITY)',
      ],
      isId: true,
    },
    {
      name: 'username',
      javaType: 'String',
      annotations: [],
      javadoc: '/** UML visibility: public */',
      isId: false,
    },
  ],
  relationFields: [],
  methods: [],
  discriminatorAnnotations: [],
  isSubclass: false,
};

const dummyAbstractClass: JavaClass = {
  className: 'BaseEntity',
  tableName: 'base_entity',
  restPath: '',
  isAbstract: true,
  implementsInterfaces: [],
  fields: [
    {
      name: 'id',
      javaType: 'Long',
      annotations: [
        '@Id',
        '@GeneratedValue(strategy = GenerationType.IDENTITY)',
      ],
      isId: true,
    },
  ],
  relationFields: [],
  methods: [],
  discriminatorAnnotations: [
    '@Inheritance(strategy = InheritanceType.SINGLE_TABLE)',
    '@DiscriminatorColumn(name = "tipo")',
  ],
  isSubclass: false,
};

const dummySubclass: JavaClass = {
  className: 'SubEntity',
  tableName: 'base_entity',
  restPath: '/api/sub-entity',
  isAbstract: false,
  extendsClass: 'BaseEntity',
  implementsInterfaces: [],
  fields: [],
  relationFields: [],
  methods: [],
  discriminatorAnnotations: ['@DiscriminatorValue("SubEntity")'],
  isSubclass: true,
};

const dbConfigH2: DatabaseConfig = {
  driverGroupId: 'com.h2database',
  driverArtifactId: 'h2',
  dialect: 'org.hibernate.dialect.H2Dialect',
  url: 'jdbc:h2:mem:testdb',
  username: 'sa',
  password: '',
  enableH2Console: true,
};

const dbConfigPg: DatabaseConfig = {
  driverGroupId: 'org.postgresql',
  driverArtifactId: 'postgresql',
  dialect: 'org.hibernate.dialect.PostgreSQLDialect',
  url: 'jdbc:postgresql://localhost:5432/NOMBRE_BD',
  username: 'TU_USUARIO',
  password: 'TU_CONTRASENA',
  enableH2Console: false,
};

describe('Templates', () => {
  describe('generateEntityClass', () => {
    it('produces @Entity and @Table', () => {
      const out = generateEntityClass(dummyClass, 'com.example.model');
      expect(out).toContain('@Entity');
      expect(out).toContain('@Table(name = "users")');
      expect(out).toContain('package com.example.model;');
      expect(out).toContain('import jakarta.persistence.*');
      expect(out).toContain('private Long id;');
      expect(out).toContain('private String username;');
    });

    it('produces abstract class with @Inheritance', () => {
      const out = generateEntityClass(dummyAbstractClass, 'com.example.model');
      expect(out).toContain('public abstract class BaseEntity');
      expect(out).toContain(
        '@Inheritance(strategy = InheritanceType.SINGLE_TABLE)'
      );
      expect(out).toContain('@DiscriminatorColumn(name = "tipo")');
    });

    it('produces subclass with @DiscriminatorValue', () => {
      const out = generateEntityClass(dummySubclass, 'com.example.model');
      expect(out).toContain('@DiscriminatorValue("SubEntity")');
      expect(out).toContain('extends BaseEntity');
    });
  });

  describe('generateDto', () => {
    it('produces Dto class without @Entity', () => {
      const out = generateDto(dummyClass, 'com.example.dto', new Map());
      expect(out).toContain('public class UserDto');
      expect(out).not.toContain('@Entity');
      expect(out).toContain('private String username;');
    });
  });

  describe('generatePom', () => {
    it('C3: Spring Boot 4.1.1, Java 21, empty relativePath', () => {
      const out = generatePom(
        'demo',
        'com.example',
        'demo',
        'Desc',
        '21',
        dbConfigH2
      );
      expect(out).toContain('<version>4.1.1</version>');
      expect(out).toContain('<java.version>21</java.version>');
      expect(out).toContain('<plugins>');
      expect(out).toContain('<relativePath/>');
    });

    it('C4: Starters y configuración web', () => {
      const out = generatePom(
        'demo',
        'com.example',
        'demo',
        'Desc',
        '21',
        dbConfigH2
      );
      expect(out).toContain('<artifactId>spring-boot-starter-web</artifactId>');
      expect(out).toContain(
        '<artifactId>spring-boot-starter-webmvc-test</artifactId>'
      );
      expect(out).toContain(
        '<artifactId>spring-boot-starter-data-jpa-test</artifactId>'
      );
    });

    it('C5: Lombok procesador de anotaciones', () => {
      const out = generatePom(
        'demo',
        'com.example',
        'demo',
        'Desc',
        '21',
        dbConfigH2
      );
      expect(out).toContain('<artifactId>maven-compiler-plugin</artifactId>');
      expect(out).toContain('<id>default-compile</id>');
      expect(out).toContain('<id>default-testCompile</id>');
      expect(out).toContain('<groupId>org.projectlombok</groupId>');
    });

    it('C12: Metadatos y escapes XML', () => {
      const out = generatePom(
        'ventas-compras',
        'com.example',
        'Ventas & Compras',
        'Desc',
        '21',
        dbConfigH2
      );
      expect(out).toContain('<name>Ventas &amp; Compras</name>');
      expect(out).toContain('<description>Desc</description>');
    });

    it('C13: Springdoc 3.1.0', () => {
      const out = generatePom(
        'demo',
        'com.example',
        'demo',
        'Desc',
        '21',
        dbConfigH2
      );
      expect(out).toContain(
        '<artifactId>springdoc-openapi-starter-webmvc-ui</artifactId>'
      );
      expect(out).toContain('<version>3.1.0</version>');
    });

    it('includes h2 driver for h2 config', () => {
      const out = generatePom(
        'demo',
        'com.example',
        'demo',
        'Desc',
        '21',
        dbConfigH2
      );
      expect(out).toContain('<artifactId>h2</artifactId>');
    });

    it('includes postgresql driver for pg config', () => {
      const out = generatePom(
        'demo',
        'com.example',
        'demo',
        'Desc',
        '21',
        dbConfigPg
      );
      expect(out).toContain('<artifactId>postgresql</artifactId>');
    });
  });

  describe('generateApplicationProperties', () => {
    it('includes H2 dialect and console', () => {
      const out = generateApplicationProperties(dbConfigH2, 'demo');
      expect(out).toContain(
        'spring.jpa.database-platform=org.hibernate.dialect.H2Dialect'
      );
      expect(out).toContain('spring.jpa.hibernate.ddl-auto=update');
      expect(out).toContain('spring.h2.console.enabled=true');
    });

    it('includes PostgreSQL dialect without H2 console', () => {
      const out = generateApplicationProperties(dbConfigPg, 'demo');
      expect(out).toContain('org.hibernate.dialect.PostgreSQLDialect');
      expect(out).not.toContain('h2.console');
    });
  });

  describe('generateController', () => {
    it('produces @RestController with CRUD endpoints', () => {
      const out = generateController(
        dummyClass,
        'com.example.controller',
        new Map()
      );
      expect(out).toContain('@RestController');
      expect(out).toContain('@RequestMapping("/api/user")');
      expect(out).toContain('@GetMapping');
      expect(out).toContain('@PostMapping');
      expect(out).toContain('@PutMapping');
      expect(out).toContain('@DeleteMapping');
    });
  });

  describe('generateReport', () => {
    it('produces clean report with no warnings', () => {
      const out = generateReport([]);
      expect(out).toContain('limpio');
    });

    it('groups warnings by element', () => {
      const out = generateReport([
        { code: 'TEST', element: 'MyClass', message: 'test warning' },
        { code: 'TEST2', element: 'MyClass', message: 'another warning' },
      ]);
      expect(out).toContain('## MyClass');
      expect(out).toContain('**[TEST]**');
      expect(out).toContain('**[TEST2]**');
    });
  });
});
