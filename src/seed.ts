import 'dotenv/config';
import { connectDB, collections, client } from './config/db.js';
import { auth } from './lib/auth.js';
import { TuitionDoc, ApplicationDoc, UserRole, PlanType } from './types/index.js';

interface SeedUserInput {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  plan: PlanType;
  phone: string;
  bio: string;
  image: string;
}

const seedUsers: SeedUserInput[] = [
  {
    name: 'MentorLagbe Admin',
    email: 'admin@mentorlagbe.com',
    password: 'Password123!',
    role: 'admin',
    plan: 'pro',
    phone: '+8801700000001',
    bio: 'Platform Administrator for MentorLagbe EdTech Ecosystem.',
    image: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400',
  },
  {
    name: 'Dr. Rafiqul Islam',
    email: 'tutor@mentorlagbe.com',
    password: 'Password123!',
    role: 'tutor',
    plan: 'pro',
    phone: '+8801711111111',
    bio: 'Senior Physics & Mathematics Mentor with 8+ years of HSC and University admission coaching experience.',
    image: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400',
  },
  {
    name: 'Nusrat Jahan',
    email: 'nusrat.tutor@mentorlagbe.com',
    password: 'Password123!',
    role: 'tutor',
    plan: 'pro',
    phone: '+8801722222222',
    bio: 'IELTS Band 8.5 Instructor & Full-Stack Web Development Mentor.',
    image: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400',
  },
  {
    name: 'Tanvir Ahmed',
    email: 'tanvir.tutor@mentorlagbe.com',
    password: 'Password123!',
    role: 'tutor',
    plan: 'free',
    phone: '+8801733333333',
    bio: 'BUET CSE Graduate specializing in O/A Level Math, ICT, and Competitive Programming.',
    image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400',
  },
  {
    name: 'Ayman Karim',
    email: 'student@mentorlagbe.com',
    password: 'Password123!',
    role: 'student',
    plan: 'free',
    phone: '+8801811111111',
    bio: 'HSC Science candidate preparing for Engineering Admission.',
    image: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400',
  },
  {
    name: 'Maliha Rahman',
    email: 'maliha.student@mentorlagbe.com',
    password: 'Password123!',
    role: 'student',
    plan: 'pro',
    phone: '+8801822222222',
    bio: 'Undergraduate student preparing for IELTS and Full-Stack Development.',
    image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400',
  },
];

async function ensureUser(u: SeedUserInput) {
  const existing = await collections.users().findOne({ email: u.email });
  if (!existing) {
    await auth.api.signUpEmail({
      body: {
        name: u.name,
        email: u.email,
        password: u.password,
      },
    });
  }

  await collections.users().updateOne(
    { email: u.email },
    {
      $set: {
        name: u.name,
        role: u.role,
        plan: u.plan,
        phone: u.phone,
        bio: u.bio,
        image: u.image,
      },
    }
  );
}

