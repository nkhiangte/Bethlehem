import React, { useState, useEffect } from 'react';
import { db, isFirebaseConfigured } from '../lib/firebase';
import { collection, getDocs, addDoc, setDoc, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import { useAuth } from '../lib/auth';
import { GalleryImage, GalleryFolder } from '../types';
import { Image as ImageIcon, Plus, Trash2, X, Upload, Folder, FolderPlus, ChevronRight, ExternalLink, Link as LinkIcon, Pencil, Eye } from 'lucide-react';
import { uploadImageToImgbb } from '../lib/imgbb';
import { parseGoogleDriveUrl } from '../lib/drive';

const GoogleDriveLogo = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M7.71 3.5L1.15 14.86L4.58 20.8L11.14 9.44L7.71 3.5Z" fill="#0066DA"/>
    <path d="M16.29 3.5H7.71L11.14 9.44H19.72L16.29 3.5Z" fill="#00AC47"/>
    <path d="M19.72 9.44L13.16 20.8H19.72L22.85 15.38L19.72 9.44Z" fill="#EA4335"/>
    <path d="M4.58 20.8H19.72L16.29 14.86H1.15L4.58 20.8Z" fill="#FFBA00"/>
  </svg>
);

export default function Gallery() {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [folders, setFolders] = useState<GalleryFolder[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  
  // Modals
  const [isAddingImage, setIsAddingImage] = useState(false);
  const [isAddingFolder, setIsAddingFolder] = useState(false);
  const [editingFolder, setEditingFolder] = useState<GalleryFolder | null>(null);
  const [viewingImage, setViewingImage] = useState<GalleryImage | null>(null);
  
  // Add Content Mode (File upload vs Google Drive link)
  const [addMode, setAddMode] = useState<'file' | 'drive'>('file');
  
  // Forms & Inputs
  const [uploading, setUploading] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderDriveUrl, setNewFolderDriveUrl] = useState('');
  
  // Local File Upload state
  const [selectedFiles, setSelectedFiles] = useState<{ id: string; file: File; title: string; previewUrl: string }[]>([]);
  const [commonPrefix, setCommonPrefix] = useState('');
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(null);
  
  // Google Drive Link state
  const [driveLinksText, setDriveLinksText] = useState('');
  const [driveLinkTitle, setDriveLinkTitle] = useState('');

  // Track broken images
  const [brokenImageIds, setBrokenImageIds] = useState<Record<string, boolean>>({});

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

  const handleCloseImageModal = () => {
    setIsAddingImage(false);
    selectedFiles.forEach(item => URL.revokeObjectURL(item.previewUrl));
    setSelectedFiles([]);
    setCommonPrefix('');
    setDriveLinksText('');
    setDriveLinkTitle('');
    setUploadProgress(null);
  };

  const openCreateFolderModal = () => {
    setEditingFolder(null);
    setNewFolderName('');
    setNewFolderDriveUrl('');
    setIsAddingFolder(true);
  };

  const openEditFolderModal = (folder: GalleryFolder) => {
    setEditingFolder(folder);
    setNewFolderName(folder.name);
    setNewFolderDriveUrl(folder.driveUrl || '');
    setIsAddingFolder(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files) as File[];
      const newItems = filesArray.map(file => {
        const cleanedTitle = file.name
          .replace(/\.[^/.]+$/, "")
          .replace(/[_-]/g, " ")
          .trim();
        return {
          id: Math.random().toString(36).substring(2, 9),
          file,
          title: cleanedTitle.charAt(0).toUpperCase() + cleanedTitle.slice(1),
          previewUrl: URL.createObjectURL(file)
        };
      });
      setSelectedFiles(prev => [...prev, ...newItems]);
    }
  };

  const applyCommonPrefix = () => {
    if (!commonPrefix.trim()) return;
    setSelectedFiles(prev => prev.map(item => {
      const prefix = commonPrefix.trim();
      const currentTitle = item.title;
      const newTitle = currentTitle.startsWith(prefix) ? currentTitle : `${prefix} - ${currentTitle}`;
      return {
        ...item,
        title: newTitle
      };
    }));
    setCommonPrefix('');
  };

  const clearAllSelected = () => {
    selectedFiles.forEach(item => URL.revokeObjectURL(item.previewUrl));
    setSelectedFiles([]);
  };

  // Upload Local Image Files
  const handleUploadImageFiles = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!db || selectedFiles.length === 0) return;

    setUploading(true);
    const uploadedImages = [];
    let successCount = 0;
    let failCount = 0;

    try {
      for (let i = 0; i < selectedFiles.length; i++) {
        setUploadProgress({ current: i + 1, total: selectedFiles.length });
        const item = selectedFiles[i];
        try {
          const imageUrl = await uploadImageToImgbb(item.file);
          const imageData = {
            title: item.title.trim() || 'Untitled',
            imageUrl,
            date: new Date().toISOString(),
            folderId: currentFolderId,
          };
          
          const docRef = await addDoc(collection(db, 'gallery'), imageData);
          uploadedImages.push({ id: docRef.id, ...imageData });
          successCount++;
        } catch (err) {
          console.error(`Error uploading file ${item.file.name}:`, err);
          failCount++;
        }
      }

      if (uploadedImages.length > 0) {
        setImages(prev => [...uploadedImages, ...prev]);
      }

      if (failCount > 0) {
        alert(`Successfully uploaded ${successCount} images. ${failCount} failed.`);
      }

      handleCloseImageModal();
    } catch (error) {
      console.error("Error adding images:", error);
      alert("An unexpected error occurred during upload.");
    } finally {
      setUploading(false);
      setUploadProgress(null);
    }
  };

  // Add Google Drive Links
  const handleAddDriveLinks = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!db || !driveLinksText.trim()) return;

    setUploading(true);
    try {
      const rawUrls = driveLinksText
        .split('\n')
        .map(u => u.trim())
        .filter(u => u.length > 0 && (u.startsWith('http://') || u.startsWith('https://')));

      if (rawUrls.length === 0) {
        alert("Please enter at least one valid HTTP/HTTPS Google Drive link.");
        setUploading(false);
        return;
      }

      const newDriveImages: GalleryImage[] = [];

      for (let i = 0; i < rawUrls.length; i++) {
        const link = rawUrls[i];
        const parsed = parseGoogleDriveUrl(link);

        let finalImageUrl = link;
        if (parsed.isDrive && parsed.type === 'file' && parsed.directImageUrl) {
          finalImageUrl = parsed.directImageUrl;
        } else if (parsed.isDrive && parsed.type === 'folder') {
          // Folder thumbnail placeholder
          finalImageUrl = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=60';
        }

        const titleText = driveLinkTitle.trim() 
          ? (rawUrls.length > 1 ? `${driveLinkTitle.trim()} #${i + 1}` : driveLinkTitle.trim())
          : (parsed.type === 'folder' ? 'Google Drive Folder' : `Google Drive Photo ${i + 1}`);

        const imageData = {
          title: titleText,
          imageUrl: finalImageUrl,
          driveUrl: link,
          isDriveLink: true,
          date: new Date().toISOString(),
          folderId: currentFolderId,
        };

        const docRef = await addDoc(collection(db, 'gallery'), imageData);
        newDriveImages.push({ id: docRef.id, ...imageData });
      }

      setImages(prev => [...newDriveImages, ...prev]);
      handleCloseImageModal();
    } catch (error) {
      console.error("Error adding Google Drive links:", error);
      alert("Failed to add Google Drive links.");
    } finally {
      setUploading(false);
    }
  };

  // Create or Edit Folder
  const handleSaveFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!db || !newFolderName.trim()) return;

    setUploading(true);
    try {
      const folderData = {
        name: newFolderName.trim(),
        driveUrl: newFolderDriveUrl.trim() || null,
        parentFolderId: editingFolder ? editingFolder.parentFolderId : currentFolderId,
        date: editingFolder ? editingFolder.date : new Date().toISOString(),
      };

      if (editingFolder?.id) {
        await setDoc(doc(db, 'gallery_folders', editingFolder.id), folderData, { merge: true });
        setFolders(prev => prev.map(f => f.id === editingFolder.id ? { ...f, ...folderData } as GalleryFolder : f));
      } else {
        const docRef = await addDoc(collection(db, 'gallery_folders'), folderData);
        const createdFolder: GalleryFolder = {
          id: docRef.id,
          ...folderData,
        } as GalleryFolder;
        setFolders([createdFolder, ...folders]);
      }

      setIsAddingFolder(false);
      setEditingFolder(null);
      setNewFolderName('');
      setNewFolderDriveUrl('');
    } catch (error) {
      console.error("Error saving folder:", error);
      alert("Failed to save folder. Please try again.");
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
      if (viewingImage?.id === id) {
        setViewingImage(null);
      }
    } catch (error) {
      console.error("Error deleting image:", error);
    }
  };

  // Filter helpers
  const currentFolders = folders.filter(f => f.parentFolderId === currentFolderId);
  const currentImages = images.filter(img => (img.folderId || null) === currentFolderId);
  const currentFolder = currentFolderId ? folders.find(f => f.id === currentFolderId) : null;

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
  const currentFolderName = currentFolder ? currentFolder.name : null;

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
              onClick={openCreateFolderModal}
              className="flex items-center gap-2 bg-[#fcfaf7] text-[#5A5A40] border border-[#ecece0] px-4 py-2 rounded-xl text-xs uppercase font-bold tracking-widest hover:bg-stone-50 transition-colors whitespace-nowrap shadow-xs"
            >
              <FolderPlus className="w-4 h-4 text-[#5A5A40]" />
              New Folder
            </button>
            <button
              onClick={() => { setIsAddingImage(true); setAddMode('file'); }}
              className="flex items-center gap-2 bg-[#5A5A40] text-white px-4 py-2 rounded-xl text-xs uppercase font-bold tracking-widest hover:bg-[#4a4a35] transition-colors whitespace-nowrap shadow-xs"
            >
              <Plus className="w-4 h-4" />
              Add Images / Drive Links
            </button>
          </div>
        )}
      </div>

      {/* Breadcrumb Navigation Bar */}
      <div className="flex items-center flex-wrap gap-2 text-xs font-sans bg-white border border-[#ecece0] px-4 py-3 rounded-2xl shadow-xs">
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

      {/* Active Folder Google Drive Banner */}
      {currentFolder?.driveUrl && (
        <div className="bg-gradient-to-r from-emerald-950/5 via-stone-100 to-blue-950/5 border border-emerald-800/20 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white rounded-xl shadow-xs border border-stone-200">
              <GoogleDriveLogo className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-serif italic font-semibold text-[#5A5A40] text-base">Google Drive Photo Album Linked</h3>
                <span className="bg-emerald-100 text-emerald-800 text-[9px] font-sans font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">Drive Linked</span>
              </div>
              <p className="text-xs text-stone-500 font-sans mt-0.5">
                Full photo collection stored on Google Drive for {currentFolder.name}.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
            <a
              href={currentFolder.driveUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 bg-[#5A5A40] text-white text-xs font-sans font-bold uppercase tracking-wider px-4 py-2.5 rounded-xl hover:bg-[#4a4a35] transition shadow-xs"
            >
              <GoogleDriveLogo className="w-4 h-4" />
              <span>Open Google Drive Album</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
            {isAdmin && (
              <button
                onClick={() => openEditFolderModal(currentFolder)}
                className="p-2.5 bg-white text-stone-600 border border-stone-200 rounded-xl hover:bg-stone-50 transition"
                title="Edit Google Drive Link"
              >
                <Pencil className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {loading ? (
        <div className="p-12 text-center text-sm text-stone-500 font-sans italic border border-dashed border-[#d0d0c5] rounded-[32px] bg-white">
          Loading gallery...
        </div>
      ) : currentFolders.length === 0 && currentImages.length === 0 ? (
        <div className="p-12 text-center text-stone-500 font-sans italic border border-dashed border-[#d0d0c5] rounded-[32px] bg-white space-y-3">
          <ImageIcon className="w-12 h-12 mx-auto text-stone-300" />
          <p>No folders or images available here yet.</p>
          {isAdmin && (
            <div className="flex justify-center gap-3 pt-2">
              <button
                onClick={openCreateFolderModal}
                className="inline-flex items-center gap-2 bg-[#fcfaf7] text-[#5A5A40] border border-[#ecece0] px-4 py-2 rounded-xl text-xs uppercase font-bold tracking-widest hover:bg-stone-50"
              >
                <FolderPlus className="w-4 h-4" />
                Create Folder
              </button>
              <button
                onClick={() => { setIsAddingImage(true); setAddMode('drive'); }}
                className="inline-flex items-center gap-2 bg-[#5A5A40] text-white px-4 py-2 rounded-xl text-xs uppercase font-bold tracking-widest hover:bg-[#4a4a35]"
              >
                <GoogleDriveLogo className="w-4 h-4" />
                Add Google Drive Links
              </button>
            </div>
          )}
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
                    className="bg-white border border-[#ecece0] hover:border-[#5A5A40]/30 rounded-2xl p-4 flex items-center justify-between shadow-xs hover:shadow-sm transition group relative"
                  >
                    <button
                      onClick={() => setCurrentFolderId(folder.id)}
                      className="flex items-center gap-3 flex-1 text-left min-w-0 pr-2"
                    >
                      <div className="text-[#5A5A40] bg-[#f5f5f0] p-2.5 rounded-xl shrink-0 relative">
                        <Folder className="w-5 h-5" />
                        {folder.driveUrl && (
                          <div className="absolute -bottom-1 -right-1 bg-emerald-600 text-white rounded-full p-0.5 shadow-xs" title="Google Drive Linked">
                            <GoogleDriveLogo className="w-3 h-3" />
                          </div>
                        )}
                      </div>
                      <div className="truncate">
                        <div className="flex items-center gap-1.5">
                          <p className="font-serif italic text-base text-[#5A5A40] truncate leading-tight">{folder.name}</p>
                        </div>
                        <p className="text-[10px] text-stone-400 font-sans mt-0.5 truncate">
                          {folders.filter(f => f.parentFolderId === folder.id).length} subfolders &bull;{' '}
                          {images.filter(img => img.folderId === folder.id).length} images
                          {folder.driveUrl && <span className="text-emerald-700 font-medium ml-1">&bull; Drive</span>}
                        </p>
                      </div>
                    </button>
                    {isAdmin && (
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditFolderModal(folder);
                          }}
                          className="p-1.5 text-stone-400 hover:text-[#5A5A40] hover:bg-stone-100 rounded-lg transition"
                          title="Edit Folder / Drive Link"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteFolder(folder.id, folder.name);
                          }}
                          className="p-1.5 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                          title="Delete Folder"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Images Section */}
          {currentImages.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-xs uppercase tracking-widest font-bold text-stone-400 font-sans">Images & Drive Content</h2>
              <div className="columns-1 sm:columns-2 lg:columns-3 gap-6 space-y-6">
                {currentImages.map(image => {
                  const isBroken = brokenImageIds[image.id];
                  const isDrive = image.isDriveLink || !!image.driveUrl;

                  return (
                    <div 
                      key={image.id} 
                      className="break-inside-avoid relative group rounded-[24px] overflow-hidden bg-white shadow-xs border border-[#e0e0d5] cursor-pointer hover:shadow-md transition-all"
                      onClick={() => setViewingImage(image)}
                    >
                      {isBroken ? (
                        <div className="p-8 text-center bg-stone-100 flex flex-col items-center justify-center space-y-2 min-h-[200px]">
                          <GoogleDriveLogo className="w-10 h-10 opacity-80" />
                          <p className="text-xs font-sans font-bold text-stone-700">{image.title}</p>
                          <p className="text-[10px] text-stone-500 font-sans">Hosted on Google Drive</p>
                          <a
                            href={image.driveUrl || image.imageUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1.5 bg-[#5A5A40] text-white text-[10px] font-sans font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg mt-2"
                          >
                            <span>Open on Google Drive</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      ) : (
                        <div className="relative overflow-hidden bg-stone-100 min-h-[160px]">
                          <img 
                            src={image.imageUrl} 
                            alt={image.title} 
                            className="w-full h-auto object-cover group-hover:scale-102 transition-transform duration-300" 
                            referrerPolicy="no-referrer"
                            onError={() => {
                              setBrokenImageIds(prev => ({ ...prev, [image.id]: true }));
                            }}
                          />
                        </div>
                      )}

                      {/* Badge if Google Drive */}
                      {isDrive && (
                        <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-md border border-stone-200/80 px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-xs text-[10px] font-sans font-bold text-stone-700">
                          <GoogleDriveLogo className="w-3.5 h-3.5" />
                          <span>Google Drive</span>
                        </div>
                      )}

                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4">
                        <h3 className="text-white font-serif text-base font-medium drop-shadow-xs">{image.title}</h3>
                        <div className="flex items-center justify-between text-[10px] text-stone-300 font-sans mt-1">
                          <span>{new Date(image.date).toLocaleDateString()}</span>
                          <span className="flex items-center gap-1 text-white/90">
                            <Eye className="w-3 h-3" /> Preview
                          </span>
                        </div>
                        {isAdmin && (
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteImage(image.id);
                            }}
                            className="absolute top-3 right-3 p-2 bg-red-500/90 hover:bg-red-600 text-white rounded-full transition shadow-xs"
                            title="Delete Image"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Lightbox Preview Modal */}
      {viewingImage && (
        <div 
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-md"
          onClick={() => setViewingImage(null)}
        >
          <div 
            className="bg-white rounded-[28px] max-w-4xl w-full overflow-hidden shadow-2xl border border-stone-200 flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-stone-200 flex justify-between items-center bg-[#fcfaf7]">
              <div className="flex items-center gap-2">
                {(viewingImage.isDriveLink || viewingImage.driveUrl) && <GoogleDriveLogo className="w-5 h-5" />}
                <h3 className="font-serif italic text-lg text-[#5A5A40] font-semibold">{viewingImage.title}</h3>
              </div>
              <button 
                onClick={() => setViewingImage(null)} 
                className="p-2 hover:bg-stone-200/60 rounded-full text-stone-600 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 bg-stone-900 flex-1 flex items-center justify-center overflow-auto min-h-[300px]">
              {brokenImageIds[viewingImage.id] ? (
                <div className="text-center text-white space-y-3 p-8">
                  <GoogleDriveLogo className="w-16 h-16 mx-auto opacity-90" />
                  <p className="text-lg font-serif italic">Hosted on Google Drive</p>
                  <p className="text-xs text-stone-300 font-sans max-w-md mx-auto">
                    This file is stored in Google Drive. Click the button below to view or download it directly in Google Drive.
                  </p>
                </div>
              ) : (
                <img 
                  src={viewingImage.imageUrl} 
                  alt={viewingImage.title} 
                  className="max-h-[65vh] w-auto object-contain rounded-lg shadow-md"
                  referrerPolicy="no-referrer"
                />
              )}
            </div>

            <div className="p-4 border-t border-stone-200 bg-white flex flex-col sm:flex-row justify-between items-center gap-3">
              <span className="text-xs text-stone-500 font-sans">
                Added {new Date(viewingImage.date).toLocaleDateString()}
              </span>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                {(viewingImage.driveUrl || viewingImage.isDriveLink) && (
                  <a
                    href={viewingImage.driveUrl || viewingImage.imageUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 bg-[#5A5A40] text-white px-4 py-2 rounded-xl text-xs uppercase font-bold tracking-widest hover:bg-[#4a4a35] transition"
                  >
                    <GoogleDriveLogo className="w-4 h-4" />
                    <span>Open in Google Drive</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
                {isAdmin && (
                  <button
                    onClick={() => handleDeleteImage(viewingImage.id)}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Folder Modal */}
      {isAddingFolder && isAdmin && (
        <div className="fixed inset-0 z-50 bg-stone-900/50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-[#f5f5f0] rounded-[32px] w-full max-w-md shadow-xl border border-[#e0e0d5] overflow-hidden">
            <div className="p-6 border-b border-[#e0e0d5] flex justify-between items-center bg-white">
              <h2 className="text-xl font-serif italic text-[#5A5A40] flex items-center gap-2">
                <FolderPlus className="w-5 h-5 text-stone-400" />
                {editingFolder 
                  ? `Edit Folder: ${editingFolder.name}` 
                  : (currentFolderName ? `New Subfolder in ${currentFolderName}` : 'Create New Folder')}
              </h2>
              <button 
                onClick={() => { setIsAddingFolder(false); setEditingFolder(null); setNewFolderName(''); setNewFolderDriveUrl(''); }} 
                className="p-2 hover:bg-stone-100 rounded-full text-stone-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveFolder} className="p-6 space-y-4 font-sans bg-white">
              <div>
                <label className="block text-[10px] uppercase font-bold text-stone-500 tracking-widest mb-1">Folder Name *</label>
                <input
                  type="text"
                  value={newFolderName}
                  onChange={e => setNewFolderName(e.target.value)}
                  className="w-full p-3 bg-[#fcfaf7] border border-[#ecece0] rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#5A5A40]"
                  required
                  placeholder="e.g. Youth Camp 2026, Sunday School..."
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-stone-500 tracking-widest mb-1 flex items-center gap-1.5">
                  <GoogleDriveLogo className="w-3.5 h-3.5" />
                  Google Drive Link (Optional)
                </label>
                <input
                  type="url"
                  value={newFolderDriveUrl}
                  onChange={e => setNewFolderDriveUrl(e.target.value)}
                  className="w-full p-3 bg-[#fcfaf7] border border-[#ecece0] rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#5A5A40]"
                  placeholder="https://drive.google.com/drive/folders/..."
                />
                <p className="text-[10px] text-stone-400 mt-1 italic">
                  Attach a Google Drive folder link so visitors can open the entire photo album directly in Google Drive.
                </p>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => { setIsAddingFolder(false); setEditingFolder(null); }}
                  className="flex-1 bg-white border border-[#ecece0] text-stone-600 px-4 py-3 rounded-xl text-xs uppercase font-bold tracking-widest hover:bg-stone-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading || !newFolderName.trim()}
                  className="flex-[2] bg-[#5A5A40] text-white px-6 py-3 rounded-xl text-xs uppercase font-bold tracking-widest hover:bg-[#4a4a35] transition disabled:opacity-50 flex justify-center items-center gap-2"
                >
                  {uploading ? 'Saving...' : (editingFolder ? 'Save Changes' : 'Create Folder')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Images / Google Drive Links Modal */}
      {isAddingImage && isAdmin && (
        <div className="fixed inset-0 z-50 bg-stone-900/50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-[#f5f5f0] rounded-[32px] w-full max-w-2xl shadow-xl border border-[#e0e0d5] overflow-hidden">
            <div className="p-6 border-b border-[#e0e0d5] flex justify-between items-center bg-white">
              <h2 className="text-xl font-serif italic text-[#5A5A40] flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-stone-400" />
                Add Content {currentFolderName ? `to ${currentFolderName}` : ''}
              </h2>
              <button onClick={handleCloseImageModal} className="p-2 hover:bg-stone-100 rounded-full text-stone-500">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Mode Switcher Tabs */}
            <div className="flex border-b border-[#ecece0] bg-[#fcfaf7]">
              <button
                type="button"
                onClick={() => setAddMode('file')}
                className={`flex-1 py-3 text-xs uppercase font-bold tracking-wider font-sans border-b-2 transition flex items-center justify-center gap-2 ${
                  addMode === 'file'
                    ? 'border-[#5A5A40] text-[#5A5A40] bg-white'
                    : 'border-transparent text-stone-400 hover:text-stone-600'
                }`}
              >
                <Upload className="w-4 h-4" />
                Upload File Images
              </button>
              <button
                type="button"
                onClick={() => setAddMode('drive')}
                className={`flex-1 py-3 text-xs uppercase font-bold tracking-wider font-sans border-b-2 transition flex items-center justify-center gap-2 ${
                  addMode === 'drive'
                    ? 'border-[#5A5A40] text-[#5A5A40] bg-white'
                    : 'border-transparent text-stone-400 hover:text-stone-600'
                }`}
              >
                <GoogleDriveLogo className="w-4 h-4" />
                Google Drive Links
              </button>
            </div>
            
            {addMode === 'file' ? (
              <form onSubmit={handleUploadImageFiles} className="p-6 space-y-4 font-sans bg-white">
                {selectedFiles.length === 0 ? (
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-stone-500 tracking-widest mb-1">Select Local Images</label>
                    <div className="relative border-2 border-dashed border-[#ecece0] rounded-xl p-12 text-center bg-[#fcfaf7] hover:bg-stone-50 transition-colors">
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleFileChange}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        required
                      />
                      <div className="flex flex-col items-center justify-center text-stone-500">
                        <Upload className="w-10 h-10 mb-2 text-stone-400" />
                        <span className="text-sm font-medium mb-1">Click or drag images to upload</span>
                        <span className="text-xs text-stone-400">You can select multiple files at once</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Toolbar */}
                    <div className="flex flex-col sm:flex-row gap-4 items-end bg-[#fcfaf7] border border-[#ecece0] p-4 rounded-2xl">
                      <div className="flex-1 w-full">
                        <label className="block text-[10px] uppercase font-bold text-stone-500 tracking-widest mb-1">Add Common Prefix (Optional)</label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={commonPrefix}
                            onChange={e => setCommonPrefix(e.target.value)}
                            className="flex-1 p-2.5 bg-white border border-[#ecece0] rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-[#5A5A40]"
                            placeholder="e.g. Youth Camp 2026"
                          />
                          <button
                            type="button"
                            onClick={applyCommonPrefix}
                            disabled={!commonPrefix.trim()}
                            className="bg-[#5A5A40] text-white px-4 py-2 rounded-xl text-[10px] uppercase font-bold tracking-widest hover:bg-[#4a4a35] transition disabled:opacity-50 font-sans"
                          >
                            Apply
                          </button>
                        </div>
                      </div>
                      <div className="flex gap-2 w-full sm:w-auto shrink-0">
                        <label className="cursor-pointer bg-white border border-[#ecece0] px-4 py-2.5 rounded-xl text-[10px] uppercase font-bold tracking-widest text-[#5A5A40] hover:bg-stone-50 transition flex items-center justify-center gap-1.5 flex-1 sm:flex-none">
                          <Plus className="w-3.5 h-3.5" />
                          Add More
                          <input
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={handleFileChange}
                            className="hidden"
                          />
                        </label>
                        <button
                          type="button"
                          onClick={clearAllSelected}
                          className="bg-red-50 text-red-500 border border-red-100 px-4 py-2.5 rounded-xl text-[10px] uppercase font-bold tracking-widest hover:bg-red-100 transition flex items-center justify-center gap-1.5 flex-1 sm:flex-none"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Clear All
                        </button>
                      </div>
                    </div>

                    {/* List of pending uploads */}
                    <div className="max-h-72 overflow-y-auto border border-[#ecece0] rounded-2xl divide-y divide-[#ecece0]">
                      {selectedFiles.map((item, index) => (
                        <div key={item.id} className="p-3 flex items-center gap-4 bg-white hover:bg-stone-50 transition">
                          <div className="relative w-14 h-14 shrink-0 rounded-lg overflow-hidden border border-[#ecece0]">
                            <img src={item.previewUrl} alt="Preview" className="w-full h-full object-cover" />
                            <span className="absolute bottom-0 right-0 bg-stone-900/70 text-[8px] text-white px-1 py-0.5 font-mono">
                              #{index + 1}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <label className="block text-[8px] uppercase font-bold text-stone-400 tracking-wider mb-0.5">Image Title</label>
                            <input
                              type="text"
                              value={item.title}
                              onChange={e => {
                                const val = e.target.value;
                                setSelectedFiles(prev => prev.map(f => f.id === item.id ? { ...f, title: val } : f));
                              }}
                              className="w-full px-2.5 py-1.5 bg-[#fcfaf7] border border-[#ecece0] rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#5A5A40]"
                              placeholder="Title..."
                              required
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              URL.revokeObjectURL(item.previewUrl);
                              setSelectedFiles(prev => prev.filter(f => f.id !== item.id));
                            }}
                            className="p-2 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Submit area */}
                <div className="pt-2 border-t border-[#ecece0] space-y-3">
                  {uploadProgress && (
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-stone-600 font-sans">
                        <span>Uploading images...</span>
                        <span className="font-semibold">{uploadProgress.current} / {uploadProgress.total}</span>
                      </div>
                      <div className="w-full bg-[#ecece0] h-2 rounded-full overflow-hidden">
                        <div 
                          className="bg-[#5A5A40] h-full transition-all duration-300"
                          style={{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%` }}
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={handleCloseImageModal}
                      disabled={uploading}
                      className="flex-1 bg-white border border-[#ecece0] text-stone-600 px-6 py-3 rounded-xl text-xs uppercase font-bold tracking-widest hover:bg-stone-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={uploading || selectedFiles.length === 0}
                      className="flex-[2] bg-[#5A5A40] text-white px-6 py-3 rounded-xl text-xs uppercase font-bold tracking-widest hover:bg-[#4a4a35] transition disabled:opacity-50 flex justify-center items-center gap-2"
                    >
                      {uploading ? 'Uploading...' : `Upload ${selectedFiles.length > 0 ? selectedFiles.length : ''} Image(s)`}
                    </button>
                  </div>
                </div>
              </form>
            ) : (
              <form onSubmit={handleAddDriveLinks} className="p-6 space-y-4 font-sans bg-white">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-stone-500 tracking-widest mb-1">Title / Label Prefix (Optional)</label>
                  <input
                    type="text"
                    value={driveLinkTitle}
                    onChange={e => setDriveLinkTitle(e.target.value)}
                    className="w-full p-3 bg-[#fcfaf7] border border-[#ecece0] rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#5A5A40]"
                    placeholder="e.g. Committee Meeting Photo, Youth Camp 2026..."
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-stone-500 tracking-widest mb-1 flex items-center gap-1.5">
                    <GoogleDriveLogo className="w-3.5 h-3.5" />
                    Google Drive Links (Paste URLs below) *
                  </label>
                  <textarea
                    rows={5}
                    value={driveLinksText}
                    onChange={e => setDriveLinksText(e.target.value)}
                    className="w-full p-3 bg-[#fcfaf7] border border-[#ecece0] rounded-xl text-xs font-mono focus:outline-none focus:ring-1 focus:ring-[#5A5A40]"
                    placeholder={`Paste Google Drive file or folder share URLs (one per line):\nhttps://drive.google.com/file/d/1ABC.../view\nhttps://drive.google.com/drive/folders/1XYZ...`}
                    required
                  />
                  <p className="text-[10px] text-stone-400 mt-1 italic">
                    Paste Google Drive photo share links or folder URLs. Google Drive photo links will be rendered directly as images!
                  </p>
                </div>

                <div className="pt-2 border-t border-[#ecece0] flex gap-3">
                  <button
                    type="button"
                    onClick={handleCloseImageModal}
                    disabled={uploading}
                    className="flex-1 bg-white border border-[#ecece0] text-stone-600 px-6 py-3 rounded-xl text-xs uppercase font-bold tracking-widest hover:bg-stone-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={uploading || !driveLinksText.trim()}
                    className="flex-[2] bg-[#5A5A40] text-white px-6 py-3 rounded-xl text-xs uppercase font-bold tracking-widest hover:bg-[#4a4a35] transition disabled:opacity-50 flex justify-center items-center gap-2"
                  >
                    <GoogleDriveLogo className="w-4 h-4" />
                    <span>{uploading ? 'Adding...' : 'Add Google Drive Links'}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
