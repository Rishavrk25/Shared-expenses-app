import express from "express";
import auth from "../middleware/auth.js";
import { createExpense, getGroupExpenses } from "../controllers/expenseController.js";

const router = express.Router();

// All expense routes are protected by auth middleware
router.use(auth);

// POST /api/expenses
router.post("/", createExpense);

// GET /api/groups/:groupId/expenses (mounted under /api/expenses/groups/:groupId)
router.get("/groups/:groupId", getGroupExpenses);

export default router;
