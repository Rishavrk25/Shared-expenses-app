import express from "express";
import auth from "../middleware/auth.js";
import { getSettlementSuggestions, recordSettlement } from "../controllers/settlementController.js";

const router = express.Router();

// All settlement routes are protected by auth middleware
router.use(auth);

// GET /api/groups/:groupId/settlements/suggestions
router.get("/groups/:groupId/settlements/suggestions", getSettlementSuggestions);

// POST /api/settlements
router.post("/", recordSettlement);

export default router;
