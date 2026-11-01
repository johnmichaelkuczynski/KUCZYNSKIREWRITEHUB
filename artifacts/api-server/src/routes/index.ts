import { Router, type IRouter } from "express";
import healthRouter from "./health";
import rewriterRouter from "./rewriter";

const router: IRouter = Router();

router.use(healthRouter);
router.use(rewriterRouter);

export default router;
