import { Router } from "express";
import { requireFirebaseAuth } from "../middleware/requireFirebaseAuth.js";
import { computeRoute } from "../controllers/routesComputeController.js";

const router = Router();

router.post("/compute", requireFirebaseAuth, computeRoute);

export default router;
