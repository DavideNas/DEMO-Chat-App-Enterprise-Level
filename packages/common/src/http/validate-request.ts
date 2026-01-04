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
