import type { AltApp, ScreenshotItem } from "../types";

export const imageUploadEnabled = import.meta.env.VITE_ENABLE_IMAGE_UPLOAD === "true";
export const imgurClientId = import.meta.env.VITE_IMGUR_CLIENT_ID;
export const imgurUploadUrl = "https://imgur.com/upload";

export type ScreenshotDevice = "iphone" | "ipad";
export type ScreenshotObject = Extract<ScreenshotItem, { imageURL: string }>;

const asScreenshotObject = (item: ScreenshotItem): ScreenshotObject => (typeof item === "string" ? { imageURL: item } : item);

export const getScreenshotLists = (screenshots: AltApp["screenshots"]): Record<ScreenshotDevice, ScreenshotObject[]> => {
  if (Array.isArray(screenshots)) {
    return {
      iphone: screenshots.map(asScreenshotObject),
      ipad: [],
    };
  }

  return {
    iphone: (screenshots?.iphone ?? []).map(asScreenshotObject),
    ipad: (screenshots?.ipad ?? []).map(asScreenshotObject),
  };
};

export const getImageSize = (url: string): Promise<Pick<ScreenshotObject, "width" | "height">> =>
  new Promise((resolve, reject) => {
    const image = new window.Image();
    image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
    image.onerror = () => reject(new Error("Could not read image size."));
    image.src = url;
  });

export const getFileImageSize = async (file: File): Promise<Pick<ScreenshotObject, "width" | "height">> => {
  const objectURL = URL.createObjectURL(file);
  try {
    return await getImageSize(objectURL);
  } finally {
    URL.revokeObjectURL(objectURL);
  }
};

const asFiniteNumber = (value: unknown): number | undefined => {
  const number = typeof value === "number" ? value : typeof value === "string" ? Number(value) : Number.NaN;
  return Number.isFinite(number) ? number : undefined;
};

export const uploadToImgur = async (file: File): Promise<ScreenshotObject> => {
  if (!imgurClientId) throw new Error("Imgur client ID is not configured.");
  const uploadBody = new FormData();
  uploadBody.append("image", file);
  uploadBody.append("type", "file");
  uploadBody.append("title", file.name);
  uploadBody.append("description", "Uploaded from AltEditor");

  const response = await fetch("https://api.imgur.com/3/image", {
    method: "POST",
    headers: {
      Authorization: `Client-ID ${imgurClientId}`,
    },
    body: uploadBody,
  });
  const responseBody = await response.json();
  const imageURL = responseBody?.data?.link;
  if (!response.ok || !responseBody?.success || !imageURL) {
    throw new Error(responseBody?.data?.error ?? "Image upload failed.");
  }
  return {
    imageURL,
    width: asFiniteNumber(responseBody?.data?.width),
    height: asFiniteNumber(responseBody?.data?.height),
  };
};

export const formatBytes = (bytes: number): string => {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 MB";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** index;
  return `${value.toFixed(index <= 1 ? 0 : 1)} ${units[index]}`;
};