const seedTuitions: Omit<TuitionDoc, '_id'>[] = [
  {
    title: 'HSC Higher Math Mastery Batch (1st & 2nd Paper)',
    subject: 'Mathematics',
    classLevel: 'HSC / Class 11-12',
    mode: 'Online',
    location: 'Zoom & Interactive Whiteboard (Nationwide)',
    monthlyFee: 2500,
    daysPerWeek: 3,
    bannerImage: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=800',
    description: 'Complete HSC Higher Mathematics syllabus coverage with weekly problem-solving sheets, CQ/MCQ mock tests, and university admission foundation.',
    tutorName: 'Dr. Rafiqul Islam',
    tutorEmail: 'tutor@mentorlagbe.com',
    approvalStatus: 'approved',
    isActive: true,
    createdAt: new Date(Date.now() - 12 * 86400000),
  },
  {
    title: 'HSC Physics Concept & Numerical Problem Solving',
    subject: 'Physics',
    classLevel: 'HSC / Class 11-12',
    mode: 'Offline',
    location: 'Dhanmondi, Dhaka',
    monthlyFee: 3500,
    daysPerWeek: 3,
    bannerImage: 'https://images.unsplash.com/photo-1636466497217-26a8cbeaf0aa?w=800',
    description: 'Deep conceptual clarity in Mechanics, Optics, Electromagnetism, and Modern Physics with board + BUET pattern math practice.',
    tutorName: 'Dr. Rafiqul Islam',
    tutorEmail: 'tutor@mentorlagbe.com',
    approvalStatus: 'approved',
    isActive: true,
    createdAt: new Date(Date.now() - 11 * 86400000),
  },
  {
    title: 'IELTS Band 7.5+ Intensive Mentorship (4 Modules)',
    subject: 'IELTS',
    classLevel: 'University / Job Seeker',
    mode: 'Online',
    location: 'Google Meet (Live 1-on-1 & Small Group)',
    monthlyFee: 4500,
    daysPerWeek: 4,
    bannerImage: 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=800',
    description: 'Targeted Speaking mock interviews, Writing Task 1 & 2 line-by-line feedback, and proven Reading/Listening time-management strategies.',
    tutorName: 'Nusrat Jahan',
    tutorEmail: 'nusrat.tutor@mentorlagbe.com',
    approvalStatus: 'approved',
    isActive: true,
    createdAt: new Date(Date.now() - 10 * 86400000),
  },
  {
    title: 'Full-Stack Web Development with Next.js & TypeScript',
    subject: 'Programming',
    classLevel: 'University / Beginner to Pro',
    mode: 'Online',
    location: 'Discord & Live Coding Sessions',
    monthlyFee: 5000,
    daysPerWeek: 3,
    bannerImage: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800',
    description: 'Build production-ready full-stack apps using Next.js App Router, TypeScript, Express, MongoDB, and Stripe with weekly code reviews.',
    tutorName: 'Nusrat Jahan',
    tutorEmail: 'nusrat.tutor@mentorlagbe.com',
    approvalStatus: 'approved',
    isActive: true,
    createdAt: new Date(Date.now() - 9 * 86400000),
  },
  {
    title: 'O-Level Additional Mathematics & Mechanics',
    subject: 'Mathematics',
    classLevel: 'O-Level / Class 9-10',
    mode: 'Offline',
    location: 'Uttara Sector 7, Dhaka',
    monthlyFee: 4000,
    daysPerWeek: 3,
    bannerImage: 'https://images.unsplash.com/photo-1509228468518-180dd4864904?w=800',
    description: 'Cambridge CAIE 4037 past-paper intensive coaching with step-by-step calculus, trigonometry, and coordinate geometry drills.',
    tutorName: 'Tanvir Ahmed',
    tutorEmail: 'tanvir.tutor@mentorlagbe.com',
    approvalStatus: 'approved',
    isActive: true,
    createdAt: new Date(Date.now() - 8 * 86400000),
  },
  {
    title: 'Python Programming & Data Structures Foundation',
    subject: 'Programming',
    classLevel: 'SSC / HSC / University',
    mode: 'Online',
    location: 'Zoom Live Interactive Class',
    monthlyFee: 3000,
    daysPerWeek: 2,
    bannerImage: 'https://images.unsplash.com/photo-1526379095098-d400fd0bf935?w=800',
    description: 'Master Python from scratch, OOP, recursion, and fundamental algorithms to kickstart problem solving and competitive coding.',
    tutorName: 'Tanvir Ahmed',
    tutorEmail: 'tanvir.tutor@mentorlagbe.com',
    approvalStatus: 'approved',
    isActive: true,
    createdAt: new Date(Date.now() - 7 * 86400000),
  },
  {
    title: 'SSC General Science & Chemistry Complete Care',
    subject: 'Chemistry',
    classLevel: 'SSC / Class 9-10',
    mode: 'Offline',
    location: 'Padma Residential Area, Rajshahi',
    monthlyFee: 2200,
    daysPerWeek: 4,
    bannerImage: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=800',
    description: 'Strong foundation in Organic Chemistry, Mole Concept, and Chemical Equations tailored for SSC board exam A+ preparation.',
    tutorName: 'Dr. Rafiqul Islam',
    tutorEmail: 'tutor@mentorlagbe.com',
    approvalStatus: 'approved',
    isActive: true,
    createdAt: new Date(Date.now() - 6 * 86400000),
  },
  {
    title: 'Spoken English & Academic Writing Bootcamp',
    subject: 'English',
    classLevel: 'Class 8-12 / University',
    mode: 'Online',
    location: 'Google Meet',
    monthlyFee: 2000,
    daysPerWeek: 3,
    bannerImage: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=800',
    description: 'Build fluency, pronunciation, grammar accuracy, and structured academic essay writing with weekly speaking clubs.',
    tutorName: 'Nusrat Jahan',
    tutorEmail: 'nusrat.tutor@mentorlagbe.com',
    approvalStatus: 'approved',
    isActive: true,
    createdAt: new Date(Date.now() - 5 * 86400000),
  },
  {
    title: 'Medical Admission Biology & Chemistry Intensive',
    subject: 'Biology',
    classLevel: 'Admission / HSC',
    mode: 'Offline',
    location: 'Mirpur 10, Dhaka',
    monthlyFee: 3800,
    daysPerWeek: 4,
    bannerImage: 'https://images.unsplash.com/photo-1576086213369-97a306d36557?w=800',
    description: 'Line-by-line textbook mastery of Zoology, Botany, and Chemistry with daily 100-mark MCQ evaluation tests.',
    tutorName: 'Dr. Rafiqul Islam',
    tutorEmail: 'tutor@mentorlagbe.com',
    approvalStatus: 'approved',
    isActive: true,
    createdAt: new Date(Date.now() - 4 * 86400000),
  },
  {
    title: 'A-Level Physics (9702) Paper 1, 2 & 4 Coaching',
    subject: 'Physics',
    classLevel: 'A-Level',
    mode: 'Online',
    location: 'Zoom & Digital Tablet Notes',
    monthlyFee: 4800,
    daysPerWeek: 3,
    bannerImage: 'https://images.unsplash.com/photo-1518152006812-edab29b069ac?w=800',
    description: 'Comprehensive A-Level Physics tutoring focusing on marking scheme keywords, uncertainty calculations, and past papers.',
    tutorName: 'Dr. Rafiqul Islam',
    tutorEmail: 'tutor@mentorlagbe.com',
    approvalStatus: 'approved',
    isActive: true,
    createdAt: new Date(Date.now() - 3 * 86400000),
  },
  {
    title: 'Class 6-8 Math & ICT Foundation Mentorship',
    subject: 'Mathematics',
    classLevel: 'Class 6-8',
    mode: 'Offline',
    location: 'Nasirabad, Chattogram',
    monthlyFee: 2000,
    daysPerWeek: 3,
    bannerImage: 'https://images.unsplash.com/photo-1596495577886-d920f1fb7238?w=800',
    description: 'Fun and engaging math & logic building for junior high students with monthly parent progress reports.',
    tutorName: 'Nusrat Jahan',
    tutorEmail: 'nusrat.tutor@mentorlagbe.com',
    approvalStatus: 'approved',
    isActive: true,
    createdAt: new Date(Date.now() - 2 * 86400000),
  },
  {
    title: 'HSC Accounting & Finance Problem Solving',
    subject: 'Accounting',
    classLevel: 'HSC / Class 11-12',
    mode: 'Online',
    location: 'Zoom Live Batch',
    monthlyFee: 2400,
    daysPerWeek: 3,
    bannerImage: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=800',
    description: 'Clear explanation of Financial Statements, Bank Reconciliation, and Cost Accounting with board question practice.',
    tutorName: 'Nusrat Jahan',
    tutorEmail: 'nusrat.tutor@mentorlagbe.com',
    approvalStatus: 'approved',
    isActive: true,
    createdAt: new Date(Date.now() - 1 * 86400000),
  },
  {
    title: 'SSC ICT & C Programming Practical Batch',
    subject: 'Programming',
    classLevel: 'HSC / Class 11-12',
    mode: 'Online',
    location: 'Google Meet',
    monthlyFee: 1800,
    daysPerWeek: 2,
    bannerImage: 'https://images.unsplash.com/photo-1515879218367-8466d910aaa4?w=800',
    description: 'HTML, Number Systems, Logic Gates, and C Programming practicals for HSC ICT.',
    tutorName: 'Dr. Rafiqul Islam',
    tutorEmail: 'tutor@mentorlagbe.com',
    approvalStatus: 'pending',
    isActive: true,
    createdAt: new Date(),
  },
];

