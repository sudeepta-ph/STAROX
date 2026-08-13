import mongoose, { Schema, Document } from "mongoose";

// One row per (post, subscriber) send attempt, written only once the send
// settles — see notifyBlogSubscribers in services/mail.ts. No separate
// "pending" row is pre-written; absence of a row for a given
// (postId, subscriberId) pair simply means it hasn't been attempted (or is
// still in flight) yet.
export interface IBlogNotificationLog extends Document {
  postId: mongoose.Types.ObjectId;
  subscriberId: mongoose.Types.ObjectId;
  email: string; // denormalized for admin display without a join
  status: "sent" | "failed";
  error?: string;
  sentAt: Date;
}

const BlogNotificationLogSchema = new Schema<IBlogNotificationLog>({
  postId: { type: Schema.Types.ObjectId, ref: "Blog", required: true, index: true },
  subscriberId: { type: Schema.Types.ObjectId, ref: "BlogSubscriber", required: true },
  email: { type: String, required: true },
  status: { type: String, enum: ["sent", "failed"], required: true },
  error: { type: String },
  sentAt: { type: Date, default: Date.now },
});

export const BlogNotificationLogModel = mongoose.model<IBlogNotificationLog>("BlogNotificationLog", BlogNotificationLogSchema);
export default BlogNotificationLogModel;
