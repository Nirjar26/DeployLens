import { Router } from "express";
import * as authController from "./auth.controller";
import { verifyToken } from "../../middleware/verifyToken";
import * as githubController from "../github/github.controller";

const router = Router();

router.post("/register", authController.register);
router.post("/login", authController.login);
router.post("/refresh", authController.refresh);
router.post("/logout", authController.logout);
router.get("/me", verifyToken, authController.getMe);
router.get("/github", verifyToken, githubController.startGithubOAuth);
router.get("/github/callback", githubController.githubOAuthCallback);

export default router;
