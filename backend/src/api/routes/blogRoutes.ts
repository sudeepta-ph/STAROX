import { Router, Response } from 'express';
import multer from 'multer';
import rateLimit from 'express-rate-limit';
import crypto from 'node:crypto';
import UserModel from '../../models/User.js';
import BlogModel from '../../models/Blog.js';
import MediaModel from '../../models/Media.js';
import BlogSubscriberModel from '../../models/BlogSubscriber.js';
import { authMiddleware, optionalAuth, AuthenticatedRequest } from '../../middleware/auth.js';
import { adminMiddleware } from '../../middleware/admin.js';
import { uploadToCloudinary, deleteFromCloudinary } from '../../services/cloudinary.js';
import { notifyBlogSubscribers } from '../../services/blogNotify.js';

export const blogRouter = Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

// Scoped to the one subscribe route below (never blogRouter.use) — same
// shape as contact.ts's demoRequestLimiter. 8 requests per 10 minutes per
// IP is generous for a real visitor (who only ever needs one) while still
// bounding abuse; app.ts already sets "trust proxy" so req.ip is correct.
const blogSubscribeLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 8,
  standardHeaders: true,
  legacyHeaders: false,
  statusCode: 429,
  message: { success: false, error: 'Too many requests, please try again later.' },
});

// Multer memory storage (Buffer) for Cloudinary upload
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// ==========================================
// USER ENDPOINTS
// ==========================================

// Get current profile
blogRouter.get('/users/me', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = await UserModel.findOne({ clerkId: req.userId });
    if (!user) {
      return res.status(404).json({ error: 'User profile not found' });
    }
    return res.json(user);
  } catch (error) {
    console.error('[User API] Get profile error:', error);
    return res.status(500).json({ error: 'Failed to fetch user profile' });
  }
});

// Update current profile
blogRouter.put('/users/me', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { firstName, lastName, username, avatar } = req.body;
    const user = await UserModel.findOne({ clerkId: req.userId });
    if (!user) {
      return res.status(404).json({ error: 'User profile not found' });
    }

    if (firstName !== undefined) user.firstName = firstName;
    if (lastName !== undefined) user.lastName = lastName;
    if (username !== undefined) user.username = username;
    if (avatar !== undefined) user.avatar = avatar;

    await user.save();
    return res.json(user);
  } catch (error) {
    console.error('[User API] Update profile error:', error);
    return res.status(500).json({ error: 'Failed to update user profile' });
  }
});

// Alias for old profile sync route to ensure backwards compatibility
blogRouter.get('/auth/profile', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = await UserModel.findOne({ clerkId: req.userId });
    if (!user) {
      return res.status(404).json({ error: 'User profile not found' });
    }
    // Return formatted to match old response signature
    return res.json({
      id: user._id,
      clerk_user_id: user.clerkId,
      email: user.email,
      username: user.username,
      full_name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username,
      avatar_url: user.avatar,
      role: user.role,
      subscription_tier: user.planTier,
      credits_remaining: user.creditsRemaining
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// ==========================================
// ADMIN PROMOTION
// ==========================================
blogRouter.post('/admin/promote', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { adminUsername, adminPassword } = req.body;
    const clerkUserId = req.userId;

    if (!clerkUserId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const envUsername = process.env.ADMIN_USERNAME || 'starox_admin';
    const envPassword = process.env.ADMIN_PASSWORD || 'starox_secure_pass_2026';

    if (adminUsername === envUsername && adminPassword === envPassword) {
      const user = await UserModel.findOneAndUpdate(
        { clerkId: clerkUserId },
        { role: 'admin' },
        { new: true }
      );

      if (!user) {
        return res.status(404).json({ error: 'User record not found' });
      }

      console.log(`[Admin Promotion] User ${clerkUserId} successfully promoted to admin.`);
      return res.json({ success: true, user });
    } else {
      return res.status(403).json({ error: 'Invalid admin credentials' });
    }
  } catch (error) {
    console.error('[Admin Promotion] Error:', error);
    return res.status(500).json({ error: 'Promotion failed' });
  }
});

// Backwards compatibility alias
blogRouter.post('/auth/promote-admin', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { adminUsername, adminPassword } = req.body;
    const clerkUserId = req.userId;

    const envUsername = process.env.ADMIN_USERNAME || 'starox_admin';
    const envPassword = process.env.ADMIN_PASSWORD || 'starox_secure_pass_2026';

    if (adminUsername === envUsername && adminPassword === envPassword) {
      const user = await UserModel.findOneAndUpdate(
        { clerkId: clerkUserId },
        { role: 'admin' },
        { new: true }
      );
      if (!user) return res.status(404).json({ error: 'User not found' });
      return res.json({ success: true, user });
    } else {
      return res.status(403).json({ error: 'Invalid credentials' });
    }
  } catch (error) {
    return res.status(500).json({ error: 'Failed' });
  }
});

