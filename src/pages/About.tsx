import React, { useState, useEffect } from 'react';
import { db, isFirebaseConfigured } from '../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useAuth } from '../lib/auth';
import { BookOpen, Edit2, Save, FileText, History, RefreshCw } from 'lucide-react';
import DOMPurify from 'dompurify';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

interface AboutArticle {
  title: string;
  content: string;
  lastUpdated: string;
  updatedBy?: string;
}

const DEFAULT_TITLE = 'Bethlehem Kohhran Chanchin Tawi';
const DEFAULT_CONTENT = `
  <p><strong>Bethlehem Kohhran</strong> hi Mizoram Presbyterian Church (Synod) hnuaia Kohhran hlun leh tlo tak pakhat a ni a. Bethlehem Veng, Aizawl, Mizoram-ah a hmun hi a awm a ni. Kohhran mipuite thlarau nun chawm hna leh Pathian ram rawngbawlna-ah kum tam tak chhung taima takin hma a lo la tawh a ni.</p>
  
  <h3>Kohhran To bul & Chanchin Tawi</h3>
  <p>Kum kalta tam tak chhung khan, Bethlehem veng mipui an lo pun chhoh rualin tualchhung Kohhran pawimawh tak a lo piang chhuak a. Pathian khawngaihna leh hruaina zarah ringtu thar tam tak sengluh an ni a, mizo khawtlang nun siamtha tu leh thlarau nun chawm nung tu Kohhran thiltihthei tak a lo ni chho ta a ni.</p>
  
  <h3>Kan Rawngbawlna Bial Hrang Hrang</h3>
  <ul>
    <li><strong>K.T.P. (Kristian Thalai Pawl):</strong> Thalai hruaihruatna leh Pathian thu tana inpe zo tura zirtirna bial.</li>
    <li><strong>Kohhran Hmeichhia:</strong> In sak chhung leh Kohhran chhungkua Pathian ram tana chawm nung tu pawl pawimawh tak.</li>
    <li><strong>Sunday School:</strong> Naupang leh puitling tana Bible zirna leh thlarau lam inchawmna hmunpui.</li>
    <li><strong>Ramthar Rawngbawlna:</strong> Hmun kilkhawr zawk leh hnam hrang hrangte hnena Chanchin Tha thlen tura inpekna.</li>
  </ul>
  
  <p>Rawngbawlna chi hrang hrang hmangin Bethlehem Kohhran hian Lalpa Isua Krista rinchhanin hma a sawn zel a, thlarau chhandamna leh khawtlang tana eng leh chi nih a tum tlat a ni.</p>
`;

