import mongoose, { Schema, Document } from "mongoose";

export interface IUser extends Document {
  clerkId: string;
  email: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
  role: "user" | "admin";
  planTier: "free" | "starter" | "pro";
  creditsRemaining: number;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    clerkId: { type: String, required: true, unique: true, index: true },
    email: { type: String, required: true, unique: true },
    username: { type: String, unique: true, sparse: true },
    firstName: { type: String },
    lastName: { type: String },
    avatar: { type: String },
    role: { type: String, enum: ["user", "admin"], default: "user" },
    planTier: { type: String, enum: ["free", "starter", "pro"], default: "free" },
    creditsRemaining: { type: Number, default: 5 },
  },
  {
    timestamps: true,
  }
);

export const UserModel = mongoose.model<IUser>("User", UserSchema);
export default UserModel;
