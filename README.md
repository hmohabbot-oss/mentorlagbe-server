# MentorLagbe — Backend API Server

MentorLagbe is a full-stack role-based Smart Tuition & Mentorship Platform built with Express.js, TypeScript, MongoDB, BetterAuth, JWT, and Stripe.

## Key Features
- **Role-Based Authentication:** BetterAuth (MongoDB Adapter) + custom JWT verification (`verifyToken`, `verifyStudent`, `verifyTutor`, `verifyAdmin`).
- **Tuition Management:** Server-side search, filtering, and pagination (`skip`/`limit`), plus Tutor CRUD with Free plan (max 2 posts) and Pro plan (unlimited posts).
- **Application Workflow:** Student enrollment requests with duplicate prevention, cancellation of pending requests, and Tutor accept/reject controls.
- **Stripe Subscriptions:** Checkout session & webhook integration for Pro Tutor ($15) and Pro Student ($10) upgrades.
- **Admin Moderation:** User role management, tuition approval/rejection, and Stripe transaction tracking.

## Tech Stack & Packages
- `express`, `cors`, `dotenv`, `mongodb`, `better-auth`, `jsonwebtoken`, `stripe`, `typescript`, `tsx`

