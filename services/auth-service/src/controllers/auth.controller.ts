import { register } from "@/services/auth.service";
import type { RegisterInput } from "@/types/auth";
import { asyncHandler } from "@chatapp/common";
import type { RequestHandler } from "express";

export const registerHandler: RequestHandler = asyncHandler(
  async (req, res) => {
    const payload = req.body as RegisterInput;
    const tokens = await register(payload);
    res.status(201).json(tokens);
  }
);
