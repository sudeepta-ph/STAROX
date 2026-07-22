import mongoose, { Schema, Document } from "mongoose";

export interface IBlog extends Document {
  title: string;
  slug: string;
  excerpt?: string;
  contentMarkdown: string;
  coverImage?: string;
  category?: string;
  tags: string[];
  authorName: string;
  authorImage?: string;
  authorDesignation?: string;
  featured: boolean;
  popular: boolean;
  status: "draft" | "published" | "archived" | "scheduled";
  draft: boolean;
  publishedAt?: Date;
  readingTime: number;
  views: number;
  seoTitle?: string;
  seoDescription?: string;
  canonicalUrl?: string;
  ogImage?: string;
  twitterCard?: string;
  metaKeywords: string[];
  createdBy?: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const BlogSchema = new Schema<IBlog>(
  {
    title: { type: String, required: true },
    slug: { type: String, required: true, unique: true, index: true },
    excerpt: { type: String },
    contentMarkdown: { type: String, required: true },
    coverImage: { type: String },
    category: { type: String },
    tags: { type: [String], default: [] },
    authorName: { type: String, required: true },
    authorImage: { type: String },
    authorDesignation: { type: String },
    featured: { type: Boolean, default: false },
    popular: { type: Boolean, default: false },
    status: { type: String, enum: ["draft", "published", "archived", "scheduled"], default: "draft" },
    draft: { type: Boolean, default: true },
    publishedAt: { type: Date },
    readingTime: { type: Number, default: 0 },
    views: { type: Number, default: 0 },
    seoTitle: { type: String },
    seoDescription: { type: String },
    canonicalUrl: { type: String },
    ogImage: { type: String },
    twitterCard: { type: String },
    metaKeywords: { type: [String], default: [] },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  {
    timestamps: true,
  }
);

export const BlogModel = mongoose.model<IBlog>("Blog", BlogSchema);
export default BlogModel;
