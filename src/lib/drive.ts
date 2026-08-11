export interface DriveUrlParseResult {
  isDrive: boolean;
  type: 'file' | 'folder' | 'unknown';
  id?: string;
  directImageUrl?: string;
  embedFolderUrl?: string;
}

/**
 * Parses a Google Drive URL and extracts file or folder ID,
 * returning direct image embedding links or folder view links.
 */
export function parseGoogleDriveUrl(url: string): DriveUrlParseResult {
  if (!url || typeof url !== 'string') {
    return { isDrive: false, type: 'unknown' };
  }

  const trimmed = url.trim();

  // Check Folder URL
  const folderMatch = trimmed.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  if (folderMatch) {
    const folderId = folderMatch[1];
    return {
      isDrive: true,
      type: 'folder',
      id: folderId,
      embedFolderUrl: `https://drive.google.com/embeddedfolderview?id=${folderId}#grid`
    };
  }

  // Check File / Photo URL
  const fileMatch = 
    trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) ||
    trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/) ||
    trimmed.match(/\/d\/([a-zA-Z0-9_-]+)/);

  if (fileMatch) {
    const fileId = fileMatch[1];
    return {
      isDrive: true,
      type: 'file',
      id: fileId,
      directImageUrl: `https://lh3.googleusercontent.com/d/${fileId}`
    };
  }

  return { isDrive: false, type: 'unknown' };
}

/**
 * Transforms a Google Drive share link to a direct displayable image URL
 * or returns the original string if not a Google Drive file link.
 */
export function formatDriveImageUrl(url: string): string {
  const parsed = parseGoogleDriveUrl(url);
  if (parsed.isDrive && parsed.type === 'file' && parsed.directImageUrl) {
    return parsed.directImageUrl;
  }
  return url;
}