async function runSeed() {
  try {
    await connectDB();
    console.log('Seeding users...');
    for (const u of seedUsers) {
      await ensureUser(u);
    }

    const existingTuitions = await collections.tuitions().countDocuments({});
    if (existingTuitions === 0) {
      console.log('Seeding 13 tuitions (12 approved + 1 pending)...');
      await collections.tuitions().insertMany(seedTuitions);
    } else {
      console.log(`Tuitions already exist (${existingTuitions}). Skipping tuition seed.`);
    }

    const existingApps = await collections.applications().countDocuments({});
    if (existingApps === 0) {
      const approvedTuitions = await collections
        .tuitions()
        .find({ approvalStatus: 'approved' })
        .limit(3)
        .toArray();

      if (approvedTuitions.length >= 2) {
        const sampleApplications: Omit<ApplicationDoc, '_id'>[] = [
          {
            tuitionId: approvedTuitions[0]._id!.toString(),
            tuitionTitle: approvedTuitions[0].title,
            subject: approvedTuitions[0].subject,
            monthlyFee: approvedTuitions[0].monthlyFee,
            tutorEmail: approvedTuitions[0].tutorEmail,
            studentName: 'Ayman Karim',
            studentEmail: 'student@mentorlagbe.com',
            studentPhone: '+8801811111111',
            preferredSchedule: 'Sun, Tue, Thu - 7:00 PM',
            studentNote: 'Looking forward to joining the HSC Higher Math batch.',
            status: 'pending',
            appliedAt: new Date(),
          },
          {
            tuitionId: approvedTuitions[1]._id!.toString(),
            tuitionTitle: approvedTuitions[1].title,
            subject: approvedTuitions[1].subject,
            monthlyFee: approvedTuitions[1].monthlyFee,
            tutorEmail: approvedTuitions[1].tutorEmail,
            studentName: 'Ayman Karim',
            studentEmail: 'student@mentorlagbe.com',
            studentPhone: '+8801811111111',
            preferredSchedule: 'Sat, Mon, Wed - 5:00 PM',
            studentNote: 'Need extra focus on Mechanics and Optics.',
            status: 'accepted',
            appliedAt: new Date(Date.now() - 86400000),
          },
        ];

        await collections.applications().insertMany(sampleApplications);
        console.log('Seeded sample applications.');
      }
    }

    console.log('Database seeding completed successfully!');
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

runSeed();