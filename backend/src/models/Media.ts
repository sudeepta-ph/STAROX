import mongoose, { Schema, Document } from "mongoose";

export interface IMedia extends Document {
  url: string;
  publicId: string;
  fileName: string;
  size: number;
  mimetype: string;
  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const MediaSchema = new Schema<IMedia>(
  {
    url: { type: String, required: true },
    publicId: { type: String, required: true, unique: true },
    fileName: { type: String, required: true },
    size: { type: Number, required: true },
    mimetype: { type: String, required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  {
    timestamps: true,
  }
);

export const MediaModel = mongoose.model<IMedia>("Media", MediaSchema);
export default MediaModel;
