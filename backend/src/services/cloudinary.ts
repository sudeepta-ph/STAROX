import { v2 as cloudinary } from "cloudinary";
import { env } from "../config/env.js";

// Initialize Cloudinary SDK
cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET
});

export interface CloudinaryUploadResult {
  secure_url: string;
  public_id: string;
  bytes: number;
  format: string;
}

/**
 * Uploads a buffer directly to Cloudinary using upload_stream.
 */
export const uploadToCloudinary = (
  fileBuffer: Buffer,
  folder: string = "starox-blog"
): Promise<CloudinaryUploadResult> => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder, resource_type: "auto" },
      (error, result) => {
        if (error) {
          console.error("[Cloudinary Service] Upload error:", error);
          return reject(error);
        }
        if (!result) {
          return reject(new Error("Cloudinary returned empty result."));
        }
        resolve({
          secure_url: result.secure_url,
          public_id: result.public_id,
          bytes: result.bytes,
          format: result.format
        });
      }
    );
    uploadStream.end(fileBuffer);
  });
};

/**
 * Deletes an asset from Cloudinary by its public ID.
 */
export const deleteFromCloudinary = (publicId: string, resourceType: string = "image"): Promise<any> => {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.destroy(publicId, { resource_type: resourceType }, (error, result) => {
      if (error) {
        console.error("[Cloudinary Service] Delete error:", error);
        return reject(error);
      }
      resolve(result);
    });
  });
};
export default cloudinary;
