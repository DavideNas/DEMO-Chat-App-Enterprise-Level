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
bun add zod@3 pino pino-pretty express @types/express --cwd packages/common
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
export * from "./errors/http-error"; // only after error dist implement
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
bun add cors helmet sequelize mysql2
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
// import { errorHandler } from "./middleware/error-handler"; → de-comment only after middleware

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

  // registerRoutes(app); → de-comment this after routes implementation

  // app.use(errorHandler); → de-comment only after middleware

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
  // AUTH_DB_URL: z.string().url(),  // → de-comment this after mysql implementation
  // JWT_SECRET: z.string().min(32),  // → de-comment this after jwt implementation
  // JWT_EXPIRES_IN: z.string().default("30m")
  // JWT_REFRESH_SECRET: z.string().min(32),
  // JWT_REFRESH_EXPIRES_IN: z.string().default("30d"),
});

type EnvType = z.infer<typeof envSchema>;

export const env: EnvType = createEnv(envSchema, {
  serviceName: "auth-service",
});

export type Env = typeof env;
```

Create then new file in `services/auth-service/src/index.ts` :

```ts
import { createApp } from "@/app";
import { createServer } from "http";
import { env } from "@/config/env";
import { logger } from "@/utils/logger";
// import { connectToDatabase } from "@/db/sequelize";
// import { initModels } from "@/models";

