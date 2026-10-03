import { formatDriveImageUrl, parseGoogleDriveUrl } from './drive';

export interface SEOMetadata {
  title?: string;
  description?: string;
  imageUrl?: string;
  url?: string;
  type?: 'website' | 'article';
}

/**
 * Normalizes an image URL to a clean URL suitable for OpenGraph / WhatsApp / Twitter previews,
 * extracting Google Drive thumbnails and smaller size versions whenever applicable.
 */
export function resolveThumbnailUrl(imageUrl?: string, content?: string): string {
  if (imageUrl && imageUrl.trim()) {
    const trimmed = imageUrl.trim();
    // Check if it's a Google Drive URL
    const parsedDrive = parseGoogleDriveUrl(trimmed);
    if (parsedDrive.isDrive && parsedDrive.id) {
      return `https://lh3.googleusercontent.com/d/${parsedDrive.id}=s400`;
    }
    const formatted = formatDriveImageUrl(trimmed);
    if (formatted.startsWith('http://') || formatted.startsWith('https://')) {
      return formatted;
    }
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    return `${origin}${formatted.startsWith('/') ? '' : '/'}${formatted}`;
  }

  if (content) {
    // 1. HTML img tag
    const imgMatch = content.match(/<img[^>]+src=["']([^"']+)["']/i);
    if (imgMatch && imgMatch[1]) {
      const src = imgMatch[1].trim();
      const parsedDrive = parseGoogleDriveUrl(src);
      if (parsedDrive.isDrive && parsedDrive.id) {
        return `https://lh3.googleusercontent.com/d/${parsedDrive.id}=s400`;
      }
      const formatted = formatDriveImageUrl(src);
      if (formatted.startsWith('http://') || formatted.startsWith('https://')) {
        return formatted;
      }
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      return `${origin}${formatted.startsWith('/') ? '' : '/'}${formatted}`;
    }

    // 2. Markdown image: ![alt](url)
    const mdMatch = content.match(/!\[.*?\]\((https?:\/\/[^\s\)]+|\/[^\s\)]+)\)/i);
    if (mdMatch && mdMatch[1]) {
      const src = mdMatch[1].trim();
      const parsedDrive = parseGoogleDriveUrl(src);
      if (parsedDrive.isDrive && parsedDrive.id) {
        return `https://lh3.googleusercontent.com/d/${parsedDrive.id}=s400`;
      }
      const formatted = formatDriveImageUrl(src);
      if (formatted.startsWith('http://') || formatted.startsWith('https://')) {
        return formatted;
      }
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      return `${origin}${formatted.startsWith('/') ? '' : '/'}${formatted}`;
    }

    // 3. Raw image URL in content text (ImgBB, Cloudinary, Drive, etc.)
    const urlMatch = content.match(/(https:\/\/(?:i\.ibb\.co|lh3\.googleusercontent\.com|drive\.google\.com)\/[^\s<>"']+)/i);
    if (urlMatch && urlMatch[1]) {
      const src = urlMatch[1].trim();
      const parsedDrive = parseGoogleDriveUrl(src);
      if (parsedDrive.isDrive && parsedDrive.id) {
        return `https://lh3.googleusercontent.com/d/${parsedDrive.id}=s400`;
      }
      return formatDriveImageUrl(src);
    }
  }

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return `${origin}/og-thumb.jpg`;
}

/**
 * Updates document head meta tags dynamically for SEO and Social Media sharing
 */
export function updateDocumentMetadata(meta: SEOMetadata) {
  if (typeof document === 'undefined') return;

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const currentUrl = meta.url 
    ? (meta.url.startsWith('http') ? meta.url : `${origin}${meta.url.startsWith('/') ? '' : '/'}${meta.url}`)
    : (typeof window !== 'undefined' ? window.location.href : '');

  const pageTitle = meta.title 
    ? (meta.title.includes('Bethlehem Kohhran') ? meta.title : `${meta.title} | Bethlehem Kohhran`)
    : 'Bethlehem Kohhran';

  const description = meta.description 
    ? meta.description.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 160)
    : 'Official website of Bethlehem Kohhran, Aizawl. Stay updated with church programs, directory, and announcements.';

  const imageUrl = meta.imageUrl || `${origin}/og-thumb.jpg`;

  // 1. Document title
  document.title = pageTitle;

  // Helper to set or create meta tag
  const setMetaTag = (attr: 'name' | 'property', key: string, value: string) => {
    let el = document.querySelector(`meta[${attr}="${key}"]`);
    if (!el) {
      el = document.createElement('meta');
      el.setAttribute(attr, key);
      document.head.appendChild(el);
    }
    el.setAttribute('content', value);
  };

  // 2. Standard description
  setMetaTag('name', 'description', description);

  // 3. OpenGraph
  setMetaTag('property', 'og:title', pageTitle);
  setMetaTag('property', 'og:description', description);
  setMetaTag('property', 'og:type', meta.type || 'website');
  setMetaTag('property', 'og:url', currentUrl);
  setMetaTag('property', 'og:site_name', 'Bethlehem Kohhran');
  setMetaTag('property', 'og:image', imageUrl);
  setMetaTag('property', 'og:image:secure_url', imageUrl);

  // 4. Twitter
  setMetaTag('name', 'twitter:card', 'summary_large_image');
  setMetaTag('name', 'twitter:title', pageTitle);
  setMetaTag('name', 'twitter:description', description);
  setMetaTag('name', 'twitter:image', imageUrl);

  // 5. Canonical & image_src link
  let canonical = document.querySelector('link[rel="canonical"]');
  if (!canonical) {
    canonical = document.createElement('link');
    canonical.setAttribute('rel', 'canonical');
    document.head.appendChild(canonical);
  }
  canonical.setAttribute('href', currentUrl);

  let imageSrc = document.querySelector('link[rel="image_src"]');
  if (!imageSrc) {
    imageSrc = document.createElement('link');
    imageSrc.setAttribute('rel', 'image_src');
    document.head.appendChild(imageSrc);
  }
  imageSrc.setAttribute('href', imageUrl);
}
