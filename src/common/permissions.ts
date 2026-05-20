import { User, UserRole } from "@prisma/client";
import { forbiddenError, requireAuthError } from "./errors.js";

export function requireUser(user: Pick<User, "id"> | null | undefined) {
  if (!user) throw requireAuthError();
  return user;
}

export function requireModerator(user: Pick<User, "role"> | null | undefined) {
  if (!user) throw requireAuthError();
  if (user.role !== UserRole.ADMIN && user.role !== UserRole.MODERATOR) throw forbiddenError();
  return user;
}

export function canViewPrivate(ownerId: number, viewer?: Pick<User, "id" | "role"> | null) {
  return viewer?.id === ownerId || viewer?.role === UserRole.ADMIN || viewer?.role === UserRole.MODERATOR;
}
