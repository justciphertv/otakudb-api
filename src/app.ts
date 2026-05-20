// @ts-nocheck
import cors from "@fastify/cors";
import Fastify from "fastify";
import depthLimit from "graphql-depth-limit";
import { NoSchemaIntrospectionCustomRule, ValidationContext, GraphQLError, Kind } from "graphql";
import { createYoga } from "graphql-yoga";
import { allowedOrigins, env } from "./config/env.js";
import { prisma } from "./db/prisma.js";
import { registerRateLimit } from "./common/rateLimit.js";
import { buildContext } from "./graphql/context.js";
import { schema } from "./graphql/schema.js";

export async function buildApp() {
  const app = Fastify({ logger: env.NODE_ENV !== "test" });

  await app.register(cors, {
    origin: (origin, cb) => {
      const isLocalDevOrigin =
        env.NODE_ENV !== "production" &&
        Boolean(origin) &&
        /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(origin ?? "");
      if (!origin || allowedOrigins.includes(origin) || isLocalDevOrigin) cb(null, true);
      else cb(new Error("Origin not allowed"), false);
    },
    credentials: true
  });
  await registerRateLimit(app);

  app.get("/health", async () => {
    await prisma.$queryRaw`SELECT 1`;
    return { ok: true, service: "otakudb-api" };
  });

  const validationRules = [
    depthLimit(8),
    complexityLimitRule(800),
    ...(env.NODE_ENV === "production" && !env.ENABLE_GRAPHQL_INTROSPECTION
      ? [NoSchemaIntrospectionCustomRule]
      : [])
  ];

  const yoga = createYoga({
    schema,
    graphqlEndpoint: "/graphql",
    maskedErrors: env.NODE_ENV === "production",
    validationRules,
    context: async ({ req }: any) => buildContext(req)
  });

  app.route({
    url: "/graphql",
    method: ["GET", "POST", "OPTIONS"],
    handler: async (request, reply) => {
      const url = `${request.protocol}://${request.headers.host}${request.url}`;
      const body =
        request.method === "GET" || request.method === "HEAD"
          ? undefined
          : typeof request.body === "string"
            ? request.body
            : JSON.stringify(request.body ?? {});
      const response = await yoga.fetch(
        url,
        {
          method: request.method,
          headers: request.headers as Record<string, string>,
          body
        },
        { req: request, reply }
      );
      response.headers.forEach((value, key) => reply.header(key, value));
      reply.status(response.status);
      reply.send(await response.text());
    }
  });

  app.addHook("onClose", async () => {
    await prisma.$disconnect();
  });

  return app;
}

function complexityLimitRule(max: number) {
  return (context: ValidationContext) => {
    let score = 0;
    return {
      Field(node: any) {
        score += node.selectionSet ? 2 : 1;
        if (score > max) {
          context.reportError(
            new GraphQLError(`Query complexity exceeds ${max}`, { nodes: node, extensions: { code: "GRAPHQL_VALIDATION_FAILED" } })
          );
        }
      },
      OperationDefinition(node: any) {
        if (node.operation === "subscription") {
          context.reportError(new GraphQLError("Subscriptions are not supported", { nodes: node }));
        }
      },
      Directive(node: any) {
        if (node.name.value === "defer" || node.name.value === "stream") {
          context.reportError(new GraphQLError("Incremental delivery is not enabled", { nodes: node }));
        }
      },
      FragmentDefinition(node: any) {
        if (node.kind !== Kind.FRAGMENT_DEFINITION) return;
      }
    };
  };
}
