import express from "express";
import { register, login, getMe, getAllUsers } from "../controllers/authController.js";
import auth from "../middleware/auth.js";

const router = express.Router();

// POST /api/auth/register
router.post("/register", register);

// POST /api/auth/login
router.post("/login", login);

// GET /api/auth/me
router.get("/me", auth, getMe);

// GET /api/auth/users
router.get("/users", auth, getAllUsers);

export default router;
