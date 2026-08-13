import { Request, Response, NextFunction } from 'express';
import { createClerkClient, verifyToken } from '@clerk/backend';
import UserModel from '../models/User.js';

const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

export interface AuthenticatedRequest extends Request {
  userId?: string;
  userRole?: string;
  mongoUserId?: string; // Storing MongoDB document ObjectId string
}

export const authMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];

    // Verify Clerk Token. clockSkewInMs widens Clerk's own default (5000ms —
    // see @clerk/backend's DEFAULT_CLOCK_SKEW_IN_MS) to 10000ms: dev/hosting
    // machines can drift a few seconds from Clerk's issuing clock, which
    // otherwise intermittently fails the iat/exp/nbf checks below with
    // "issued at date claim (iat) is in the future" even for a genuinely
    // valid, freshly-issued token. This does not disable or loosen claim
    // verification itself — exp/nbf/iat are still fully checked, just with
    // a slightly wider, officially-supported tolerance window instead of
    // Clerk's default, which this codebase's observed drift (5-7s) sits
    // right at the edge of.
    const verifiedToken = await verifyToken(token, { secretKey: process.env.CLERK_SECRET_KEY, clockSkewInMs: 10_000 });
    const clerkUserId = verifiedToken.sub;
    
    if (!clerkUserId) {
      return res.status(401).json({ error: 'Invalid token claims' });
    }

    req.userId = clerkUserId;

    // Query Clerk to get latest details for either creation or update
    const clerkUser = await clerk.users.getUser(clerkUserId);
    const email = clerkUser.emailAddresses[0]?.emailAddress || '';
    const username = clerkUser.username || email.split('@')[0] || `user_${clerkUserId.substring(5, 12)}`;
    const firstName = clerkUser.firstName || '';
    const lastName = clerkUser.lastName || '';
    const avatar = clerkUser.imageUrl || '';

    // 1. Search by clerkId
    let existingUser = await UserModel.findOne({ clerkId: clerkUserId });

    // 2. If not found, search by email
    if (!existingUser && email) {
      existingUser = await UserModel.findOne({ email });
    }

    if (!existingUser) {
      console.log('[Clerk Sync] Auto-creating user in MongoDB:', clerkUserId);
      existingUser = await UserModel.create({
        clerkId: clerkUserId,
        email,
        username,
        firstName,
        lastName,
        avatar,
        role: 'user',
        planTier: 'free',
        creditsRemaining: 5
      });
      console.log('[Clerk Sync] Created user successfully:', existingUser._id);
    } else {
      console.log('[Clerk Sync] Syncing user profile updates:', clerkUserId);
      let hasChanges = false;

      if (existingUser.clerkId !== clerkUserId) {
        existingUser.clerkId = clerkUserId;
        hasChanges = true;
      }
      if (email && existingUser.email !== email) {
        existingUser.email = email;
        hasChanges = true;
      }
      if (username && existingUser.username !== username) {
        existingUser.username = username;
        hasChanges = true;
      }
      if (firstName && existingUser.firstName !== firstName) {
        existingUser.firstName = firstName;
        hasChanges = true;
      }
      if (lastName && existingUser.lastName !== lastName) {
        existingUser.lastName = lastName;
        hasChanges = true;
      }
      if (avatar && existingUser.avatar !== avatar) {
        existingUser.avatar = avatar;
        hasChanges = true;
      }

      if (hasChanges) {
        await existingUser.save();
      }
    }

    req.userRole = existingUser.role;
    req.mongoUserId = (existingUser._id as any).toString();

    next();
  } catch (error) {
    console.error('[Auth Middleware] Verification failed:', error);
    return res.status(401).json({ error: 'Authentication failed' });
  }
};

export const optionalAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      // Same widened tolerance as authMiddleware above — see the comment there.
      const verifiedToken = await verifyToken(token, { secretKey: process.env.CLERK_SECRET_KEY, clockSkewInMs: 10_000 });
      const clerkUserId = verifiedToken.sub;
      
      if (clerkUserId) {
        req.userId = clerkUserId;
        
        // Find MongoDB user
        const existingUser = await UserModel.findOne({ clerkId: clerkUserId });
        if (existingUser) {
          req.userRole = existingUser.role;
          req.mongoUserId = (existingUser._id as any).toString();
        }
      }
    }
    
    next();
  } catch (error) {
    next();
  }
};
