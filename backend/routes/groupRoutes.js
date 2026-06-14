import express from "express";
import auth from "../middleware/auth.js";
import {
    createGroup,
    getUserGroups,
    getGroupById,
    getGroupMembers,
    addMember,
    removeMember,
} from "../controllers/groupController.js";

import { getGroupExpenses } from "../controllers/expenseController.js";

const router = express.Router();

// All group routes are protected by auth middleware
router.use(auth);

// POST   /api/groups
router.post("/", createGroup);

// GET    /api/groups
router.get("/", getUserGroups);

// GET    /api/groups/:groupId
router.get("/:groupId", getGroupById);

// POST   /api/groups/:groupId/members
router.post("/:groupId/members", addMember);

// GET    /api/groups/:groupId/members
router.get("/:groupId/members", getGroupMembers);

// DELETE /api/groups/:groupId/members/:userId
router.delete("/:groupId/members/:userId", removeMember);

// GET    /api/groups/:groupId/expenses
router.get("/:groupId/expenses", getGroupExpenses);

export default router;
