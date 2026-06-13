import express from 'express';
import { clerkMiddleware } from "@clerk/express";
import groupRoutes from './routes/groupRoutes.js';
import cors from 'cors';

const app = express();

// Middleware
app.use(express.json());
app.use(cors());
app.use(clerkMiddleware());

// Routes
app.use('/api/groups', groupRoutes);

app.listen(3000, () => {
  console.log('Server is running on port 3000')
})