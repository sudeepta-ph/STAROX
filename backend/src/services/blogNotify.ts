import { env } from "../config/env";
import BlogModel, { IBlog } from "../models/Blog";
import BlogSubscriberModel from "../models/BlogSubscriber";
import BlogNotificationLogModel from "../models/BlogNotificationLog";
import { sendBlogPublishedEmail } from "./mail";

// Called fire-and-forget, after the publish request's res.json(...) has
// already been sent (see blogRoutes.ts) — never awaited by the HTTP
// handler, so a slow or failing broadcast can never delay or break
// publishing. Errors from any individual send are caught per-recipient
// below; nothing here throws back to the caller.
export async function notifyBlogSubscribers(post: IBlog): Promise<void> {
  // Atomic claim — the single-document conditional update guarantees this
  // broadcast fires at most once per post, ever, even if the publish
  // request that triggered it was retried (two concurrent callers can't
  // both win this update: MongoDB serializes writes to the same document).
  const claimed = await BlogModel.findOneAndUpdate(
    { _id: post._id, notificationSentAt: { $exists: false } },
    { $set: { notificationSentAt: new Date() } }
  );
  if (!claimed) {
    console.log(`[Blog Notify] Skipping post ${post._id} — notification already claimed/sent.`);
    return;
  }

  const subscribers = await BlogSubscriberModel.find({ status: "active" });
  if (subscribers.length === 0) return;

  const articleUrl = `${env.FRONTEND_ORIGIN}/blog/${post.slug}`;

  const results = await Promise.allSettled(
    subscribers.map(async (sub) => {
      const unsubscribeUrl = `${env.FRONTEND_ORIGIN}/blog/unsubscribe/${sub.unsubscribeToken}`;
      await sendBlogPublishedEmail({
        toEmail: sub.email,
        title: post.title,
        excerpt: post.excerpt || "",
        articleUrl,
        unsubscribeUrl,
      });
      return sub;
    })
  );

  const logRows = results.map((result, i) => {
    const sub = subscribers[i];
    return result.status === "fulfilled"
      ? { postId: post._id, subscriberId: sub._id, email: sub.email, status: "sent" as const, sentAt: new Date() }
      : { postId: post._id, subscriberId: sub._id, email: sub.email, status: "failed" as const, error: String(result.reason?.message ?? result.reason), sentAt: new Date() };
  });

  await BlogNotificationLogModel.insertMany(logRows).catch((err) =>
    console.error("[Blog Notify] Failed to write notification log rows:", err)
  );

  const sentCount = logRows.filter((r) => r.status === "sent").length;
  console.log(`[Blog Notify] Post "${post.title}" (${post._id}): notified ${sentCount}/${subscribers.length} active subscribers.`);
}
