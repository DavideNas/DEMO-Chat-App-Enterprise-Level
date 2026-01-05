import { authRouter } from "@/routes/auth.routes";
import type { Router } from "express";

export const registerRoutes = (app: Router) => {
  app.use("/auth", authRouter);
};