const main = async () => {
  try {
    // await connectToDatabase();   → de-comment after sequelize.ts creation
    // await initModels();    → de-comment this after models integration

    const app = createApp();
    const server = createServer(app);

    const port = env.AUTH_SERVICE_PORT;

    server.listen(port, () => {
      logger.info({ port }, "Auth service is running");
    });

    const shutdown = () => {
      logger.info("Shutting down auth service...");

      Promise.all([
        /*closeDatabase()*/
      ]) // → de-comment this after sequelize implementation
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

Now to manage errors we need to add a file in `packages/common/src/errors/http-error.ts` :

```ts
export class HttpError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = "HttpError";
  }
}
```

Now must add attribute to package.json file like this:

```json
"script": {
  "build": "tsc"
},
```

> At this point you must to add the **export** for the **_http-error_** in `packages\common\src\index.ts`

Next execute command to generate **/dist** folder with **HttpError** definition class:

```sh
bun --cwd packages/common run build
```

After this create a file in `services\auth-service\src\middleware\error-handler.ts` adding this code:

```ts
import { HttpError } from "@chatapp/common";

import type { ErrorRequestHandler } from "express";
import { logger } from "@/utils/logger";

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  logger.error({ err, req }, "Unhandled error occurred");

  const error = err instanceof HttpError ? err : undefined;
  const statusCode = error?.statusCode ?? 500;
  const message =
    statusCode >= 500
      ? "Internal Server Error"
      : (error?.message ?? "Unknown Error");
  const payload = error?.details
    ? { message, details: error.details }
    : { message };

  res.status(statusCode).json(payload);

  void _next();
};
```

At this point you can de-comment integration of errorHandler in `auth-service/src/app.ts` file.

Then rerun command to test new version of auth-service

```sh
bun --cwd services/auth-service dev
```

Add a new file in `packages/common/src/http/validate-request.ts`

```ts
import { HttpError } from "../errors/http-error";
import type { NextFunction, Request, Response } from "express";
import { ZodError, type AnyZodObject, type ZodType } from "zod";

type Schema = AnyZodObject | ZodType;
type ParamsRecord = Record<string, string>;
type QueryRecord = Record<string, unknown>;

export interface RequestValidationSchemas {
  body?: Schema;
  params?: Schema;
  query?: Schema;
}

const formattedError = (error: ZodError) =>
  error.errors.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message,
  }));

export const validateRequest = (schemas: RequestValidationSchemas) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (schemas.body) {
        const parseBody = schemas.body.parse(req.body) as unknown;
        req.body = parseBody;
      }

      if (schemas.params) {
        const parsedParams = schemas.params.parse(req.params) as ParamsRecord;
        req.params = parsedParams as Request["params"];
      }

      if (schemas.query) {
        const parsedQuery = schemas.query.parse(req.query) as QueryRecord;
        req.query = parsedQuery as Request["query"];
      }
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        next(
          new HttpError(422, "Validation Error", {
            issues: formattedError(error),
          })
        );
        return;
      }
      next(error);
    }
  };
};
```

---

## Test with Docker

As you finish the auth-service implementation you can create a docker compose to test microservices

```yml
services:
  auth-db:
    image: mysql:8.0
    container_name: chatapp-auth.db
    environment:
      MYSQL_DATABASE: ${AUTH_DB_NAME:-chatapp_auth_service}
      MYSQL_USER: ${AUTH_DB_USER:-chatapp_auth_user}
      MYSQL_PASSWORD: ${AUTH_DB_PASSWORD:-chatapp_auth_password}
      MYSQL_ROOT_PASSWORD: ${AUTH_DB_ROOT_PASSWORD:-root_password}
    command: ["mysqld", "--default-authentication-plugin=mysql_native_password"]
    ports:
      - "${AUTH_DB_PORT:-3306}:3306"
    volumes:
      - auth-db-data:/var/lib/mysql
    networks:
      - chatapp-network

volumes:
  auth-db-data:

networks:
  chatapp-network:
    driver: bridge
```

Add now sequelize to auth-service

```sh
cd services/auth-service
bun add sequelize
```

then add url for DB in the .env file for auth-service

```env
//...

AUTH_DB_URL=mysql://chatapp_auth_user:chatapp_auth_password@localhost:3306/chatapp_auth_service
AUTH_DB_SSL=false
```

So de-comment **_AUTH_DB_URL_** part in the `services/auth-service/src/config/env.ts` file.

Create now a file in `services/auth-service/src/db/sequelize.ts` :

```ts
import { Sequelize } from "sequelize";
import { env } from "@/config/env";
import { logger } from "@/utils/logger";

export const sequelize = new Sequelize(env.AUTH_DB_URL, {
  dialect: "mysql",
  logging:
    env.NODE_ENV == "development"
      ? (msg: unknown) => {
          logger.debug({ sequelize: msg });
        }
      : false,
  define: { underscored: true, freezeTableName: true },
});

export const connectToDatabase = async () => {
  await sequelize.authenticate();
  logger.info("Auth database connection established successfully.");
};

export const closeDatabase = async () => {
  await sequelize.close();
  logger.info("Auth database connection closed.");
};
```

So you can de-comment **_connectToDatabase_** part in `services/auth-service/src/index.ts`

Now make a new test of auth-service starting mysql connection with docker:

- First open Docker Desktop and run `docker-compose up -d auth-db`
- Then run service to test db connection implement `bun --cwd services/auth-service dev`

> if run there will be no problem to see a message similar to :

```sh
INFO (auth-service/7564): Auth database connection established successfully.
INFO (auth-service/7564): Auth service is running
    port: 4003
```

---

## Credentials Model

In auth-service folder create a new file to manage model for user credentials in `src/models/user-credentials.model.ts`.  
This file will manage the entire registration process by a unique model **UserCredentials** in mysql db by **sequelize** plugin.

```ts
import { DataTypes, Model, type Optional } from "sequelize";
import { sequelize } from "@/db/sequelize";

export interface UserCredentialsAttributes {
  id: string;
  email: string;
  displayName: string;
  passwordHash: string;
  createdAt: Date;
  updatedAt: Date;
}

export type UserCredentialsCreationAttributes = Optional<
  UserCredentialsAttributes,
  "id" | "createdAt" | "updatedAt"
>;

export class UserCredentials
  extends Model<UserCredentialsAttributes, UserCredentialsCreationAttributes>
  implements UserCredentialsAttributes
{
  declare id: string;
  declare email: string;
  declare displayName: string;
  declare passwordHash: string;
  declare createdAt: Date;
  declare updatedAt: Date;
}

UserCredentials.init(
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
      },
    },
    passwordHash: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    displayName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: "user_credentials",
  }
);
```

After this add a file in `auth-service/src/models/index.ts`  
This is needed to register model in sequelize system and sync it with mysql DB.

```ts
import { sequelize } from "@/db/sequelize";
import { UserCredentials } from "@/models/user-credentials.model";
// import { RefreshToken } from "@/models/refresh-token.model";

export const initModels = async () => {
  await sequelize.sync();
};

export { UserCredentials /*, RefreshToken */ }; // → de-comment this part only after refresh token implementation
```

Now you can de-comment **initModels** & **closeDatabase** part in `services/auth-service/src/index.ts`.

Run service to test connection with model integration

```sh
docker-compose up -d auth-db
bun --cwd services/auth-service dev   # Run this only after docker bootstrap
```

---

## Adding refresh token management

Create a file in `services/auth-service/src/models/refresh-token.model.ts` :

```ts
import { DataTypes, Model, type Optional } from "sequelize";
import { sequelize } from "@/db/sequelize";
import { UserCredentials } from "@/models/user-credentials.model";

export interface RefreshTokenAttributes {
  id: string;
  userId: string;
  tokenId: string;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type RefreshTokenCreationAttributes = Optional<
  RefreshTokenAttributes,
  "id" | "createdAt" | "updatedAt"
>;

export class RefreshToken
  extends Model<RefreshTokenAttributes, RefreshTokenCreationAttributes>
  implements RefreshTokenAttributes
{
  declare id: string;
  declare userId: string;
  declare tokenId: string;
  declare expiresAt: Date;
  declare createdAt: Date;
  declare updatedAt: Date;
}

RefreshToken.init(
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    tokenId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: "refresh_tokens",
  }
);

UserCredentials.hasMany(RefreshToken, {
  foreignKey: "userId",
  as: "refreshTokens",
  onDelete: "CASCADE",
});

RefreshToken.belongsTo(UserCredentials, {
  foreignKey: "userId",
  as: "user",
});
```

De-comment now the RefreshToken implementation in `services/auth-service/src/models/index.ts`.

---

## Decoupling interface implement (with service layer)

Create a file to implement different interfaces `services/auth-service/src/types/auth.ts`

```ts
export interface RegisterInput {
  email: string;
  password: string;
  displayName: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface UserData {
  id: string;
  email: string;
  displayName: string;
  createdAt: string;
}

export interface AuthToken {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse extends AuthToken {
  user: UserData;
}
```

Now add a plugin to manage hashing

```sh
bun add bcrypt jsonwebtoken --cwd services/auth-service
bun add -d @types/jsonwebtoken @types/bcrypt --cwd services/auth-service
```

Then complete the .env constant for JWT management `services/auth-service/.env`:

```
// ...

JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=30m
JWT_REFRESH_SECRET=your_jwt_refresh_secret_key
JWT_REFRESH_EXPIRES_IN=30d
```

> Now you can de-comment JWT part in `services/auth-service/src/config/env.ts`

And add another file in the utils: `services/auth-service/src/utils/token.ts`

```ts
import bcrypt from "bcrypt";
import jwt, { type Secret, type SignOptions } from "jsonwebtoken";
import { env } from "@/config/env";

const ACCESS_TOKEN: Secret = env.JWT_SECRET;
const REFRESH_TOKEN: Secret = env.JWT_REFRESH_SECRET;
const ACCESS_OPTIONS: SignOptions = {
  expiresIn: env.JWT_EXPIRES_IN as SignOptions["expiresIn"],
};
const REFRESH_OPTIONS: SignOptions = {
  expiresIn: env.JWT_REFRESH_EXPIRES_IN as SignOptions["expiresIn"],
};

export const hashPassword = async (password: string): Promise<string> => {
  const saltRounds = 12;
  return bcrypt.hash(password, saltRounds);
};

export const verifyPassword = async (
  password: string,
  hash: string
): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};

export interface AccessTokenPayload {
  sub: string; // userId
  email: string;
}

export interface RefreshTokenPayload {
  sub: string; // userId
  tokenId: string;
}

export const signAccessToken = (payload: AccessTokenPayload): string => {
  return jwt.sign(payload, ACCESS_TOKEN, ACCESS_OPTIONS);
};

export const signRefreshToken = (payload: RefreshTokenPayload): string => {
  return jwt.sign(payload, REFRESH_TOKEN, REFRESH_OPTIONS);
};

export const verifyRefreshToken = (payload: string): RefreshTokenPayload => {
  return jwt.verify(payload, REFRESH_TOKEN) as RefreshTokenPayload;
};
```

Then implement services manager in `services/auth-service/src/services/auth.service.ts`

```ts
import { sequelize } from "@/db/sequelize";
import { RefreshToken, UserCredentials } from "@/models";
import type { AuthResponse, RegisterInput } from "@/types/auth";
import { hashPassword, signAccessToken, signRefreshToken } from "@/utils/token";
import { HttpError } from "@chatapp/common";
import { Op, Transaction } from "sequelize";
import crypto from "crypto";

const REFRESH_TOKEN_TL_DAYS = 30;

export const register = async (input: RegisterInput): Promise<AuthResponse> => {
  const existing = await UserCredentials.findOne({
    where: { email: { [Op.eq]: input.email } },
  });

  if (existing) {
    throw new HttpError(400, "User with this email already exists");
  }

  const transaction = await sequelize.transaction();

  try {
    const passwordHash = await hashPassword(input.password);
    const user = await UserCredentials.create(
      {
        email: input.email,
        displayName: input.displayName,
        passwordHash,
      },
      { transaction }
    );

    const refreshTokenRecord = await createRefreshToken(user.id, transaction);
    await transaction.commit();

    const accessToken = signAccessToken({ sub: user.id, email: user.email });
    const refreshToken = signRefreshToken({
      sub: user.id,
      tokenId: refreshTokenRecord.tokenId,
    });

    const userData = {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      createdAt: user.createdAt.toISOString(),
    };

    // TODO: publish event UserRegistered

    return { accessToken, refreshToken, user: userData };
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

const createRefreshToken = async (
  userId: string,
  transaction?: Transaction
) => {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_TL_DAYS);

  const tokenId = crypto.randomUUID();

  const record = await RefreshToken.create(
    {
      userId,
      tokenId,

      expiresAt,
    },
    { transaction }
  );
  return record;
};
```

## Controller Handler

Before go further with controller handler, we need to manage error for **async-handler**.  
Add new file in `package/common/src/http/async-handler.ts`.

```ts
import type { NextFunction, RequestHandler, Request, Response } from "express";

export type AsyncHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<unknown>;

const toError = (error: unknown): Error => {
  return error instanceof Error ? error : new Error(String(error));
};

const forwardError = (nextFn: ErrorForwarder, error: Error) => {
  nextFn(toError(error));
};

type ErrorForwarder = (error: Error) => void;

export const asyncHandler = (handler: AsyncHandler): RequestHandler => {
  return (req, res, next) => {
    void handler(req, res, next).catch((error) => {
      forwardError(next as ErrorForwarder, error);
    });
  };
};
```

And in `packages/common/src/index.ts` add the exportation for async-errors

```ts
// [...]
export * from "./http/async-handler";
export * from "./http/validate-request";
// [...]
```

After add a controller for authentications services in `services/auth-service/src/controllers/auth.controller.ts` :

```ts
import { register } from "@/services/auth.service";
import type { RegisterInput } from "@/types/auth";
import { asyncHandler } from "@chatapp/common";
import type { RequestHandler } from "express";

export const requestHandler: RequestHandler = asyncHandler(async (req, res) => {
  const payload = req.body as RegisterInput;
  const tokens = await register(payload);
  res.status(201).json(tokens);
});
```

---

## Implement routes

Implement now the routes adding a file in `services/auth-service/src/routes/auth.routes.ts` with this code:

```ts
import { Router } from "express";
import { validateRequest } from "@chatapp/common";
import { registerHandler } from "@/controllers/auth.controller";
// import { registerSchema } from "@/routes/auth.schema";

export const authRouter: Router = Router();

authRouter.post(
  "/register",
  validateRequest({
    /* body: registerSchema.shape.body */
  }),
  registerHandler
);
// de-comment body part only after adding auth.schema file
```

In `services/auth-services/src/app.ts` de-comment **registerRoutes** part.

After add new file in `services/auth-service/src/routes/index.ts` :

```ts
import { authRouter } from "@/routes/auth.routes";
import type { Router } from "express";

export const registerRoutes = (app: Router) => {
  app.use("/auth", authRouter);
};
```

Before test and compile demo we must to create a temp JWT:

- Open following website https://key-generator.com/random-jwt-secret-key-generator
- Then select 32 chars (128 bits)
- Copy generated key
- Replace **your_jwt_secret_key** in `service/auth-service/.env` as **JWT_SECRET** value

> Make now the same procedure to create a temp **JWT_REFRESH_SECRET**

Now test again auth-service by typing this bash command

```sh
docker-compose up -d auth-db
bun --cwd services\auth-service dev
```

If run go further and add new fil in `service/auth-service/src/routes/auth.schema.ts`

```ts
import { z } from "@chatapp/common";

export const registerSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(8),
    displayName: z.string().min(3).max(30),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(8),
  }),
});

export const refreshSchema = z.object({
  body: z.object({
    refreshToken: z.string(),
  }),
});

export const revokeSchema = z.object({
  body: z.object({
    userId: z.string().uuid(),
  }),
});
```

Now you can de-comment **registerSchema** part `services/auth-service/src/routes/auth.routes.ts`.

---

## TEST API

Now to test db API you can add a new connection to mysql DB with the same credentials from **AUTH_DB_URL** value (in .env file).

To do this connection you can open mysql container from Docker , select tab EXEC and type this string

```sh
mysql -u chatapp_auth_user -pchatapp_auth_password chatapp_auth_service
```

Then can test register api by open Postman and adding following parameters:

- Verb : POST
- Url : http://localhost:4003/auth/register
- headers: content-type application-json
- Body-Raw

```json
{
  "email": "testuser@example.com",
  "displayName": "Test User",
  "password": "Qwerty123"
}
```

Then click "SEND" to get json response like this:

```json
{
  "accessToken": "eyJh*********.*******",
  "refreshToken": "eyJ*********.*******",
  "user": {
    "id": "d438****-****-****-****-************",
    "email": "testuser@example.com",
    "displayName": "Test User",
    "createdAt": "2026-01-05T16:42:33.439Z"
  }
}
```
