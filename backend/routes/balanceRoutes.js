import express from "express";
import auth from "../middleware/auth.js";
import { getGroupBalances, getUserBalanceBreakdown } from "../controllers/balanceController.js";

const router = express.Router();

// All balance routes are protected by auth middleware
router.use(auth);

// GET /api/groups/:groupId/balances
router.get("/:groupId/balances", getGroupBalances);

// GET /api/groups/:groupId/balances/:userId
router.get("/:groupId/balances/:userId", getUserBalanceBreakdown);

export default router;
