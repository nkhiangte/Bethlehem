import React, { useState, useEffect } from 'react';
import { db, isFirebaseConfigured } from '../lib/firebase';
import { collection, getDocs, addDoc, deleteDoc, doc, query, orderBy, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../lib/auth';
import { NewsArticle } from '../types';
import { Newspaper, Plus, Trash2, Calendar, FileText } from 'lucide-react';
import DOMPurify from 'dompurify';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

export default function Home() {
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const { isAdmin } = useAuth();

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

  const handleAddNews = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) return;

    const newArticle = {
      title: newTitle.trim(),
      content: newContent,
      date: new Date().toISOString(),
    };

    if (!isFirebaseConfigured || !db) {
      const currentNews = [{ id: 'local_news_' + Date.now(), ...newArticle }, ...news];
      localStorage.setItem('bethlehem_news', JSON.stringify(currentNews));
      setNews(currentNews);
      setIsAdding(false);
      setNewTitle('');
      setNewContent('');
      alert("News saved locally (Firebase not fully configured).");
      return;
    }

    try {
      const docRef = await addDoc(collection(db, 'news'), newArticle);
      setNews([{ id: docRef.id, ...newArticle }, ...news]);
      setIsAdding(false);
      setNewTitle('');
      setNewContent('');
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

  const formatDate = (isoString: string) => {
    const d = new Date(isoString);
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  };

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
        <div className="bg-white rounded-[32px] p-6 shadow-sm border border-[#e0e0d5]">
          <h2 className="text-lg font-serif italic text-[#5A5A40] mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5 text-stone-400" />
            Compose Article
          </h2>
          <form onSubmit={handleAddNews} className="space-y-4 font-sans">
            <div>
              <label className="block text-[10px] uppercase font-bold text-stone-500 tracking-widest mb-1">Title</label>
              <input
                type="text"
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                className="w-full p-3 bg-[#fcfaf7] border border-[#ecece0] rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#5A5A40]"
                required
                placeholder="News Title..."
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase font-bold text-stone-500 tracking-widest mb-1">Content</label>
              <div className="bg-white">
                <ReactQuill 
                  theme="snow" 
                  value={newContent} 
                  onChange={setNewContent} 
                  className="h-48 mb-12"
                />
              </div>
            </div>
            <button
              type="submit"
              className="bg-[#5A5A40] text-white px-6 py-2.5 rounded-xl text-xs uppercase font-bold tracking-widest hover:bg-[#4a4a35] transition"
            >
              Post News
            </button>
          </form>
        </div>
      )}

      {loading ? (
        <div className="p-12 text-center text-sm text-stone-500 font-sans italic border border-dashed border-[#d0d0c5] rounded-[32px]">
          Loading latest news...
        </div>
      ) : news.length === 0 ? (
        <div className="p-12 text-center text-stone-500 font-sans italic border border-dashed border-[#d0d0c5] rounded-[32px]">
          <Newspaper className="w-12 h-12 mx-auto mb-4 text-stone-300" />
          <p>No news articles available yet.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {news.map(article => (
            <article key={article.id} className="bg-white rounded-[32px] p-8 shadow-sm border border-[#e0e0d5] relative overflow-hidden">
              <div className="absolute top-0 right-0 p-6 flex gap-2">
                {isAdmin && (
                  <button 
                    onClick={() => handleDelete(article.id)}
                    className="p-2 text-red-400 hover:bg-red-50 hover:text-red-600 rounded-full transition"
                    title="Delete Article"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
              <header className="mb-6">
                <h2 className="text-2xl font-serif text-[#2d2d2a] mb-2 pr-12">{article.title}</h2>
                <div className="flex items-center text-[10px] uppercase font-bold tracking-widest text-stone-400 font-sans">
                  <Calendar className="w-3 h-3 mr-1.5" />
                  {formatDate(article.date)}
                </div>
              </header>
              <div 
                className="prose prose-stone max-w-none font-sans text-sm text-stone-700 prose-headings:font-serif prose-headings:font-normal prose-a:text-[#5A5A40]"
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(article.content) }}
              />
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
