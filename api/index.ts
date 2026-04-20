import express from 'express';
import cors from 'cors';

// Environment variables are automatically loaded by Vercel
// No need for dotenv in production

// Import the router from local src directory
import interviewRouter from './src/routes/interview';

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
  res.json({
    status: 'ok',
    message: 'API is running on Vercel',
    env: {
      SUPABASE_URL: !!process.env.SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      ANTHROPIC_API_KEY: !!process.env.ANTHROPIC_API_KEY,
      FRONTEND_URL: !!process.env.FRONTEND_URL,
    }
  });
});

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error', details: err.message });
});

// Export for Vercel Serverless Functions
export default app;
