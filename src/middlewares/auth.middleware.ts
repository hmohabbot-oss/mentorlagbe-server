import { Request, Response, NextFunction } from 'express';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { collections } from '../config/db.js';
import { UserRole, PlanType } from '../types/index.js';

export interface AuthUserPayload {
  userId: string;
  email: string;
  name: string;
  role: UserRole;
  plan: PlanType;
}

export interface AuthRequest extends Request {
  user?: AuthUserPayload;
}

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET is missing in .env file');
}

export async function verifyToken(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized access: No token provided',
      });
      return;
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET!) as JwtPayload & AuthUserPayload;

    // ডেটাবেস থেকে ইউজারের সর্বশেষ role ও plan যাচাই করা হচ্ছে
    const dbUser = await collections.users().findOne({ email: decoded.email });
    if (!dbUser) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized access: User not found',
      });
      return;
    }

    req.user = {
      userId: dbUser._id.toString(),
      email: dbUser.email,
      name: dbUser.name,
      role: dbUser.role || 'student',
      plan: dbUser.plan || 'free',
    };

    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Unauthorized access: Invalid or expired token',
    });
  }
}

export function verifyStudent(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void {
  if (req.user?.role !== 'student') {
    res.status(403).json({
      success: false,
      message: 'Forbidden access: Student role required',
    });
    return;
  }
  next();
}

export function verifyTutor(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void {
  if (req.user?.role !== 'tutor') {
    res.status(403).json({
      success: false,
      message: 'Forbidden access: Tutor role required',
    });
    return;
  }
  next();
}

export function verifyAdmin(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void {
  if (req.user?.role !== 'admin') {
    res.status(403).json({
      success: false,
      message: 'Forbidden access: Admin role required',
    });
    return;
  }
  next();
}