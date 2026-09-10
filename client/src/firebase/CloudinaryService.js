// src/firebase/cloudinaryService.js

const CLOUD_NAME = "tn83k35y";
const UPLOAD_PRESET = "Greentrip_chats";

const CLOUDINARY_UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/upload`;

/**
 * ============================================================
 * UPLOAD FILE TO CLOUDINARY
 * ============================================================
 *
 * folderOrKind:
 * - "images"
 * - "videos"
 * - "voice"
 * - "audio"
 * - or any custom folder name
 *
 * Cloudinary:
 * - image files use the "image" resource type
 * - audio/video files use the "video" resource type
 */
export async function uploadToCloudinary(
  file,
  folderOrKind = "chat"
) {
  if (!file) {
    throw new Error("No file selected.");
  }

  if (!(file instanceof Blob)) {
    throw new Error("Invalid file.");
  }

  const kind = String(
    folderOrKind || "chat"
  ).toLowerCase();

  /*
   * ----------------------------------------------------------
   * DETECT MEDIA TYPE
   * ----------------------------------------------------------
   */

  const isImage =
    file.type?.startsWith("image/") ||
    ["image", "images", "photo", "photos"].includes(kind);

  const isAudio =
    file.type?.startsWith("audio/") ||
    ["audio", "voice", "voices"].includes(kind);

  const isVideo =
    file.type?.startsWith("video/") ||
    ["video", "videos"].includes(kind);

  let mediaType = "file";

  if (isImage) {
    mediaType = "image";
  } else if (isAudio) {
    mediaType = "audio";
  } else if (isVideo) {
    mediaType = "video";
  }

  /*
   * ----------------------------------------------------------
   * CLOUDINARY RESOURCE TYPE
   * ----------------------------------------------------------
   *
   * Cloudinary handles audio/video through the "video"
   * resource type.
   */

  const resourceType = isImage
    ? "image"
    : "video";

  /*
   * ----------------------------------------------------------
   * CLOUDINARY FOLDER
   * ----------------------------------------------------------
   */

  let folder;

  if (isImage) {
    folder = "greentrip/chats/images";
  } else if (isAudio) {
    folder = "greentrip/chats/voice";
  } else if (isVideo) {
    folder = "greentrip/chats/videos";
  } else {
    folder = "greentrip/chats/files";
  }

  /*
   * ----------------------------------------------------------
   * FORM DATA
   * ----------------------------------------------------------
   */

  const formData = new FormData();

  formData.append(
    "file",
    file
  );

  formData.append(
    "upload_preset",
    UPLOAD_PRESET
  );

  formData.append(
    "folder",
    folder
  );

  /*
   * Keep original filename when possible.
   */

  if (file.name) {
    formData.append(
      "use_filename",
      "true"
    );

    formData.append(
      "unique_filename",
      "false"
    );
  }

  /*
   * ----------------------------------------------------------
   * UPLOAD
   * ----------------------------------------------------------
   */

  const uploadUrl =
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${resourceType}/upload`;

  const response = await fetch(
    uploadUrl,
    {
      method: "POST",
      body: formData,
    }
  );

  let data = null;

  try {
    data = await response.json();
  } catch {
    throw new Error(
      `Cloudinary upload failed (${response.status}).`
    );
  }

  /*
   * ----------------------------------------------------------
   * CHECK RESPONSE
   * ----------------------------------------------------------
   */

  if (
    !response.ok ||
    !data?.secure_url
  ) {
    console.error(
      "Cloudinary upload error:",
      data
    );

    throw new Error(
      data?.error?.message ||
        `Cloudinary upload failed (${response.status}).`
    );
  }

  /*
   * ----------------------------------------------------------
   * RETURN UPLOAD INFORMATION
   * ----------------------------------------------------------
   *
   * mediaType is important because chatService.js uses it
   * to distinguish image / video / audio messages.
   */

  const originalUrl =
    data.secure_url;

  return {
    url: originalUrl,

    secure_url: originalUrl,

    originalUrl,

    publicId:
      data.public_id || "",

    resourceType:
      data.resource_type ||
      resourceType,

    mediaType,

    format:
      data.format || "",

    duration:
      data.duration || null,

    bytes:
      data.bytes || null,

    width:
      data.width || null,

    height:
      data.height || null,

    originalFilename:
      data.original_filename ||
      file.name ||
      "",
  };
}

