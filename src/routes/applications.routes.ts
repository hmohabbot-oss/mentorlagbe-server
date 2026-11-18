import { Router, Response } from 'express';
import { ObjectId } from 'mongodb';
import { collections } from '../config/db.js';
import {
  AuthRequest,
  verifyToken,
  verifyStudent,
  verifyTutor,
} from '../middlewares/auth.middleware.js';
import { ApplicationDoc } from '../types/index.js';

const router = Router();

// ১. POST /api/applications — শুধু Student আবেদন করতে পারবে (ডুপ্লিকেট আবেদন প্রতিরোধসহ)
router.post(
  '/',
  verifyToken,
  verifyStudent,
  async (req: AuthRequest, res: Response) => {
    try {
      const { tuitionId, studentPhone, preferredSchedule, studentNote } =
        req.body;

      if (!tuitionId || !studentPhone || !preferredSchedule) {
        res.status(400).json({
          success: false,
          message: 'Tuition ID, phone, and preferred schedule are required',
        });
        return;
      }

      if (!ObjectId.isValid(String(tuitionId))) {
        res.status(400).json({ success: false, message: 'Invalid tuition ID' });
        return;
      }

      const tuition = await collections
        .tuitions()
        .findOne({ _id: new ObjectId(String(tuitionId)) });

      if (
        !tuition ||
        tuition.approvalStatus !== 'approved' ||
        !tuition.isActive
      ) {
        res.status(404).json({
          success: false,
          message: 'This tuition is not available for applications',
        });
        return;
      }

      // একই Student একই টিউশনে ডুপ্লিকেট আবেদন করতে পারবে না
      const existingApplication = await collections.applications().findOne({
        tuitionId: String(tuitionId),
        studentEmail: req.user!.email,
      });

      if (existingApplication) {
        res.status(409).json({
          success: false,
          message: 'You have already applied to this tuition',
        });
        return;
      }

      const newApplication: ApplicationDoc = {
        tuitionId: String(tuitionId),
        tuitionTitle: tuition.title,
        subject: tuition.subject,
        monthlyFee: tuition.monthlyFee,
        tutorEmail: tuition.tutorEmail,
        studentName: req.user!.name,
        studentEmail: req.user!.email,
        studentPhone: String(studentPhone).trim(),
        preferredSchedule: String(preferredSchedule).trim(),
        studentNote: String(studentNote || '').trim(),
        status: 'pending',
        appliedAt: new Date(),
      };

      const result = await collections.applications().insertOne(newApplication);

      res.status(201).json({
        success: true,
        message: 'Application submitted successfully',
        data: { ...newApplication, _id: result.insertedId },
      });
    } catch (error) {
      console.error('Error submitting application:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to submit application',
      });
    }
  }
);

// ২. GET /api/applications/my-applications — Student-এর নিজের আবেদন তালিকা
router.get(
  '/my-applications',
  verifyToken,
  verifyStudent,
  async (req: AuthRequest, res: Response) => {
    try {
      const applications = await collections
        .applications()
        .find({ studentEmail: req.user!.email })
        .sort({ appliedAt: -1 })
        .toArray();

      // প্রতিটি আবেদনের সাথে Tutor-এর নাম যুক্ত করা হচ্ছে
      const tutorEmails = [...new Set(applications.map((a) => a.tutorEmail))];
      const tutors = tutorEmails.length
        ? await collections
            .users()
            .find(
              { email: { $in: tutorEmails } },
              { projection: { email: 1, name: 1 } }
            )
            .toArray()
        : [];

      const tutorNameMap = new Map(tutors.map((t) => [t.email, t.name]));

      const enriched = applications.map((app) => ({
        ...app,
        tutorName: tutorNameMap.get(app.tutorEmail) || 'Tutor',
      }));

      res.json({ success: true, data: enriched });
    } catch (error) {
      console.error('Error fetching student applications:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch your applications',
      });
    }
  }
);

// ৩. DELETE /api/applications/:id — Student শুধু 'pending' আবেদন Cancel/Delete করতে পারবে
router.delete(
  '/:id',
  verifyToken,
  verifyStudent,
  async (req: AuthRequest, res: Response) => {
    try {
      const id = req.params.id as string;
      if (!ObjectId.isValid(id)) {
        res
          .status(400)
          .json({ success: false, message: 'Invalid application ID' });
        return;
      }

      const existing = await collections
        .applications()
        .findOne({ _id: new ObjectId(id) });

      if (!existing) {
        res
          .status(404)
          .json({ success: false, message: 'Application not found' });
        return;
      }

      if (existing.studentEmail !== req.user!.email) {
        res.status(403).json({
          success: false,
          message: 'Forbidden: You can only cancel your own applications',
        });
        return;
      }

      if (existing.status !== 'pending') {
        res.status(400).json({
          success: false,
          message: 'Only pending applications can be cancelled',
        });
        return;
      }

      await collections.applications().deleteOne({ _id: new ObjectId(id) });

      res.json({
        success: true,
        message: 'Application cancelled successfully',
      });
    } catch (error) {
      console.error('Error cancelling application:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to cancel application',
      });
    }
  }
);

// ৪. GET /api/applications/tutor/applicants — Tutor-এর টিউশনে আবেদন করা Student-দের তালিকা
router.get(
  '/tutor/applicants',
  verifyToken,
  verifyTutor,
  async (req: AuthRequest, res: Response) => {
    try {
      const applicants = await collections
        .applications()
        .find({ tutorEmail: req.user!.email })
        .sort({ appliedAt: -1 })
        .toArray();

      res.json({ success: true, data: applicants });
    } catch (error) {
      console.error('Error fetching tutor applicants:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch applicants',
      });
    }
  }
);

// ৫. PATCH /api/applications/:id/status — Tutor আবেদন Accepted বা Rejected করবে
router.patch(
  '/:id/status',
  verifyToken,
  verifyTutor,
  async (req: AuthRequest, res: Response) => {
    try {
      const id = req.params.id as string;
      const { status } = req.body;

      if (!ObjectId.isValid(id)) {
        res
          .status(400)
          .json({ success: false, message: 'Invalid application ID' });
        return;
      }

      if (status !== 'accepted' && status !== 'rejected') {
        res.status(400).json({
          success: false,
          message: "Status must be either 'accepted' or 'rejected'",
        });
        return;
      }

      const existing = await collections
        .applications()
        .findOne({ _id: new ObjectId(id) });

      if (!existing) {
        res
          .status(404)
          .json({ success: false, message: 'Application not found' });
        return;
      }

      if (existing.tutorEmail !== req.user!.email) {
        res.status(403).json({
          success: false,
          message: 'Forbidden: You can only update applicants for your own tuitions',
        });
        return;
      }

      await collections
        .applications()
        .updateOne({ _id: new ObjectId(id) }, { $set: { status } });

      res.json({
        success: true,
        message: `Application ${status} successfully`,
      });
    } catch (error) {
      console.error('Error updating application status:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update application status',
      });
    }
  }
);

export default router;