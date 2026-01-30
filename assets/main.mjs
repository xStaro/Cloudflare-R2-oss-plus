import { encodePathForUrl } from "./url-utils.mjs";
const THUMBNAIL_SIZE = 144;

/**
 * @param {File} file
 */
export async function generateThumbnail(file) {
  const canvas = document.createElement("canvas");
  canvas.width = THUMBNAIL_SIZE;
  canvas.height = THUMBNAIL_SIZE;
  var ctx = canvas.getContext("2d");

  /** @type HTMLImageElement */
  if (file.type.startsWith("image/")) {
    const image = await new Promise((resolve) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.src = URL.createObjectURL(file);
    });
    ctx.drawImage(image, 0, 0, THUMBNAIL_SIZE, THUMBNAIL_SIZE);
  } else if (file.type === "video/mp4") {
    // Generate thumbnail from video
    const video = await new Promise(async (resolve, reject) => {
      const video = document.createElement("video");
      video.muted = true;
      video.src = URL.createObjectURL(file);
      setTimeout(() => reject(new Error("Video load timeout")), 2000);
      await video.play();
      await video.pause();
      video.currentTime = 0;
      resolve(video);
    });
    ctx.drawImage(video, 0, 0, THUMBNAIL_SIZE, THUMBNAIL_SIZE);
  }

  /** @type Blob */
  const thumbnailBlob = await new Promise((resolve) =>
    canvas.toBlob((blob) => resolve(blob))
  );

  return thumbnailBlob;
}

/**
 * @param {Blob} blob
 */
export async function blobDigest(blob) {
  const digest = await crypto.subtle.digest("SHA-1", await blob.arrayBuffer());
  const digestArray = Array.from(new Uint8Array(digest));
  const digestHex = digestArray
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return digestHex;
}

export const SIZE_LIMIT = 80 * 1000 * 1000; // 80MB
const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_RETRY_DELAY_MS = 800;
const DEFAULT_CONCURRENCY = 3;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * @param {string} key
 * @param {File} file
 * @param {Record<string, any>} options
 */
export async function multipartUpload(key, file, options) {
  const encodedKey = encodePathForUrl(key);
  const headers = options?.headers || {};
  const chunkSize = Number.isFinite(options?.chunkSize)
    ? Math.max(1024 * 1024, options.chunkSize)
    : SIZE_LIMIT;
  const maxRetries = Number.isFinite(options?.retries)
    ? Math.max(0, options.retries)
    : DEFAULT_MAX_RETRIES;
  const retryDelayMs = Number.isFinite(options?.retryDelayMs)
    ? Math.max(0, options.retryDelayMs)
    : DEFAULT_RETRY_DELAY_MS;
  const concurrency = Number.isFinite(options?.concurrency)
    ? Math.max(1, options.concurrency)
    : DEFAULT_CONCURRENCY;
  headers["content-type"] = file.type;

  const resumeUploadId = options?.resume?.uploadId;
  const initialParts = Array.isArray(options?.resume?.uploadedParts)
    ? options.resume.uploadedParts.slice()
    : [];
  const uploadId = resumeUploadId
    ? resumeUploadId
    : await axios
        .post(`/api/write/items/${encodedKey}?uploads`, "", { headers })
        .then((res) => res.data.uploadId);
  const totalChunks = Math.ceil(file.size / chunkSize);
  const uploadedParts = initialParts;

  const uploadPartWithRetry = async (partNumber, chunk) => {
    const searchParams = new URLSearchParams({ partNumber, uploadId });
    let attempt = 0;
    while (true) {
      try {
        const response = await axios.put(
          `/api/write/items/${encodedKey}?${searchParams}`,
          chunk,
          {
            headers,
            onUploadProgress(progressEvent) {
              if (typeof options?.onUploadProgress !== "function") return;
              options.onUploadProgress({
                loaded: (partNumber - 1) * chunkSize + progressEvent.loaded,
                total: file.size,
                partNumber,
                partLoaded: progressEvent.loaded,
                partSize: chunk.size,
              });
            },
          }
        );
        return {
          partNumber,
          etag: response.headers.etag,
        };
      } catch (error) {
        error.partNumber = partNumber;
        if (attempt >= maxRetries) throw error;
        const jitter = Math.floor(Math.random() * 200);
        const delay = retryDelayMs * Math.pow(2, attempt) + jitter;
        attempt += 1;
        await sleep(delay);
      }
    }
  };

  const pendingParts = [];
  for (let i = 1; i <= totalChunks; i++) {
    if (uploadedParts[i - 1]) continue;
    const chunk = file.slice((i - 1) * chunkSize, i * chunkSize);
    pendingParts.push({ partNumber: i, chunk });
  }

  let nextIndex = 0;
  const workerCount = Math.min(concurrency, pendingParts.length || 1);
  const workers = Array.from({ length: workerCount }, async () => {
    while (nextIndex < pendingParts.length) {
      const current = pendingParts[nextIndex];
      nextIndex += 1;
      try {
        const { partNumber, etag } = await uploadPartWithRetry(current.partNumber, current.chunk);
        uploadedParts[partNumber - 1] = { partNumber, etag };
      } catch (error) {
        const multipartError = new Error("Multipart upload failed");
        multipartError.isMultipartUpload = true;
        multipartError.partNumber = error?.partNumber;
        multipartError.uploadId = uploadId;
        multipartError.uploadedParts = uploadedParts.filter(Boolean);
        multipartError.totalChunks = totalChunks;
        multipartError.cause = error;
        throw multipartError;
      }
    }
  });

  await Promise.all(workers);
  const completeParams = new URLSearchParams({ uploadId });
  await axios.post(
    `/api/write/items/${encodedKey}?${completeParams}`,
    {
      parts: uploadedParts,
    },
    { headers }
  );
}
