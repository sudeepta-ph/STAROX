import mongoose, { Schema, Document } from "mongoose";

// Project placeholder
export interface IProject extends Document {
  userId: string;
  name: string;
  description?: string;
  websiteUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ProjectSchema = new Schema<IProject>(
  {
    userId: { type: String, required: true },
    name: { type: String, required: true },
    description: { type: String },
    websiteUrl: { type: String },
  },
  { timestamps: true }
);

export const ProjectModel = mongoose.model<IProject>("Project", ProjectSchema);

// UploadedFile placeholder
export interface IUploadedFile extends Document {
  projectId: string;
  userId: string;
  fileName: string;
  fileType: "csv" | "pdf" | "image" | "analytics";
  fileUrl: string;
  fileSize: number;
  parsedData?: Record<string, any>;
  createdAt: Date;
}

const UploadedFileSchema = new Schema<IUploadedFile>(
  {
    projectId: { type: String, required: true },
    userId: { type: String, required: true },
    fileName: { type: String, required: true },
    fileType: { type: String, enum: ["csv", "pdf", "image", "analytics"], required: true },
    fileUrl: { type: String, required: true },
    fileSize: { type: Number, required: true },
    parsedData: { type: Schema.Types.Mixed },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const UploadedFileModel = mongoose.model<IUploadedFile>("UploadedFile", UploadedFileSchema);

// Suggestions placeholder
const SuggestionSchema = new Schema(
  {
    analysisId: { type: String, required: true },
    projectId: { type: String, required: true },
    type: { type: String, enum: ["ux_issue", "ui_improvement", "feature_addon", "copy_refinement"], required: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    severity: { type: String, enum: ["low", "medium", "high", "critical"], required: true },
    why: { type: String, required: true },
    recommendation: { type: String, required: true },
    estimatedImpact: { type: String, required: true },
    complexity: { type: String, enum: ["low", "medium", "high"], required: true },
    priorityScore: { type: Number, required: true },
    elementSelector: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const SuggestionModel = mongoose.model("Suggestion", SuggestionSchema);
