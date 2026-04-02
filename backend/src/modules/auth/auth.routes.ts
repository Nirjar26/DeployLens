import { Router } from "express";
import * as authController from "./auth.controller";
import { verifyToken } from "../../middleware/verifyToken";
import { authRateLimiter, sensitiveActionRateLimiter } from "../../middleware/rateLimit";
import * as githubController from "../github/github.controller";

const router = Router();
router.use(authRateLimiter);

router.get("/csrf-token", authController.getCsrfToken);
router.post("/register", sensitiveActionRateLimiter, authController.register);
router.post("/login", sensitiveActionRateLimiter, authController.login);
router.post("/refresh", sensitiveActionRateLimiter, authController.refresh);
router.post("/logout", sensitiveActionRateLimiter, authController.logout);
router.get("/me", verifyToken, authController.getMe);
router.get("/github", verifyToken, githubController.startGithubOAuth);
router.get("/github/callback", githubController.githubOAuthCallback);

export default router;
