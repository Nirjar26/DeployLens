import { Router } from "express";
import { verifyToken } from "../../middleware/verifyToken";
import * as accountController from "./account.controller";

const router = Router();

router.use(verifyToken);
router.put("/profile", accountController.updateProfile);
router.put("/password", accountController.updatePassword);
router.delete("/", accountController.deleteAccount);

export default router;
