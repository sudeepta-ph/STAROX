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
    
    // Verify Clerk Token
    const verifiedToken = await verifyToken(token, { secretKey: process.env.CLERK_SECRET_KEY });
    const clerkUserId = verifiedToken.sub;
    
    if (!clerkUserId) {
      return res.status(401).json({ error: 'Invalid token claims' });
    }

    req.userId = clerkUserId;

    // Check if user exists in MongoDB
    let existingUser = await UserModel.findOne({ clerkId: clerkUserId });

    // Query Clerk to get latest details for either creation or update
    const clerkUser = await clerk.users.getUser(clerkUserId);
    const email = clerkUser.emailAddresses[0]?.emailAddress || '';
    const username = clerkUser.username || email.split('@')[0] || `user_${clerkUserId.substring(5, 12)}`;
    const firstName = clerkUser.firstName || '';
    const lastName = clerkUser.lastName || '';
    const avatar = clerkUser.imageUrl || '';

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
      // "If the user exists: Update profile."
      console.log('[Clerk Sync] Syncing user profile updates:', clerkUserId);
      existingUser.email = email;
      existingUser.username = username;
      existingUser.firstName = firstName;
      existingUser.lastName = lastName;
      existingUser.avatar = avatar;
      await existingUser.save();
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
      const verifiedToken = await verifyToken(token, { secretKey: process.env.CLERK_SECRET_KEY });
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
