# DEMO-Chat-App-Enterprise-Level

A Fully configured Chat App with implementation of RabbitMQ, Redis and Docker

To install dependencies:

```bash
bun install
```

To run:

```bash
bun run index.ts
```

This project was created using `bun init` in bun v1.2.22. [Bun](https://bun.com) is a fast all-in-one JavaScript runtime.

## Installs & initial scaffold

In package.json add this attribute:

```json
"workspaces": [
    "services/*",
    "packages/*"
],
// [...]
"scripts" : {
    "build": "bun run --filter '*' --filter '!chatapp' build",
    "dev": "bun run --filter '*' --filter '!chatapp' dev",
    "lint": "bun run --filter '*' --filter '!chatapp' lint",
    "format": "bun run --filter '*' --filter '!chatapp' format",
    "test": "bun run --filter '*' --filter '!chatapp' test"
},
```

Than installs the needed packages with this commands:

```sh
bun add -d typescript @types/node tsx prettier @eslint/js typescript-eslint eslint
```

Then setup `tsconfig.base.json` by renaming `tsconfig.json`.

```json
{
  "compilerOptions": {
    "composite": true, // Mandatory for Project ref

    // TS can create file. JS, SourceMaps or Type
    "noEmit": false,

    // switch with "bundler", "Node" fit better with Bun
    "moduleResolution": "Node",

    // Specify types for Bun and Node (mandatory)
    "types": ["bun", "node"]
  }
}
```

Then add `tsconfig.json` file with this content:

```json
{
  "extends": "./tsconfig.base.json",
  "compilerOptions": { "composite": true },
  "files": [],
  "references": [
    { "path": "./packages/common" },
    { "path": "./services/user-service" },
    { "path": "./services/gateway-service" },
    { "path": "./services/chat-service" },
    { "path": "./services/auth-service" }
  ]
}
```

So this is the time to generate fully folder structure as described in the `tsconfig.json` in the **references** attributes.

Next add `packages/common/tsconfig.json` file with this content:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "rootDir": "src",
    "outDir": "dist",
    "tsBuildInfoFile": "dist/tsconfig.tsbuildinfo",
    "declaration": true,
    "declarationMap": true,
    "composite": true,
    "noEmit": false,
    "emitDeclarationOnly": true
  },
  "include": ["src"]
}
```

Now to generate a scaffold for each packages install following plugins:

```sh
bun add zod pino pino-pretty --cwd packages/common
```

Then create initial scaffold

```sh
cd package/common && bun init -y && mkdir src
```

> Each source file must be placed in **/src** folder

in new packages.json change the attribute to take this effect on the project implementation

```json
"name": "@chatapp/common",
"private": true,  // if not present yet
"main": "dist/index.js",
"types": "dist/index.d.ts",
```

Add again the plugins to work better inside common workspace

```sh
bun add zod pino
```

Open `package.json` file to check if plugins are installed.

- **Zod** is a useful plugin to validate "form fields", "API responses", "env variables", "db data" or others JS objects.
  - z.infer help to extract data from schema optimizing DX creating robust code implementation
- **Pino** is one of the fastest JSON logger (For node) producing logs compatible with monitoring tools like Grafana, Datadog or ELK.
  - JSON structured data helps to instant filter infos by `timestamp`, `level` or `userId`

---

## Implement commons

Add a new file in `packages/common/src/logger.ts`:

```ts
import pino from "pino";

import type { Logger, LoggerOptions } from "pino";

type CreateLoggerOptions = LoggerOptions & {
  name: string;
};

export const createLogger = (options: CreateLoggerOptions): Logger => {
  const { name, ...rest } = options;
  const transport =
    process.env.NODE_ENV === "development"
      ? {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "SYS:standard",
          },
        }
      : undefined;

  return pino({
    name,
    level: process.env.LOG_LEVEL || "info",
    transport,
    ...rest,
  });
};
```

After this create in same folder a new file for env schema called env.ts

```ts
import type { ZodObject, ZodRawShape } from "zod";
import { z } from "zod";

interface EnvOptions {
  source?: NodeJS.ProcessEnv;
  serviceName?: string;
}

type SchemaOutput<TSchema extends ZodRawShape> = z.output<ZodObject<TSchema>>;

