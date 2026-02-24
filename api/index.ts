import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Import the router from backend
import interviewRouter from '../backend/src/routes/interview';

const app = express();

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true,
}));
app.use(express.json());

// Routes
app.use('/api/interview', interviewRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'API is running on Vercel' });
});

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error', details: err.message });
});

// Export for Vercel Serverless Functions
export default app;
