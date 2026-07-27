import type { Request, Response, NextFunction } from 'express';

declare global {
  namespace Express {
    interface Request {
      user?: {
        uid: string;
        email: string | null;
      };
    }
  }
}

export declare function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> | void;

export declare function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction
): void;
