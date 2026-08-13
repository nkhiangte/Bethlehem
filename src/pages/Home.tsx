import React, { useState, useEffect, useRef } from 'react';
import { db, isFirebaseConfigured } from '../lib/firebase';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../lib/auth';
import { NewsArticle } from '../types';
import { Newspaper, Plus, Trash2, Calendar, FileText, Image as ImageIcon, Loader2, X, Upload, Pencil, Save, ChevronDown, ChevronUp, BookOpen, ChevronLeft, ChevronRight } from 'lucide-react';
import DOMPurify from 'dompurify';
import { RichTextEditor } from '../components/RichTextEditor';
import { useBackButton } from '../hooks/useBackButton';

export default function Home() {
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [featuredImage, setFeaturedImage] = useState<string>('');
  const [uploadingFeatured, setUploadingFeatured] = useState(false);
  const [uploadingInline, setUploadingInline] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  // Article expansion & full reader modal state
  const [expandedArticleIds, setExpandedArticleIds] = useState<string[]>([]);
  const [viewingArticle, setViewingArticle] = useState<NewsArticle | null>(null);
  
  useBackButton(!!viewingArticle, () => setViewingArticle(null));

  // Edit post state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editFeaturedImage, setEditFeaturedImage] = useState<string>('');
  const [uploadingEditFeatured, setUploadingEditFeatured] = useState(false);
  const [uploadingEditInline, setUploadingEditInline] = useState(false);

  const { isAdmin } = useAuth();

  const quillRef = useRef<any>(null);
  const inlineFileInputRef = useRef<HTMLInputElement>(null);

  const editQuillRef = useRef<any>(null);
  const editInlineFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchNews();
  }, []);

  const fetchNews = async () => {
    if (!isFirebaseConfigured || !db) {
      const cached = localStorage.getItem('bethlehem_news');
      if (cached) {
        try {
          setNews(JSON.parse(cached));
        } catch (e) {
          setNews([]);
        }
      }
      setLoading(false);
      return;
    }
    try {
      const q = query(collection(db, 'news'), orderBy('date', 'desc'));
      const snap = await getDocs(q);
      const fetchedNews = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      } as NewsArticle));
      setNews(fetchedNews);
    } catch (error) {
      console.error("Error fetching news:", error);
    } finally {
      setLoading(false);
    }
  };

  const uploadToImgBB = async (file: File): Promise<string> => {
    const apiKey = import.meta.env.VITE_IMGBB_API_KEY;
    if (!apiKey) {
      throw new Error("ImgBB API key is not configured. Please add VITE_IMGBB_API_KEY to secrets.");
    }

    const formData = new FormData();
    formData.append('image', file);

    const response = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData?.error?.message || `ImgBB upload failed with status ${response.status}`);
    }

    const data = await response.json();
    if (data && data.data && data.data.url) {
      return data.data.url;
    } else {
      throw new Error("Invalid response format from ImgBB API");
    }
  };

  const handleFeaturedImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingFeatured(true);
    try {
      const url = await uploadToImgBB(file);
      setFeaturedImage(url);
    } catch (error: any) {
      console.error("Featured image upload failed:", error);
      alert(error.message || "Failed to upload image.");
    } finally {
      setUploadingFeatured(false);
    }
  };

  const handleInlineImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingInline(true);
    try {
      const url = await uploadToImgBB(file);
      setNewContent(prev => prev + `<p><img src="${url}" alt="image" /></p>`);
    } catch (error: any) {
      console.error("Inline image upload failed:", error);
      alert(error.message || "Failed to upload image.");
    } finally {
      setUploadingInline(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleAddNews = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) return;

    const newArticle = {
      title: newTitle.trim(),
      content: newContent,
      date: new Date().toISOString(),
      imageUrl: featuredImage || undefined,
    };

    if (!isFirebaseConfigured || !db) {
      const currentNews = [{ id: 'local_news_' + Date.now(), ...newArticle }, ...news];
      localStorage.setItem('bethlehem_news', JSON.stringify(currentNews));
      setNews(currentNews);
      setIsAdding(false);
      setNewTitle('');
      setNewContent('');
      setFeaturedImage('');
      alert("News saved locally (Firebase not fully configured).");
      return;
    }

    try {
      const docRef = await addDoc(collection(db, 'news'), newArticle);
      setNews([{ id: docRef.id, ...newArticle }, ...news]);
      setIsAdding(false);
      setNewTitle('');
      setNewContent('');
      setFeaturedImage('');
    } catch (error) {
      console.error("Error adding news to Firestore:", error);
      alert("Failed to save news to Firestore.");
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this news article?')) return;

    if (!isFirebaseConfigured || !db) {
      const currentNews = news.filter(n => n.id !== id);
      localStorage.setItem('bethlehem_news', JSON.stringify(currentNews));
      setNews(currentNews);
      return;
    }

    try {
      await deleteDoc(doc(db, 'news', id));
      setNews(news.filter(n => n.id !== id));
    } catch (error) {
      console.error("Error deleting news from Firestore:", error);
    }
  };

  const handleStartEdit = (article: NewsArticle) => {
    setEditingId(article.id);
    setEditTitle(article.title);
    setEditContent(article.content);
    setEditFeaturedImage(article.imageUrl || '');
    setIsAdding(false);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditTitle('');
    setEditContent('');
    setEditFeaturedImage('');
  };

  const handleEditFeaturedImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingEditFeatured(true);
    try {
      const url = await uploadToImgBB(file);
      setEditFeaturedImage(url);
    } catch (error: any) {
      console.error("Featured image upload failed:", error);
      alert(error.message || "Failed to upload image.");
    } finally {
      setUploadingEditFeatured(false);
    }
  };

  const handleEditInlineImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingEditInline(true);
    try {
      const url = await uploadToImgBB(file);
      setEditContent(prev => prev + `<p><img src="${url}" alt="image" /></p>`);
    } catch (error: any) {
      console.error("Inline image upload failed:", error);
      alert(error.message || "Failed to upload image.");
    } finally {
      setUploadingEditInline(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId || !editTitle.trim() || !editContent.trim()) return;

    const updatedArticle = {
      title: editTitle.trim(),
      content: editContent,
      imageUrl: editFeaturedImage || undefined,
    };

    if (!isFirebaseConfigured || !db) {
      const currentNews = news.map(n => n.id === editingId ? { ...n, ...updatedArticle } : n);
      localStorage.setItem('bethlehem_news', JSON.stringify(currentNews));
      setNews(currentNews);
      handleCancelEdit();
      alert("Article updated locally (Firebase not fully configured).");
      return;
    }

    try {
      await updateDoc(doc(db, 'news', editingId), updatedArticle);
      setNews(news.map(n => n.id === editingId ? { ...n, ...updatedArticle } : n));
      handleCancelEdit();
    } catch (error: any) {
      console.error("Error updating news in Firestore:", error);
      alert("Failed to update news. Please try again.");
    }
  };

  const formatDate = (isoString: string) => {
    const d = new Date(isoString);
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  const toggleExpand = (id: string) => {
    setExpandedArticleIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const isLongContent = (htmlContent: string) => {
    if (!htmlContent) return false;
    const text = htmlContent.replace(/<[^>]+>/g, '').trim();
    const paragraphCount = (htmlContent.match(/<p/g) || []).length;
    const hasImages = htmlContent.includes('<img');
    const hasLists = htmlContent.includes('<ul') || htmlContent.includes('<ol');
    return text.length > 200 || paragraphCount > 1 || hasImages || hasLists;
  };

  const totalPages = Math.ceil(news.length / ITEMS_PER_PAGE);
  const paginatedNews = news.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight uppercase">Latest News</h1>
          <p className="mt-1 text-stone-500 font-sans text-xs uppercase tracking-widest">Bethlehem Kohhran Updates</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setIsAdding(!isAdding)}
            className="flex items-center gap-2 bg-[#5A5A40] text-white px-4 py-2 rounded-xl text-xs uppercase font-bold tracking-widest hover:bg-[#4a4a35] transition-colors whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            {isAdding ? 'Cancel' : 'Add News'}
          </button>
        )}
      </div>

      {isAdding && isAdmin && (
        <div className="bg-white rounded-[32px] p-6 sm:p-8 shadow-sm border border-[#e0e0d5]">
          <h2 className="text-lg font-serif italic text-[#5A5A40] mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5 text-stone-400" />
            Compose Article
          </h2>
          <form onSubmit={handleAddNews} className="space-y-6 font-sans">
            <div>
              <label className="block text-[10px] uppercase font-bold text-stone-500 tracking-widest mb-1.5">Title</label>
              <input
                type="text"
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                className="w-full p-3.5 bg-[#fcfaf7] border border-[#ecece0] rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#5A5A40] font-semibold text-[#2d2d2a]"
                required
                placeholder="News Title..."
              />
            </div>

            {/* Featured Image Upload Field */}
            <div>
              <label className="block text-[10px] uppercase font-bold text-stone-500 tracking-widest mb-1.5">Featured Image (Optional)</label>
              {!import.meta.env.VITE_IMGBB_API_KEY && (
                <div className="mb-3 p-3 bg-amber-50 text-amber-800 text-xs rounded-xl border border-amber-200">
                  ⚠️ <strong>ImgBB API Key is missing!</strong> Please add <code>VITE_IMGBB_API_KEY</code> to your secrets in Settings to enable image uploads.
                </div>
              )}
              {featuredImage ? (
                <div className="relative inline-block rounded-2xl overflow-hidden border border-[#ecece0] bg-stone-50 max-w-md">
                  <img src={featuredImage} alt="Featured preview" className="max-h-48 object-cover rounded-2xl" referrerPolicy="no-referrer" />
                  <button
                    type="button"
                    onClick={() => setFeaturedImage('')}
                    className="absolute top-2 right-2 p-1.5 bg-black/60 text-white rounded-full hover:bg-black/80 transition-colors"
                    title="Remove Image"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <label className={`flex flex-col items-center justify-center p-6 border-2 border-dashed border-[#d0d0c5] hover:border-[#5A5A40] rounded-2xl cursor-pointer bg-[#fcfaf7] transition ${uploadingFeatured ? 'pointer-events-none opacity-60' : ''}`}>
                  {uploadingFeatured ? (
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 className="w-6 h-6 animate-spin text-[#5A5A40]" />
                      <span className="text-xs text-stone-500">Uploading featured image to ImgBB...</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-1 text-center">
                      <Upload className="w-6 h-6 text-stone-400 mb-1" />
                      <span className="text-xs font-semibold text-stone-600">Click or Drag to Upload Featured Image</span>
                      <span className="text-[10px] text-stone-400 uppercase tracking-wider">PNG, JPG, GIF up to 10MB</span>
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFeaturedImageUpload}
                    disabled={uploadingFeatured || !import.meta.env.VITE_IMGBB_API_KEY}
                    className="hidden"
                  />
                </label>
              )}
            </div>

            {/* Content Field & Inline Image Upload Button */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-[10px] uppercase font-bold text-stone-500 tracking-widest">Content</label>
                {import.meta.env.VITE_IMGBB_API_KEY && (
                  <div>
                    <button
                      type="button"
                      disabled={uploadingInline}
                      onClick={() => inlineFileInputRef.current?.click()}
                      className="flex items-center gap-1.5 bg-white border border-[#ecece0] text-[#5A5A40] hover:bg-stone-50 transition px-3 py-1.5 rounded-lg text-[10px] uppercase font-bold tracking-wider"
                    >
                      {uploadingInline ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <ImageIcon className="w-3 h-3" />
                      )}
                      {uploadingInline ? 'Inserting...' : 'Insert Image'}
                    </button>
                    <input
                      type="file"
                      ref={inlineFileInputRef}
                      onChange={handleInlineImageUpload}
                      accept="image/*"
                      className="hidden"
                    />
                  </div>
                )}
              </div>
              <RichTextEditor
                value={newContent}
                onChange={setNewContent}
                placeholder="Write news content..."
              />
            </div>

            <div className="flex gap-3 pt-4 border-t border-[#ecece0]">
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="flex-1 bg-white border border-[#ecece0] text-stone-600 px-6 py-3 rounded-xl text-xs uppercase font-bold tracking-widest hover:bg-stone-50 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-[2] bg-[#5A5A40] text-white px-6 py-3 rounded-xl text-xs uppercase font-bold tracking-widest hover:bg-[#4a4a35] transition flex justify-center items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Post News
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="p-12 text-center text-sm text-stone-500 font-sans italic border border-dashed border-[#d0d0c5] rounded-[32px] bg-white flex flex-col items-center justify-center gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-[#5A5A40]" />
          <span>Loading latest news...</span>
        </div>
      ) : news.length === 0 ? (
        <div className="p-12 text-center text-stone-500 font-sans italic border border-dashed border-[#d0d0c5] rounded-[32px]">
          <Newspaper className="w-12 h-12 mx-auto mb-4 text-stone-300" />
          <p>No news articles available yet.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {paginatedNews.map(article => (
            editingId === article.id ? (
              <article key={article.id} className="bg-white rounded-[32px] p-6 sm:p-8 shadow-sm border-2 border-[#5A5A40] relative overflow-hidden">
                <div className="flex justify-between items-center mb-6 border-b border-[#ecece0] pb-4">
                  <h3 className="text-lg font-serif italic text-[#5A5A40] flex items-center gap-2">
                    <Pencil className="w-5 h-5 text-stone-400" />
                    Edit News Article
                  </h3>
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="p-1.5 text-stone-400 hover:text-stone-600 rounded-full hover:bg-stone-100 transition"
                    title="Cancel Editing"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleSaveEdit} className="space-y-6 font-sans">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-stone-500 tracking-widest mb-1.5">Title</label>
                    <input
                      type="text"
                      value={editTitle}
                      onChange={e => setEditTitle(e.target.value)}
                      className="w-full p-3.5 bg-[#fcfaf7] border border-[#ecece0] rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#5A5A40] font-semibold text-[#2d2d2a]"
                      required
                      placeholder="News Title..."
                    />
                  </div>

                  {/* Featured Image */}
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-stone-500 tracking-widest mb-1.5">Featured Image (Optional)</label>
                    {editFeaturedImage ? (
                      <div className="relative inline-block rounded-2xl overflow-hidden border border-[#ecece0] bg-stone-50 max-w-md">
                        <img src={editFeaturedImage} alt="Featured preview" className="max-h-48 object-cover rounded-2xl" referrerPolicy="no-referrer" />
                        <button
                          type="button"
                          onClick={() => setEditFeaturedImage('')}
                          className="absolute top-2 right-2 p-1.5 bg-black/60 text-white rounded-full hover:bg-black/80 transition-colors"
                          title="Remove Image"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <label className={`flex flex-col items-center justify-center p-6 border-2 border-dashed border-[#d0d0c5] hover:border-[#5A5A40] rounded-2xl cursor-pointer bg-[#fcfaf7] transition ${uploadingEditFeatured ? 'pointer-events-none opacity-60' : ''}`}>
                        {uploadingEditFeatured ? (
                          <div className="flex flex-col items-center gap-2">
                            <Loader2 className="w-6 h-6 animate-spin text-[#5A5A40]" />
                            <span className="text-xs text-stone-500">Uploading image...</span>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-1 text-center">
                            <Upload className="w-6 h-6 text-stone-400 mb-1" />
                            <span className="text-xs font-semibold text-stone-600">Click or Drag to Upload Featured Image</span>
                            <span className="text-[10px] text-stone-400 uppercase tracking-wider">PNG, JPG, GIF up to 10MB</span>
                          </div>
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleEditFeaturedImageUpload}
                          disabled={uploadingEditFeatured || !import.meta.env.VITE_IMGBB_API_KEY}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>

                  {/* Content & Inline Image Upload */}
                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <label className="block text-[10px] uppercase font-bold text-stone-500 tracking-widest">Content</label>
                      {import.meta.env.VITE_IMGBB_API_KEY && (
                        <div>
                          <button
                            type="button"
                            disabled={uploadingEditInline}
                            onClick={() => editInlineFileInputRef.current?.click()}
                            className="flex items-center gap-1.5 bg-white border border-[#ecece0] text-[#5A5A40] hover:bg-stone-50 transition px-3 py-1.5 rounded-lg text-[10px] uppercase font-bold tracking-wider"
                          >
                            {uploadingEditInline ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <ImageIcon className="w-3 h-3" />
                            )}
                            {uploadingEditInline ? 'Inserting...' : 'Insert Image'}
                          </button>
                          <input
                            type="file"
                            ref={editInlineFileInputRef}
                            onChange={handleEditInlineImageUpload}
                            accept="image/*"
                            className="hidden"
                          />
                        </div>
                      )}
                    </div>
                    <RichTextEditor
                      value={editContent}
                      onChange={setEditContent}
                      placeholder="Edit article content..."
                    />
                  </div>

                  <div className="flex gap-3 pt-4 border-t border-[#ecece0]">
                    <button
                      type="button"
                      onClick={handleCancelEdit}
                      className="flex-1 bg-white border border-[#ecece0] text-stone-600 px-6 py-3 rounded-xl text-xs uppercase font-bold tracking-widest hover:bg-stone-50 transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-[2] bg-[#5A5A40] text-white px-6 py-3 rounded-xl text-xs uppercase font-bold tracking-widest hover:bg-[#4a4a35] transition flex justify-center items-center gap-2 font-bold"
                    >
                      <Save className="w-4 h-4" />
                      Save Changes
                    </button>
                  </div>
                </form>
              </article>
            ) : (
              (() => {
                const isExpanded = expandedArticleIds.includes(article.id);
                const longPost = isLongContent(article.content);

                return (
                  <article key={article.id} className="bg-white rounded-[32px] p-6 sm:p-10 shadow-sm border border-[#e0e0d5] relative overflow-hidden transition-all">
                    <div className="absolute top-0 right-0 p-4 sm:p-6 flex items-center gap-1 z-10">
                      {isAdmin && (
                        <>
                          <button 
                            onClick={() => handleStartEdit(article)}
                            className="p-2 text-stone-400 hover:bg-stone-100 hover:text-[#5A5A40] rounded-full transition"
                            title="Edit Article"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleDelete(article.id)}
                            className="p-2 text-red-400 hover:bg-red-50 hover:text-red-600 rounded-full transition"
                            title="Delete Article"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                    <header className="mb-5">
                      <h2 className="text-xl sm:text-2xl font-serif text-[#2d2d2a] mb-2 pr-16 leading-tight">{article.title}</h2>
                      <div className="flex items-center text-[10px] uppercase font-bold tracking-widest text-stone-400 font-sans">
                        <Calendar className="w-3 h-3 mr-1.5" />
                        {formatDate(article.date)}
                      </div>
                    </header>

                    {article.imageUrl && (
                      <div className="mb-5 rounded-2xl overflow-hidden border border-[#ecece0] bg-stone-50 flex justify-center">
                        <img 
                          src={article.imageUrl} 
                          alt={article.title} 
                          className="w-full h-auto max-h-[650px] object-contain rounded-2xl"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    )}

                    <div className="relative">
                      <div 
                        className={`prose prose-stone max-w-none font-sans text-sm text-stone-700 prose-headings:font-serif prose-headings:font-normal prose-a:text-[#5A5A40] prose-img:rounded-2xl prose-img:w-full prose-img:h-auto prose-img:max-h-[650px] prose-img:object-contain prose-img:border prose-img:border-[#ecece0] prose-img:my-4 prose-img:mx-auto transition-all duration-300 ${
                          longPost && !isExpanded ? 'max-h-40 overflow-hidden' : ''
                        }`}
                        dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(article.content) }}
                      />

                      {longPost && !isExpanded && (
                        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-white via-white/90 to-transparent pointer-events-none" />
                      )}
                    </div>

                    {longPost && (
                      <div className="mt-4 pt-3 border-t border-[#ecece0] flex flex-wrap items-center justify-between gap-2">
                        <button
                          onClick={() => toggleExpand(article.id)}
                          className="inline-flex items-center gap-2 bg-[#5A5A40] hover:bg-[#4a4a35] text-white px-4 py-2 rounded-xl text-xs uppercase font-bold tracking-wider transition shadow-xs font-sans"
                        >
                          {isExpanded ? (
                            <>
                              <span>Tawm leh rawh / Show Less</span>
                              <ChevronUp className="w-4 h-4" />
                            </>
                          ) : (
                            <>
                              <span>Chhiar chhunzawm rawh / Read More</span>
                              <ChevronDown className="w-4 h-4" />
                            </>
                          )}
                        </button>

                        <button
                          onClick={() => setViewingArticle(article)}
                          className="inline-flex items-center gap-1.5 text-stone-600 hover:text-[#5A5A40] bg-stone-100 hover:bg-stone-200/80 px-3.5 py-2 rounded-xl text-xs uppercase font-bold tracking-wider transition font-sans"
                          title="Open full reader view"
                        >
                          <BookOpen className="w-3.5 h-3.5" />
                          <span>Full View</span>
                        </button>
                      </div>
                    )}
                  </article>
                );
              })()
            )
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 pt-6 mt-4">
          <button
            onClick={() => {
              setCurrentPage(prev => Math.max(prev - 1, 1));
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            disabled={currentPage === 1}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-white border border-[#ecece0] text-stone-600 rounded-xl text-[10px] uppercase font-bold tracking-widest hover:bg-stone-50 transition shadow-xs disabled:opacity-50 disabled:cursor-not-allowed font-sans"
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </button>
          <span className="text-[10px] font-bold text-stone-500 font-sans tracking-widest bg-stone-100 px-4 py-2 rounded-xl">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => {
              setCurrentPage(prev => Math.min(prev + 1, totalPages));
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            disabled={currentPage === totalPages}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-white border border-[#ecece0] text-stone-600 rounded-xl text-[10px] uppercase font-bold tracking-widest hover:bg-stone-50 transition shadow-xs disabled:opacity-50 disabled:cursor-not-allowed font-sans"
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Full Article Reader Modal */}
      {viewingArticle && (
        <div 
          className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6"
          onClick={() => setViewingArticle(null)}
        >
          <div 
            className="bg-white rounded-[32px] max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-stone-200 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-6 border-b border-[#ecece0] flex items-start justify-between gap-4 bg-[#fcfaf7]">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-widest text-stone-400 font-sans block mb-1">
                  {formatDate(viewingArticle.date)}
                </span>
                <h2 className="text-xl sm:text-2xl font-serif text-[#2d2d2a] font-semibold leading-tight">
                  {viewingArticle.title}
                </h2>
              </div>
              <button 
                onClick={() => setViewingArticle(null)}
                className="p-2 hover:bg-stone-200/60 text-stone-500 rounded-full transition shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body Content */}
            <div className="p-6 sm:p-8 overflow-y-auto space-y-6 flex-1 font-sans">
              {viewingArticle.imageUrl && (
                <div className="rounded-2xl overflow-hidden border border-[#ecece0] bg-stone-50 flex justify-center">
                  <img 
                    src={viewingArticle.imageUrl} 
                    alt={viewingArticle.title} 
                    className="w-full h-auto max-h-[650px] object-contain rounded-2xl"
                    referrerPolicy="no-referrer"
                  />
                </div>
              )}

              <div 
                className="prose prose-stone max-w-none text-sm sm:text-base text-stone-800 prose-headings:font-serif prose-a:text-[#5A5A40] prose-img:rounded-2xl prose-img:w-full prose-img:h-auto prose-img:max-h-[650px] prose-img:object-contain prose-img:border prose-img:border-[#ecece0] prose-img:my-4 prose-img:mx-auto"
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(viewingArticle.content) }}
              />
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-[#ecece0] bg-[#fcfaf7] flex items-center justify-between">
              <span className="text-xs text-stone-400 font-sans italic">Bethlehem Kohhran News</span>
              <button
                onClick={() => setViewingArticle(null)}
                className="bg-[#5A5A40] text-white px-5 py-2 rounded-xl text-xs uppercase font-bold tracking-widest hover:bg-[#4a4a35] transition font-sans font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