export default function About() {
  const [article, setArticle] = useState<AboutArticle | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [saving, setSaving] = useState(false);
  const { isAdmin, profile, user } = useAuth();

  useEffect(() => {
    fetchAboutContent();
  }, []);

  const fetchAboutContent = async () => {
    setLoading(true);
    if (!isFirebaseConfigured || !db) {
      // Local fallback
      const cached = localStorage.getItem('bethlehem_about_us');
      if (cached) {
        try {
          setArticle(JSON.parse(cached));
        } catch (e) {
          setArticle({
            title: DEFAULT_TITLE,
            content: DEFAULT_CONTENT,
            lastUpdated: new Date().toISOString()
          });
        }
      } else {
        setArticle({
          title: DEFAULT_TITLE,
          content: DEFAULT_CONTENT,
          lastUpdated: new Date().toISOString()
        });
      }
      setLoading(false);
      return;
    }

    try {
      const docRef = doc(db, 'about', 'history');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setArticle(docSnap.data() as AboutArticle);
      } else {
        // First-time setup, load default content
        const initialArticle: AboutArticle = {
          title: DEFAULT_TITLE,
          content: DEFAULT_CONTENT,
          lastUpdated: new Date().toISOString(),
          updatedBy: 'System'
        };
        setArticle(initialArticle);
      }
    } catch (error) {
      console.error("Error fetching about content:", error);
      // Fallback in case of network issue
      setArticle({
        title: DEFAULT_TITLE,
        content: DEFAULT_CONTENT,
        lastUpdated: new Date().toISOString()
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStartEdit = () => {
    if (article) {
      setEditTitle(article.title);
      setEditContent(article.content);
      setIsEditing(true);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTitle.trim() || !editContent.trim()) {
      alert("Please enter a title and content.");
      return;
    }

    setSaving(true);
    const updatedBy = profile?.fullName || user?.email || 'Admin';
    const updatedData: AboutArticle = {
      title: editTitle.trim(),
      content: editContent,
      lastUpdated: new Date().toISOString(),
      updatedBy
    };

    if (!isFirebaseConfigured || !db) {
      // Offline mode caching
      localStorage.setItem('bethlehem_about_us', JSON.stringify(updatedData));
      setArticle(updatedData);
      setIsEditing(false);
      setSaving(false);
      alert("Updated successfully (saved locally).");
      return;
    }

    try {
      const docRef = doc(db, 'about', 'history');
      await setDoc(docRef, updatedData);
      setArticle(updatedData);
      setIsEditing(false);
    } catch (error) {
      console.error("Error saving about content:", error);
      alert("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (isoString: string) => {
    const d = new Date(isoString);
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight uppercase">About Us</h1>
          <p className="mt-1 text-stone-500 font-sans text-xs uppercase tracking-widest">History & Heritage of Bethlehem Kohhran</p>
        </div>
        {isAdmin && article && !isEditing && (
          <button
            onClick={handleStartEdit}
            className="flex items-center gap-2 bg-[#5A5A40] text-white px-4 py-2.5 rounded-xl text-xs uppercase font-bold tracking-widest hover:bg-[#4a4a35] transition-colors whitespace-nowrap font-sans"
          >
            <Edit2 className="w-4 h-4" />
            Edit History
          </button>
        )}
      </div>

      {loading ? (
        <div className="p-12 text-center text-sm text-stone-500 font-sans italic border border-dashed border-[#d0d0c5] rounded-[32px] bg-white flex flex-col items-center justify-center gap-3">
          <RefreshCw className="w-6 h-6 text-[#5A5A40] animate-spin" />
          <span>Loading church history...</span>
        </div>
      ) : isEditing ? (
        <div className="bg-white rounded-[32px] p-6 sm:p-8 shadow-sm border border-[#e0e0d5]">
          <h2 className="text-lg font-serif italic text-[#5A5A40] mb-6 flex items-center gap-2 border-b border-[#ecece0] pb-3">
            <FileText className="w-5 h-5 text-stone-400" />
            Edit Church History Entry
          </h2>
          <form onSubmit={handleSave} className="space-y-6 font-sans">
            <div>
              <label className="block text-[10px] uppercase font-bold text-stone-500 tracking-widest mb-1.5">Article Title</label>
              <input
                type="text"
                value={editTitle}
                onChange={e => setEditTitle(e.target.value)}
                className="w-full p-3.5 bg-[#fcfaf7] border border-[#ecece0] rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#5A5A40] font-semibold text-[#2d2d2a]"
                required
                placeholder="Title (e.g. Bethlehem Kohhran Chanchin Tawi)"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase font-bold text-stone-500 tracking-widest mb-1.5">Church History & Content (Rich Text)</label>
              <div className="bg-white rounded-xl overflow-hidden border border-[#ecece0]">
                <ReactQuill 
                  theme="snow" 
                  value={editContent} 
                  onChange={setEditContent} 
                  className="h-80 mb-12"
                />
              </div>
            </div>
            <div className="flex gap-3 pt-4 border-t border-[#ecece0]">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                disabled={saving}
                className="flex-1 bg-white border border-[#ecece0] text-stone-600 px-6 py-3 rounded-xl text-xs uppercase font-bold tracking-widest hover:bg-stone-50 transition font-sans disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-[2] bg-[#5A5A40] text-white px-6 py-3 rounded-xl text-xs uppercase font-bold tracking-widest hover:bg-[#4a4a35] transition font-sans flex justify-center items-center gap-2 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Saving...' : 'Save History Entry'}
              </button>
            </div>
          </form>
        </div>
      ) : article ? (
        <article className="bg-white rounded-[32px] p-8 sm:p-12 shadow-sm border border-[#e0e0d5] relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 flex gap-2">
            {isAdmin && (
              <button 
                onClick={handleStartEdit}
                className="p-2 text-[#5A5A40] hover:bg-stone-50 rounded-full transition border border-[#ecece0]"
                title="Edit Entry"
              >
                <Edit2 className="w-4 h-4" />
              </button>
            )}
          </div>
          <header className="mb-8 pb-6 border-b border-[#ecece0]">
            <div className="flex items-center gap-2 text-[10px] uppercase font-bold tracking-widest text-[#5A5A40] mb-3 font-sans">
              <History className="w-4 h-4" />
              <span>Church History Article</span>
            </div>
            <h2 className="text-3xl font-serif text-[#2d2d2a] mb-3 pr-12 leading-tight">{article.title}</h2>
            <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-stone-400 font-sans">
              <span>Last updated: {formatDate(article.lastUpdated)}</span>
              {article.updatedBy && (
                <>
                  <span className="text-stone-300">•</span>
                  <span>By: {article.updatedBy}</span>
                </>
              )}
            </div>
          </header>
          <div 
            className="prose prose-stone max-w-none font-sans text-[#2d2d2a] leading-relaxed text-sm prose-headings:font-serif prose-headings:font-normal prose-headings:text-[#5A5A40] prose-h3:text-lg prose-h3:mt-8 prose-h3:mb-3 prose-p:mb-5 prose-ul:list-disc prose-ul:pl-6 prose-li:mb-2 prose-strong:text-stone-800"
            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(article.content) }}
          />
        </article>
      ) : null}
    </div>
  );
}
