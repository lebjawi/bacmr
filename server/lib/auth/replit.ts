import type { Request, RequestHandler } from "express";
import { isAuthenticated as replitIsAuthenticated } from "../../replit_integrations/auth";
import type { AuthProvider, AuthUser } from "./provider";

class ReplitAuthProvider implements AuthProvider {
  get isAuthenticated(): RequestHandler {
    return replitIsAuthenticated;
  }

  getUserFromRequest(req: Request): AuthUser | null {
    const user = req.user as any;
    if (!user || !user.claims) return null;
    return {
      id: user.claims.sub,
      email: user.claims.email || null,
      firstName: user.claims.first_name || null,
      lastName: user.claims.last_name || null,
      profileImageUrl: user.claims.profile_image_url || null,
      role: "student",
    };
  }
}

export const replitAuthProvider = new ReplitAuthProvider();