// ==========================================
// PUBLIC BLOG READS
// ==========================================

// Get all blogs (Paginated, Filtered, Searchable)
blogRouter.get('/blogs', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 9;
    const skip = (page - 1) * limit;

    const search = (req.query.search as string) || '';
    const category = (req.query.category as string) || '';
    const tag = (req.query.tag as string) || '';
    const popular = req.query.popular === 'true';
    const featured = req.query.featured === 'true';

    // Build Mongo Query filter
    const filter: any = {};

    // RLS/Status Filter: Admins can see everything; public users only see 'published'
    if (req.userRole !== 'admin') {
      filter.status = 'published';
    } else {
      const status = req.query.status as string;
      if (status) filter.status = status;
    }

    if (category) filter.category = category;
    if (popular) filter.popular = true;
    if (featured) filter.featured = true;
    if (tag) filter.tags = tag;

    // Apply search across multiple fields
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { slug: { $regex: search, $options: 'i' } },
        { contentMarkdown: { $regex: search, $options: 'i' } },
        { authorName: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    const total = await BlogModel.countDocuments(filter);
    const posts = await BlogModel.find(filter)
      .populate('createdBy', 'firstName lastName username avatar')
      .sort({ publishedAt: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit);

    return res.json({
      posts: posts || [],
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('[Blogs Query] Error:', error);
    return res.status(500).json({ error: 'Failed to fetch blogs' });
  }
});

// Get single blog post by slug or ID
blogRouter.get('/blogs/:slugOrId', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { slugOrId } = req.params;
    if (typeof slugOrId !== 'string') {
      return res.status(400).json({ error: 'Invalid slug or ID param' });
    }
    const isObjectId = slugOrId.match(/^[0-9a-fA-F]{24}$/) !== null;

    console.log(`[Blog API] Incoming slug: "${slugOrId}"`);
    console.log(`[Blog API] Mongo query: ${isObjectId ? `findById("${slugOrId}")` : `findOne({ slug: "${slugOrId}" })`}`);

    const post = isObjectId
      ? await BlogModel.findById(slugOrId).populate('createdBy', 'firstName lastName username avatar')
      : await BlogModel.findOne({ slug: slugOrId }).populate('createdBy', 'firstName lastName username avatar');

    if (!post) {
      console.warn(`[Blog API] Blog post not found for query: "${slugOrId}". Response status: 404`);
      return res.status(404).json({ error: 'Blog post not found' });
    }

    console.log(`[Blog API] Returned document: "${post.title}" (ID: ${post._id}). Response status: 200`);

    // If it's a draft and requester is not admin, deny access
    if (post.status !== 'published' && req.userRole !== 'admin') {
      console.warn(`[Blog API] Access denied for non-admin to draft blog post: "${post.title}". Response status: 403`);
      return res.status(403).json({ error: 'Access Denied: Blog post is not published' });
    }

    // Increment view count asynchronously
    if (req.userRole !== 'admin') {
      BlogModel.findByIdAndUpdate(post._id, { $inc: { views: 1 } }).exec().catch(err => {
        console.error('[Views Increment] Error:', err);
      });
    }

    return res.json(post);
  } catch (error) {
    console.error('[Blog Query] Error:', error);
    return res.status(500).json({ error: 'Failed to fetch blog post' });
  }
});

// ==========================================
// ADMIN WORKSPACE CMS (Admin-only)
// ==========================================

