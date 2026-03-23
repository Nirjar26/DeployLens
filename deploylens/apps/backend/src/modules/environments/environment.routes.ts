import { Router } from "express";
import { verifyToken } from "../../middleware/verifyToken";
import * as environmentController from "./environment.controller";

const router = Router();

router.use(verifyToken);
router.post("/", environmentController.createEnvironment);
router.get("/", environmentController.getEnvironments);
router.put("/:id", environmentController.updateEnvironment);
router.delete("/:id", environmentController.deleteEnvironment);

export default router;