/**
 * ============================================================
 * CONVERT CLOUDINARY AUDIO URL TO MP3
 * ============================================================
 *
 * Original:
 *
 * https://res.cloudinary.com/tn83k35y/video/upload/
 * voice-123.webm
 *
 * Browser playback:
 *
 * https://res.cloudinary.com/tn83k35y/video/upload/
 * f_mp3/voice-123.mp3
 *
 * This function is safe to call multiple times.
 * It will NOT create:
 *
 * f_mp3/f_mp3/
 *
 * or:
 *
 * voice-123.mp3.mp3
 */
export function getBrowserAudioUrl(url) {
  if (
    !url ||
    typeof url !== "string"
  ) {
    return url || "";
  }

  /*
   * Only transform Cloudinary URLs.
   */

  if (
    !url.includes(
      "res.cloudinary.com/"
    ) ||
    !url.includes("/upload/")
  ) {
    return url;
  }

  let audioUrl = url;

  /*
   * ----------------------------------------------------------
   * ADD f_mp3 ONLY ONCE
   * ----------------------------------------------------------
   */

  if (
    !audioUrl.includes(
      "/upload/f_mp3/"
    )
  ) {
    audioUrl =
      audioUrl.replace(
        "/upload/",
        "/upload/f_mp3/"
      );
  }

  /*
   * ----------------------------------------------------------
   * CHANGE AUDIO EXTENSION TO .MP3
   * ----------------------------------------------------------
   *
   * Handles:
   * .webm
   * .weba
   * .ogg
   * .oga
   * .mp4
   * .m4a
   * .wav
   * .mp3
   */

  audioUrl =
    audioUrl.replace(
      /\.(webm|weba|ogg|oga|mp4|m4a|wav|mp3)(\?.*)?$/i,
      ".mp3$2"
    );

  return audioUrl;
}

/**
 * ============================================================
 * UPLOAD VOICE RECORDING
 * ============================================================
 *
 * Browser recordings are normally:
 *
 * audio/webm;codecs=opus
 *
 * Cloudinary stores them using the "video" resource type.
 *
 * We return:
 *
 * originalUrl
 *     -> original Cloudinary file
 *
 * url
 *     -> browser-friendly MP3 delivery URL
 */
export async function uploadVoiceToCloudinary(
  blob
) {
  if (!blob) {
    throw new Error(
      "No voice recording found."
    );
  }

  if (!(blob instanceof Blob)) {
    throw new Error(
      "Invalid voice recording."
    );
  }

  /*
   * Determine extension from MIME type.
   */

  const extension =
    getAudioExtension(
      blob.type
    );

  /*
   * Create a File object so Cloudinary receives
   * a proper filename.
   */

  const file =
    new File(
      [blob],
      `voice-${Date.now()}.${extension}`,
      {
        type:
          blob.type ||
          "audio/webm",
      }
    );

  /*
   * Upload as voice.
   */

  const result =
    await uploadToCloudinary(
      file,
      "voice"
    );

  /*
   * Make absolutely sure this is treated as audio.
   */

  const originalUrl =
    result.secure_url ||
    result.url ||
    "";

  const browserAudioUrl =
    getBrowserAudioUrl(
      originalUrl
    );

  return {
    ...result,

    mediaType: "audio",

    /*
     * Original Cloudinary URL.
     */
    originalUrl,

    /*
     * Browser playback URL.
     */
    url: browserAudioUrl,

    browserAudioUrl,
  };
}

/**
 * ============================================================
 * GET AUDIO EXTENSION
 * ============================================================
 */

function getAudioExtension(
  mimeType = ""
) {
  const type =
    String(mimeType)
      .toLowerCase();

  if (
    type.includes("webm")
  ) {
    return "webm";
  }

  if (
    type.includes("ogg")
  ) {
    return "ogg";
  }

  if (
    type.includes("mp4")
  ) {
    return "m4a";
  }

  if (
    type.includes("mpeg")
  ) {
    return "mp3";
  }

  if (
    type.includes("wav")
  ) {
    return "wav";
  }

  return "webm";
}

/**
 * ============================================================
 * DELETE FROM CLOUDINARY
 * ============================================================
 *
 * Intentionally not implemented in the browser.
 *
 * Cloudinary unsigned uploads should not expose privileged
 * deletion credentials to the frontend.
 *
 * If deletion is required later, use a secure backend.
 */
export async function deleteFromCloudinary() {
  throw new Error(
    "Cloudinary deletion must be handled by a secure backend."
  );
}