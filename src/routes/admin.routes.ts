import { Router, Response } from 'express';
import { ObjectId } from 'mongodb';
import { collections } from '../config/db.js';
import {
  AuthRequest,
  verifyToken,
  verifyAdmin,
} from '../middlewares/auth.middleware.js';

const router = Router();

// সব অ্যাডমিন রাউটের জন্য verifyToken ও verifyAdmin প্রযোজ্য
router.use(verifyToken, verifyAdmin);

// ১. GET /api/admin/users — সব রেজিস্টার্ড ইউজার
router.get('/users', async (_req: AuthRequest, res: Response) => {
  try {
    const users = await collections
      .users()
      .find({})
      .sort({ createdAt: -1 })
      .toArray();

    res.json({ success: true, data: users });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users',
    });
  }
});

// ২. PATCH /api/admin/users/:id/role — ইউজারের রোল পরিবর্তন ('student' | 'tutor' | 'admin')
router.patch('/users/:id/role', async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const { role } = req.body;

    if (!ObjectId.isValid(id)) {
      res.status(400).json({ success: false, message: 'Invalid user ID' });
      return;
    }

    if (role !== 'student' && role !== 'tutor' && role !== 'admin') {
      res.status(400).json({
        success: false,
        message: "Role must be 'student', 'tutor', or 'admin'",
      });
      return;
    }

    const result = await collections
      .users()
      .updateOne({ _id: new ObjectId(id) }, { $set: { role } });

    if (result.matchedCount === 0) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    res.json({
      success: true,
      message: `User role updated to ${role}`,
    });
  } catch (error) {
    console.error('Error updating user role:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update user role',
    });
  }
});

// ৩. GET /api/admin/tuitions — অ্যাপ্রুভালের জন্য সব টিউশন পোস্ট
router.get('/tuitions', async (_req: AuthRequest, res: Response) => {
  try {
    const tuitions = await collections
      .tuitions()
      .find({})
      .sort({ createdAt: -1 })
      .toArray();

    res.json({ success: true, data: tuitions });
  } catch (error) {
    console.error('Error fetching admin tuitions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch tuitions',
    });
  }
});

// ৪. PATCH /api/admin/tuitions/:id/approval — টিউশন Approved বা Rejected করা
router.patch(
  '/tuitions/:id/approval',
  async (req: AuthRequest, res: Response) => {
    try {
      const id = req.params.id as string;
      const { approvalStatus } = req.body;

      if (!ObjectId.isValid(id)) {
        res.status(400).json({ success: false, message: 'Invalid tuition ID' });
        return;
      }

      if (approvalStatus !== 'approved' && approvalStatus !== 'rejected') {
        res.status(400).json({
          success: false,
          message: "approvalStatus must be 'approved' or 'rejected'",
        });
        return;
      }

      const result = await collections
        .tuitions()
        .updateOne({ _id: new ObjectId(id) }, { $set: { approvalStatus } });

      if (result.matchedCount === 0) {
        res.status(404).json({ success: false, message: 'Tuition not found' });
        return;
      }

      res.json({
        success: true,
        message: `Tuition ${approvalStatus} successfully`,
      });
    } catch (error) {
      console.error('Error updating tuition approval:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update tuition approval status',
      });
    }
  }
);

// ৫. GET /api/admin/transactions — সব Stripe পেমেন্ট রেকর্ড
router.get('/transactions', async (_req: AuthRequest, res: Response) => {
  try {
    const transactions = await collections
      .payments()
      .find({})
      .sort({ paidAt: -1 })
      .toArray();

    res.json({ success: true, data: transactions });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch transactions',
    });
  }
});

export default router;