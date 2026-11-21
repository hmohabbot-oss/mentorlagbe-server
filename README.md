# MentorLagbe — Backend API Server

MentorLagbe is a full-stack, role-based Smart Tuition & Mentorship Platform built with Express.js, TypeScript, MongoDB, BetterAuth, JWT, Stripe, and Nodemailer.

## Live API & Repositories
- **Live API:** https://mentorlagbe-server-gold.vercel.app
- **Live Client:** https://mentorlagbe-client-lilac.vercel.app
- **GitHub (Server):** https://github.com/hmohabbot-oss/mentorlagbe-server
- **GitHub (Client):** https://github.com/hmohabbot-oss/mentorlagbe-client

## Key Features
- **Authentication & Security:** BetterAuth (MongoDB Adapter + Admin Plugin + Google OAuth), Nodemailer password reset emails, and custom JWT middlewares (`verifyToken`, `verifyStudent`, `verifyTutor`, `verifyAdmin`).
- **Tuition & Slot Management:** Server-side search, filtering, and pagination (`skip`/`limit`), plus Tutor CRUD with Free plan (max 2 posts), Pro plan (unlimited posts), and custom schedule slots.
- **Application & Bookmark Workflow:** Student applications with duplicate prevention, pending cancellation, Tutor accept/reject controls, and saved tuition bookmarks.
- **Stripe Subscriptions:** Checkout session, webhook, and session verification for Pro Tutor ($15) and Pro Student ($10) upgrades.
- **Admin Moderation:** User role management, tuition approval/rejection, and Stripe transaction tracking.

## NPM Packages Used
- `express`, `cors`, `dotenv`, `mongodb`, `better-auth`, `jsonwebtoken`, `stripe`, `nodemailer`, `typescript`, `tsx`

## Admin & Demo Credentials (For Quick Testing)
- **Admin:** `admin@mentorlagbe.com` / `Password123!`
- **Tutor:** `fatema@gmail.com` / `P@ss321#`
- **Student:** `alimurtaza@gmail.com` / `P@ss321#`