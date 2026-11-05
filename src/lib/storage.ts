import { storage } from './firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { uploadImageToImgbb } from './imgbb';

/**
 * Uploads an image file:
 * 1. Attempts to upload directly to Firebase Storage (permanent storage under Bethlehem Kohhran project).
 * 2. If Firebase Storage is not yet enabled in the Firebase console or encounters an error,
 *    gracefully falls back to ImgBB so that uploading never fails.
 *
 * @param file The image file to upload
 * @param folder The folder path in storage (e.g. 'news', 'gallery', 'elders', 'upabial')
 * @returns The public URL of the uploaded image
 */
export async function uploadImage(file: File, folder = 'news'): Promise<string> {
  if (storage) {
    try {
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const filename = `${folder}/${Date.now()}_${sanitizedName}`;
      const storageRef = ref(storage, filename);
      
      const snapshot = await uploadBytes(storageRef, file, {
        contentType: file.type || 'image/jpeg',
      });
      const downloadUrl = await getDownloadURL(snapshot.ref);
      return downloadUrl;
    } catch (storageErr) {
      console.warn("Firebase Storage upload not available or failed, falling back to ImgBB:", storageErr);
    }
  }

  // Graceful fallback to ImgBB
  return await uploadImageToImgbb(file);
}
