import { EntityDoc, RelationshipDoc } from '../../src/export/transformer.js';

export const fixtureEntities: EntityDoc[] = [
  {
    _id: 'ent_user',
    type: 'class',
    data: {
      name: 'User',
      isAbstract: true,
      attributes: [
        { id: 1, name: 'id', visibility: '+', type: 'long' },
        { id: 2, name: 'username', visibility: '+', type: 'string' },
        { id: 3, name: 'password', visibility: '—', type: 'string' },
      ],
      methods: [
        {
          id: 1,
          name: 'login',
          returnType: 'boolean',
          visibility: '+',
          isStatic: false,
        },
      ],
    },
  },
  {
    _id: 'ent_guest',
    type: 'class',
    data: {
      name: 'Guest',
      isAbstract: false,
      attributes: [
        { id: 1, name: 'loyaltyPoints', visibility: '—', type: 'int' },
      ],
      methods: [],
    },
  },
  {
    _id: 'ent_employee',
    type: 'class',
    data: {
      name: 'Employee',
      isAbstract: false,
      attributes: [{ id: 1, name: 'salary', visibility: '—', type: 'double' }],
      methods: [],
    },
  },
  {
    _id: 'ent_room_status',
    type: 'enum',
    data: {
      name: 'RoomStatus',
      constants: [
        { id: 1, name: 'AVAILABLE', type: 'string' },
        { id: 2, name: 'OCCUPIED', type: 'string' },
        { id: 3, name: 'MAINTENANCE', type: 'string' },
      ],
    },
  },
  {
    _id: 'ent_room',
    type: 'class',
    data: {
      name: 'Room',
      isAbstract: false,
      attributes: [
        { id: 1, name: 'number', visibility: '—', type: 'int' },
        { id: 2, name: 'status', visibility: '—', type: 'RoomStatus' },
      ],
      methods: [
        {
          id: 1,
          name: 'clean',
          returnType: 'void',
          visibility: '+',
          isStatic: false,
        },
      ],
    },
  },
  {
    _id: 'ent_payment',
    type: 'interface',
    data: {
      name: 'Payment',
      attributes: [],
      methods: [
        {
          id: 1,
          name: 'process',
          returnType: 'boolean',
          visibility: '+',
          isStatic: false,
        },
      ],
    },
  },
  {
    _id: 'ent_cc_payment',
    type: 'class',
    data: {
      name: 'CreditCardPayment',
      isAbstract: false,
      attributes: [
        { id: 1, name: 'cardNumber', visibility: '—', type: 'string' },
      ],
      methods: [
        {
          id: 1,
          name: 'process',
          returnType: 'boolean',
          visibility: '+',
          isStatic: false,
        },
      ],
    },
  },
  {
    _id: 'ent_reservation',
    type: 'class',
    data: {
      name: 'Reservation',
      isAbstract: false,
      attributes: [
        { id: 1, name: 'id', visibility: '+', type: 'long' },
        { id: 2, name: 'date', visibility: '—', type: 'date' },
      ],
      methods: [],
    },
  },
  {
    _id: 'ent_invoice',
    type: 'class',
    data: {
      name: 'Invoice',
      isAbstract: false,
      attributes: [
        { id: 1, name: 'id', visibility: '+', type: 'long' },
        { id: 2, name: 'total', visibility: '—', type: 'double' },
      ],
      methods: [],
    },
  },
];

export const fixtureRelationships: RelationshipDoc[] = [
  {
    _id: 'rel_guest_user',
    type: 'Inheritance',
    source: 'ent_user',
    target: 'ent_guest',
    data: {},
  },
  {
    _id: 'rel_employee_user',
    type: 'Inheritance',
    source: 'ent_user',
    target: 'ent_employee',
    data: {},
  },
  {
    _id: 'rel_cc_payment_payment',
    type: 'Implementation',
    source: 'ent_payment',
    target: 'ent_cc_payment',
    data: {},
  },
  {
    _id: 'rel_reservation_invoice',
    type: 'Composition',
    source: 'ent_reservation',
    target: 'ent_invoice',
    data: {
      srcMultiplicity: '1',
      tgtMultiplicity: '1',
      label: 'has',
    },
  },
  {
    _id: 'rel_guest_reservation',
    type: 'Aggregation',
    source: 'ent_guest',
    target: 'ent_reservation',
    data: {
      srcMultiplicity: '1',
      tgtMultiplicity: '*',
      label: 'makes',
    },
  },
  {
    _id: 'rel_reservation_room',
    type: 'Association',
    source: 'ent_reservation',
    target: 'ent_room',
    data: {
      srcMultiplicity: '*',
      tgtMultiplicity: '1',
      label: 'books',
    },
  },
  {
    _id: 'rel_employee_room',
    type: 'Dependency',
    source: 'ent_employee',
    target: 'ent_room',
    data: {
      label: 'cleans',
    },
  },
];
