import { Router, Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import type { AuthRequest } from '../middleware/auth';

const prisma = new PrismaClient();
const router = Router();

// Auth middleware inline
function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  next();
}

// GET /api/saved-jobs?userId=...
router.get('/', async (req: AuthRequest, res: Response) => {
  const userId = req.userId;
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  const jobs = await prisma.savedJob.findMany({
    where: { userId },
    orderBy: { savedAt: 'desc' },
  });
  res.json(jobs);
});

// POST /api/saved-jobs
router.post('/', async (req: AuthRequest, res: Response) => {
  const userId = req.userId;
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  const { jobData, source, externalId, title, company, location } = req.body;
  if (!externalId || !title || !company) {
    res.status(400).json({ error: 'externalId, title, company required' });
    return;
  }
  const job = await prisma.savedJob.create({
    data: {
      userId,
      jobData: jobData ?? {},
      source: source ?? 'adzuna',
      externalId,
      title,
      company,
      location,
    },
  });
  res.status(201).json(job);
});

// DELETE /api/saved-jobs/:id
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  const userId = req.userId;
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  await prisma.savedJob.deleteMany({ where: { id: req.params.id, userId } });
  res.json({ ok: true });
});

export default router;
