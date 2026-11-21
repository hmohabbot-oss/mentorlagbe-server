import { betterAuth } from 'better-auth';
import { mongodbAdapter } from 'better-auth/adapters/mongodb';
import { admin } from 'better-auth/plugins';
import nodemailer from 'nodemailer';
import { connectDB } from '../config/db.js';

const db = await connectDB();
const isProd = process.env.NODE_ENV === 'production';

const trustedOrigins = [
  'http://localhost:3000',
  process.env.CLIENT_URL || '',
].filter(Boolean);

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export const auth = betterAuth({
  database: mongodbAdapter(db),
  baseURL: process.env.BETTER_AUTH_URL || 'http://localhost:5000',
  secret: process.env.BETTER_AUTH_SECRET,
  trustedOrigins,
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 6,
    async sendResetPassword({ user, token }) {
      const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
      const resetLink = `${clientUrl}/reset-password?token=${token}`;

      await transporter.sendMail({
        from: `"MentorLagbe Support" <${process.env.EMAIL_USER}>`,
        to: user.email,
        subject: 'Reset Your MentorLagbe Password',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px;">
            <h2 style="color: #041E42; margin-bottom: 12px;">Password Reset Request</h2>
            <p style="color: #334155; font-size: 14px; line-height: 1.6;">
              Hi ${user.name || 'there'},<br/>
              We received a request to reset your MentorLagbe account password. Click the button below to set a new password:
            </p>
            <div style="margin: 24px 0; text-align: center;">
              <a href="${resetLink}" style="background-color: #FF6B00; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">
                Reset Password
              </a>
            </div>
            <p style="color: #64748b; font-size: 12px;">
              If you didn't request this, you can safely ignore this email.
            </p>
          </div>
        `,
      });
    },
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      redirectURI: `${process.env.CLIENT_URL || 'http://localhost:3000'}/api/auth/callback/google`,
    },
  },
  user: {
    modelName: 'users',
    additionalFields: {
      role: {
        type: 'string',
        required: false,
        defaultValue: 'student',
        input: true,
      },
      selectedRole: {
        type: 'string',
        required: false,
        defaultValue: 'student',
        input: true,
      },
      phone: {
        type: 'string',
        required: false,
        defaultValue: '',
        input: true,
      },
      bio: {
        type: 'string',
        required: false,
        defaultValue: '',
        input: true,
      },
      plan: {
        type: 'string',
        required: false,
        defaultValue: 'free',
        input: false,
      },
    },
  },
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          const chosen = (user as Record<string, unknown>).selectedRole;
          const allowedRole = chosen === 'tutor' ? 'tutor' : 'student';
          return {
            data: {
              ...user,
              role: allowedRole,
              plan: 'free',
            },
          };
        },
      },
    },
  },
  advanced: {
    defaultCookieAttributes: {
      sameSite: isProd ? 'none' : 'lax',
      secure: isProd,
    },
  },
  plugins: [admin()],
});