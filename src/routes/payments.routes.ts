import { Router, Request, Response } from 'express';
import Stripe from 'stripe';
import { collections } from '../config/db.js';
import { AuthRequest, verifyToken } from '../middlewares/auth.middleware.js';
import { PaymentDoc, UserRole } from '../types/index.js';

const router = Router();

const stripeSecret = process.env.STRIPE_SECRET_KEY;
if (!stripeSecret) {
  throw new Error('STRIPE_SECRET_KEY is missing in .env file');
}

const stripe = new Stripe(stripeSecret);
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';

// ডুপ্লিকেট প্রতিরোধ করে পেমেন্ট সেভ ও ইউজারকে 'pro' করার কমন ফাংশন
async function recordSuccessfulPayment(session: Stripe.Checkout.Session) {
  const existing = await collections
    .payments()
    .findOne({ stripeSessionId: session.id });

  if (existing) {
    // আগে থেকেই রেকর্ড থাকলে শুধু ইউজার প্ল্যান 'pro' নিশ্চিত করে রিটার্ন করবে
    await collections
      .users()
      .updateOne({ email: existing.userEmail }, { $set: { plan: 'pro' } });
    return existing;
  }

  const userEmail = session.metadata?.userEmail || session.customer_email || '';
  const userName = session.metadata?.userName || 'User';
  const userRole = (session.metadata?.userRole as UserRole) || 'student';
  const planName = session.metadata?.planName || 'Pro Plan';
  const transactionId =
    typeof session.payment_intent === 'string'
      ? session.payment_intent
      : session.payment_intent?.id || session.id;

  const paymentRecord: PaymentDoc = {
    userEmail,
    userName,
    userRole,
    planName,
    amount: (session.amount_total || 0) / 100,
    currency: (session.currency || 'usd').toUpperCase(),
    transactionId,
    stripeSessionId: session.id,
    paymentStatus: 'paid',
    paidAt: new Date(),
  };

  await collections.payments().insertOne(paymentRecord);
  await collections
    .users()
    .updateOne({ email: userEmail }, { $set: { plan: 'pro' } });

  return paymentRecord;
}

// ১. POST /api/payments/create-checkout-session — Pro Plan-এর জন্য Stripe Checkout তৈরি
router.post(
  '/create-checkout-session',
  verifyToken,
  async (req: AuthRequest, res: Response) => {
    try {
      const { email, name, role, plan, userId } = req.user!;

      if (plan === 'pro') {
        res.status(400).json({
          success: false,
          message: 'You are already subscribed to the Pro Plan',
        });
        return;
      }

      if (role !== 'tutor' && role !== 'student') {
        res.status(400).json({
          success: false,
          message: 'Pro subscriptions are only available for Students and Tutors',
        });
        return;
      }

      const isTutor = role === 'tutor';
      const amountInCents = isTutor ? 1500 : 1000; // Tutor $15, Student $10
      const planName = isTutor ? 'Pro Tutor Plan' : 'Pro Student Plan';
      const description = isTutor
        ? 'Unlimited tuition posts & verified tutor badge'
        : 'Priority booking & enhanced student perks';

      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        customer_email: email,
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: planName,
                description,
              },
              unit_amount: amountInCents,
            },
            quantity: 1,
          },
        ],
        metadata: {
          userId,
          userEmail: email,
          userName: name,
          userRole: role,
          planName,
        },
        success_url: `${CLIENT_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${CLIENT_URL}/payment/cancel`,
      });

      res.json({
        success: true,
        url: session.url,
        sessionId: session.id,
      });
    } catch (error) {
      console.error('Error creating Stripe session:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create Stripe checkout session',
      });
    }
  }
);

// ২. POST /api/payments/verify-session — /payment/success পেজ থেকে পেমেন্ট ভেরিফাই করা
router.post(
  '/verify-session',
  verifyToken,
  async (req: AuthRequest, res: Response) => {
    try {
      const { sessionId } = req.body;
      if (!sessionId) {
        res
          .status(400)
          .json({ success: false, message: 'Stripe sessionId is required' });
        return;
      }

      const session = await stripe.checkout.sessions.retrieve(String(sessionId));

      if (session.payment_status !== 'paid') {
        res.status(400).json({
          success: false,
          message: 'Payment has not been completed',
        });
        return;
      }

      if (session.metadata?.userEmail !== req.user!.email) {
        res.status(403).json({
          success: false,
          message: 'Forbidden: Session does not belong to the logged-in user',
        });
        return;
      }

      const payment = await recordSuccessfulPayment(session);

      res.json({
        success: true,
        message: 'Pro Plan activated successfully!',
        data: payment,
      });
    } catch (error) {
      console.error('Error verifying Stripe session:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to verify payment session',
      });
    }
  }
);

// ৩. Stripe Webhook Handler (express.json()-এর আগে raw body সহ মাউন্ট হবে)
export async function stripeWebhookHandler(req: Request, res: Response) {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !webhookSecret) {
    res.status(400).send('Webhook signature or secret missing');
    return;
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    res.status(400).send(`Webhook Error: ${(err as Error).message}`);
    return;
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    if (session.payment_status === 'paid') {
      await recordSuccessfulPayment(session);
    }
  }

  res.json({ received: true });
}

export default router;