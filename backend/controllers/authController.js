import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import pool from "../config/db.js";

// POST /api/auth/register
export const register = async (req, res) => {
    try {
        let { name, email, password } = req.body;

        // Validate input
        if (!name || !email || !password) {
            return res.status(400).json({ error: "Name, email, and password are required" });
        }
        
        email = email.toLowerCase();

        // Check if email already exists
        const existingUser = await pool.query(
            "SELECT id FROM users WHERE LOWER(email) = $1",
            [email]
        );

        if (existingUser.rows.length > 0) {
            return res.status(409).json({ error: "Email already registered" });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Store user
        const result = await pool.query(
            "INSERT INTO users(name, email, password) VALUES($1, $2, $3) RETURNING id, name, email, created_at",
            [name, email, hashedPassword]
        );

        res.status(201).json({ message: "User registered successfully" });
    } catch (err) {
        console.error("Register error:", err.message);
        res.status(500).json({ error: "Internal server error" });
    }
};

// POST /api/auth/login
export const login = async (req, res) => {
    try {
        let { email, password } = req.body;

        // Validate input
        if (!email || !password) {
            return res.status(400).json({ error: "Email and password are required" });
        }
        
        email = email.toLowerCase();

        // Find user by email
        const result = await pool.query(
            "SELECT id, name, email, password FROM users WHERE LOWER(email) = $1",
            [email]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ error: "Invalid email or password" });
        }

        const user = result.rows[0];

        // Compare password
        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(401).json({ error: "Invalid email or password" });
        }

        // Generate token
        const token = jwt.sign(
            { userId: user.id },
            process.env.JWT_SECRET,
            { expiresIn: "7d" }
        );

        res.json({ token, user: { id: user.id, name: user.name, email: user.email.toLowerCase() } });
    } catch (err) {
        console.error("Login error:", err.message);
        res.status(500).json({ error: "Internal server error" });
    }
};

// GET /api/auth/me
export const getMe = async (req, res) => {
    try {
        const userId = req.userId;
        const result = await pool.query(
            "SELECT id, name, email, created_at FROM users WHERE id = $1",
            [userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "User not found" });
        }

        const user = result.rows[0];
        user.email = user.email.toLowerCase();
        res.json(user);
    } catch (err) {
        console.error("Get me error:", err.message);
        res.status(500).json({ error: "Internal server error" });
    }
};

// GET /api/auth/users
export const getAllUsers = async (req, res) => {
    try {
        const result = await pool.query(
            "SELECT id, name, email FROM users ORDER BY name"
        );
        const users = result.rows.map(u => ({ ...u, email: u.email.toLowerCase() }));
        res.json(users);
    } catch (err) {
        console.error("Get all users error:", err.message);
        res.status(500).json({ error: "Internal server error" });
    }
};

