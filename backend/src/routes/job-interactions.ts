import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import type { AuthRequest } from '../middleware/auth';

const prisma = new PrismaClient();
const router = Router();

// GET /api/job-interactions?jobId=&source=
router.get('/', async (req: AuthRequest, res: Response) => {
  const userId = req.userId;
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const { jobId, source } = req.query as { jobId?: string; source?: string };
  const where: any = { userId };
  if (jobId) where.jobId = jobId;
  if (source) where.source = source;

  const interactions = await prisma.jobInteraction.findMany({ where });
  res.json(interactions);
});

// POST /api/job-interactions
router.post('/', async (req: AuthRequest, res: Response) => {
  const userId = req.userId;
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const { jobId, source, type } = req.body;
  if (!jobId || !source || !type) {
    res.status(400).json({ error: 'jobId, source, type required' });
    return;
  }

  // Upsert: if exists, update; else create
  const existing = await prisma.jobInteraction.findUnique({
    where: { userId_jobId_source_type: { userId, jobId, source, type } },
  });

  if (existing) {
    await prisma.jobInteraction.delete({ where: { id: existing.id } });
    res.json({ removed: true });
  } else {
    const interaction = await prisma.jobInteraction.create({
      data: { userId, jobId, source, type },
    });
    res.status(201).json(interaction);
  }
});

export default router;
