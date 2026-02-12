import type { Request, Response, NextFunction, RequestHandler } from "express";
import { db } from "../../db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";

declare global {
  namespace Express {
    interface Request {
      dbUser?: {
        id: string;
        username: string | null;
        email: string | null;
        firstName: string | null;
        lastName: string | null;
        profileImageUrl: string | null;
        role: string;
      };
    }
  }
}

export const loadDbUser: RequestHandler = async (req: Request, res: Response, next: NextFunction) => {
  const user = req.user as any;
  if (user?.claims?.sub) {
    try {
      const [dbUser] = await db.select().from(users).where(eq(users.id, user.claims.sub));
      if (dbUser && dbUser.isActive !== false) {
        req.dbUser = {
          id: dbUser.id,
          username: dbUser.username,
          email: dbUser.email,
          firstName: dbUser.firstName,
          lastName: dbUser.lastName,
          profileImageUrl: dbUser.profileImageUrl,
          role: dbUser.role,
        };
        return next();
      }
    } catch (error) {
      console.error("Failed to load user from DB:", error);
    }
  }

  const sessionUserId = (req as any).session?.userId;
  if (sessionUserId) {
    try {
      const [dbUser] = await db.select().from(users).where(eq(users.id, sessionUserId));
      if (dbUser && dbUser.isActive !== false) {
        req.dbUser = {
          id: dbUser.id,
          username: dbUser.username,
          email: dbUser.email,
          firstName: dbUser.firstName,
          lastName: dbUser.lastName,
          profileImageUrl: dbUser.profileImageUrl,
          role: dbUser.role,
        };
        return next();
      }
    } catch (error) {
      console.error("Failed to load user from DB:", error);
    }
  }

  next();
};

export const requireAuthenticated: RequestHandler = (req: Request, res: Response, next: NextFunction) => {
  if (!req.dbUser) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
};

export const requireAdmin: RequestHandler = (req: Request, res: Response, next: NextFunction) => {
  if (!req.dbUser) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  if (req.dbUser.role !== "admin") {
    return res.status(403).json({ message: "Forbidden: admin role required" });
  }
  next();
};

export const requireStudent: RequestHandler = (req: Request, res: Response, next: NextFunction) => {
  if (!req.dbUser) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  if (req.dbUser.role !== "student" && req.dbUser.role !== "admin") {
    return res.status(403).json({ message: "Forbidden: student role required" });
  }
  next();
};
