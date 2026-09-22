import { JavaClass } from '../types';
import { getAllFields, getAllRelationFields } from '../hierarchy';

export function generateController(
  cls: JavaClass,
  packageName: string,
  classMap: Map<string, JavaClass>
): string {
  const modelPkg = packageName.replace('.controller', '.model');
  const dtoPkg = packageName.replace('.controller', '.dto');
  const servicePkg = packageName.replace('.controller', '.service');
  const repositoryPkg = packageName.replace('.controller', '.repository');
  const n = cls.className;
  const varName = n.charAt(0).toLowerCase() + n.slice(1);

  const lines: string[] = [];
  lines.push(`package ${packageName};`);
  lines.push('');
  lines.push(`import ${modelPkg}.${n};`);
  lines.push(`import ${dtoPkg}.${n}Dto;`);
  lines.push(`import ${servicePkg}.${n}Service;`);

  const allFields = getAllFields(cls, classMap);
  const allRelations = getAllRelationFields(cls, classMap);

  // Repositories for part relations (C24)
  const mappedByRelations = allRelations.filter(
    (rel) =>
      !rel.isCollection && rel.annotations.some((a) => a.includes('mappedBy'))
  );
  const partRelations = allRelations.filter(
    (rel) =>
      !rel.isCollection &&
      rel.annotations.some((a) => a.includes('@JoinColumn'))
  );
  const manyToManyOwnerRelations = allRelations.filter(
    (rel) =>
      rel.isCollection && rel.annotations.some((a) => a.includes('@JoinTable'))
  );
  const uniqueRepos = new Set<string>();
  for (const rel of partRelations) {
    uniqueRepos.add(rel.relatedClassName);
    lines.push(`import ${modelPkg}.${rel.relatedClassName};`);
    lines.push(`import ${repositoryPkg}.${rel.relatedClassName}Repository;`);
  }
  for (const rel of mappedByRelations) {
    if (!uniqueRepos.has(rel.relatedClassName)) {
      uniqueRepos.add(rel.relatedClassName);
      lines.push(`import ${modelPkg}.${rel.relatedClassName};`);
      lines.push(`import ${repositoryPkg}.${rel.relatedClassName}Repository;`);
    }
  }
  for (const rel of manyToManyOwnerRelations) {
    if (!uniqueRepos.has(rel.relatedClassName)) {
      uniqueRepos.add(rel.relatedClassName);
      lines.push(`import ${modelPkg}.${rel.relatedClassName};`);
      lines.push(`import ${repositoryPkg}.${rel.relatedClassName}Repository;`);
    }
  }
  lines.push('import org.springframework.http.ResponseEntity;');
  lines.push('import org.springframework.web.bind.annotation.*;');
  lines.push(
    'import org.springframework.transaction.annotation.Transactional;'
  );
  lines.push('import java.util.List;');
  lines.push('import jakarta.validation.Valid;');
  lines.push('import java.util.stream.Collectors;');
  lines.push('@RestController');
  lines.push('@Transactional');
  lines.push(`@RequestMapping("${cls.restPath}")`);
  lines.push(`public class ${n}Controller {`);
  lines.push('');
  lines.push(`    private final ${n}Service ${varName}Service;`);
  for (const repoClass of uniqueRepos) {
    const repoVar = `${
      repoClass.charAt(0).toLowerCase() + repoClass.slice(1)
    }Repository`;
    lines.push(`    private final ${repoClass}Repository ${repoVar};`);
  }
  lines.push('');

  const constructorParams = [`${n}Service ${varName}Service`];
  for (const repoClass of uniqueRepos) {
    const repoVar = `${
      repoClass.charAt(0).toLowerCase() + repoClass.slice(1)
    }Repository`;
    constructorParams.push(`${repoClass}Repository ${repoVar}`);
  }
  lines.push(`    public ${n}Controller(${constructorParams.join(', ')}) {`);
  lines.push(`        this.${varName}Service = ${varName}Service;`);
  for (const repoClass of uniqueRepos) {
    const repoVar = `${
      repoClass.charAt(0).toLowerCase() + repoClass.slice(1)
    }Repository`;
    lines.push(`        this.${repoVar} = ${repoVar};`);
  }
  lines.push('    }');
  lines.push('');

  // GET list
  lines.push('    @GetMapping');
  lines.push(`    public List<${n}Dto> getAll() {`);
  lines.push(`        return ${varName}Service.findAll().stream()`);
  lines.push(`            .map(this::toDto)`);
  lines.push('            .collect(Collectors.toList());');
  lines.push('    }');
  lines.push('');

  // GET by id
  lines.push('    @GetMapping("/{id}")');
  lines.push(
    `    public ResponseEntity<${n}Dto> getById(@PathVariable Long id) {`
  );
  lines.push(`        return ${varName}Service.findById(id)`);
  lines.push('            .map(this::toDto)');
  lines.push('            .map(ResponseEntity::ok)');
  lines.push('            .orElse(ResponseEntity.notFound().build());');
  lines.push('    }');
  lines.push('');

  // POST
  lines.push('    @PostMapping');
  lines.push(`    public ${n}Dto create(@Valid @RequestBody ${n}Dto dto) {`);
  lines.push(`        ${n} entity = toEntity(dto);`);
  lines.push(`        ${n} saved = ${varName}Service.save(entity);`);
  lines.push('        return toDto(saved);');
  lines.push('    }');
  lines.push('');

  // PUT
  lines.push('    @PutMapping("/{id}")');
  lines.push(
    `    public ResponseEntity<${n}Dto> update(@PathVariable Long id, @Valid @RequestBody ${n}Dto dto) {`
  );
  lines.push(`        return ${varName}Service.findById(id)`);
  lines.push('            .map(existing -> {');
  // Copy scalar fields
  for (const field of allFields) {
    if (!field.isId) {
      const getter = `get${field.name
        .charAt(0)
        .toUpperCase()}${field.name.slice(1)}`;
      const setter = `set${field.name
        .charAt(0)
        .toUpperCase()}${field.name.slice(1)}`;
      lines.push(`                existing.${setter}(dto.${getter}());`);
    }
  }
  // Update part relations
  for (const rel of partRelations) {
    const relClass = rel.relatedClassName;
    const repoName = `${
      relClass.charAt(0).toLowerCase() + relClass.slice(1)
    }Repository`;
    const CapName =
      rel.fieldName.charAt(0).toUpperCase() + rel.fieldName.slice(1);
    const isOptional = !rel.annotations.some((a) =>
      a.includes('nullable = false')
    );

    lines.push(`                if (dto.get${CapName}Id() != null) {`);
    lines.push(
      `                    ${relClass} related = ${repoName}.findById(dto.get${CapName}Id())`
    );
    lines.push(
      `                        .orElseThrow(() -> new IllegalArgumentException("No existe ${relClass} con id " + dto.get${CapName}Id()));`
    );

    lines.push(`                    // Sync bidirectional if exists`);
    lines.push(`                    if (related != null) {`);
    let hasMappedBy = false;
    const relatedClass = classMap.get(rel.relatedClassName);
    if (relatedClass) {
      const invRel = relatedClass.relationFields.find((f) =>
        f.annotations.some((a) => a.includes(`mappedBy = "${rel.fieldName}"`))
      );
      if (invRel && !invRel.isCollection) {
        const invCapName =
          invRel.fieldName.charAt(0).toUpperCase() + invRel.fieldName.slice(1);
        lines.push(
          `                        related.set${invCapName}(existing);`
        );
        hasMappedBy = true;
      }
    }
    lines.push(`                    }`);
    lines.push(`                    existing.set${CapName}(related);`);

    if (isOptional) {
      lines.push(`                } else {`);
      if (hasMappedBy) {
        lines.push(
          `                    if (existing.get${CapName}() != null) {`
        );
        // Note: to properly nullify the inverse side, we'd need its name again.
        const relatedClass2 = classMap.get(rel.relatedClassName);
        if (relatedClass2) {
          const invRel2 = relatedClass2.relationFields.find((f) =>
            f.annotations.some((a) =>
              a.includes(`mappedBy = "${rel.fieldName}"`)
            )
          );
          if (invRel2) {
            const invCapName2 =
              invRel2.fieldName.charAt(0).toUpperCase() +
              invRel2.fieldName.slice(1);
            lines.push(
              `                        existing.get${CapName}().set${invCapName2}(null);`
            );
          }
        }
        lines.push(`                    }`);
      }
      lines.push(`                    existing.set${CapName}(null);`);
      lines.push(`                }`);
    } else {
      lines.push(`                }`); // Remove empty else
    }
  }
  for (const rel of manyToManyOwnerRelations) {
    const relClass = rel.relatedClassName;
    const repoName = `${
      relClass.charAt(0).toLowerCase() + relClass.slice(1)
    }Repository`;
    const CapName =
      rel.fieldName.charAt(0).toUpperCase() + rel.fieldName.slice(1);

    lines.push(`                if (dto.get${CapName}Ids() != null) {`);
    lines.push(
      `                    java.util.List<${relClass}> relatedList = ${repoName}.findAllById(dto.get${CapName}Ids());`
    );
    lines.push(
      `                    existing.set${CapName}(new java.util.HashSet<>(relatedList));`
    );
    lines.push(`                }`);
  }

  lines.push(
    `                return ResponseEntity.ok(toDto(${varName}Service.save(existing)));`
  );
  lines.push('            })');
  lines.push('            .orElse(ResponseEntity.notFound().build());');
  lines.push('    }');
  lines.push('');

  // DELETE
  lines.push('    @DeleteMapping("/{id}")');
  lines.push('    public ResponseEntity<Void> delete(@PathVariable Long id) {');
  lines.push(`        if (${varName}Service.findById(id).isEmpty()) {`);
  lines.push('            return ResponseEntity.notFound().build();');
  lines.push('        }');
  lines.push(`        ${varName}Service.deleteById(id);`);
  lines.push('        return ResponseEntity.noContent().build();');
  lines.push('    }');
  lines.push('');

  // toDto helper
  lines.push(`    private ${n}Dto toDto(${n} entity) {`);
  lines.push(`        ${n}Dto dto = new ${n}Dto();`);
  for (const field of allFields) {
    const getter = `get${field.name.charAt(0).toUpperCase()}${field.name.slice(
      1
    )}`;
    const setter = `set${field.name.charAt(0).toUpperCase()}${field.name.slice(
      1
    )}`;
    lines.push(`        dto.${setter}(entity.${getter}());`);
  }
  for (const rel of allRelations) {
    const getter = `get${rel.fieldName
      .charAt(0)
      .toUpperCase()}${rel.fieldName.slice(1)}`;
    if (!rel.isCollection) {
      const setter = `set${rel.fieldName
        .charAt(0)
        .toUpperCase()}${rel.fieldName.slice(1)}Id`;
      lines.push(`        if (entity.${getter}() != null) {`);
      lines.push(`            dto.${setter}(entity.${getter}().getId());`);
      lines.push('        }');
    } else {
      const setter = `set${rel.fieldName
        .charAt(0)
        .toUpperCase()}${rel.fieldName.slice(1)}Ids`;
      lines.push(`        dto.${setter}(`);
      lines.push(`            entity.${getter}() == null`);
      lines.push(`                ? java.util.List.of()`);
      lines.push(`                : entity.${getter}().stream()`);
      const targetClass = rel.relatedClassName;
      lines.push(`                    .map(item -> item.getId())`);
      lines.push(`                    .collect(Collectors.toList())`);
      lines.push(`        );`);
    }
  }
  lines.push('        return dto;');
  lines.push('    }');
  lines.push('');

  // toEntity helper
  lines.push(`    private ${n} toEntity(${n}Dto dto) {`);
  lines.push(`        ${n} entity = new ${n}();`);
  for (const field of allFields) {
    if (!field.isId) {
      const getter = `get${field.name
        .charAt(0)
        .toUpperCase()}${field.name.slice(1)}`;
      const setter = `set${field.name
        .charAt(0)
        .toUpperCase()}${field.name.slice(1)}`;
      lines.push(`        entity.${setter}(dto.${getter}());`);
    }
  }
  for (const rel of partRelations) {
    const relClass = rel.relatedClassName;
    const repoName = `${
      relClass.charAt(0).toLowerCase() + relClass.slice(1)
    }Repository`;
    const CapName =
      rel.fieldName.charAt(0).toUpperCase() + rel.fieldName.slice(1);

    lines.push(`        if (dto.get${CapName}Id() != null) {`);
    lines.push(
      `            ${relClass} related = ${repoName}.findById(dto.get${CapName}Id())`
    );
    lines.push(
      `                .orElseThrow(() -> new IllegalArgumentException("No existe ${relClass} con id " + dto.get${CapName}Id()));`
    );

    lines.push(`            // Sync bidirectional if exists`);
    lines.push(`            if (related != null) {`);
    const relatedClass = classMap.get(rel.relatedClassName);
    if (relatedClass) {
      const invRel = relatedClass.relationFields.find((f) =>
        f.annotations.some((a) => a.includes(`mappedBy = "${rel.fieldName}"`))
      );
      if (invRel && !invRel.isCollection) {
        const invCapName =
          invRel.fieldName.charAt(0).toUpperCase() + invRel.fieldName.slice(1);
        lines.push(`                related.set${invCapName}(entity);`);
      }
    }
    lines.push(`            }`);
    lines.push(`            entity.set${CapName}(related);`);
    lines.push(`        }`);
  }

  for (const rel of manyToManyOwnerRelations) {
    const relClass = rel.relatedClassName;
    const repoName = `${
      relClass.charAt(0).toLowerCase() + relClass.slice(1)
    }Repository`;
    const CapName =
      rel.fieldName.charAt(0).toUpperCase() + rel.fieldName.slice(1);

    lines.push(`        if (dto.get${CapName}Ids() != null) {`);
    lines.push(
      `            java.util.List<${relClass}> relatedList = ${repoName}.findAllById(dto.get${CapName}Ids());`
    );
    lines.push(
      `            entity.set${CapName}(new java.util.HashSet<>(relatedList));`
    );
    lines.push(`        }`);
  }

  lines.push('        return entity;');
  lines.push('    }');

  lines.push('}');
  return lines.join('\n');
}
