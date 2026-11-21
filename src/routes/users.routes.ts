import { Router, Response } from 'express';
import { ObjectId } from 'mongodb';
import { collections } from '../config/db.js';
import { AuthRequest, verifyToken } from '../middlewares/auth.middleware.js';

const router = Router();

// ১. GET /api/users/me — লগইন করা ইউজারের সম্পূর্ণ প্রোফাইল
router.get('/me', verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    const user = await collections
      .users()
      .findOne({ email: req.user!.email });

    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    res.json({ success: true, data: user });
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user profile',
    });
  }
});

// ২. PATCH /api/users/profile — প্রোফাইল আপডেট (Name, Phone, Bio, Image)
router.patch(
  '/profile',
  verifyToken,
  async (req: AuthRequest, res: Response) => {
    try {
      const { name, phone, bio, image } = req.body;

      const updateFields: Record<string, string> = {};
      if (name !== undefined && String(name).trim()) {
        updateFields.name = String(name).trim();
      }
      if (phone !== undefined) {
        updateFields.phone = String(phone).trim();
      }
      if (bio !== undefined) {
        updateFields.bio = String(bio).trim();
      }
      if (image !== undefined) {
        updateFields.image = String(image).trim();
      }

      if (Object.keys(updateFields).length === 0) {
        res.status(400).json({
          success: false,
          message: 'No valid profile fields provided to update',
        });
        return;
      }

      await collections
        .users()
        .updateOne({ email: req.user!.email }, { $set: updateFields });

      const updatedUser = await collections
        .users()
        .findOne({ email: req.user!.email });

      res.json({
        success: true,
        message: 'Profile updated successfully',
        data: updatedUser,
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update profile',
      });
    }
  }
);

// ৩. GET /api/users/saved-tuitions — সেভ করা টিউশনগুলো দেখা
router.get(
  '/saved-tuitions',
  verifyToken,
  async (req: AuthRequest, res: Response) => {
    try {
      const user = await collections
        .users()
        .findOne({ email: req.user!.email });

      const savedIds = (user?.savedTuitions || []).filter((id) =>
        ObjectId.isValid(id)
      );

      if (savedIds.length === 0) {
        res.json({ success: true, data: [] });
        return;
      }

      const tuitions = await collections
        .tuitions()
        .find({
          _id: { $in: savedIds.map((id) => new ObjectId(id)) },
          approvalStatus: 'approved',
          isActive: true,
        })
        .toArray();

      res.json({ success: true, data: tuitions });
    } catch (error) {
      console.error('Error fetching saved tuitions:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch saved tuitions',
      });
    }
  }
);

// ৪. POST /api/users/saved-tuitions/:tuitionId — টিউশন বুকমার্ক Toggle
router.post(
  '/saved-tuitions/:tuitionId',
  verifyToken,
  async (req: AuthRequest, res: Response) => {
    try {
      const tuitionId = req.params.tuitionId as string;
      if (!ObjectId.isValid(tuitionId)) {
        res.status(400).json({ success: false, message: 'Invalid tuition ID' });
        return;
      }

      const user = await collections
        .users()
        .findOne({ email: req.user!.email });

      const currentSaved = user?.savedTuitions || [];
      const alreadySaved = currentSaved.includes(tuitionId);

      const updatedSaved = alreadySaved
        ? currentSaved.filter((id) => id !== tuitionId)
        : [...currentSaved, tuitionId];

      await collections
        .users()
        .updateOne(
          { email: req.user!.email },
          { $set: { savedTuitions: updatedSaved } }
        );

      res.json({
        success: true,
        saved: !alreadySaved,
        savedTuitions: updatedSaved,
        message: alreadySaved
          ? 'Removed from Saved Tuitions'
          : 'Added to Saved Tuitions',
      });
    } catch (error) {
      console.error('Error toggling saved tuition:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update saved tuitions',
      });
    }
  }
);

// ৫. GET /api/users/dashboard-stats — রোল অনুযায়ী ড্যাশবোর্ড স্ট্যাটস কার্ড
router.get(
  '/dashboard-stats',
  verifyToken,
  async (req: AuthRequest, res: Response) => {
    try {
      const { email, role, plan } = req.user!;

      if (role === 'student') {
        const [totalApplied, acceptedCount, pendingCount] = await Promise.all([
          collections.applications().countDocuments({ studentEmail: email }),
          collections
            .applications()
            .countDocuments({ studentEmail: email, status: 'accepted' }),
          collections
            .applications()
            .countDocuments({ studentEmail: email, status: 'pending' }),
        ]);

        res.json({
          success: true,
          data: {
            role,
            plan,
            totalApplied,
            acceptedCount,
            pendingCount,
          },
        });
        return;
      }

      if (role === 'tutor') {
        const [totalPosted, approvedCount, totalApplicants] = await Promise.all([
          collections.tuitions().countDocuments({ tutorEmail: email }),
          collections.tuitions().countDocuments({
            tutorEmail: email,
            approvalStatus: 'approved',
            isActive: true,
          }),
          collections.applications().countDocuments({ tutorEmail: email }),
        ]);

        res.json({
          success: true,
          data: {
            role,
            plan,
            totalPosted,
            approvedCount,
            totalApplicants,
          },
        });
        return;
      }

      if (role === 'admin') {
        const [
          totalUsers,
          totalTutors,
          pendingTuitions,
          approvedTuitions,
          paidPayments,
        ] = await Promise.all([
          collections.users().countDocuments({}),
          collections.users().countDocuments({ role: 'tutor' }),
          collections
            .tuitions()
            .countDocuments({ approvalStatus: 'pending' }),
          collections
            .tuitions()
            .countDocuments({ approvalStatus: 'approved' }),
          collections.payments().find({ paymentStatus: 'paid' }).toArray(),
        ]);

        const totalRevenue = paidPayments.reduce(
          (sum, p) => sum + (p.amount || 0),
          0
        );

        res.json({
          success: true,
          data: {
            role,
            plan,
            totalUsers,
            totalTutors,
            pendingTuitions,
            approvedTuitions,
            totalRevenue,
          },
        });
        return;
      }

      res.status(403).json({ success: false, message: 'Invalid user role' });
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch dashboard statistics',
      });
    }
  }
);

export default router;