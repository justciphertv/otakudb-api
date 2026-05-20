import { GraphQLError } from "graphql";

export class AppError extends Error {
  constructor(
    message: string,
    public readonly code = "BAD_REQUEST",
    public readonly statusCode = 400
  ) {
    super(message);
  }
}

export function toGraphQLError(error: unknown): GraphQLError {
  if (error instanceof GraphQLError) return error;
  if (error instanceof AppError) {
    return new GraphQLError(error.message, {
      extensions: { code: error.code, http: { status: error.statusCode } }
    });
  }
  if (error instanceof Error) {
    return new GraphQLError(error.message, { extensions: { code: "INTERNAL_SERVER_ERROR" } });
  }
  return new GraphQLError("Unexpected error", { extensions: { code: "INTERNAL_SERVER_ERROR" } });
}

export const requireAuthError = () => new AppError("Authentication required", "UNAUTHENTICATED", 401);
export const forbiddenError = () => new AppError("Insufficient permissions", "FORBIDDEN", 403);
export const notFoundError = (name = "Resource") => new AppError(`${name} not found`, "NOT_FOUND", 404);
