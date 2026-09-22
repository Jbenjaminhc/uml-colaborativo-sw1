import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../../src/app';
import { DiagramModel } from '../../src/models/diagram.model';
import { UserModel } from '../../src/models/user.model';
import { EntityModel } from '../../src/models/entity.model';

let mongoServer: MongoMemoryServer;
let ownerId: string;
let otherUserId: string;
let editorId: string;
let viewerId: string;

let tokenOwner: string;
let tokenOther: string;
let tokenEditor: string;
let tokenViewer: string;

let diagramPropioId: string;
let diagramAjenoId: string;
let diagramEmptyId: string;

beforeAll(async () => {
  process.env.JWT_SECRET = 'test-secret';
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());

  const owner = await UserModel.create({
    username: 'owner',
    email: 'owner@test.com',
    password: '123',
    verified: true,
  });
  const other = await UserModel.create({
    username: 'other',
    email: 'other@test.com',
    password: '123',
    verified: true,
  });
  const editor = await UserModel.create({
    username: 'editor',
    email: 'editor@test.com',
    password: '123',
    verified: true,
  });
  const viewer = await UserModel.create({
    username: 'viewer',
    email: 'viewer@test.com',
    password: '123',
    verified: true,
  });

  ownerId = owner._id.toString();
  otherUserId = other._id.toString();
  editorId = editor._id.toString();
  viewerId = viewer._id.toString();

  tokenOwner = jwt.sign({ userId: ownerId, type: 'auth' }, 'test-secret');
  tokenOther = jwt.sign({ userId: otherUserId, type: 'auth' }, 'test-secret');
  tokenEditor = jwt.sign({ userId: editorId, type: 'auth' }, 'test-secret');
  tokenViewer = jwt.sign({ userId: viewerId, type: 'auth' }, 'test-secret');

  const diagPropio = await DiagramModel.create({
    name: 'Propio',
    userId: ownerId,
    collaborators: [
      { userId: editorId, role: 'editor' },
      { userId: viewerId, role: 'viewer' },
    ],
  });
  diagramPropioId = diagPropio._id.toString();

  const diagAjeno = await DiagramModel.create({
    name: 'Ajeno',
    userId: otherUserId,
    collaborators: [],
  });
  diagramAjenoId = diagAjeno._id.toString();

  const diagEmpty = await DiagramModel.create({
    name: 'Empty',
    userId: ownerId,
    collaborators: [],
  });
  diagramEmptyId = diagEmpty._id.toString();

  await EntityModel.create({
    diagramId: diagramPropioId,
    type: 'class',
    data: { name: 'TestClass' },
    position: { x: 0, y: 0 },
  });
  await EntityModel.create({
    diagramId: diagramPropioId,
    type: 'class',
    data: { name: 'TestClass2' },
    position: { x: 0, y: 0 },
  });
  await EntityModel.create({
    diagramId: diagramAjenoId,
    type: 'class',
    data: { name: 'AjenoClass' },
    position: { x: 0, y: 0 },
  });
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('Export Endpoints - Security (C1)', () => {
  it('T-C1a: GET /api/diagram/<AJENO>/export/springboot?diagramId=<PROPIO> uses PROPIO', async () => {
    const res = await request(app)
      .get(
        `/api/diagram/${diagramAjenoId}/export/springboot?diagramId=${diagramPropioId}&database=h2&groupId=com.test&artifactId=test`
      )
      .set('Authorization', `Bearer ${tokenOwner}`);

    expect(res.status).toBe(200);
  });

  it('T-C1b: GET /api/diagram/<AJENO>/export/preview?diagramId=<PROPIO> uses PROPIO', async () => {
    const res = await request(app)
      .get(
        `/api/diagram/${diagramAjenoId}/export/preview?diagramId=${diagramPropioId}`
      )
      .set('Authorization', `Bearer ${tokenOwner}`);
    expect(res.status).toBe(200);
    expect(res.body.entityCount).toBe(2);
  });

  it('T-C1c: El caso normal (sin query) sigue funcionando para owner, editor y viewer', async () => {
    const previewResOwner = await request(app)
      .get(`/api/diagram/${diagramPropioId}/export/preview`)
      .set('Authorization', `Bearer ${tokenOwner}`);
    expect(previewResOwner.status).toBe(200);

    const previewResEditor = await request(app)
      .get(`/api/diagram/${diagramPropioId}/export/preview`)
      .set('Authorization', `Bearer ${tokenEditor}`);
    expect(previewResEditor.status).toBe(200);

    const previewResViewer = await request(app)
      .get(`/api/diagram/${diagramPropioId}/export/preview`)
      .set('Authorization', `Bearer ${tokenViewer}`);
    expect(previewResViewer.status).toBe(200);

    const zipResEditor = await request(app)
      .get(
        `/api/diagram/${diagramPropioId}/export/springboot?database=h2&groupId=com.test&artifactId=test`
      )
      .set('Authorization', `Bearer ${tokenEditor}`);
    expect(zipResEditor.status).toBe(200);
  });
});

describe('Export Endpoints - Functionality (C2)', () => {
  it('200 y cabecera Content-Disposition correcta en /export/springboot', async () => {
    const res = await request(app)
      .get(
        `/api/diagram/${diagramPropioId}/export/springboot?database=h2&groupId=com.test&artifactId=test`
      )
      .set('Authorization', `Bearer ${tokenOwner}`);
    expect(res.status).toBe(200);
    expect(res.header['content-type']).toBe('application/zip');
    expect(res.header['content-disposition']).toContain(
      'attachment; filename="test.zip"'
    );
  });

  it('200 con la forma esperada del JSON en /export/preview', async () => {
    const res = await request(app)
      .get(`/api/diagram/${diagramPropioId}/export/preview`)
      .set('Authorization', `Bearer ${tokenOwner}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('entityCount');
    expect(res.body).toHaveProperty('relationshipCount');
    expect(res.body).toHaveProperty('fileCount');
    expect(res.body).toHaveProperty('warnings');
  });

  it('404 diagrama inexistente', async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();
    const res = await request(app)
      .get(`/api/diagram/${fakeId}/export/preview`)
      .set('Authorization', `Bearer ${tokenOwner}`);
    expect(res.status).toBe(404);
  });

  it('404 usuario sin acceso', async () => {
    const res = await request(app)
      .get(`/api/diagram/${diagramAjenoId}/export/preview`)
      .set('Authorization', `Bearer ${tokenOwner}`);
    expect(res.status).toBe(404);
  });

  it('400 diagrama vacio', async () => {
    const res = await request(app)
      .get(`/api/diagram/${diagramEmptyId}/export/preview`)
      .set('Authorization', `Bearer ${tokenOwner}`);
    expect(res.status).toBe(400);
    expect(res.body.message).toContain('El diagrama no tiene entidades');
  });

  it('400 parametros invalidos', async () => {
    const res = await request(app)
      .get(
        `/api/diagram/${diagramPropioId}/export/springboot?database=h2&groupId=123&artifactId=`
      )
      .set('Authorization', `Bearer ${tokenOwner}`);
    expect(res.status).toBe(400);
  });

  it('400 database distinto', async () => {
    const res = await request(app)
      .get(
        `/api/diagram/${diagramPropioId}/export/springboot?database=mysql&groupId=com.test&artifactId=test`
      )
      .set('Authorization', `Bearer ${tokenOwner}`);
    expect(res.status).toBe(400);
  });
});
