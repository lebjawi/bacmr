import type { Request, Response, NextFunction, RequestHandler } from "express";

export interface AuthUser {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  profileImageUrl: string | null;
  role: string;
}

export interface AuthProvider {
  isAuthenticated: RequestHandler;
  getUserFromRequest(req: Request): AuthUser | null;
}

export function requireRole(provider: AuthProvider, role: string): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = provider.getUserFromRequest(req);
    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    if (user.role !== role) {
      return res.status(403).json({ message: "Forbidden: insufficient role" });
    }
    next();
  };
}

export function requireAuth(provider: AuthProvider): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = provider.getUserFromRequest(req);
    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    next();
  };
}
