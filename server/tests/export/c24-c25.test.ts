import { generateController } from '../../src/export/templates/controller.template.js';
import { generateService } from '../../src/export/templates/service.template.js';
import { JavaClass } from '../../src/export/types.js';
import { resolveRelationshipAnnotations } from '../../src/export/relationships.js';

describe('C24 and C25', () => {
  let todoClass: JavaClass;
  let parteCompClass: JavaClass;
  let parteAgregClass: JavaClass;
  let classMap: Map<string, JavaClass>;

  beforeEach(() => {
    // Mock the classes and relationships
    todoClass = {
      className: 'Todo',
      tableName: 'todo',
      restPath: '/api/todo',
      fields: [
        { name: 'id', javaType: 'Long', annotations: [], isId: true },
      ] as any,
      relationFields: [],
      methods: [],
      implementsInterfaces: [],
      discriminatorAnnotations: [],
    } as any;

    parteCompClass = {
      className: 'ParteComp',
      tableName: 'parte_comp',
      restPath: '/api/parte-comp',
      fields: [
        { name: 'id', javaType: 'Long', annotations: [], isId: true },
      ] as any,
      relationFields: [],
      methods: [],
      implementsInterfaces: [],
      discriminatorAnnotations: [],
    } as any;

    parteAgregClass = {
      className: 'ParteAgreg',
      tableName: 'parte_agreg',
      restPath: '/api/parte-agreg',
      fields: [
        { name: 'id', javaType: 'Long', annotations: [], isId: true },
      ] as any,
      relationFields: [],
      methods: [],
      implementsInterfaces: [],
      discriminatorAnnotations: [],
    } as any;

    // Setup Composition (Todo -> ParteComp)
    const compAnnotations = resolveRelationshipAnnotations(
      '1',
      '*',
      'Todo',
      'ParteComp',
      'Composition'
    );
    todoClass.relationFields.push(compAnnotations.sourceField!);
    parteCompClass.relationFields.push(compAnnotations.targetField!);

    // Setup Aggregation (Todo -> ParteAgreg)
    const agregAnnotations = resolveRelationshipAnnotations(
      '1',
      '*',
      'Todo',
      'ParteAgreg',
      'Aggregation'
    );
    todoClass.relationFields.push(agregAnnotations.sourceField!);
    parteAgregClass.relationFields.push(agregAnnotations.targetField!);

    classMap = new Map();
    classMap.set(todoClass.className, todoClass);
    classMap.set(parteCompClass.className, parteCompClass);
    classMap.set(parteAgregClass.className, parteAgregClass);
  });

  describe('C24: Controller toEntity and update resolves relations', () => {
    it('T-C24a & T-C24b & T-C24c: toEntity handles IDs correctly for mandatory and optional relations', () => {
      const code = generateController(
        parteCompClass,
        'com.demo.controller',
        classMap
      );

      // Should inject Repository
      expect(code).toContain('private final TodoRepository todoRepository;');
      expect(code).toContain(
        'public ParteCompController(ParteCompService parteCompService, TodoRepository todoRepository)'
      );

      // toEntity should resolve the ID
      expect(code).toContain('if (dto.getTodoId() != null)');
      expect(code).toContain('entity.setTodo(related)');
      expect(code).toContain('orElseThrow(() -> new IllegalArgumentException(');
    });

    it('T-C24d: update reassigns relations or unassigns if optional', () => {
      // Aggregation is optional on the Part side (unlike Composition which is nullable=false)
      const code = generateController(
        parteAgregClass,
        'com.demo.controller',
        classMap
      );

      // In update mapping
      expect(code).toContain('if (dto.getTodoId() != null) {');
      expect(code).toContain('existing.setTodo(related)');
      expect(code).toContain('} else {');
      expect(code).toContain('existing.setTodo(null);'); // Because it is optional
    });
  });

  describe('C25: Service unassigns aggregations before delete', () => {
    it('T-C25a & T-C25c: unassigns aggregation but not composition', () => {
      const code = generateService(todoClass, 'com.demo.service', classMap);

      // Should unassign ParteAgreg
      expect(code).toContain(
        'entity.getParteAgregs().forEach(p -> p.setTodo(null));'
      );
      expect(code).toContain('entity.getParteAgregs().clear();');

      // Should NOT unassign ParteComp (it will be deleted via orphanRemoval)
      expect(code).not.toContain('entity.getParteComps().forEach');
      expect(code).not.toContain('entity.getParteComps().clear()');

      // Calls repository.delete(entity) instead of deleteById
      expect(code).toContain('todoRepository.delete(entity);');
      expect(code).not.toContain('todoRepository.deleteById(id);');
    });

    it('T-C25b: A WHOLE with only compositions deletes as before', () => {
      todoClass.relationFields = [todoClass.relationFields[0]]; // Keep only composition
      const code = generateService(todoClass, 'com.demo.service', classMap);

      // Doesn`t generate block
      expect(code).not.toContain('findById(id).ifPresent');
      expect(code).toContain('todoRepository.deleteById(id);');
    });
  });
});
