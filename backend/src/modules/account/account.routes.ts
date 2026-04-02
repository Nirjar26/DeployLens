import { Router } from "express";
import { verifyToken } from "../../middleware/verifyToken";
import { apiRateLimiter, sensitiveActionRateLimiter } from "../../middleware/rateLimit";
import * as accountController from "./account.controller";

const router = Router();

router.use(apiRateLimiter);
router.use(verifyToken);
router.put("/profile", accountController.updateProfile);
router.put("/password", sensitiveActionRateLimiter, accountController.updatePassword);
router.get("/sessions", accountController.getActiveSessions);
router.delete("/sessions/:id", accountController.revokeSession);
router.delete("/", sensitiveActionRateLimiter, accountController.deleteAccount);

export default router;
