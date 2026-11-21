import { Router, Request, Response } from 'express';
import { Filter, ObjectId } from 'mongodb';
import { collections } from '../config/db.js';
import {
  AuthRequest,
  verifyToken,
  verifyTutor,
} from '../middlewares/auth.middleware.js';
import { TuitionDoc } from '../types/index.js';

const router = Router();

// ১. GET /api/tuitions/featured — হোম পেজের জন্য সর্বশেষ ৬টি Approved ও Active টিউশন
router.get('/featured', async (_req: Request, res: Response) => {
  try {
    const tuitions = await collections
      .tuitions()
      .find({ approvalStatus: 'approved', isActive: true })
      .sort({ createdAt: -1 })
      .limit(6)
      .toArray();

    res.json({ success: true, data: tuitions });
  } catch (error) {
    console.error('Error fetching featured tuitions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch featured tuitions',
    });
  }
});

// ২. GET /api/tuitions/tutor/my-tuitions — লগইন করা Tutor-এর সব টিউশন
router.get(
  '/tutor/my-tuitions',
  verifyToken,
  verifyTutor,
  async (req: AuthRequest, res: Response) => {
    try {
      const tuitions = await collections
        .tuitions()
        .find({ tutorEmail: req.user!.email })
        .sort({ createdAt: -1 })
        .toArray();

      res.json({ success: true, data: tuitions });
    } catch (error) {
      console.error('Error fetching tutor tuitions:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch your tuitions',
      });
    }
  }
);

// ৩. GET /api/tuitions — Challenge 1 (Search & Filter) + Optional 1 (Pagination)
router.get('/', async (req: Request, res: Response) => {
  try {
    const search = (req.query.search as string)?.trim() || '';
    const subject = (req.query.subject as string)?.trim() || '';
    const classLevel = (req.query.classLevel as string)?.trim() || '';
    const mode = (req.query.mode as string)?.trim() || '';
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.max(1, parseInt(req.query.limit as string, 10) || 9);
    const skip = (page - 1) * limit;

    const filter: Filter<TuitionDoc> = {
      approvalStatus: 'approved',
      isActive: true,
    };

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { subject: { $regex: search, $options: 'i' } },
        { tutorName: { $regex: search, $options: 'i' } },
      ];
    }

    if (subject && subject !== 'all') {
      filter.subject = { $regex: `^${subject}$`, $options: 'i' };
    }

    if (classLevel && classLevel !== 'all') {
      filter.classLevel = { $regex: `^${classLevel}$`, $options: 'i' };
    }

    if (mode === 'Online' || mode === 'Offline') {
      filter.mode = mode;
    }

    const [tuitions, total] = await Promise.all([
      collections
        .tuitions()
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
      collections.tuitions().countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: tuitions,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (error) {
    console.error('Error browsing tuitions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch tuitions',
    });
  }
});

// ৪. GET /api/tuitions/:id — সিঙ্গেল টিউশন ডিটেইলস + টিউটরের প্রোফাইল সামারি
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    if (!ObjectId.isValid(id)) {
      res.status(400).json({ success: false, message: 'Invalid tuition ID' });
      return;
    }

    const tuition = await collections
      .tuitions()
      .findOne({ _id: new ObjectId(id) });

    if (!tuition) {
      res.status(404).json({ success: false, message: 'Tuition not found' });
      return;
    }

    const tutorProfile = await collections.users().findOne(
      { email: tuition.tutorEmail },
      {
        projection: {
          name: 1,
          email: 1,
          image: 1,
          bio: 1,
          plan: 1,
        },
      }
    );

    res.json({
      success: true,
      data: {
        ...tuition,
        tutorProfile: tutorProfile || null,
      },
    });
  } catch (error) {
    console.error('Error fetching tuition details:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch tuition details',
    });
  }
});

// ৫. POST /api/tuitions — নতুন টিউশন পোস্ট (Free প্ল্যানে সর্বোচ্চ ২টি)
router.post(
  '/',
  verifyToken,
  verifyTutor,
  async (req: AuthRequest, res: Response) => {
    try {
      const {
        title,
        subject,
        classLevel,
        mode,
        location,
        monthlyFee,
        daysPerWeek,
        scheduleSlots,
        bannerImage,
        description,
      } = req.body;

      if (
        !title ||
        !subject ||
        !classLevel ||
        !mode ||
        !location ||
        monthlyFee === undefined ||
        daysPerWeek === undefined ||
        !bannerImage ||
        !description
      ) {
        res.status(400).json({
          success: false,
          message: 'All tuition fields are required',
        });
        return;
      }

      if (req.user!.plan === 'free') {
        const existingCount = await collections
          .tuitions()
          .countDocuments({ tutorEmail: req.user!.email });

        if (existingCount >= 2) {
          res.status(403).json({
            success: false,
            message:
              'Free Plan tutors can post up to 2 tuitions. Upgrade to Pro for unlimited posts!',
          });
          return;
        }
      }

      const cleanSlots = Array.isArray(scheduleSlots)
        ? scheduleSlots.map((s) => String(s).trim()).filter(Boolean)
        : ['Flexible / Discuss with Tutor'];

      const newTuition: TuitionDoc = {
        title: String(title).trim(),
        subject: String(subject).trim(),
        classLevel: String(classLevel).trim(),
        mode: mode === 'Offline' ? 'Offline' : 'Online',
        location: String(location).trim(),
        monthlyFee: Number(monthlyFee),
        daysPerWeek: Number(daysPerWeek),
        scheduleSlots: cleanSlots.length
          ? cleanSlots
          : ['Flexible / Discuss with Tutor'],
        bannerImage: String(bannerImage).trim(),
        description: String(description).trim(),
        tutorName: req.user!.name,
        tutorEmail: req.user!.email,
        approvalStatus: 'pending',
        isActive: true,
        createdAt: new Date(),
      };

      const result = await collections.tuitions().insertOne(newTuition);
      res.status(201).json({
        success: true,
        message: 'Tuition posted successfully and pending admin approval',
        data: { ...newTuition, _id: result.insertedId },
      });
    } catch (error) {
      console.error('Error creating tuition:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create tuition',
      });
    }
  }
);

