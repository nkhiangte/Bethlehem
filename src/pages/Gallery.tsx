import React, { useState, useEffect } from 'react';
import { db, isFirebaseConfigured } from '../lib/firebase';
import { collection, getDocs, addDoc, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import { useAuth } from '../lib/auth';
import { GalleryImage, GalleryFolder } from '../types';
import { Image as ImageIcon, Plus, Trash2, X, Upload, Folder, FolderPlus, ChevronRight } from 'lucide-react';
import { uploadImageToImgbb } from '../lib/imgbb';

export default function Gallery() {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [folders, setFolders] = useState<GalleryFolder[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  
  // Modals
  const [isAddingImage, setIsAddingImage] = useState(false);
  const [isAddingFolder, setIsAddingFolder] = useState(false);
  
  // Forms
  const [uploading, setUploading] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newFolderName, setNewFolderName] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  const { isAdmin } = useAuth();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    if (!isFirebaseConfigured || !db) {
      setLoading(false);
      return;
    }
    try {
      // Fetch Images
      const imageQuery = query(collection(db, 'gallery'), orderBy('date', 'desc'));
      const imageSnap = await getDocs(imageQuery);
      const fetchedImages = imageSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      } as GalleryImage));
      setImages(fetchedImages);

      // Fetch Folders
      const folderSnap = await getDocs(collection(db, 'gallery_folders'));
      const fetchedFolders = folderSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      } as GalleryFolder));
      setFolders(fetchedFolders);
    } catch (error) {
      console.error("Error fetching gallery data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUploadImage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!db || !selectedFile || !newTitle.trim()) return;

    setUploading(true);
    try {
      const imageUrl = await uploadImageToImgbb(selectedFile);
      const imageData = {
        title: newTitle.trim(),
        imageUrl,
        date: new Date().toISOString(),
        folderId: currentFolderId,
      };
      
      const docRef = await addDoc(collection(db, 'gallery'), imageData);
      
      setImages([{ id: docRef.id, ...imageData }, ...images]);
      setIsAddingImage(false);
      setNewTitle('');
      setSelectedFile(null);
    } catch (error) {
      console.error("Error adding image:", error);
      alert("Failed to upload image. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!db || !newFolderName.trim()) return;

    setUploading(true);
    try {
      const folderData = {
        name: newFolderName.trim(),
        parentFolderId: currentFolderId,
        date: new Date().toISOString(),
      };
      
      const docRef = await addDoc(collection(db, 'gallery_folders'), folderData);
      
      const createdFolder: GalleryFolder = {
        id: docRef.id,
        ...folderData,
      };
      
      setFolders([createdFolder, ...folders]);
      setIsAddingFolder(false);
      setNewFolderName('');
    } catch (error) {
      console.error("Error creating folder:", error);
      alert("Failed to create folder. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const deleteFolderRecursive = async (folderId: string) => {
    if (!db) return;
    
    // Find all immediate child folders
    const childFolders = folders.filter(f => f.parentFolderId === folderId);
    for (const child of childFolders) {
      await deleteFolderRecursive(child.id);
    }

    // Find and delete all images in this folder
    const childImages = images.filter(img => img.folderId === folderId);
    for (const img of childImages) {
      try {
        await deleteDoc(doc(db, 'gallery', img.id));
      } catch (err) {
        console.error("Error deleting image in folder:", err);
      }
    }

    // Delete the folder itself
    try {
      await deleteDoc(doc(db, 'gallery_folders', folderId));
    } catch (err) {
      console.error("Error deleting folder document:", err);
    }
  };

  const handleDeleteFolder = async (folderId: string, folderName: string) => {
    if (!db || !window.confirm(`Are you sure you want to delete the folder "${folderName}" and all its contents (including subfolders and images)?`)) return;

    setLoading(true);
    try {
      await deleteFolderRecursive(folderId);
      
      const getDescendantFolderIds = (fid: string): string[] => {
        const ids = [fid];
        const children = folders.filter(f => f.parentFolderId === fid);
        for (const child of children) {
          ids.push(...getDescendantFolderIds(child.id));
        }
        return ids;
      };

      const deletedIds = getDescendantFolderIds(folderId);
      setFolders(folders.filter(f => !deletedIds.includes(f.id)));
      setImages(images.filter(img => !img.folderId || !deletedIds.includes(img.folderId)));
    } catch (error) {
      console.error("Error in folder deletion workflow:", error);
      alert("Failed to delete folder entirely.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteImage = async (id: string) => {
    if (!db || !window.confirm('Are you sure you want to delete this image?')) return;
    try {
      await deleteDoc(doc(db, 'gallery', id));
      setImages(images.filter(img => img.id !== id));
    } catch (error) {
      console.error("Error deleting image:", error);
    }
  };

  // Filter helpers
  const currentFolders = folders.filter(f => f.parentFolderId === currentFolderId);
  const currentImages = images.filter(img => (img.folderId || null) === currentFolderId);

  // Breadcrumbs
  const getBreadcrumbs = () => {
    const crumbs: GalleryFolder[] = [];
    let tempId = currentFolderId;
    while (tempId) {
      const folder = folders.find(f => f.id === tempId);
      if (folder) {
        crumbs.unshift(folder);
        tempId = folder.parentFolderId;
      } else {
        break;
      }
    }
    return crumbs;
  };

  const breadcrumbs = getBreadcrumbs();
  const currentFolderName = currentFolderId ? folders.find(f => f.id === currentFolderId)?.name : null;

  return (
    <div className="space-y-6">
      {/* Top Header Panel */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight uppercase">Gallery</h1>
          <p className="mt-1 text-stone-500 font-sans text-xs uppercase tracking-widest">
            {currentFolderName ? `Gallery / ${currentFolderName}` : 'Church Photo Gallery'}
          </p>
        </div>
        {isAdmin && (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setIsAddingFolder(true)}
              className="flex items-center gap-2 bg-[#fcfaf7] text-[#5A5A40] border border-[#ecece0] px-4 py-2 rounded-xl text-xs uppercase font-bold tracking-widest hover:bg-stone-50 transition-colors whitespace-nowrap"
            >
              <FolderPlus className="w-4 h-4" />
              New Folder
            </button>
            <button
              onClick={() => setIsAddingImage(true)}
              className="flex items-center gap-2 bg-[#5A5A40] text-white px-4 py-2 rounded-xl text-xs uppercase font-bold tracking-widest hover:bg-[#4a4a35] transition-colors whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              Add Image
            </button>
          </div>
        )}
      </div>

      {/* Breadcrumb Navigation Bar */}
      <div className="flex items-center flex-wrap gap-2 text-xs font-sans bg-white border border-[#ecece0] px-4 py-3 rounded-2xl shadow-sm">
        <button
          onClick={() => setCurrentFolderId(null)}
          className={`hover:text-[#5A5A40] transition ${!currentFolderId ? 'text-[#5A5A40] font-bold' : 'text-stone-500'}`}
        >
          HOME
        </button>
        {breadcrumbs.map((crumb, idx) => (
          <React.Fragment key={crumb.id}>
            <ChevronRight className="w-3.5 h-3.5 text-stone-300 shrink-0" />
            <button
              onClick={() => setCurrentFolderId(crumb.id)}
              className={`hover:text-[#5A5A40] transition uppercase tracking-wider ${
                idx === breadcrumbs.length - 1 ? 'text-[#5A5A40] font-bold' : 'text-stone-500'
              }`}
            >
              {crumb.name}
            </button>
          </React.Fragment>
        ))}
      </div>

      {loading ? (
        <div className="p-12 text-center text-sm text-stone-500 font-sans italic border border-dashed border-[#d0d0c5] rounded-[32px] bg-white">
          Loading gallery...
        </div>
      ) : currentFolders.length === 0 && currentImages.length === 0 ? (
        <div className="p-12 text-center text-stone-500 font-sans italic border border-dashed border-[#d0d0c5] rounded-[32px] bg-white">
          <ImageIcon className="w-12 h-12 mx-auto mb-4 text-stone-300" />
          <p>No folders or images available here yet.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Folders Section */}
          {currentFolders.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-xs uppercase tracking-widest font-bold text-stone-400 font-sans">Folders</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {currentFolders.map(folder => (
                  <div
                    key={folder.id}
                    className="bg-white border border-[#ecece0] hover:border-[#5A5A40]/30 rounded-2xl p-4 flex items-center justify-between shadow-sm hover:shadow transition group relative"
                  >
                    <button
                      onClick={() => setCurrentFolderId(folder.id)}
                      className="flex items-center gap-3 flex-1 text-left"
                    >
                      <div className="text-[#5A5A40] bg-[#f5f5f0] p-2.5 rounded-xl">
                        <Folder className="w-5 h-5" />
                      </div>
                      <div className="truncate pr-8">
                        <p className="font-serif italic text-base text-[#5A5A40] truncate leading-tight">{folder.name}</p>
                        <p className="text-[10px] text-stone-400 font-sans mt-0.5">
                          {folders.filter(f => f.parentFolderId === folder.id).length} subfolders &bull;{' '}
                          {images.filter(img => img.folderId === folder.id).length} images
                        </p>
                      </div>
                    </button>
                    {isAdmin && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteFolder(folder.id, folder.name);
                        }}
                        className="p-2 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Delete Folder"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Images Section */}
          {currentImages.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-xs uppercase tracking-widest font-bold text-stone-400 font-sans">Images</h2>
              <div className="columns-1 sm:columns-2 lg:columns-3 gap-6 space-y-6">
                {currentImages.map(image => (
                  <div key={image.id} className="break-inside-avoid relative group rounded-[24px] overflow-hidden bg-white shadow-sm border border-[#e0e0d5]">
                    <img src={image.imageUrl} alt={image.title} className="w-full h-auto object-cover" referrerPolicy="no-referrer" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4">
                      <h3 className="text-white font-serif text-lg">{image.title}</h3>
                      {isAdmin && (
                        <button 
                          onClick={() => handleDeleteImage(image.id)}
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
            </div>
          )}
        </div>
      )}

      {/* Add Folder Modal */}
      {isAddingFolder && isAdmin && (
        <div className="fixed inset-0 z-50 bg-stone-900/50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-[#f5f5f0] rounded-[32px] w-full max-w-md shadow-xl border border-[#e0e0d5] overflow-hidden">
            <div className="p-6 border-b border-[#e0e0d5] flex justify-between items-center bg-white">
              <h2 className="text-xl font-serif italic text-[#5A5A40] flex items-center gap-2">
                <FolderPlus className="w-5 h-5 text-stone-400" />
                {currentFolderName ? `New Subfolder in ${currentFolderName}` : 'Create New Folder'}
              </h2>
              <button onClick={() => { setIsAddingFolder(false); setNewFolderName(''); }} className="p-2 hover:bg-stone-100 rounded-full text-stone-500">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateFolder} className="p-6 space-y-4 font-sans bg-white">
              <div>
                <label className="block text-[10px] uppercase font-bold text-stone-500 tracking-widest mb-1">Folder Name</label>
                <input
                  type="text"
                  value={newFolderName}
                  onChange={e => setNewFolderName(e.target.value)}
                  className="w-full p-3 bg-[#fcfaf7] border border-[#ecece0] rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#5A5A40]"
                  required
                  placeholder="e.g. Inkhawm Thlalak, Sunday School..."
                />
              </div>
              <button
                type="submit"
                disabled={uploading || !newFolderName.trim()}
                className="w-full bg-[#5A5A40] text-white px-6 py-3 rounded-xl text-xs uppercase font-bold tracking-widest hover:bg-[#4a4a35] transition disabled:opacity-50 flex justify-center items-center"
              >
                {uploading ? 'Creating...' : 'Create Folder'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Upload Image Modal */}
      {isAddingImage && isAdmin && (
        <div className="fixed inset-0 z-50 bg-stone-900/50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-[#f5f5f0] rounded-[32px] w-full max-w-md shadow-xl border border-[#e0e0d5] overflow-hidden">
            <div className="p-6 border-b border-[#e0e0d5] flex justify-between items-center bg-white">
              <h2 className="text-xl font-serif italic text-[#5A5A40] flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-stone-400" />
                Upload Image {currentFolderName ? `to ${currentFolderName}` : ''}
              </h2>
              <button onClick={() => { setIsAddingImage(false); setSelectedFile(null); setNewTitle(''); }} className="p-2 hover:bg-stone-100 rounded-full text-stone-500">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleUploadImage} className="p-6 space-y-4 font-sans bg-white">
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
