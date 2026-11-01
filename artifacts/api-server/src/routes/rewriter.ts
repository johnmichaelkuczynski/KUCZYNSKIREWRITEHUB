import { Router, type IRouter } from "express";
import { GetRewriterStatusResponse, RewriteTextBody, RewriteTextResponse } from "@workspace/api-zod";
import { configuration, rewrite, RewriteError } from "../lib/rewriter";

const router: IRouter = Router();
const pending = new Set<string>();

router.get("/rewriter/status", (_req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.json(GetRewriterStatusResponse.parse(configuration()));
});

router.post("/rewriter/rewrite", async (req, res): Promise<void> => {
  res.setHeader("Cache-Control", "no-store");
  const parsed = RewriteTextBody.safeParse(req.body);
  if (!parsed.success || !parsed.data.text.trim()) {
    res.status(400).json({ error: "Enter target text between 1 and 30,000 characters and choose a supported provider." });
    return;
  }
  const client = req.ip ?? "unknown";
  if (pending.has(client) || pending.size >= 4) {
    res.status(503).json({ error: "A rewrite is already running or the service is busy. Please wait before trying again." });
    return;
  }
  pending.add(client);
  try {
    res.json(RewriteTextResponse.parse(await rewrite(parsed.data.text.trim(), parsed.data.provider)));
  } catch (error) {
    const status = error instanceof RewriteError ? error.status : 502;
    req.log.warn({ status }, "Rewrite could not complete");
    res.status(status).json({
      error: error instanceof RewriteError ? error.message : "Rewriting failed. No ungrounded result was generated.",
    });
  } finally {
    pending.delete(client);
  }
});

export default router;
