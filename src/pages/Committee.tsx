import { useState, useEffect } from 'react';
import { Plus, X, Pencil, Trash2, Users, Phone, MessageCircle } from 'lucide-react';
import { db, isFirebaseConfigured } from '../lib/firebase';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import { useAuth } from '../lib/auth';
import { Committee, CommitteeBearer, DEFAULT_COMMITTEES, DEFAULT_COMMITTEE_BEARERS } from '../types';
import { getPhoneCallUrl, getWhatsAppUrl } from '../components/PhoneLink';

export default function CommitteePage() {
  const { isAdmin } = useAuth();
  const [committees, setCommittees] = useState<Committee[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCommittee, setEditingCommittee] = useState<Committee | null>(null);
  const [formName, setFormName] = useState('');
  const [formBearers, setFormBearers] = useState<CommitteeBearer[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    if (!isFirebaseConfigured || !db) {
      const local = localStorage.getItem('local_committees');
      if (local) {
        setCommittees(JSON.parse(local));
      } else {
        // Initialize default committees
        const initialCommittees: Committee[] = DEFAULT_COMMITTEES.map((name, index) => ({
          id: `local_com_${Date.now()}_${index}`,
          name,
          bearers: DEFAULT_COMMITTEE_BEARERS.map(title => ({ title, name: '', phone: '' }))
        }));
        setCommittees(initialCommittees);
        localStorage.setItem('local_committees', JSON.stringify(initialCommittees));
      }
      setLoading(false);
      return;
    }

    try {
      const snap = await getDocs(query(collection(db, 'committees'), orderBy('name', 'asc')));
      if (snap.empty) {
        // Initialize if empty
        const initialCommittees = [];
        for (const name of DEFAULT_COMMITTEES) {
          const newDoc = await addDoc(collection(db, 'committees'), {
            name,
            bearers: DEFAULT_COMMITTEE_BEARERS.map(title => ({ title, name: '', phone: '' }))
          });
          initialCommittees.push({
            id: newDoc.id,
            name,
            bearers: DEFAULT_COMMITTEE_BEARERS.map(title => ({ title, name: '', phone: '' }))
          });
        }
        setCommittees(initialCommittees);
      } else {
        setCommittees(snap.docs.map(d => ({ id: d.id, ...d.data() } as Committee)));
      }
    } catch (error) {
      console.error("Error fetching committees:", error);
    } finally {
      setLoading(false);
    }
  };

  const openModal = (committee?: Committee) => {
    if (committee) {
      setEditingCommittee(committee);
      setFormName(committee.name);
      setFormBearers(committee.bearers.map(b => ({
        title: b.title || '',
        name: b.name || '',
        phone: b.phone || ''
      })));
    } else {
      setEditingCommittee(null);
      setFormName('');
      setFormBearers(DEFAULT_COMMITTEE_BEARERS.map(title => ({ title, name: '', phone: '' })));
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

  const handleBearerPhoneChange = (index: number, phone: string) => {
    const updated = [...formBearers];
    updated[index].phone = phone;
    setFormBearers(updated);
  };

  const addBearer = () => {
    setFormBearers([...formBearers, { title: '', name: '', phone: '' }]);
  };

  const removeBearer = (index: number) => {
    setFormBearers(formBearers.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!formName.trim()) {
      alert("Committee name is required.");
      return;
    }

    const data = {
      name: formName,
      bearers: formBearers.filter(b => b.title.trim() !== '' || b.name.trim() !== '')
    };

    if (!isFirebaseConfigured || !db) {
      const updated = [...committees];
      if (editingCommittee) {
        const idx = updated.findIndex(c => c.id === editingCommittee.id);
        if (idx !== -1) updated[idx] = { ...editingCommittee, ...data };
      } else {
        updated.push({ id: 'local_com_' + Date.now(), ...data });
      }
      updated.sort((a, b) => a.name.localeCompare(b.name));
      localStorage.setItem('local_committees', JSON.stringify(updated));
      setCommittees(updated);
      setIsModalOpen(false);
      return;
    }

    try {
      if (editingCommittee?.id) {
        await updateDoc(doc(db, 'committees', editingCommittee.id), data);
      } else {
        await addDoc(collection(db, 'committees'), data);
      }
      setIsModalOpen(false);
      fetchData();
    } catch (error) {
      console.error("Error saving committee:", error);
      alert("Failed to save committee");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this committee?")) return;
    
    if (!isFirebaseConfigured || !db) {
      const updated = committees.filter(c => c.id !== id);
      localStorage.setItem('local_committees', JSON.stringify(updated));
      setCommittees(updated);
      return;
    }

    try {
      await deleteDoc(doc(db, 'committees', id));
      fetchData();
    } catch (error) {
      console.error("Error deleting committee:", error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight uppercase">Committee</h1>
          <p className="mt-1 text-stone-500 font-sans text-xs uppercase tracking-widest">Office bearers and members</p>
        </div>
        {isAdmin && (
          <button 
            onClick={() => openModal()}
            className="bg-[#5A5A40] text-white px-4 py-2 rounded-xl text-[10px] uppercase font-bold tracking-widest hover:bg-[#4a4a35] transition shrink-0 font-sans flex items-center gap-2"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Committee
          </button>
        )}
      </div>

      {loading ? (
        <div className="p-12 text-center text-sm text-stone-500 font-sans italic">Loading...</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {committees.map(committee => (
            <div key={committee.id} className="bg-white rounded-[32px] shadow-sm border border-[#e0e0d5] overflow-hidden group flex flex-col justify-between">
              <div>
                <div className="p-6 border-b border-[#ecece0] flex justify-between items-center bg-[#fcfaf7]">
                  <h2 className="text-xl font-serif italic text-[#5A5A40] flex items-center gap-2">
                    <Users className="w-5 h-5 text-stone-400" />
                    {committee.name}
                  </h2>
                  {isAdmin && (
                    <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => openModal(committee)} 
                        className="p-1.5 text-stone-400 hover:text-[#5A5A40] hover:bg-white border border-[#ecece0] rounded-lg transition"
                        title="Edit Committee"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={() => handleDelete(committee.id)} 
                        className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 border border-red-100 rounded-lg transition"
                        title="Delete Committee"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
                <div className="p-6 font-sans">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {committee.bearers.map((bearer, idx) => (
                      <div key={idx} className="p-3.5 bg-[#fcfaf7] border border-[#ecece0] rounded-2xl flex flex-col justify-between space-y-2">
                        <div>
                          <span className="text-[10px] uppercase font-bold text-stone-400 tracking-widest block mb-0.5">
                            {bearer.title}
                          </span>
                          <span className="text-sm font-semibold text-[#2d2d2a] block">
                            {bearer.name || '-'}
                          </span>
                        </div>

                        {bearer.phone ? (
                          <div className="pt-2 border-t border-[#ecece0] flex flex-col gap-1.5">
                            <div className="flex items-center gap-1.5 text-xs text-stone-600">
                              <Phone className="w-3 h-3 text-[#5A5A40] shrink-0" />
                              <span className="font-mono font-medium">{bearer.phone}</span>
                            </div>
                            <div className="flex items-center gap-2 pt-0.5">
                              <a
                                href={getPhoneCallUrl(bearer.phone)}
                                className="flex-1 flex items-center justify-center gap-1 py-1.5 px-2.5 bg-[#5A5A40] text-white rounded-xl hover:bg-[#4a4a35] transition font-medium text-[11px] shadow-2xs"
                                title={`Call ${bearer.name || bearer.title}`}
                              >
                                <Phone className="w-3 h-3" />
                                <span>Call</span>
                              </a>
                              <a
                                href={getWhatsAppUrl(bearer.phone)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex-1 flex items-center justify-center gap-1 py-1.5 px-2.5 bg-[#25D366] text-white rounded-xl hover:bg-[#20bd5a] transition font-medium text-[11px] shadow-2xs"
                                title={`WhatsApp ${bearer.name || bearer.title}`}
                              >
                                <MessageCircle className="w-3 h-3" />
                                <span>WhatsApp</span>
                              </a>
                            </div>
                          </div>
                        ) : (
                          <div className="pt-1 text-[11px] text-stone-400 italic">
                            No phone added
                          </div>
                        )}
                      </div>
                    ))}
                    {committee.bearers.length === 0 && (
                      <div className="text-sm text-stone-500 italic col-span-2">No bearers assigned.</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
          {committees.length === 0 && (
            <div className="col-span-full p-12 text-center text-sm text-stone-500 font-sans italic border border-dashed border-[#d0d0c5] rounded-[32px]">
              No committees found. Click "Add Committee" to create one.
            </div>
          )}
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-stone-900/50 flex items-center justify-center p-4 backdrop-blur-sm overflow-y-auto py-10">
          <div className="bg-[#f5f5f0] rounded-[32px] w-full max-w-2xl shadow-xl border border-[#e0e0d5] overflow-hidden my-auto max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-[#e0e0d5] flex justify-between items-center bg-white sticky top-0 z-10 shrink-0">
              <h2 className="text-xl font-serif italic text-[#5A5A40]">
                {editingCommittee ? 'Edit Committee' : 'Add Committee'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-stone-100 rounded-full text-stone-500">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6 font-sans overflow-y-auto flex-1">
              <div>
                <label className="block text-[10px] uppercase font-bold text-stone-500 tracking-widest mb-1">Committee Name</label>
                <input 
                  type="text" 
                  value={formName} 
                  onChange={e => setFormName(e.target.value)}
                  placeholder="e.g. Kohhran Committee"
                  className="w-full p-3 bg-white border border-[#ecece0] rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#5A5A40]"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-3">
                  <label className="block text-[10px] uppercase font-bold text-stone-500 tracking-widest">Office Bearers & Members</label>
                  <button 
                    onClick={addBearer}
                    className="text-[10px] uppercase font-bold tracking-widest text-[#5A5A40] hover:text-[#4a4a35] flex items-center gap-1 bg-white px-3 py-1.5 rounded-xl border border-[#ecece0] shadow-2xs hover:bg-stone-50"
                  >
                    <Plus className="w-3 h-3" /> Add Member / Role
                  </button>
                </div>
                
                <div className="space-y-3">
                  {formBearers.map((bearer, index) => (
                    <div key={index} className="p-3.5 bg-white border border-[#ecece0] rounded-2xl space-y-2.5 shadow-2xs">
                      <div className="flex gap-2 items-center">
                        <input 
                          type="text" 
                          value={bearer.title} 
                          onChange={e => handleBearerTitleChange(index, e.target.value)}
                          placeholder="Role (e.g. Chairman, Member)"
                          className="w-1/3 p-2.5 bg-[#fcfaf7] border border-[#ecece0] rounded-xl text-sm font-medium focus:outline-none focus:ring-1 focus:ring-[#5A5A40]"
                        />
                        <input 
                          type="text" 
                          value={bearer.name} 
                          onChange={e => handleBearerChange(index, e.target.value)}
                          placeholder="Name (e.g. Upa Lalthlamuana)"
                          className="flex-1 p-2.5 bg-[#fcfaf7] border border-[#ecece0] rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#5A5A40]"
                        />
                        <button 
                          type="button"
                          onClick={() => removeBearer(index)}
                          className="p-2.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition shrink-0"
                          title="Remove Member"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#f0f0e8] rounded-xl text-stone-600 shrink-0 text-xs font-semibold">
                          <Phone className="w-3.5 h-3.5 text-[#5A5A40]" />
                          <span>Phone</span>
                        </div>
                        <input 
                          type="text" 
                          value={bearer.phone || ''} 
                          onChange={e => handleBearerPhoneChange(index, e.target.value)}
                          placeholder="Phone number / WhatsApp (e.g. 9862123456)"
                          className="w-full p-2.5 bg-[#fcfaf7] border border-[#ecece0] rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-[#5A5A40]"
                        />
                      </div>
                    </div>
                  ))}
                  {formBearers.length === 0 && (
                    <p className="text-xs text-stone-500 italic">No bearers added.</p>
                  )}
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-[#e0e0d5] bg-white flex justify-end gap-3 sticky bottom-0 z-10 shrink-0">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="px-6 py-2.5 rounded-xl text-xs uppercase font-bold tracking-widest text-stone-500 hover:bg-stone-50 font-sans border border-[#ecece0]"
              >
                Cancel
              </button>
              <button 
                onClick={handleSave}
                className="px-6 py-2.5 rounded-xl text-xs uppercase font-bold tracking-widest bg-[#5A5A40] text-white hover:bg-[#4a4a35] font-sans"
              >
                Save Committee
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

