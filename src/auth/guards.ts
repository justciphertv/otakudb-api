import { User } from "@prisma/client";
import { requireModerator, requireUser } from "../common/permissions.js";

export const assertAuth = (user?: User | null) => requireUser(user);
export const assertModerator = (user?: User | null) => requireModerator(user);
