import { Router } from "express";
import { verifyToken } from "../../middleware/verifyToken";
import { apiRateLimiter } from "../../middleware/rateLimit";
import { sendSuccess } from "../../utils/response";
import { getAggregatorStatus, runAggregator } from "./aggregator.service";

const router = Router();

router.use(apiRateLimiter);
router.use(verifyToken);

router.post("/run", async (req, res, next) => {
  try {
    if (!req.user?.id) {
      throw new Error("Invalid credentials");
    }

    const result = await runAggregator(req.user.id);
    return sendSuccess(res, result);
  } catch (error) {
    return next(error);
  }
});

router.get("/status", async (req, res, next) => {
  try {
    if (!req.user?.id) {
      throw new Error("Invalid credentials");
    }

    const status = await getAggregatorStatus(req.user.id);
    return sendSuccess(res, status);
  } catch (error) {
    return next(error);
  }
});

export default router;
