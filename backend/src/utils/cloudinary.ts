import { v2 as cloudinary } from 'cloudinary';

/**
 * Architecture Flow:
 * Client → Our API (auth check) → Validate Image → Cloudinary (upload) → Returns URL → Save to DB
 */

// ============================================================================
// IMAGE VALIDATION - Security best practices
// ============================================================================

/**
 * Allowed image MIME types
 * 
 * Interview Q: Why validate file types?
 * -> Prevent malicious file uploads (PHP, JS disguised as images)
 * -> Prevent XSS via SVG files (can contain JavaScript)
 * -> Reduce attack surface
 */
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp'
] as const;

/**
 * Maximum file size in bytes (5MB)
 * 
 * Interview Q: Why limit file size?
 * -> Prevent DoS via large uploads
 * -> Keep storage costs manageable
 * -> Improve page load times
 */
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

/**
 * Validate base64 image data
 * 
 * Security checks:
 * 1. Validate MIME type (prevent non-image uploads)
 * 2. Check file size (prevent DoS)
 * 3. Validate base64 format (prevent malformed data)
 * 
 * @param base64Data - Base64 encoded image string
 * @returns { valid: boolean, error?: string }
 * 
 * Interview Q: What are base64 image security risks?
 * -> Size inflation (33% larger than binary)
 * -> Can hide malicious content in image metadata
 * -> Memory exhaustion during decoding
 */
export const validateImage = (base64Data: string): { valid: boolean; error?: string } => {
  // Check if it's a valid data URI format
  const dataUriRegex = /^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+)?;base64,/;
  const match = base64Data.match(dataUriRegex);

  if (!match) {
    // Try to validate as raw base64 (without data URI prefix)
    // This is less secure but sometimes necessary
    if (!/^[A-Za-z0-9+/]+=*$/.test(base64Data.substring(0, 100))) {
      return { valid: false, error: 'Invalid image format. Must be base64 encoded.' };
    }
    // Can't determine MIME type without data URI, proceed with caution
    console.warn('⚠️ Image uploaded without data URI prefix - cannot validate MIME type');
  } else {
    // Extract and validate MIME type
    const mimeType = match[1];
    if (!mimeType || !ALLOWED_MIME_TYPES.includes(mimeType as typeof ALLOWED_MIME_TYPES[number])) {
      return { 
        valid: false, 
        error: `Invalid image type: ${mimeType}. Allowed: ${ALLOWED_MIME_TYPES.join(', ')}` 
      };
    }
  }

  // Calculate approximate file size from base64
  // Base64 is ~33% larger than binary, so: originalSize ≈ base64Length * 0.75
  const base64WithoutPrefix = base64Data.replace(/^data:[^;]+;base64,/, '');
  const approximateSize = (base64WithoutPrefix.length * 3) / 4;

  if (approximateSize > MAX_FILE_SIZE) {
    const sizeMB = (approximateSize / (1024 * 1024)).toFixed(2);
    return { 
      valid: false, 
      error: `Image too large: ${sizeMB}MB. Maximum allowed: 5MB` 
    };
  }

  return { valid: true };
};

// Configure Cloudinary with credentials from .env

// Configure Cloudinary with credentials from .env
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Upload an image to Cloudinary
 * 
 * @param file - Base64 string or file path to upload
 * @param folder - Cloudinary folder name (e.g., "campus-lost-found/items")
 * @returns Promise<string> - The secure URL of uploaded image
 * 
 * How it works:
 * 1. Takes base64 image data from request
 * 2. Uploads to Cloudinary under specific folder
 * 3. Returns permanent HTTPS URL (e.g., https://res.cloudinary.com/...)
 * 4. We save this URL in our database
 * 
 * Error Handling:
 * - Invalid image format → throws error
 * - Upload failed → throws error with Cloudinary message
 * - Network issues → throws error
 */
export const uploadToCloudinary = async (
  file: string,
  folder: string = 'campus-lost-found/items'
): Promise<string> => {
  try {
    // Upload image to Cloudinary
    // file can be: base64 data URI, file path, or URL
    const result = await cloudinary.uploader.upload(file, {
      folder: folder,                    // Organize in folders
      resource_type: 'auto',             // Auto-detect image/video
      transformation: [
        { width: 1200, crop: 'limit' },  // Max width 1200px (mobile-friendly)
        { quality: 'auto:good' },        // Auto compression (balance quality/size)
      ],
    });

    // Return the secure HTTPS URL
    // This is what we save in database
    return result.secure_url;
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    throw new Error('Failed to upload image to Cloudinary');
  }
};

/**
 * Delete an image from Cloudinary
 * 
 * @param publicId - The public ID of the image (extracted from URL)
 * @returns Promise<void>
 * 
 * Use case: When user deletes their item, we also delete images from Cloudinary
 * to avoid orphaned images (keeping storage clean)
 * 
 * How to get publicId from URL:
 * URL: https://res.cloudinary.com/demo/image/upload/v1234/campus-lost-found/items/abc123.jpg
 * publicId: campus-lost-found/items/abc123
 */
export const deleteFromCloudinary = async (publicId: string): Promise<void> => {
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error('Cloudinary delete error:', error);
    // Don't throw - if delete fails, it's not critical
    // Image will just stay in Cloudinary (minor cost, not breaking)
  }
};

/**
 * Extract public_id from Cloudinary URL
 * 
 * @param url - Full Cloudinary URL
 * @returns string - The public ID
 * 
 * Example:
 * Input:  https://res.cloudinary.com/demo/image/upload/v1234/campus-lost-found/items/abc123.jpg
 * Output: campus-lost-found/items/abc123
 */
export const extractPublicId = (url: string): string => {
  try {
    // Split URL and get everything after 'upload/v{version}/'
    const parts = url.split('/upload/');
    if (parts.length < 2) return '';
    
    const pathAfterUpload = parts[1];
    // Remove version number (e.g., v1234567890/)
    const withoutVersion = pathAfterUpload.split('/').slice(1).join('/');
    // Remove file extension
    const publicId = withoutVersion.split('.')[0];
    
    return publicId;
  } catch (error) {
    console.error('Error extracting public ID:', error);
    return '';
  }
};
