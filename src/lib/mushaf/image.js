/**
 * src/lib/mushaf/image.js
 * URLs for the official KFGQPC Madinah mushaf page images (1441H print, rendered to WebP).
 * Images are hosted in Supabase Storage (public bucket "mushaf"); the text-based page view
 * is used whenever no image source is configured.
 */

const IMAGE_FOLDER = 'kfgqpc-1441';

export function getMushafImageBaseUrl() {
  if (process.env.NEXT_PUBLIC_MUSHAF_IMAGE_BASE_URL) {
    return process.env.NEXT_PUBLIC_MUSHAF_IMAGE_BASE_URL.replace(/\/$/, '');
  }
  if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return `${process.env.NEXT_PUBLIC_SUPABASE_URL.replace(/\/$/, '')}/storage/v1/object/public/mushaf/${IMAGE_FOLDER}`;
  }
  return null;
}

export function isMushafImageEnabled() {
  return Boolean(getMushafImageBaseUrl());
}

export function getMushafImageUrl(pageNumber) {
  const base = getMushafImageBaseUrl();
  if (!base) return null;
  return `${base}/${String(pageNumber).padStart(3, '0')}.webp`;
}
