import { MongoClient, Db, ServerApiVersion } from 'mongodb';
import { UserDoc, TuitionDoc, ApplicationDoc, PaymentDoc } from '../types/index.js';

const uri = process.env.MONGODB_URI;
if (!uri) {
  throw new Error('MONGODB_URI is missing in .env file');
}

export const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

let dbInstance: Db | null = null;

export async function connectDB(): Promise<Db> {
  if (dbInstance) return dbInstance;
  await client.connect();
  dbInstance = client.db('mentorlagbe');
  console.log('Connected to MongoDB (mentorlagbe)');
  return dbInstance;
}

export function getDB(): Db {
  if (!dbInstance) {
    throw new Error('Database not initialized. Call connectDB() first.');
  }
  return dbInstance;
}

export const collections = {
  users: () => getDB().collection<UserDoc>('users'),
  tuitions: () => getDB().collection<TuitionDoc>('tuitions'),
  applications: () => getDB().collection<ApplicationDoc>('applications'),
  payments: () => getDB().collection<PaymentDoc>('payments'),
};