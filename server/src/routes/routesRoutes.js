import { Router } from "express";
import { computeRoute } from "../controllers/routesComputeController.js";

const router = Router();

router.post("/compute", computeRoute);

export default router;
