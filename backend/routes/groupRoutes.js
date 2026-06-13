import express from "express";
import { requireAuth } from "@clerk/express";

const router = express.Router();

router.get("/", requireAuth(), (req, res) => {
  res.json({
    message: "Groups fetched successfully",
  });
});

export default router;