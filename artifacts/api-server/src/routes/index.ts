import { Router, type IRouter } from "express";
import healthRouter from "./health";
import openaiRouter from "./openai";
import shoppingRouter from "./shopping";
import searchRouter from "./search";
import alertsRouter from "./alerts";
import { authMiddleware } from "../middlewares/auth";

const router: IRouter = Router();

// Public health check route
router.use(healthRouter);

// Secure all other routes with the auth middleware
router.use(authMiddleware);

router.use(openaiRouter);
router.use(shoppingRouter);
router.use(searchRouter);
router.use(alertsRouter);

export default router;
