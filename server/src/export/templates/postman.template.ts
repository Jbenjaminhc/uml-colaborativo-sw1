import { JavaClass, JavaEnum, GenerationParams, Warning } from '../types';
import { sampleValueRaw, sortClassesTopologically } from '../utils';
import { getAllFields } from '../hierarchy';

export function generatePostmanCollection(
  classes: JavaClass[],
  enums: JavaEnum[],
  classMap: Map<string, JavaClass>,
  config: GenerationParams,
  diagramName: string
): { content: string; warnings: Warning[] } | null {
  const concreteClasses = classes.filter(
    (c) => !c.isAbstract && c.fields !== undefined && c.methods !== undefined
  );
  if (concreteClasses.length === 0) return null;

  const { sorted, warnings } = sortClassesTopologically(
    concreteClasses,
    classMap
  );
  const cycleDetected = warnings.length > 0;

  const collectionName = `${diagramName || 'API'} - API`;

  const variables = [{ key: 'baseUrl', value: 'http://localhost:8080' }];

  for (const cls of sorted) {
    const varName = `${cls.className
      .charAt(0)
      .toLowerCase()}${cls.className.slice(1)}Id`;
    variables.push({ key: varName, value: '' });
  }

  const items: any[] = [];

  for (const cls of sorted) {
    const clsName = cls.className;
    const varName = `${cls.className
      .charAt(0)
      .toLowerCase()}${cls.className.slice(1)}Id`;
    const { restPath } = cls;

    // Body for POST/PUT
    const bodyObj: Record<string, any> = {};
    const allFields = getAllFields(cls, classMap);

    // Add scalar fields
    for (const field of allFields) {
      if (!field.isId) {
        bodyObj[field.name] = sampleValueRaw(
          field.javaType,
          field.name,
          1,
          enums
        );
      }
    }

    const relChecks: string[] = [];
    // Add relation owner fields
    for (const rel of cls.relationFields) {
      if (
        !rel.isCollection &&
        rel.annotations.some((a) => a.includes('@JoinColumn'))
      ) {
        const relVar = `${rel.relatedClassName
          .charAt(0)
          .toLowerCase()}${rel.relatedClassName.slice(1)}Id`;
        bodyObj[`${rel.fieldName}Id`] = `{{${relVar}}}`;
        relChecks.push(
          `    pm.expect(jsonData.${rel.fieldName}Id.toString()).to.eql(pm.collectionVariables.get('${relVar}').toString());`
        );
      }
    }

    const bodyObjPut = { ...bodyObj };
    const updateChecks: string[] = [];
    let updatedFieldCount = 0;
    for (const field of allFields) {
      if (!field.isId) {
        const expectedValue = sampleValueRaw(
          field.javaType,
          field.name,
          2,
          enums
        );
        bodyObjPut[field.name] = expectedValue;
        if (updatedFieldCount === 0) {
          const expectedStr =
            typeof expectedValue === 'string'
              ? `'${expectedValue}'`
              : expectedValue;
          updateChecks.push(
            `    pm.expect(jsonData.${field.name}).to.eql(${expectedStr});`
          );
          updatedFieldCount++;
        }
      }
    }

    const folder = {
      name: clsName,
      item: [
        {
          name: `Listar ${clsName}`,
          event: [
            {
              listen: 'test',
              script: {
                exec: [
                  'pm.test("Status code is 200", function () {',
                  '    pm.response.to.have.status(200);',
                  '});',
                  'pm.test("Response is array", function () {',
                  '    var jsonData = pm.response.json();',
                  '    pm.expect(Array.isArray(jsonData)).to.be.true;',
                  '});',
                ],
              },
            },
          ],
          request: {
            method: 'GET',
            url: {
              raw: `{{baseUrl}}${restPath}`,
              host: ['{{baseUrl}}'],
              path: restPath.split('/').filter((p) => p),
            },
          },
        },
        {
          name: `Crear ${clsName}`,
          event: [
            {
              listen: 'test',
              script: {
                exec: [
                  'pm.test("Status code is 200", function () {',
                  '    pm.response.to.have.status(200);',
                  '});',
                  'pm.test("Response has id", function () {',
                  '    var jsonData = pm.response.json();',
                  '    pm.expect(jsonData.id).to.exist;',
                  ...relChecks,
                  `    pm.collectionVariables.set('${varName}', jsonData.id);`,
                  '});',
                ],
              },
            },
          ],
          request: {
            method: 'POST',
            header: [{ key: 'Content-Type', value: 'application/json' }],
            body: {
              mode: 'raw',
              raw: JSON.stringify(bodyObj, null, 2)
                .replace(/"\{\{/g, '{{')
                .replace(/\}\}"/g, '}}'),
              options: {
                raw: {
                  language: 'json',
                },
              },
            },
            url: {
              raw: `{{baseUrl}}${restPath}`,
              host: ['{{baseUrl}}'],
              path: restPath.split('/').filter((p) => p),
            },
          },
        },
        {
          name: `Obtener ${clsName}`,
          event: [
            {
              listen: 'test',
              script: {
                exec: [
                  'pm.test("Status code is 200", function () {',
                  '    pm.response.to.have.status(200);',
                  '});',
                  'pm.test("Id matches variable", function () {',
                  '    var jsonData = pm.response.json();',
                  `    pm.expect(jsonData.id.toString()).to.eql(pm.collectionVariables.get('${varName}').toString());`,
                  '});',
                ],
              },
            },
          ],
          request: {
            method: 'GET',
            url: {
              raw: `{{baseUrl}}${restPath}/{{${varName}}}`,
              host: ['{{baseUrl}}'],
              path: [...restPath.split('/').filter((p) => p), `{{${varName}}}`],
            },
          },
        },
        {
          name: `Actualizar ${clsName}`,
          event: [
            {
              listen: 'test',
              script: {
                exec: [
                  'pm.test("Status code is 200", function () {',
                  '    pm.response.to.have.status(200);',
                  '});',
                  'pm.test("Updated field matches", function () {',
                  '    var jsonData = pm.response.json();',
                  ...updateChecks,
                  '});',
                ],
              },
            },
          ],
          request: {
            method: 'PUT',
            header: [{ key: 'Content-Type', value: 'application/json' }],
            body: {
              mode: 'raw',
              raw: JSON.stringify(bodyObjPut, null, 2)
                .replace(/"\{\{/g, '{{')
                .replace(/\}\}"/g, '}}'),
              options: {
                raw: {
                  language: 'json',
                },
              },
            },
            url: {
              raw: `{{baseUrl}}${restPath}/{{${varName}}}`,
              host: ['{{baseUrl}}'],
              path: [...restPath.split('/').filter((p) => p), `{{${varName}}}`],
            },
          },
        },
      ],
    };
    items.push(folder);
  }

  if (!cycleDetected) {
    const cleanupItem: any = {
      name: 'Limpieza',
      item: [],
    };
    const reverseSorted = [...sorted].reverse();
    for (const cls of reverseSorted) {
      const clsName = cls.className;
      const varName = `${cls.className
        .charAt(0)
        .toLowerCase()}${cls.className.slice(1)}Id`;
      const { restPath } = cls;
      cleanupItem.item.push({
        name: `Eliminar ${clsName}`,
        event: [
          {
            listen: 'test',
            script: {
              exec: [
                'pm.test("Status code is 204", function () {',
                '    pm.response.to.have.status(204);',
                '});',
              ],
            },
          },
        ],
        request: {
          method: 'DELETE',
          url: {
            raw: `{{baseUrl}}${restPath}/{{${varName}}}`,
            host: ['{{baseUrl}}'],
            path: [...restPath.split('/').filter((p) => p), `{{${varName}}}`],
          },
        },
      });
    }
    items.push(cleanupItem);
  }

  const postmanCollection = {
    info: {
      name: collectionName,
      schema:
        'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
    },
    variable: variables,
    item: items,
  };

  return { content: JSON.stringify(postmanCollection, null, 2), warnings };
}