// ৬. PATCH /api/tuitions/:id — নিজের টিউশন এডিট/আপডেট করা
router.patch(
  '/:id',
  verifyToken,
  verifyTutor,
  async (req: AuthRequest, res: Response) => {
    try {
      const id = req.params.id as string;
      if (!ObjectId.isValid(id)) {
        res.status(400).json({ success: false, message: 'Invalid tuition ID' });
        return;
      }

      const existing = await collections
        .tuitions()
        .findOne({ _id: new ObjectId(id) });

      if (!existing) {
        res.status(404).json({ success: false, message: 'Tuition not found' });
        return;
      }

      if (existing.tutorEmail !== req.user!.email) {
        res.status(403).json({
          success: false,
          message: 'Forbidden: You can only update your own tuitions',
        });
        return;
      }

      const {
        title,
        subject,
        classLevel,
        mode,
        location,
        monthlyFee,
        daysPerWeek,
        scheduleSlots,
        bannerImage,
        description,
        isActive,
      } = req.body;

      const updateFields: Partial<TuitionDoc> = {};
      if (title !== undefined) updateFields.title = String(title).trim();
      if (subject !== undefined) updateFields.subject = String(subject).trim();
      if (classLevel !== undefined)
        updateFields.classLevel = String(classLevel).trim();
      if (mode === 'Online' || mode === 'Offline') updateFields.mode = mode;
      if (location !== undefined)
        updateFields.location = String(location).trim();
      if (monthlyFee !== undefined)
        updateFields.monthlyFee = Number(monthlyFee);
      if (daysPerWeek !== undefined)
        updateFields.daysPerWeek = Number(daysPerWeek);
      if (Array.isArray(scheduleSlots)) {
        updateFields.scheduleSlots = scheduleSlots
          .map((s) => String(s).trim())
          .filter(Boolean);
      }
      if (bannerImage !== undefined)
        updateFields.bannerImage = String(bannerImage).trim();
      if (description !== undefined)
        updateFields.description = String(description).trim();
      if (typeof isActive === 'boolean') updateFields.isActive = isActive;

      await collections
        .tuitions()
        .updateOne({ _id: new ObjectId(id) }, { $set: updateFields });

      res.json({
        success: true,
        message: 'Tuition updated successfully',
      });
    } catch (error) {
      console.error('Error updating tuition:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update tuition',
      });
    }
  }
);

// ৭. PATCH /api/tuitions/:id/toggle-status — Active / Closed স্ট্যাটাস টগল
router.patch(
  '/:id/toggle-status',
  verifyToken,
  verifyTutor,
  async (req: AuthRequest, res: Response) => {
    try {
      const id = req.params.id as string;
      if (!ObjectId.isValid(id)) {
        res.status(400).json({ success: false, message: 'Invalid tuition ID' });
        return;
      }

      const existing = await collections
        .tuitions()
        .findOne({ _id: new ObjectId(id) });

      if (!existing) {
        res.status(404).json({ success: false, message: 'Tuition not found' });
        return;
      }

      if (existing.tutorEmail !== req.user!.email) {
        res.status(403).json({
          success: false,
          message: 'Forbidden: You can only modify your own tuitions',
        });
        return;
      }

      const newStatus = !existing.isActive;
      await collections
        .tuitions()
        .updateOne({ _id: new ObjectId(id) }, { $set: { isActive: newStatus } });

      res.json({
        success: true,
        message: `Tuition is now ${newStatus ? 'Active' : 'Closed'}`,
        isActive: newStatus,
      });
    } catch (error) {
      console.error('Error toggling tuition status:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to toggle tuition status',
      });
    }
  }
);

// ৮. DELETE /api/tuitions/:id — নিজের টিউশন ডিলিট করা
router.delete(
  '/:id',
  verifyToken,
  verifyTutor,
  async (req: AuthRequest, res: Response) => {
    try {
      const id = req.params.id as string;
      if (!ObjectId.isValid(id)) {
        res.status(400).json({ success: false, message: 'Invalid tuition ID' });
        return;
      }

      const existing = await collections
        .tuitions()
        .findOne({ _id: new ObjectId(id) });

      if (!existing) {
        res.status(404).json({ success: false, message: 'Tuition not found' });
        return;
      }

      if (existing.tutorEmail !== req.user!.email) {
        res.status(403).json({
          success: false,
          message: 'Forbidden: You can only delete your own tuitions',
        });
        return;
      }

      await collections.tuitions().deleteOne({ _id: new ObjectId(id) });

      res.json({
        success: true,
        message: 'Tuition deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting tuition:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete tuition',
      });
    }
  }
);

export default router;