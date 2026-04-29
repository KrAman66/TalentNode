import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const router = Router();

// GET /api/saved-jobs?userId=...
router.get('/', async (req: Request, res: Response) => {
  const { userId } = req.query as { userId?: string };
  if (!userId) {
    res.status(400).json({ error: 'userId required' });
    return;
  }
  const jobs = await prisma.savedJob.findMany({
    where: { userId },
    orderBy: { savedAt: 'desc' },
  });
  res.json(jobs);
});

// POST /api/saved-jobs
router.post('/', async (req: Request, res: Response) => {
  const { userId, jobData, source, externalId, title, company, location } = req.body;
  if (!userId || !externalId || !title || !company) {
    res.status(400).json({ error: 'userId, externalId, title, company required' });
    return;
  }
  const job = await prisma.savedJob.create({
    data: {
      userId,
      jobData: jobData ?? {},
      source: source ?? 'linkedin',
      externalId,
      title,
      company,
      location,
    },
  });
  res.status(201).json(job);
});

// DELETE /api/saved-jobs/:id
router.delete('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  await prisma.savedJob.deleteMany({ where: { id } });
  res.json({ ok: true });
});

export default router;