// Create new post
blogRouter.post('/blogs', authMiddleware, adminMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const mongoUserId = req.mongoUserId!;
    const blogData = req.body;
    
    // Calculate reading time (roughly 200 words per minute)
    const wordCount = (blogData.contentMarkdown || '').split(/\s+/).filter(Boolean).length;
    const readingTime = Math.max(1, Math.ceil(wordCount / 200));

    const newPost = await BlogModel.create({
      ...blogData,
      readingTime,
      createdBy: mongoUserId,
      updatedBy: mongoUserId,
      publishedAt: blogData.status === 'published' ? new Date() : blogData.publishedAt || null
    });

    console.log('[Admin CMS] Created blog post in MongoDB:', newPost._id);
    res.status(201).json(newPost);

    // Published immediately on creation — there's no prior document, so
    // this is unconditionally a first-publish event. Fired after the
    // response is already sent; a slow/failing broadcast can never delay
    // or break the create request (see notifyBlogSubscribers).
    if (newPost.status === 'published') {
      notifyBlogSubscribers(newPost).catch((err) => console.error('[Blog Notify] Failed for new post:', err));
    }
    return;
  } catch (error) {
    console.error('[Admin CMS] Create Blog Error:', error);
    return res.status(500).json({ error: 'Failed to create blog post' });
  }
});

// Update post
blogRouter.put('/blogs/:id', authMiddleware, adminMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const mongoUserId = req.mongoUserId!;
    const blogData = req.body;
    
    // Calculate reading time
    const wordCount = (blogData.contentMarkdown || '').split(/\s+/).filter(Boolean).length;
    const readingTime = Math.max(1, Math.ceil(wordCount / 200));

    const updates: any = {
      ...blogData,
      readingTime,
      updatedBy: mongoUserId
    };

    // wasPublished captures the PRE-update status — this is the exact
    // draft/archived/scheduled -> published transition check (see
    // blogNotify.ts's atomic claim for why a naive compare like this is
    // still safe under a retried request).
    let wasPublished = false;
    if (blogData.status === 'published') {
      const currentPost = await BlogModel.findById(id);
      updates.publishedAt = currentPost?.publishedAt || new Date();
      wasPublished = currentPost?.status === 'published';
    }

    const updatedPost = await BlogModel.findByIdAndUpdate(
      id,
      updates,
      { new: true }
    );

    if (!updatedPost) {
      return res.status(404).json({ error: 'Blog post not found' });
    }

    console.log('[Admin CMS] Updated blog post in MongoDB:', id);
    res.json(updatedPost);

    // Only a genuine draft/archived/scheduled -> published transition
    // notifies subscribers — never a draft save, a preview, an edit to an
    // already-published post, or a delete. Fired after the response is
    // already sent (see notifyBlogSubscribers for the atomic once-only
    // guarantee that also covers a retried publish request).
    if (blogData.status === 'published' && !wasPublished) {
      notifyBlogSubscribers(updatedPost).catch((err) => console.error('[Blog Notify] Failed for published post:', err));
    }
    return;
  } catch (error) {
    console.error('[Admin CMS] Update Blog Error:', error);
    return res.status(500).json({ error: 'Failed to update blog post' });
  }
});

// Delete post
blogRouter.delete('/blogs/:id', authMiddleware, adminMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    const deleted = await BlogModel.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ error: 'Blog post not found' });
    }

    console.log('[Admin CMS] Deleted blog post from MongoDB:', id);
    return res.json({ success: true, message: 'Blog post deleted successfully' });
  } catch (error) {
    console.error('[Admin CMS] Delete Blog Error:', error);
    return res.status(500).json({ error: 'Failed to delete blog post' });
  }
});

// ==========================================
// MEDIA UPLOAD & STORAGE (Admin-only)
// ==========================================
blogRouter.post('/media/upload', authMiddleware, adminMiddleware, upload.single('file'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const file = req.file;
    const mongoUserId = req.mongoUserId!;

    console.log('[Admin Storage] Uploading file to Cloudinary...');
    
    // Upload buffer directly to Cloudinary
    const cloudinaryResult = await uploadToCloudinary(file.buffer, "starox-blog");

    // Save to Media collection
    const mediaItem = await MediaModel.create({
      url: cloudinaryResult.secure_url,
      publicId: cloudinaryResult.public_id,
      fileName: file.originalname,
      size: file.size,
      mimetype: file.mimetype,
      createdBy: mongoUserId
    });

    console.log('[Admin Storage] Cloudinary upload successful:', mediaItem.url);
    return res.json({
      url: mediaItem.url,
      id: mediaItem._id,
      fileName: mediaItem.fileName,
      size: mediaItem.size,
      mimetype: mediaItem.mimetype
    });
  } catch (error) {
    console.error('[Admin Storage] Upload failed:', error);
    return res.status(500).json({ error: 'Failed to upload media file' });
  }
});

