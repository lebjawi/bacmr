import { replitAuthProvider } from "./replit";
import type { AuthProvider } from "./provider";
export { requireRole, requireAuth } from "./provider";
export type { AuthProvider, AuthUser } from "./provider";

export const authProvider: AuthProvider = replitAuthProvider;
