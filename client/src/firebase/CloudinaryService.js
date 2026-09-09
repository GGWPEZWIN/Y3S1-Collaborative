// Cloudinary direct browser upload service.
// IMPORTANT: Cloud name and unsigned upload preset are safe to expose in the frontend.
// NEVER put your Cloudinary API secret in this file.

const CLOUDINARY_CLOUD_NAME =
  import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || "tn83k35y";

const CLOUDINARY_UPLOAD_PRESET =
  import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || "Greentrip_chats";

const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10 MB
const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100 MB
const MAX_AUDIO_SIZE = 10 * 1024 * 1024; // 10 MB

function getMediaType(file) {
  if (!file?.type) return null;

  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("video/")) return "video";
  if (file.type.startsWith("audio/")) return "audio";

  return null;
}

function validateFile(file) {
  const mediaType = getMediaType(file);

  if (!mediaType) {
    throw new Error(
      "Only image, video, and audio files are supported."
    );
  }

  const limits = {
    image: MAX_IMAGE_SIZE,
    video: MAX_VIDEO_SIZE,
    audio: MAX_AUDIO_SIZE,
  };

  if (file.size > limits[mediaType]) {
    const maxMb = Math.round(
      limits[mediaType] / (1024 * 1024)
    );

    throw new Error(
      `${mediaType[0].toUpperCase() + mediaType.slice(1)} is too large. Maximum size is ${maxMb} MB.`
    );
  }

  return mediaType;
}

export async function uploadToCloudinary(
  file,
  folder = "greentrip/chat"
) {
  if (!file) {
    throw new Error("No media file selected.");
  }

  const mediaType = validateFile(file);

  if (
    !CLOUDINARY_CLOUD_NAME ||
    !CLOUDINARY_UPLOAD_PRESET
  ) {
    throw new Error(
      "Cloudinary is not configured. Check your VITE_CLOUDINARY_* values."
    );
  }

  const formData = new FormData();

  formData.append("file", file);
  formData.append(
    "upload_preset",
    CLOUDINARY_UPLOAD_PRESET
  );
  formData.append("folder", folder);

  /*
    Cloudinary treats audio as a video resource type.

    Therefore:
      image -> /image/upload
      video -> /video/upload
      audio -> /video/upload
  */
  const resourceType =
    mediaType === "image"
      ? "image"
      : "video";

  const endpoint =
    `https://api.cloudinary.com/v1_1/` +
    `${CLOUDINARY_CLOUD_NAME}/` +
    `${resourceType}/upload`;

  const response = await fetch(endpoint, {
    method: "POST",
    body: formData,
  });

  let data = null;

  try {
    data = await response.json();
  } catch {
    // Keep generic error below if response isn't JSON.
  }

  if (!response.ok) {
    throw new Error(
      data?.error?.message ||
        `Cloudinary ${mediaType} upload failed.`
    );
  }

  if (!data?.secure_url) {
    throw new Error(
      "Cloudinary uploaded the file but did not return a media URL."
    );
  }

  return {
    url: data.secure_url,

    publicId:
      data.public_id || "",

    resourceType:
      data.resource_type || mediaType,

    format:
      data.format || "",

    bytes:
      data.bytes || file.size,

    mediaType,
  };
}

export function getCloudinaryConfig() {
  return {
    cloudName:
      CLOUDINARY_CLOUD_NAME,

    uploadPreset:
      CLOUDINARY_UPLOAD_PRESET,
  };
}