// Delete media
blogRouter.delete('/media/:id', authMiddleware, adminMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    const mediaItem = await MediaModel.findById(id);
    if (!mediaItem) {
      return res.status(404).json({ error: 'Media file not found' });
    }

    console.log('[Admin Storage] Deleting file from Cloudinary:', mediaItem.publicId);
    
    // Delete from Cloudinary using correct resource type
    let resourceType = "image";
    if (mediaItem.mimetype && mediaItem.mimetype.startsWith("video/")) {
      resourceType = "video";
    } else if (mediaItem.mimetype && !mediaItem.mimetype.startsWith("image/")) {
      resourceType = "raw";
    }
    await deleteFromCloudinary(mediaItem.publicId, resourceType);

    // Delete from MongoDB
    await MediaModel.findByIdAndDelete(id);

    console.log('[Admin Storage] Deleted successfully from DB and Cloudinary:', id);
    return res.json({ success: true, message: 'Media asset deleted successfully' });
  } catch (error) {
    console.error('[Admin Storage] Delete failed:', error);
    return res.status(500).json({ error: 'Failed to delete media asset' });
  }
});

// ==========================================
// ADMIN DASHBOARD ANALYTICS (Admin-only)
// ==========================================
blogRouter.get('/admin/stats', authMiddleware, adminMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    // 1. Get blog count stats
    const totalPosts = await BlogModel.countDocuments();
    const drafts = await BlogModel.countDocuments({ status: 'draft' });
    const published = await BlogModel.countDocuments({ status: 'published' });
    const archived = await BlogModel.countDocuments({ status: 'archived' });
    const scheduled = await BlogModel.countDocuments({ status: 'scheduled' });

    // Aggregate total views
    const viewsAggregation = await BlogModel.aggregate([
      { $group: { _id: null, totalViews: { $sum: "$views" } } }
    ]);
    const totalViews = viewsAggregation[0]?.totalViews || 0;

    // Get most viewed
    const mostViewed = await BlogModel.find()
      .sort({ views: -1 })
      .limit(5)
      .select('title slug views status createdAt');

    // Get recent posts
    const recentPosts = await BlogModel.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('title slug status createdAt');

    // 2. Fetch recent uploads from MongoDB Media Library
    const recentUploads = await MediaModel.find()
      .sort({ createdAt: -1 })
      .limit(10);

    // Aggregate total storage usage
    const storageAggregation = await MediaModel.aggregate([
      { $group: { _id: null, totalSize: { $sum: "$size" } } }
    ]);
    const storageUsage = storageAggregation[0]?.totalSize || 0;

    return res.json({
      summary: {
        totalPosts,
        drafts,
        published,
        archived,
        scheduled,
        totalViews,
        storageUsage
      },
      mostViewed,
      recentPosts,
      recentUploads: recentUploads.map(item => ({
        id: item._id,
        name: item.fileName,
        size: item.size,
        created_at: item.createdAt,
        url: item.url
      }))
    });
  } catch (error) {
    console.error('[Admin Stats] Query failed:', error);
    return res.status(500).json({ error: 'Failed to fetch admin stats' });
  }
});

// ==========================================
// BLOG SUBSCRIPTIONS (public — no STAROX/PMX account required)
// ==========================================