export const createEnv = <TSchema extends ZodRawShape>(
  schema: ZodObject<TSchema>,
  options: EnvOptions = {}
): SchemaOutput<TSchema> => {
  const { source = process.env, serviceName = "service" } = options;
  const parsed = schema.safeParse(source);

  if (!parsed.success) {
    const formattedErrors = z.treeifyError(parsed.error);
    throw new Error(
      `[${serviceName}] Environment variable validation failed: ${JSON.stringify(formattedErrors)}`
    );
  }

  return parsed.data;
};

export type EnvSchema<TShape extends ZodRawShape> = z.output<ZodObject<TShape>>;
```

Now that **logger** and **env** implementation is complete you can add `index.ts` file with following content:

```ts
export * from "./env";
export * from "./logger";
export { z } from "zod";
export type { Logger } from "pino";
```

---

## Add Auth Service

Create a new file in `service/auth-service/tsconfig.json` with following setup:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "rootDir": "src",
    "outDir": "dist",
    "tsBuildInfoFile": "dist/tsconfig.tsbuildinfo",
    "declaration": true,
    "declarationMap": true,
    "noEmit": false, // good compromise for monorepo bun
    "emitDeclarationOnly": true, // with this only ".d.ts" will be created
    "composite": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "../../packages/common" }]
}
```

Then init auth-service by typing this command on vscode terminal

```sh
cd services/auth-service
bun init -y
```

Then update name attribute inside `package.json` file:

```json
"name": "@chatapp/auth-service",
// add also this attributes...
"main": "dist/index.js",
"types": "dist/index.d.ts",
```

So add plugins **dotenv** and **express** to service

```sh
bun add dotenv express
```

then in dependencies attributes add also reference to common package

```json
"dependencies": {
  "@chatapp/common": "workspace:^",
  // [...]
}
```

Now we need new plugin for `auth-service` so open folder and add it:

```sh
cd services/auth-service
bun add -d @types/express @types/cors
bun add cors helmet
```

A file for logger is needed in `services/auth-service/src/utils/logger.ts`:

```ts
import { createLogger } from "@chatapp/common";
import type { Logger } from "@chatapp/common";

export const logger: Logger = createLogger({
  name: "auth-service",
});
```

Create a file in `services/auth-service/app.ts` :

```ts
import express, { type Application } from "express";
import cors from "cors";
import helmet from "helmet";

export const createApp = (): Application => {
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin: "*",
      credentials: true,
    })
  );
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.use((_req, res) => {
    res.status(404).json({ message: "Not found" });
  });

  return app;
};
```

Add new file and folder in `services/auth-service/src/config/env.ts` :

```ts
import "dotenv/config";
import { createEnv, z } from "@chatapp/common";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  AUTH_SERVICE_PORT: z.coerce.number().int().min(0).max(65_535).default(4003),
});

type EnvType = z.infer<typeof envSchema>;

export const env: EnvType = createEnv(envSchema, {
  serviceName: "auth-service",
});

export type Env = typeof env;
```

Create then new file in `services/auth-service/index.ts` :

```ts
import { createApp } from "@/app";
import { createServer } from "http";
import { env } from "@/config/env";
import { logger } from "@/utils/logger";

const main = async () => {
  try {
    const app = createApp();
    const server = createServer(app);

    const port = env.AUTH_SERVICE_PORT;

    server.listen(port, () => {
      logger.info({ port }, "Auth service is running");
    });

    const shutdown = () => {
      logger.info("Shutting down auth service...");

      Promise.all([])
        .catch((error: unknown) => {
          logger.error({ error }, "Error during shutdown tasks");
        })
        .finally(() => {
          server.close(() => process.exit(0));
        });
    };

    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
  } catch (error) {
    logger.error({ error }, "Failed to start auth service");
    process.exit(1);
  }
};

void main();
```

Then you can add in a new file in `services/auth-service/.env` this parameters:

```
NODE_ENV=development
AUTH_SERVICE_PORT=4003
```

to make all this compatible add this "script" attribute to `services/auth-service/package.json` :

```json
"scripts" : {
  "build": "tsc --project tsconfig.json",
  "dev": "bun --watch src/index.ts",
  "start": "node dist/index.js",
  "lint": "eslint 'src/**/*.ts'",
  "typecheck": "tsc --noEmit --project tsconfig.json",
  "test": "echo 'No tests yet'",
  "format": "prettier --check 'src/**/*.ts'"
},
```

Finally test auth-service typing this command in VSCode terminal:

```sh
bun --cwd services/auth-service dev
```

PROSEGUE DAL MINUTO 1:10:44 del video https://www.youtube.com/watch?v=nCyvvMjO2ME
