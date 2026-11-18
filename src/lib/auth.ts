import { betterAuth } from 'better-auth';
import { mongodbAdapter } from 'better-auth/adapters/mongodb';
import { admin } from 'better-auth/plugins';
import { connectDB } from '../config/db.js';

const db = await connectDB();
const isProd = process.env.NODE_ENV === 'production';

export const auth = betterAuth({
  database: mongodbAdapter(db),
  baseURL: process.env.BETTER_AUTH_URL || 'http://localhost:5000',
  secret: process.env.BETTER_AUTH_SECRET,
  trustedOrigins: [process.env.CLIENT_URL || 'http://localhost:3000'],
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 6,
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
          const allowedRole = user.role === 'tutor' ? 'tutor' : 'student';
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