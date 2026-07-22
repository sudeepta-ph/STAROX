import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth.js';

export const adminMiddleware = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.userId) {
    return res.status(401).json({ error: 'Unauthorized: Authentication required' });
  }

  if (req.userRole !== 'admin') {
    return res.status(403).json({ error: 'Forbidden: Admin authorization required' });
  }

  next();
};
