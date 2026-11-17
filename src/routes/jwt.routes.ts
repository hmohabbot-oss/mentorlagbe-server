import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { fromNodeHeaders } from 'better-auth/node';
import { auth } from '../lib/auth.js';
import { collections } from '../config/db.js';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET as string;

// POST /api/jwt — BetterAuth সেশন ভেরিফাই করে JWT টোকেন ইস্যু করে
router.post('/', async (req: Request, res: Response) => {
  try {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });

    if (!session?.user?.email) {
      res.status(401).json({
        success: false,
        message: 'No active session found',
      });
      return;
    }

    const dbUser = await collections.users().findOne({
      email: session.user.email,
    });

    if (!dbUser) {
      res.status(404).json({
        success: false,
        message: 'User record not found',
      });
      return;
    }

    const payload = {
      userId: dbUser._id.toString(),
      email: dbUser.email,
      name: dbUser.name,
      role: dbUser.role || 'student',
      plan: dbUser.plan || 'free',
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      success: true,
      token,
      user: payload,
    });
  } catch (error) {
    console.error('JWT generation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate JWT token',
    });
  }
});

export default router;