// Subscribe (and, for a previously-unsubscribed address, resubscribe) with
// just an email address. Idempotent: submitting the same email twice never
// creates a second row and never re-sends anything.
blogRouter.post('/blogs/subscribe', blogSubscribeLimiter, async (req, res) => {
  try {
    const { email } = req.body;
    if (typeof email !== 'string' || !email.trim()) {
      return res.status(400).json({ success: false, error: 'Enter a valid email address.' });
    }
    const normalized = normalizeEmail(email);
    if (!EMAIL_RE.test(normalized)) {
      return res.status(400).json({ success: false, error: 'Enter a valid email address.' });
    }

    const existing = await BlogSubscriberModel.findOne({ email: normalized });

    if (existing && existing.status === 'active') {
      return res.json({ success: true, code: 'ALREADY_SUBSCRIBED', message: "You're already subscribed to the STAROX Blog." });
    }

    if (existing && existing.status === 'unsubscribed') {
      existing.status = 'active';
      existing.subscribedAt = new Date();
      existing.unsubscribedAt = undefined;
      await existing.save();
      return res.json({ success: true, code: 'SUBSCRIBED', message: "You're subscribed. We'll email you when a new post is published." });
    }

    try {
      await BlogSubscriberModel.create({
        email: normalized,
        status: 'active',
        subscribedAt: new Date(),
        unsubscribeToken: crypto.randomBytes(24).toString('base64url'),
      });
    } catch (createErr: any) {
      // Race: another concurrent request created the same normalized email
      // between our findOne and this create. Treat it the same as
      // "already subscribed" rather than surfacing a raw duplicate-key error.
      if (createErr?.code === 11000) {
        return res.json({ success: true, code: 'ALREADY_SUBSCRIBED', message: "You're already subscribed to the STAROX Blog." });
      }
      throw createErr;
    }

    return res.json({ success: true, code: 'SUBSCRIBED', message: "You're subscribed. We'll email you when a new post is published." });
  } catch (error) {
    console.error('[Blog Subscribe] Error:', error);
    return res.status(500).json({ success: false, error: "Couldn't subscribe right now. Please try again." });
  }
});

// Unsubscribe by opaque token only — never by email, so this link can
// never be used to enumerate or target an arbitrary address. Idempotent:
// safe to click/POST more than once.
blogRouter.post('/blogs/unsubscribe/:token', async (req, res) => {
  try {
    const sub = await BlogSubscriberModel.findOne({ unsubscribeToken: req.params.token });
    if (!sub) {
      return res.status(404).json({ success: false, error: 'This unsubscribe link is invalid or has expired.' });
    }
    if (sub.status === 'active') {
      sub.status = 'unsubscribed';
      sub.unsubscribedAt = new Date();
      await sub.save();
    }
    return res.json({ success: true, message: "You're unsubscribed from the STAROX Blog." });
  } catch (error) {
    console.error('[Blog Unsubscribe] Error:', error);
    return res.status(500).json({ success: false, error: "Couldn't process that right now. Please try again." });
  }
});

// Same token as the unsubscribe link — lets the "Resubscribe" button on the
// unsubscribe confirmation page work without asking for the email again.
blogRouter.post('/blogs/resubscribe/:token', async (req, res) => {
  try {
    const sub = await BlogSubscriberModel.findOne({ unsubscribeToken: req.params.token });
    if (!sub) {
      return res.status(404).json({ success: false, error: 'This link is invalid or has expired.' });
    }
    if (sub.status === 'unsubscribed') {
      sub.status = 'active';
      sub.subscribedAt = new Date();
      sub.unsubscribedAt = undefined;
      await sub.save();
    }
    return res.json({ success: true, message: "You're subscribed. We'll email you when a new post is published." });
  } catch (error) {
    console.error('[Blog Resubscribe] Error:', error);
    return res.status(500).json({ success: false, error: "Couldn't process that right now. Please try again." });
  }
});

// ==========================================
// ADMIN BLOG SUBSCRIBERS (Admin-only)
// ==========================================

blogRouter.get('/admin/blog-subscribers', authMiddleware, adminMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const skip = (page - 1) * limit;

    const [total, active, unsubscribed, subscribers] = await Promise.all([
      BlogSubscriberModel.countDocuments(),
      BlogSubscriberModel.countDocuments({ status: 'active' }),
      BlogSubscriberModel.countDocuments({ status: 'unsubscribed' }),
      BlogSubscriberModel.find().sort({ subscribedAt: -1 }).skip(skip).limit(limit).select('email status subscribedAt unsubscribedAt'),
    ]);

    return res.json({
      summary: { total, active, unsubscribed },
      subscribers,
      page,
      pages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('[Admin Blog Subscribers] Query failed:', error);
    return res.status(500).json({ error: 'Failed to fetch blog subscribers' });
  }
});

blogRouter.post('/admin/blog-subscribers/:id/unsubscribe', authMiddleware, adminMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const sub = await BlogSubscriberModel.findById(req.params.id);
    if (!sub) return res.status(404).json({ error: 'Subscriber not found' });
    sub.status = 'unsubscribed';
    sub.unsubscribedAt = new Date();
    await sub.save();
    return res.json({ success: true, data: sub });
  } catch (error) {
    console.error('[Admin Blog Subscribers] Unsubscribe failed:', error);
    return res.status(500).json({ error: 'Failed to unsubscribe subscriber' });
  }
});
