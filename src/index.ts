import 'dotenv/config';
import express, { Request, Response } from 'express';
import cors from 'cors';
import { toNodeHandler } from 'better-auth/node';
import { connectDB } from './config/db.js';
import { auth } from './lib/auth.js';
import jwtRoutes from './routes/jwt.routes.js';
import tuitionsRoutes from './routes/tuitions.routes.js';
import applicationsRoutes from './routes/applications.routes.js';
import usersRoutes from './routes/users.routes.js';
import adminRoutes from './routes/admin.routes.js';
import paymentsRoutes, {
  stripeWebhookHandler,
} from './routes/payments.routes.js';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(
  cors({
    origin: [process.env.CLIENT_URL || 'http://localhost:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// BetterAuth ও Stripe Webhook অবশ্যই express.json()-এর আগে থাকতে হবে
app.all('/api/auth/*splat', toNodeHandler(auth));
app.post(
  '/api/payments/webhook',
  express.raw({ type: 'application/json' }),
  stripeWebhookHandler
);

app.use(express.json());

// API Routes
app.use('/api/jwt', jwtRoutes);
app.use('/api/tuitions', tuitionsRoutes);
app.use('/api/applications', applicationsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/payments', paymentsRoutes);

app.get('/', (_req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'MentorLagbe API is running!',
  });
});

async function startServer() {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`Server is running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

export default app;