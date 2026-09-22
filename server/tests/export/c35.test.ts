import { transform } from '../../src/export/transformer';
import { generateDto } from '../../src/export/templates/dto.template';
import { generateController } from '../../src/export/templates/controller.template';
import { JavaClass } from '../../src/export/types';

describe('C35: LOS DTO DE LAS SUBCLASES', () => {
  it('T-C35: El DTO extiende de superclase, pero Controller mapea TODO', () => {
    const entities: any[] = [
      {
        _id: 'vehiculo',
        type: 'class',
        data: {
          name: 'Vehiculo',
          attributes: [
            { id: 1, name: 'placa', type: 'string', visibility: 'private' },
            { id: 2, name: 'marca', type: 'string', visibility: 'private' },
          ],
        },
      },
      {
        _id: 'camion',
        type: 'class',
        data: {
          name: 'Camion',
          attributes: [
            { id: 1, name: 'nroEjes', type: 'int', visibility: 'private' },
          ],
        },
      },
      {
        _id: 'pesado',
        type: 'class',
        data: {
          name: 'Pesado',
          attributes: [
            { id: 1, name: 'tonelaje', type: 'int', visibility: 'private' },
          ],
        },
      },
    ];

    const rels: any[] = [
      {
        _id: 'r1',
        type: 'Inheritance',
        source: 'vehiculo',
        target: 'camion',
        data: {},
      },
      {
        _id: 'r2',
        type: 'Inheritance',
        source: 'camion',
        target: 'pesado',
        data: {},
      },
    ];

    const model = transform(entities, rels);
    const classMap = new Map<string, JavaClass>(
      model.classes.map((c) => [c.className, c])
    );

    const pesado = classMap.get('Pesado')!;

    const dtoCode = generateDto(pesado, 'com.test.dto', classMap);
    // DTO hereda pero SOLO declara lo suyo
    expect(dtoCode).toContain('public class PesadoDto extends CamionDto');
    expect(dtoCode).not.toContain('private String placa;');
    expect(dtoCode).not.toContain('private String marca;');
    expect(dtoCode).not.toContain('private Integer nroEjes;');
    expect(dtoCode).toContain('private Integer tonelaje;');

    const controllerCode = generateController(
      pesado,
      'com.test.controller',
      classMap
    );
    // toDto (incluye ID y todos los heredados)
    expect(controllerCode).toContain('dto.setId(entity.getId());');
    expect(controllerCode).toContain('dto.setPlaca(entity.getPlaca());');
    expect(controllerCode).toContain('dto.setMarca(entity.getMarca());');
    expect(controllerCode).toContain('dto.setNroEjes(entity.getNroEjes());');
    expect(controllerCode).toContain('dto.setTonelaje(entity.getTonelaje());');

    // toEntity (sin ID)
    expect(controllerCode).not.toContain('entity.setId(dto.getId());');
    expect(controllerCode).toContain('entity.setPlaca(dto.getPlaca());');
    expect(controllerCode).toContain('entity.setMarca(dto.getMarca());');
    expect(controllerCode).toContain('entity.setNroEjes(dto.getNroEjes());');
    expect(controllerCode).toContain('entity.setTonelaje(dto.getTonelaje());');

    // update (sin ID)
    expect(controllerCode).not.toContain('existing.setId(dto.getId());');
    expect(controllerCode).toContain('existing.setPlaca(dto.getPlaca());');
    expect(controllerCode).toContain('existing.setMarca(dto.getMarca());');
    expect(controllerCode).toContain('existing.setNroEjes(dto.getNroEjes());');
    expect(controllerCode).toContain(
      'existing.setTonelaje(dto.getTonelaje());'
    );
  });
});
