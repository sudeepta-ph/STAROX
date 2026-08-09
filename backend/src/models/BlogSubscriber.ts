import mongoose, { Schema, Document } from "mongoose";

export interface IBlogSubscriber extends Document {
  email: string;
  status: "active" | "unsubscribed";
  subscribedAt: Date;
  unsubscribedAt?: Date;
  // Opaque credential for the unsubscribe/resubscribe links — never the
  // subscriber's email itself. Same generation pattern as PMX invite tokens
  // (crypto.randomBytes(24).toString("base64url")).
  unsubscribeToken: string;
  createdAt: Date;
  updatedAt: Date;
}

const BlogSubscriberSchema = new Schema<IBlogSubscriber>(
  {
    // Always normalized (trim + lowercase) before every read/write — see
    // blogRoutes.ts's normalizeEmail helper. The unique index below is what
    // actually prevents "Test@x.com" and "test@x.com" from becoming two rows.
    email: { type: String, required: true, unique: true, index: true },
    status: { type: String, enum: ["active", "unsubscribed"], default: "active" },
    subscribedAt: { type: Date, default: Date.now },
    unsubscribedAt: { type: Date },
    unsubscribeToken: { type: String, required: true, unique: true, index: true },
  },
  { timestamps: true }
);

export const BlogSubscriberModel = mongoose.model<IBlogSubscriber>("BlogSubscriber", BlogSubscriberSchema);
export default BlogSubscriberModel;
