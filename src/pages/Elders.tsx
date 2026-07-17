import React, { useState, useEffect } from 'react';
import { MapPin, Phone, Plus, X, Pencil, Trash2, Upload } from 'lucide-react';
import { db, isFirebaseConfigured } from '../lib/firebase';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import { Upa } from '../types';
import { uploadImageToImgbb } from '../lib/imgbb';
import { useAuth } from '../lib/auth';

export default function Elders() {
  const { isAdmin } = useAuth();
  const [upas, setUpas] = useState<Upa[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUpa, setEditingUpa] = useState<Upa | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [bial, setBial] = useState('');
  const [phone, setPhone] = useState('');
  const [bio, setBio] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    fetchUpas();
  }, []);

  const fetchUpas = async () => {
    if (!isFirebaseConfigured || !db) {
      setUpas([]);
      setLoading(false);
      return;
    }
    try {
      const q = query(collection(db, 'upas'), orderBy('name', 'asc'));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Upa));
      
      // If Firestore is completely empty, use empty array
      if (data.length === 0) {
        setUpas([]);
      } else {
        setUpas(data);
      }
    } catch (error) {
      console.error("Error fetching elders:", error);
      setUpas([]); // Fallback
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (upa?: Upa) => {
    if (upa) {
      setEditingUpa(upa);
      setName(upa.name);
      setBial(upa.bial);
      setPhone(upa.phone);
      setBio(upa.bio || '');
      setImageUrl(upa.imageUrl || '');
    } else {
      setEditingUpa(null);
      setName('');
      setBial('');
      setPhone('');
      setBio('');
      setImageUrl('');
    }
    setSelectedFile(null);
    setIsModalOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleSave = async () => {
    if (!name || !bial || !phone) {
      alert("Please fill in all required fields (Name, Bial Area, Phone).");
      return;
    }

    if (!isFirebaseConfigured || !db) {
      alert("Firebase not configured. Cannot save.");
      return;
    }

    setIsUploading(true);
    try {
      let finalImageUrl = imageUrl;
      if (selectedFile) {
        finalImageUrl = await uploadImageToImgbb(selectedFile);
      }

      const upaData = { name, bial, phone, bio, imageUrl: finalImageUrl };

      if (editingUpa?.id) {
        await updateDoc(doc(db, 'upas', editingUpa.id), upaData);
      } else {
        await addDoc(collection(db, 'upas'), upaData);
      }
      setIsModalOpen(false);
      fetchUpas();
    } catch (error) {
      console.error("Error saving elder:", error);
      alert("Failed to save elder.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this elder?")) return;
    if (!isFirebaseConfigured || !db) return;

    try {
      await deleteDoc(doc(db, 'upas', id));
      fetchUpas();
    } catch (error) {
      console.error("Error deleting Upa:", error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight uppercase">Kohhran Committee</h1>
          <p className="mt-1 text-stone-500 font-sans text-xs uppercase tracking-widest">List of ordained Upas and their areas (bial)</p>
        </div>
        {isAdmin && (
          <button 
            onClick={() => handleOpenModal()}
            className="bg-[#5A5A40] text-white px-4 py-2 rounded-xl text-[10px] uppercase font-bold tracking-widest hover:bg-[#4a4a35] transition font-sans flex items-center gap-2"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Upa
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-center py-12 text-stone-500 font-sans">Loading Upas...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {upas.map((upa) => (
            <div key={upa.id} className="bg-white rounded-[32px] shadow-sm border border-[#e0e0d5] overflow-hidden flex flex-col p-2">
              <div className="bg-[#fcfaf7] border border-[#ecece0] rounded-[24px] p-6 flex-1 m-1 mb-0 relative group">
                {/* Actions overlay */}
                {isAdmin && (
                  <div className="absolute top-4 right-4 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 backdrop-blur-sm p-1 rounded-xl border border-[#ecece0]">
                    <button onClick={() => handleOpenModal(upa)} className="p-1.5 text-stone-500 hover:text-[#5A5A40] rounded-lg hover:bg-[#fcfaf7] transition">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => handleDelete(upa.id)} className="p-1.5 text-red-500 hover:text-red-700 rounded-lg hover:bg-red-50 transition">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                <div className="flex items-start gap-4">
                  {upa.imageUrl ? (
                    <img 
                      src={upa.imageUrl} 
                      alt={upa.name} 
                      className="w-12 h-12 rounded-full object-cover border border-[#ecece0] shrink-0" 
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-12 h-12 bg-white border border-[#ecece0] text-[#5A5A40] rounded-full flex items-center justify-center text-xl font-bold font-sans shrink-0">
                      {upa.name.split(' ')[1]?.charAt(0) || upa.name.charAt(4) || 'U'}
                    </div>
                  )}
                  <div className="pr-12">
                    <h2 className="text-lg font-serif italic text-[#5A5A40] leading-tight">{upa.name}</h2>
                    <div className="mt-1 flex items-start space-x-1.5 text-[10px] uppercase tracking-wider font-bold text-stone-400 font-sans">
                      <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                      <span>{upa.bial}</span>
                    </div>
                  </div>
                </div>
                <p className="mt-4 text-sm text-stone-500 leading-relaxed font-sans italic">
                  {upa.bio || 'No biography details provided.'}
                </p>
              </div>
              <div className="px-7 py-5 flex items-center justify-between">
                <div className="flex items-center text-xs font-semibold text-[#2d2d2a] font-sans uppercase tracking-widest">
                  <Phone className="w-4 h-4 mr-2 text-[#5A5A40]" />
                  {upa.phone}
                </div>
              </div>
            </div>
          ))}
          {upas.length === 0 && (
            <div className="text-center py-12 text-stone-500 font-sans italic col-span-full">No Upas found.</div>
          )}
        </div>
      )}

      {/* Form Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-stone-900/50 flex items-center justify-center p-4">
          <div className="bg-[#f5f5f0] rounded-[32px] w-full max-w-lg shadow-xl border border-[#e0e0d5] overflow-hidden">
            <div className="p-6 border-b border-[#e0e0d5] flex justify-between items-center bg-white">
              <h2 className="text-xl font-serif italic text-[#5A5A40]">
                {editingUpa ? 'Edit Upa' : 'New Upa'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-stone-100 rounded-full text-stone-500">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 font-sans">
              <div>
                <label className="block text-[10px] uppercase font-bold text-stone-500 tracking-widest mb-1">Name</label>
                <input 
                  type="text" 
                  value={name} 
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Upa Lalthlamuana"
                  className="w-full p-3 bg-white border border-[#ecece0] rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#5A5A40]"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-stone-500 tracking-widest mb-1">Bial Area (Bial)</label>
                <input 
                  type="text" 
                  value={bial} 
                  onChange={e => setBial(e.target.value)}
                  placeholder="e.g. Bial 1 - Venglai"
                  className="w-full p-3 bg-white border border-[#ecece0] rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#5A5A40]"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-stone-500 tracking-widest mb-1">Phone Number</label>
                <input 
                  type="text" 
                  value={phone} 
                  onChange={e => setPhone(e.target.value)}
                  placeholder="e.g. +91 98765 43210"
                  className="w-full p-3 bg-white border border-[#ecece0] rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#5A5A40]"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-stone-500 tracking-widest mb-1">Biography / Info (Optional)</label>
                <textarea 
                  value={bio} 
                  onChange={e => setBio(e.target.value)}
                  placeholder="Describe role, year ordained, or other info..."
                  rows={3}
                  className="w-full p-3 bg-white border border-[#ecece0] rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#5A5A40] resize-none"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase font-bold text-stone-500 tracking-widest mb-1">Upa Image (Optional)</label>
                <div className="flex items-center gap-4">
                  {imageUrl && !selectedFile && (
                    <img src={imageUrl} alt="Preview" className="w-12 h-12 rounded-full object-cover border border-[#ecece0]" />
                  )}
                  <input 
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="w-full p-2 bg-white border border-[#ecece0] rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#5A5A40]"
                  />
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-[#e0e0d5] bg-white flex justify-end gap-3">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="px-6 py-2 rounded-xl text-xs uppercase font-bold tracking-widest text-stone-500 hover:bg-stone-50 font-sans border border-[#ecece0]"
                disabled={isUploading}
              >
                Cancel
              </button>
              <button 
                onClick={handleSave}
                disabled={isUploading}
                className="px-6 py-2 rounded-xl text-xs uppercase font-bold tracking-widest bg-[#5A5A40] text-white hover:bg-[#4a4a35] font-sans disabled:opacity-50"
              >
                {isUploading ? 'Saving...' : 'Save Upa'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
