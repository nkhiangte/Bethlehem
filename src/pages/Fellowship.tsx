import { useState, useEffect } from 'react';
import { Plus, X, Pencil, Trash2, HeartHandshake } from 'lucide-react';
import { db, isFirebaseConfigured } from '../lib/firebase';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import { Fellowship, FellowshipBearer, DEFAULT_FELLOWSHIPS, DEFAULT_FELLOWSHIP_BEARERS } from '../types';

export default function FellowshipPage() {
  const [fellowships, setFellowships] = useState<Fellowship[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFellowship, setEditingFellowship] = useState<Fellowship | null>(null);
  const [formName, setFormName] = useState('');
  const [formBearers, setFormBearers] = useState<FellowshipBearer[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    if (!isFirebaseConfigured || !db) {
      const local = localStorage.getItem('local_fellowships');
      if (local) {
        setFellowships(JSON.parse(local));
      } else {
        // Initialize default fellowships
        const initialFellowships: Fellowship[] = DEFAULT_FELLOWSHIPS.map((name, index) => ({
          id: `local_fel_${Date.now()}_${index}`,
          name,
          bearers: DEFAULT_FELLOWSHIP_BEARERS.map(title => ({ title, name: '' }))
        }));
        setFellowships(initialFellowships);
        localStorage.setItem('local_fellowships', JSON.stringify(initialFellowships));
      }
      setLoading(false);
      return;
    }

    try {
      const snap = await getDocs(query(collection(db, 'fellowships'), orderBy('name', 'asc')));
      if (snap.empty) {
        // Initialize if empty
        const initialFellowships = [];
        for (const name of DEFAULT_FELLOWSHIPS) {
          const newDoc = await addDoc(collection(db, 'fellowships'), {
            name,
            bearers: DEFAULT_FELLOWSHIP_BEARERS.map(title => ({ title, name: '' }))
          });
          initialFellowships.push({
            id: newDoc.id,
            name,
            bearers: DEFAULT_FELLOWSHIP_BEARERS.map(title => ({ title, name: '' }))
          });
        }
        setFellowships(initialFellowships);
      } else {
        setFellowships(snap.docs.map(d => ({ id: d.id, ...d.data() } as Fellowship)));
      }
    } catch (error) {
      console.error("Error fetching fellowships:", error);
    } finally {
      setLoading(false);
    }
  };

  const openModal = (fellowship?: Fellowship) => {
    if (fellowship) {
      setEditingFellowship(fellowship);
      setFormName(fellowship.name);
      setFormBearers([...fellowship.bearers]);
    } else {
      setEditingFellowship(null);
      setFormName('');
      setFormBearers(DEFAULT_FELLOWSHIP_BEARERS.map(title => ({ title, name: '' })));
    }
    setIsModalOpen(true);
  };

  const handleBearerChange = (index: number, name: string) => {
    const updated = [...formBearers];
    updated[index].name = name;
    setFormBearers(updated);
  };

  const handleBearerTitleChange = (index: number, title: string) => {
    const updated = [...formBearers];
    updated[index].title = title;
    setFormBearers(updated);
  };

  const addBearer = () => {
    setFormBearers([...formBearers, { title: '', name: '' }]);
  };

  const removeBearer = (index: number) => {
    setFormBearers(formBearers.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!formName.trim()) {
      alert("Fellowship name is required.");
      return;
    }

    const data = {
      name: formName,
      bearers: formBearers.filter(b => b.title.trim() !== '')
    };

    if (!isFirebaseConfigured || !db) {
      const updated = [...fellowships];
      if (editingFellowship) {
        const idx = updated.findIndex(c => c.id === editingFellowship.id);
        if (idx !== -1) updated[idx] = { ...editingFellowship, ...data };
      } else {
        updated.push({ id: 'local_fel_' + Date.now(), ...data });
      }
      updated.sort((a, b) => a.name.localeCompare(b.name));
      localStorage.setItem('local_fellowships', JSON.stringify(updated));
      setFellowships(updated);
      setIsModalOpen(false);
      return;
    }

    try {
      if (editingFellowship?.id) {
        await updateDoc(doc(db, 'fellowships', editingFellowship.id), data);
      } else {
        await addDoc(collection(db, 'fellowships'), data);
      }
      setIsModalOpen(false);
      fetchData();
    } catch (error) {
      console.error("Error saving fellowship:", error);
      alert("Failed to save fellowship");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this fellowship?")) return;
    
    if (!isFirebaseConfigured || !db) {
      const updated = fellowships.filter(c => c.id !== id);
      localStorage.setItem('local_fellowships', JSON.stringify(updated));
      setFellowships(updated);
      return;
    }

    try {
      await deleteDoc(doc(db, 'fellowships', id));
      fetchData();
    } catch (error) {
      console.error("Error deleting fellowship:", error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight uppercase">Fellowship</h1>
          <p className="mt-1 text-stone-500 font-sans text-xs uppercase tracking-widest">Office bearers and members</p>
        </div>
        <button 
          onClick={() => openModal()}
          className="bg-[#5A5A40] text-white px-4 py-2 rounded-xl text-[10px] uppercase font-bold tracking-widest hover:bg-[#4a4a35] transition shrink-0 font-sans flex items-center gap-2"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Fellowship
        </button>
      </div>

      {loading ? (
        <div className="p-12 text-center text-sm text-stone-500 font-sans italic">Loading...</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {fellowships.map(fellowship => (
            <div key={fellowship.id} className="bg-white rounded-[32px] shadow-sm border border-[#e0e0d5] overflow-hidden group">
              <div className="p-6 border-b border-[#ecece0] flex justify-between items-center bg-[#fcfaf7]">
                <h2 className="text-xl font-serif italic text-[#5A5A40] flex items-center gap-2">
                  <HeartHandshake className="w-5 h-5 text-stone-400" />
                  {fellowship.name}
                </h2>
                <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => openModal(fellowship)} 
                    className="p-1.5 text-stone-400 hover:text-[#5A5A40] hover:bg-white border border-[#ecece0] rounded-lg transition"
                    title="Edit Fellowship"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button 
                    onClick={() => handleDelete(fellowship.id)} 
                    className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 border border-red-100 rounded-lg transition"
                    title="Delete Fellowship"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <div className="p-6 font-sans">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-6">
                  {fellowship.bearers.map((bearer, idx) => (
                    <div key={idx} className="flex flex-col">
                      <span className="text-[10px] uppercase font-bold text-stone-400 tracking-widest mb-1">{bearer.title}</span>
                      <span className="text-sm font-semibold text-[#2d2d2a]">{bearer.name || '-'}</span>
                    </div>
                  ))}
                  {fellowship.bearers.length === 0 && (
                    <div className="text-sm text-stone-500 italic col-span-2">No bearers assigned.</div>
                  )}
                </div>
              </div>
            </div>
          ))}
          {fellowships.length === 0 && (
            <div className="col-span-full p-12 text-center text-sm text-stone-500 font-sans italic border border-dashed border-[#d0d0c5] rounded-[32px]">
              No fellowships found. Click "Add Fellowship" to create one.
            </div>
          )}
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-stone-900/50 flex items-center justify-center p-4 backdrop-blur-sm overflow-y-auto py-10">
          <div className="bg-[#f5f5f0] rounded-[32px] w-full max-w-2xl shadow-xl border border-[#e0e0d5] overflow-hidden my-auto">
            <div className="p-6 border-b border-[#e0e0d5] flex justify-between items-center bg-white sticky top-0 z-10">
              <h2 className="text-xl font-serif italic text-[#5A5A40]">
                {editingFellowship ? 'Edit Fellowship' : 'Add Fellowship'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-stone-100 rounded-full text-stone-500">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6 font-sans">
              <div>
                <label className="block text-[10px] uppercase font-bold text-stone-500 tracking-widest mb-1">Fellowship Name</label>
                <input 
                  type="text" 
                  value={formName} 
                  onChange={e => setFormName(e.target.value)}
                  placeholder="e.g. KTP"
                  className="w-full p-3 bg-white border border-[#ecece0] rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#5A5A40]"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-3">
                  <label className="block text-[10px] uppercase font-bold text-stone-500 tracking-widest">Office Bearers</label>
                  <button 
                    onClick={addBearer}
                    className="text-[10px] uppercase font-bold tracking-widest text-[#5A5A40] hover:text-[#4a4a35] flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> Add Role
                  </button>
                </div>
                
                <div className="space-y-3">
                  {formBearers.map((bearer, index) => (
                    <div key={index} className="flex gap-3 items-start">
                      <div className="flex-1">
                        <input 
                          type="text" 
                          value={bearer.title} 
                          onChange={e => handleBearerTitleChange(index, e.target.value)}
                          placeholder="Title (e.g. Leader)"
                          className="w-full p-3 bg-white border border-[#ecece0] rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#5A5A40]"
                        />
                      </div>
                      <div className="flex-1">
                        <input 
                          type="text" 
                          value={bearer.name} 
                          onChange={e => handleBearerChange(index, e.target.value)}
                          placeholder="Name"
                          className="w-full p-3 bg-white border border-[#ecece0] rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#5A5A40]"
                        />
                      </div>
                      <button 
                        onClick={() => removeBearer(index)}
                        className="p-3 text-red-400 hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-100 rounded-xl transition mt-px shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  {formBearers.length === 0 && (
                    <p className="text-xs text-stone-500 italic">No bearers added.</p>
                  )}
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-[#e0e0d5] bg-white flex justify-end gap-3 sticky bottom-0 z-10">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="px-6 py-2 rounded-xl text-xs uppercase font-bold tracking-widest text-stone-500 hover:bg-stone-50 font-sans border border-[#ecece0]"
              >
                Cancel
              </button>
              <button 
                onClick={handleSave}
                className="px-6 py-2 rounded-xl text-xs uppercase font-bold tracking-widest bg-[#5A5A40] text-white hover:bg-[#4a4a35] font-sans"
              >
                Save Fellowship
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
