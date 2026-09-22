import {
  transform,
  EntityDoc,
  RelationshipDoc,
} from '../../src/export/transformer';

describe('C27: @JoinColumn NO SE DESEMPATA', () => {
  const rutaId = '6aa4c9621c0f6359059743eb';
  const paradaId = '6aa4c97c1c0f6359059743fb';

  const getEntities = (): EntityDoc[] => [
    { _id: rutaId, type: 'class', data: { name: 'Ruta' } },
    { _id: paradaId, type: 'class', data: { name: 'Parada' } },
  ];

  it('T-C27a: dos relaciones entre el mismo par producen columnas distintas', () => {
    const relationships: RelationshipDoc[] = [
      {
        _id: 'r1',
        type: 'Composition',
        source: rutaId,
        target: paradaId,
        data: { label: 'origen', srcMultiplicity: '1', tgtMultiplicity: '*' },
      },
      {
        _id: 'r2',
        type: 'Composition',
        source: rutaId,
        target: paradaId,
        data: { label: 'destino', srcMultiplicity: '1', tgtMultiplicity: '*' },
      },
    ];

    const { classes, warnings } = transform(
      getEntities() as any,
      relationships as any
    );
    const parada = classes.find((c) => c.className === 'Parada');

    // Parada is the owning side in a OneToMany/ManyToOne depending on multiplicity.
    // Here srcMult=1, tgtMult=* -> Parada has @ManyToOne pointing to Ruta.
    // So Parada should have two fields pointing to Ruta.
    const f1 = parada?.relationFields.find((f) => f.fieldName === 'rutaOrigen');
    const f2 = parada?.relationFields.find(
      (f) => f.fieldName === 'rutaDestino'
    );

    expect(f1).toBeDefined();
    expect(f2).toBeDefined();

    const joinCol1 = f1?.annotations.find((a) => a.startsWith('@JoinColumn'));
    const joinCol2 = f2?.annotations.find((a) => a.startsWith('@JoinColumn'));

    expect(joinCol1).toContain('name = "ruta_origen_id"');
    expect(joinCol2).toContain('name = "ruta_destino_id"');

    // Check warnings
    const wRuta = warnings.find((w) =>
      w.message.includes('Colisi\u00f3n resuelta en Ruta:')
    );
    const wParada = warnings.find((w) =>
      w.message.includes('Colisi\u00f3n resuelta en Parada:')
    );

    expect(wRuta).toBeDefined();
    expect(wRuta?.message).toContain('paradasOrigen');
    expect(wRuta?.message).toContain('paradasDestino');

    expect(wParada).toBeDefined();
    expect(wParada?.message).toContain('rutaOrigen');
    expect(wParada?.message).toContain('rutaDestino');
  });
});
