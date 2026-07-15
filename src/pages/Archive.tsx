import { useState, useEffect } from 'react';
import { Calendar, Users, Plus, X, Pencil, Trash2, ChevronRight } from 'lucide-react';
import { db, isFirebaseConfigured } from '../lib/firebase';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import { ArchiveYear, DEFAULT_ARCHIVE_ROLES, ArchiveRole } from '../types';

export default function Archive() {
  const [archives, setArchives] = useState<ArchiveYear[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState<ArchiveYear | null>(null);
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingArchive, setEditingArchive] = useState<ArchiveYear | null>(null);
  
  // Form states
  const [year, setYear] = useState('');
  const [roles, setRoles] = useState<ArchiveRole[]>([]);

  useEffect(() => {
    fetchArchives();
  }, []);

  const fetchArchives = async () => {
    setLoading(true);
    let fetchedArchives: ArchiveYear[] = [];

    if (!isFirebaseConfigured || !db) {
      const localArchives = localStorage.getItem('local_archives');
      if (localArchives) {
        fetchedArchives = JSON.parse(localArchives);
      }
    } else {
      try {
        const q = query(collection(db, 'archives'), orderBy('year', 'desc'));
        const snapshot = await getDocs(q);
        fetchedArchives = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ArchiveYear));
      } catch (error) {
        console.error("Error fetching archives:", error);
      }
    }

    setArchives(fetchedArchives);
    if (fetchedArchives.length > 0) {
      if (selectedYear) {
        const stillExists = fetchedArchives.find(a => a.id === selectedYear.id);
        setSelectedYear(stillExists || fetchedArchives[0]);
      } else {
        setSelectedYear(fetchedArchives[0]);
      }
    } else {
      setSelectedYear(null);
    }
    setLoading(false);
  };

  const openModal = (archive?: ArchiveYear) => {
    if (archive) {
      setEditingArchive(archive);
      setYear(archive.year);
      setRoles([...archive.roles]);
    } else {
      setEditingArchive(null);
      setYear(new Date().getFullYear().toString());
      setRoles(DEFAULT_ARCHIVE_ROLES.map(r => ({ role: r, personName: '' })));
    }
    setIsModalOpen(true);
  };

  const handleAddRole = () => {
    setRoles([...roles, { role: '', personName: '' }]);
  };

  const handleRoleChange = (index: number, field: 'role' | 'personName', val: string) => {
    const newRoles = [...roles];
    newRoles[index][field] = val;
    setRoles(newRoles);
  };

  const handleRemoveRole = (index: number) => {
    const newRoles = [...roles];
    newRoles.splice(index, 1);
    setRoles(newRoles);
  };

  const handleSave = async () => {
    if (!year) {
      alert("Please enter a year.");
      return;
    }

    const archiveData = { year, roles };

    if (!isFirebaseConfigured || !db) {
      const updatedArchives = [...archives];
      if (editingArchive) {
        const idx = updatedArchives.findIndex(a => a.id === editingArchive.id);
        if (idx !== -1) {
          updatedArchives[idx] = { ...editingArchive, ...archiveData };
        }
      } else {
        const newArchive: ArchiveYear = {
          id: 'local_archive_' + Date.now(),
          ...archiveData
        };
        updatedArchives.push(newArchive);
      }
      
      // Sort desc locally
      updatedArchives.sort((a, b) => parseInt(b.year) - parseInt(a.year));
      
      localStorage.setItem('local_archives', JSON.stringify(updatedArchives));
      setArchives(updatedArchives);
      setIsModalOpen(false);
      
      const updatedItem = editingArchive ? updatedArchives.find(a => a.id === editingArchive.id) : updatedArchives[0];
      if (updatedItem) setSelectedYear(updatedItem);
      
      return;
    }

    try {
      if (editingArchive?.id) {
        await updateDoc(doc(db, 'archives', editingArchive.id), archiveData);
      } else {
        await addDoc(collection(db, 'archives'), archiveData);
      }
      setIsModalOpen(false);
      await fetchArchives();
    } catch (error) {
      console.error("Error saving archive:", error);
      alert("Failed to save archive.");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this archive year?")) return;
    
    if (!isFirebaseConfigured || !db) {
      const updatedArchives = archives.filter(a => a.id !== id);
      localStorage.setItem('local_archives', JSON.stringify(updatedArchives));
      setArchives(updatedArchives);
      if (selectedYear?.id === id) {
        setSelectedYear(updatedArchives[0] || null);
      }
      return;
    }

    try {
      await deleteDoc(doc(db, 'archives', id));
      await fetchArchives();
    } catch (error) {
      console.error("Error deleting archive:", error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight uppercase">Archive</h1>
          <p className="mt-1 text-stone-500 font-sans text-xs uppercase tracking-widest">
            Historical records of Rawngbawltu (Office Bearers)
          </p>
        </div>
        <button 
          onClick={() => openModal()}
          className="bg-[#5A5A40] text-white px-4 py-2 rounded-xl text-[10px] uppercase font-bold tracking-widest hover:bg-[#4a4a35] transition font-sans flex items-center gap-2 shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Year
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-stone-500 font-sans">Loading archives...</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Year selection */}
          <div className="lg:col-span-4 space-y-4">
            <h2 className="text-xs uppercase tracking-widest font-bold text-stone-400 font-sans px-2">
              Select Year
            </h2>
            <div className="space-y-3">
              {archives.map((archive) => {
                const isActive = selectedYear?.id === archive.id;

                return (
                  <div
                    key={archive.id}
                    className={`group relative rounded-[24px] border transition-all ${
                      isActive
                        ? 'bg-[#5A5A40] text-white border-[#5A5A40] shadow-md'
                        : 'bg-white text-[#2d2d2a] border-[#e0e0d5] hover:border-stone-400'
                    }`}
                  >
                    <button
                      onClick={() => setSelectedYear(archive)}
                      className="w-full text-left p-4 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3 pr-8">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 font-sans ${
                          isActive ? 'bg-white/20 text-white' : 'bg-[#fcfaf7] border border-[#ecece0] text-[#5A5A40]'
                        }`}>
                          <Calendar className="w-4 h-4" />
                        </div>
                        <div>
                          <h3 className="font-serif italic text-lg leading-tight">
                            {archive.year}
                          </h3>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <ChevronRight className={`w-4 h-4 transition-transform group-hover:translate-x-0.5 ${
                          isActive ? 'text-white/80' : 'text-stone-300'
                        }`} />
                      </div>
                    </button>

                    {/* Admin inline buttons */}
                    <div className="absolute top-3 right-10 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={(e) => { e.stopPropagation(); openModal(archive); }}
                        className={`p-1.5 rounded-lg border transition ${
                          isActive 
                            ? 'bg-white/20 text-white border-white/30 hover:bg-white/35' 
                            : 'bg-[#fcfaf7] text-stone-500 border-[#ecece0] hover:text-[#5A5A40]'
                        }`}
                        title="Edit Year"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleDelete(archive.id); }}
                        className={`p-1.5 rounded-lg border transition ${
                          isActive 
                            ? 'bg-red-900/40 text-red-100 border-red-500/30 hover:bg-red-800/55' 
                            : 'bg-red-50 text-red-500 border-red-100 hover:text-red-700 hover:bg-red-100'
                        }`}
                        title="Delete Year"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
              {archives.length === 0 && (
                <div className="text-center py-6 text-stone-400 font-sans italic">No archives found.</div>
              )}
            </div>
          </div>

          {/* Right Column: Roles for the selected year */}
          <div className="lg:col-span-8 space-y-6">
            {selectedYear ? (
              <div className="bg-white rounded-[32px] border border-[#e0e0d5] shadow-sm overflow-hidden">
                <div className="p-6 sm:p-8 border-b border-[#e0e0d5] bg-[#fcfaf7]">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] uppercase font-bold text-stone-400 tracking-wider font-sans mb-1 block">
                          Rawngbawltu List
                        </span>
                        <button 
                          onClick={() => openModal(selectedYear)}
                          className="p-1 text-stone-400 hover:text-[#5A5A40] transition rounded-md hover:bg-stone-100"
                          title="Edit roles"
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                      </div>
                      <h2 className="text-2xl font-serif italic text-[#5A5A40]">{selectedYear.year} Office Bearers</h2>
                    </div>
                    <div className="bg-white border border-[#ecece0] px-4 py-2.5 rounded-2xl flex items-center gap-2 font-sans shrink-0">
                      <Users className="w-4 h-4 text-[#5A5A40]" />
                      <span className="text-xs font-bold text-[#2d2d2a]">
                        {selectedYear.roles.length} Role{selectedYear.roles.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-[#ecece0] font-sans">
                    <thead className="bg-[#fcfaf7]">
                      <tr>
                        <th scope="col" className="px-6 py-4 text-left text-[10px] font-bold text-stone-400 uppercase tracking-widest w-1/2">
                          Post / Committee Role
                        </th>
                        <th scope="col" className="px-6 py-4 text-left text-[10px] font-bold text-stone-400 uppercase tracking-widest w-1/2">
                          Rawngbawltu Name
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-[#ecece0]">
                      {selectedYear.roles.map((r, i) => (
                        <tr key={i} className="hover:bg-[#f5f5f0]/50 transition-colors">
                          <td className="px-6 py-5 whitespace-nowrap">
                            <div className="text-sm font-semibold text-[#5A5A40] uppercase tracking-widest text-[10px]">{r.role || 'Unspecified Role'}</div>
                          </td>
                          <td className="px-6 py-5 whitespace-nowrap">
                            <div className="text-sm font-semibold text-[#2d2d2a]">{r.personName || 'TBA'}</div>
                          </td>
                        </tr>
                      ))}
                      {selectedYear.roles.length === 0 && (
                        <tr>
                          <td colSpan={2} className="px-6 py-12 text-center text-sm text-stone-500 italic">
                            No roles defined for this year.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-stone-500 font-sans italic bg-white border border-[#e0e0d5] rounded-[32px]">
                Please select a Year from the list on the left or add a new Year to begin.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal for Add / Edit Year Roles */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-stone-900/50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-[#f5f5f0] rounded-[32px] w-full max-w-2xl shadow-xl border border-[#e0e0d5] overflow-hidden max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-[#e0e0d5] flex justify-between items-center bg-white shrink-0">
              <h2 className="text-xl font-serif italic text-[#5A5A40]">
                {editingArchive ? `Edit ${editingArchive.year} Rawngbawltu` : 'Add New Archive Year'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-stone-100 rounded-full text-stone-500">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 font-sans">
              <div>
                <label className="block text-[10px] uppercase font-bold text-stone-500 tracking-widest mb-1">Year</label>
                <input 
                  type="text" 
                  value={year} 
                  onChange={e => setYear(e.target.value)}
                  placeholder="e.g. 2024"
                  className="w-full p-3 bg-white border border-[#ecece0] rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#5A5A40]"
                />
              </div>

              <div>
                <div className="flex justify-between items-end mb-4">
                  <label className="block text-[10px] uppercase font-bold text-stone-500 tracking-widest">Office Bearers / Roles</label>
                  <button 
                    onClick={handleAddRole}
                    className="text-[#5A5A40] text-[10px] uppercase font-bold tracking-widest flex items-center hover:underline"
                  >
                    <Plus className="w-3 h-3 mr-1" /> Add Extra Role
                  </button>
                </div>
                <div className="space-y-3">
                  {roles.map((r, i) => (
                    <div key={i} className="flex gap-3 items-start">
                      <div className="flex-1">
                        <input 
                          type="text" 
                          value={r.role} 
                          onChange={e => handleRoleChange(i, 'role', e.target.value)}
                          placeholder="Role (e.g. Kohhran Chairman)"
                          className="w-full p-3 bg-white border border-[#ecece0] rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#5A5A40] font-semibold text-[#5A5A40]"
                        />
                      </div>
                      <div className="flex-[2]">
                        <input 
                          type="text" 
                          value={r.personName} 
                          onChange={e => handleRoleChange(i, 'personName', e.target.value)}
                          placeholder="Person Name"
                          className="w-full p-3 bg-white border border-[#ecece0] rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#5A5A40]"
                        />
                      </div>
                      <button 
                        onClick={() => handleRemoveRole(i)}
                        className="p-3 text-stone-400 hover:text-red-500 bg-white border border-[#ecece0] rounded-xl transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  {roles.length === 0 && (
                    <div className="text-sm text-stone-500 italic p-4 text-center border border-dashed border-[#ecece0] rounded-xl bg-white">
                      No roles defined. Click "Add Extra Role" to begin.
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-[#e0e0d5] bg-white flex justify-end gap-3 shrink-0">
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
                Save Year
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
