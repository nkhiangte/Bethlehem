import React, { useState, useEffect } from 'react';
import { db, isFirebaseConfigured } from '../lib/firebase';
import { collection, getDocs, addDoc, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import { useAuth } from '../lib/auth';
import { GalleryImage } from '../types';
import { Image as ImageIcon, Plus, Trash2, X, Upload } from 'lucide-react';
import { uploadImageToImgbb } from '../lib/imgbb';

export default function Gallery() {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const { isAdmin } = useAuth();

  useEffect(() => {
    fetchImages();
  }, []);

  const fetchImages = async () => {
    if (!isFirebaseConfigured || !db) {
      setLoading(false);
      return;
    }
    try {
      const q = query(collection(db, 'gallery'), orderBy('date', 'desc'));
      const snap = await getDocs(q);
      const fetchedImages = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      } as GalleryImage));
      setImages(fetchedImages);
    } catch (error) {
      console.error("Error fetching images:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!db || !selectedFile || !newTitle.trim()) return;

    setUploading(true);
    try {
      const imageUrl = await uploadImageToImgbb(selectedFile);
      const docRef = await addDoc(collection(db, 'gallery'), {
        title: newTitle,
        imageUrl,
        date: new Date().toISOString(),
      });
      setImages([{ id: docRef.id, title: newTitle, imageUrl, date: new Date().toISOString() }, ...images]);
      setIsAdding(false);
      setNewTitle('');
      setSelectedFile(null);
    } catch (error) {
      console.error("Error adding image:", error);
      alert("Failed to upload image. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!db || !window.confirm('Are you sure you want to delete this image?')) return;
    try {
      await deleteDoc(doc(db, 'gallery', id));
      setImages(images.filter(img => img.id !== id));
    } catch (error) {
      console.error("Error deleting image:", error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight uppercase">Gallery</h1>
          <p className="mt-1 text-stone-500 font-sans text-xs uppercase tracking-widest">Church Photo Gallery</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-2 bg-[#5A5A40] text-white px-4 py-2 rounded-xl text-xs uppercase font-bold tracking-widest hover:bg-[#4a4a35] transition-colors whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            Add Image
          </button>
        )}
      </div>

      {loading ? (
        <div className="p-12 text-center text-sm text-stone-500 font-sans italic border border-dashed border-[#d0d0c5] rounded-[32px]">
          Loading gallery...
        </div>
      ) : images.length === 0 ? (
        <div className="p-12 text-center text-stone-500 font-sans italic border border-dashed border-[#d0d0c5] rounded-[32px]">
          <ImageIcon className="w-12 h-12 mx-auto mb-4 text-stone-300" />
          <p>No images available yet.</p>
        </div>
      ) : (
        <div className="columns-1 sm:columns-2 lg:columns-3 gap-6 space-y-6">
          {images.map(image => (
            <div key={image.id} className="break-inside-avoid relative group rounded-[24px] overflow-hidden bg-white shadow-sm border border-[#e0e0d5]">
              <img src={image.imageUrl} alt={image.title} className="w-full h-auto object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4">
                <h3 className="text-white font-serif text-lg">{image.title}</h3>
                {isAdmin && (
                  <button 
                    onClick={() => handleDelete(image.id)}
                    className="absolute top-4 right-4 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition"
                    title="Delete Image"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {isAdding && isAdmin && (
        <div className="fixed inset-0 z-50 bg-stone-900/50 flex items-center justify-center p-4">
          <div className="bg-[#f5f5f0] rounded-[32px] w-full max-w-md shadow-xl border border-[#e0e0d5] overflow-hidden">
            <div className="p-6 border-b border-[#e0e0d5] flex justify-between items-center bg-white">
              <h2 className="text-xl font-serif italic text-[#5A5A40] flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-stone-400" />
                Upload Image
              </h2>
              <button onClick={() => { setIsAdding(false); setSelectedFile(null); setNewTitle(''); }} className="p-2 hover:bg-stone-100 rounded-full text-stone-500">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleUpload} className="p-6 space-y-4 font-sans bg-white">
              <div>
                <label className="block text-[10px] uppercase font-bold text-stone-500 tracking-widest mb-1">Title</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  className="w-full p-3 bg-[#fcfaf7] border border-[#ecece0] rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#5A5A40]"
                  required
                  placeholder="Image Title..."
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase font-bold text-stone-500 tracking-widest mb-1">Select Image</label>
                <div className="relative border-2 border-dashed border-[#ecece0] rounded-xl p-8 text-center bg-[#fcfaf7] hover:bg-stone-50 transition-colors">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    required
                  />
                  <div className="flex flex-col items-center justify-center text-stone-500">
                    <Upload className="w-8 h-8 mb-2 text-stone-400" />
                    <span className="text-sm font-medium">
                      {selectedFile ? selectedFile.name : "Click or drag image to upload"}
                    </span>
                  </div>
                </div>
              </div>
              <button
                type="submit"
                disabled={uploading || !selectedFile || !newTitle.trim()}
                className="w-full bg-[#5A5A40] text-white px-6 py-3 rounded-xl text-xs uppercase font-bold tracking-widest hover:bg-[#4a4a35] transition disabled:opacity-50 flex justify-center items-center"
              >
                {uploading ? 'Uploading...' : 'Upload Image'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
