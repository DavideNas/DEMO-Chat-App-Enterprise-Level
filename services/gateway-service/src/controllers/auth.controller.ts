import { authProxyService } from "@/services/auth-proxy.service";
import { registerSchema } from "@/validation/auth.schema";
import type { AsyncHandler } from "@chatapp/common";

export const registerUser: AsyncHandler = async (req, res, next) => {
  try {
    const payload = registerSchema.parse(req);
    const response = await authProxyService.register(payload.body);

    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
};
