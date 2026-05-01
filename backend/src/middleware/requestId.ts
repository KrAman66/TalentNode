import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

export interface RequestWithId extends Request {
  requestId?: string;
  userId?: string;
}

export function requestIdMiddleware(req: RequestWithId, _res: Response, next: NextFunction) {
  req.requestId = randomUUID().split('-')[0]!; // short id
  next();
}
