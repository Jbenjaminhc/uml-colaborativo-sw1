import { Router } from 'express';
import withAuth from '../middleware/auth';
import { getErrorMessage } from '../utils';
import {
  generatePreview,
  generateZip,
  validateGenerationParams,
} from '../export/generator';
import { SupportedDatabase } from '../export/types';
import { generateXmiFromDiagram } from '../export/xmi';
import { getDiagramContents } from '../controllers/diagramController';

const exportRouter = Router({ mergeParams: true });

// Both routes require auth with diagram access (GET allows viewer role)
exportRouter.use(withAuth);

// GET /api/diagram/:diagramId/export/preview
exportRouter.get('/preview', async (req, res) => {
  try {
    const diagramId = (req as any).diagram._id.toString();
    const preview = await generatePreview(diagramId);
    res.json(preview);
  } catch (e) {
    res.status(400).json({ message: getErrorMessage(e) });
  }
});

// GET /api/diagram/:diagramId/export/springboot?database=...&groupId=...&artifactId=...
exportRouter.get('/springboot', async (req, res) => {
  try {
    const diagramId = (req as any).diagram._id.toString();
    const database = (req.query.database as string) || 'h2';
    const groupId = (req.query.groupId as string) || '';
    const artifactId = (req.query.artifactId as string) || '';
    const name = req.query.name as string | undefined;
    const description = req.query.description as string | undefined;
    const packageName = req.query.packageName as string | undefined;
    const javaVersion = req.query.javaVersion as string | undefined;

    const validation = validateGenerationParams(
      database,
      groupId,
      artifactId,
      name,
      description,
      packageName,
      javaVersion
    );

    if (!validation.params) {
      res.status(400).json({ message: validation.errors.join('; ') });
      return;
    }

    const { stream, artifactId: resolvedArtifactId } = await generateZip(
      diagramId,
      validation.params
    );

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${resolvedArtifactId}.zip"`
    );

    stream.pipe(res);
  } catch (e) {
    res.status(400).json({ message: getErrorMessage(e) });
  }
});

// GET /api/diagram/:diagramId/export/xmi
exportRouter.get('/xmi', async (req, res) => {
  try {
    const diagramId = (req as any).diagram._id.toString();
    const { content, diagramName, warnings } = await generateXmiFromDiagram(
      diagramId
    );

    if (warnings.length > 0) {
      console.warn(
        `[XMI Export] Warnings para diagrama ${diagramId}:`,
        warnings
      );
    }

    const safeFilename = diagramName.replace(/[^a-zA-Z0-9_\-. ]/g, '_');
    res.setHeader('Content-Type', 'application/xml');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${safeFilename}.xmi"`
    );
    res.send(content);
  } catch (e) {
    const message = getErrorMessage(e);
    if (message === 'El diagrama no tiene entidades') {
      res.status(400).json({ message });
    } else {
      res.status(400).json({ message });
    }
  }
});

// GET /api/diagram/:diagramId/export/json
exportRouter.get('/json', async (req, res) => {
  try {
    const diagramId = (req as any).diagram._id.toString();
    const diagramName = (req as any).diagram.name;
    const contents = await getDiagramContents(diagramId);

    const safeFilename = diagramName.replace(/[^a-zA-Z0-9_\-. ]/g, '_');
    res.setHeader('Content-Type', 'application/json');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${safeFilename}.json"`
    );
    res.send(JSON.stringify(contents, null, 2));
  } catch (e) {
    res.status(400).json({ message: getErrorMessage(e) });
  }
});

export default exportRouter;
