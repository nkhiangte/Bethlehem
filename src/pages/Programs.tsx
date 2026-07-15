import { useState, useEffect } from 'react';
import { Clock, User, Plus, X, Pencil, Trash2, Calendar } from 'lucide-react';
import { db, isFirebaseConfigured } from '../lib/firebase';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import { InkhawmProgramme, PROGRAM_TITLES, DEFAULT_PROGRAM_ROLES, TawngtaiHruaituMonth, TawngtaiHruaituDay } from '../types';

export default function Programs() {
  const [activeTab, setActiveTab] = useState<'inkhawm' | 'tawngtai'>('inkhawm');
  const [programs, setPrograms] = useState<InkhawmProgramme[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Inkhawm Programme states
  const [isInkhawmModalOpen, setIsInkhawmModalOpen] = useState(false);
  const [editingProgram, setEditingProgram] = useState<InkhawmProgramme | null>(null);
  const [title, setTitle] = useState(PROGRAM_TITLES[0]);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [roles, setRoles] = useState<{ role: string; value: string }[]>([]);

  // Tawngtai Inkhawm states
  const [tawngtaiMonths, setTawngtaiMonths] = useState<TawngtaiHruaituMonth[]>([]);
  const [selectedMonthId, setSelectedMonthId] = useState<string>('');
  const [isTawngtaiModalOpen, setIsTawngtaiModalOpen] = useState(false);
  const [editingTawngtai, setEditingTawngtai] = useState<TawngtaiHruaituMonth | null>(null);
  const [tawngtaiYearMonth, setTawngtaiYearMonth] = useState('');
  const [tawngtaiDays, setTawngtaiDays] = useState<TawngtaiHruaituDay[]>([]);

  useEffect(() => {
    fetchPrograms();
    fetchTawngtaiMonths();
  }, []);

  useEffect(() => {
    if (!editingProgram) {
      setRoles(DEFAULT_PROGRAM_ROLES[title]?.map(r => ({ role: r, value: '' })) || []);
    }
  }, [title, editingProgram]);

  const fetchPrograms = async () => {
    if (!isFirebaseConfigured || !db) {
      setPrograms([]);
      return;
    }
    try {
      const q = query(collection(db, 'programs'), orderBy('date', 'desc'));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as InkhawmProgramme));
      setPrograms(data);
    } catch (error) {
      console.error("Error fetching programs:", error);
      setPrograms([]);
    }
  };

  const fetchTawngtaiMonths = async () => {
    if (!isFirebaseConfigured || !db) {
      const local = localStorage.getItem('local_tawngtai');
      if (local) {
        const data = JSON.parse(local);
        setTawngtaiMonths(data);
        if (data.length > 0) setSelectedMonthId(data[0].id);
      }
      setLoading(false);
      return;
    }
    try {
      const q = query(collection(db, 'tawngtai'), orderBy('yearMonth', 'desc'));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TawngtaiHruaituMonth));
      setTawngtaiMonths(data);
      if (data.length > 0) {
        if (!selectedMonthId || !data.find(m => m.id === selectedMonthId)) {
          setSelectedMonthId(data[0].id);
        }
      }
    } catch (error) {
      console.error("Error fetching tawngtai:", error);
    } finally {
      setLoading(false);
    }
  };

  // --- INKHAWM PROGRAMME ACTIONS ---
  const handleOpenInkhawmModal = (program?: InkhawmProgramme) => {
    if (program) {
      setEditingProgram(program);
      setTitle(program.title);
      setDate(program.date);
      setTime(program.time);
      setRoles([...program.roles]);
    } else {
      setEditingProgram(null);
      setTitle(PROGRAM_TITLES[0]);
      setDate(new Date().toISOString().split('T')[0]);
      setTime('10:00');
      setRoles(DEFAULT_PROGRAM_ROLES[PROGRAM_TITLES[0]].map(r => ({ role: r, value: '' })));
    }
    setIsInkhawmModalOpen(true);
  };

  const handleAddRole = () => setRoles([...roles, { role: 'Extra Field', value: '' }]);
  const handleRoleChange = (index: number, field: 'role' | 'value', val: string) => {
    const newRoles = [...roles];
    newRoles[index][field] = val;
    setRoles(newRoles);
  };
  const handleRemoveRole = (index: number) => {
    const newRoles = [...roles];
    newRoles.splice(index, 1);
    setRoles(newRoles);
  };

  const handleSaveInkhawm = async () => {
    const programData = { title, date, time, roles };
    if (!isFirebaseConfigured || !db) {
      alert("Firebase not configured. Cannot save.");
      return;
    }
    try {
      if (editingProgram?.id) {
        await updateDoc(doc(db, 'programs', editingProgram.id), programData);
      } else {
        await addDoc(collection(db, 'programs'), programData);
      }
      setIsInkhawmModalOpen(false);
      fetchPrograms();
    } catch (error) {
      console.error("Error saving program:", error);
      alert("Failed to save program.");
    }
  };

  const handleDeleteInkhawm = async (id: string) => {
    if (!confirm("Are you sure you want to delete this programme?")) return;
    if (!isFirebaseConfigured || !db) return;
    try {
      await deleteDoc(doc(db, 'programs', id));
      fetchPrograms();
    } catch (error) {
      console.error("Error deleting:", error);
    }
  };

  // --- TAWNGTAI INKHAWM ACTIONS ---
  const generateDaysForMonth = (ym: string): TawngtaiHruaituDay[] => {
    if (!ym) return [];
    const [y, m] = ym.split('-');
    const year = parseInt(y);
    const month = parseInt(m) - 1;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days: TawngtaiHruaituDay[] = [];
    const mizoDays = ['Pathianni', 'Thawhtanni', 'Thawhlehni', 'Nilaini', 'Ningani', 'Zirtawpni', 'Inrinni'];
    
    for (let i = 1; i <= daysInMonth; i++) {
      const d = new Date(year, month, i);
      days.push({
        date: i,
        dayName: mizoDays[d.getDay()],
        zingLeader: '',
        tlaiLeader: ''
      });
    }
    return days;
  };

  const handleOpenTawngtaiModal = (monthData?: TawngtaiHruaituMonth) => {
    if (monthData) {
      setEditingTawngtai(monthData);
      setTawngtaiYearMonth(monthData.yearMonth);
      setTawngtaiDays([...monthData.days]);
    } else {
      setEditingTawngtai(null);
      const currentYm = new Date().toISOString().slice(0, 7);
      setTawngtaiYearMonth(currentYm);
      setTawngtaiDays(generateDaysForMonth(currentYm));
    }
    setIsTawngtaiModalOpen(true);
  };

  const handleTawngtaiYearMonthChange = (val: string) => {
    setTawngtaiYearMonth(val);
    setTawngtaiDays(generateDaysForMonth(val));
  };

  const handleTawngtaiDayChange = (index: number, field: 'zingLeader' | 'tlaiLeader', val: string) => {
    const newDays = [...tawngtaiDays];
    newDays[index][field] = val;
    setTawngtaiDays(newDays);
  };

  const handleSaveTawngtai = async () => {
    if (!tawngtaiYearMonth) return;
    const data = { yearMonth: tawngtaiYearMonth, days: tawngtaiDays };

    if (!isFirebaseConfigured || !db) {
      const updated = [...tawngtaiMonths];
      if (editingTawngtai) {
        const idx = updated.findIndex(m => m.id === editingTawngtai.id);
        if (idx !== -1) updated[idx] = { ...editingTawngtai, ...data };
      } else {
        updated.push({ id: 'local_tawngtai_' + Date.now(), ...data });
      }
      updated.sort((a, b) => b.yearMonth.localeCompare(a.yearMonth));
      localStorage.setItem('local_tawngtai', JSON.stringify(updated));
      setTawngtaiMonths(updated);
      setIsTawngtaiModalOpen(false);
      if (!editingTawngtai) setSelectedMonthId(updated[0].id);
      return;
    }

    try {
      if (editingTawngtai?.id) {
        await updateDoc(doc(db, 'tawngtai', editingTawngtai.id), data);
      } else {
        await addDoc(collection(db, 'tawngtai'), data);
      }
      setIsTawngtaiModalOpen(false);
      fetchTawngtaiMonths();
    } catch (error) {
      console.error("Error saving tawngtai:", error);
      alert("Failed to save tawngtai hruaitu.");
    }
  };

  const handleDeleteTawngtai = async (id: string) => {
    if (!confirm("Are you sure you want to delete this month's record?")) return;
    if (!isFirebaseConfigured || !db) {
      const updated = tawngtaiMonths.filter(m => m.id !== id);
      localStorage.setItem('local_tawngtai', JSON.stringify(updated));
      setTawngtaiMonths(updated);
      if (selectedMonthId === id) setSelectedMonthId(updated[0]?.id || '');
      return;
    }
    try {
      await deleteDoc(doc(db, 'tawngtai', id));
      fetchTawngtaiMonths();
    } catch (error) {
      console.error("Error deleting:", error);
    }
  };

  const formatMonthName = (ym: string) => {
    if (!ym) return '';
    const [y, m] = ym.split('-');
    const d = new Date(parseInt(y), parseInt(m) - 1, 1);
    return d.toLocaleString('en-US', { month: 'long', year: 'numeric' });
  };

  const selectedMonthData = tawngtaiMonths.find(m => m.id === selectedMonthId);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight uppercase">Programmes</h1>
          <p className="mt-1 text-stone-500 font-sans text-xs uppercase tracking-widest">Church service & prayer meeting schedules</p>
        </div>
      </div>

      <div className="flex space-x-2 border-b border-[#e0e0d5] pb-px overflow-x-auto no-scrollbar">
        <button 
          onClick={() => setActiveTab('inkhawm')}
          className={`px-5 py-3 text-xs uppercase font-bold tracking-widest transition-colors border-b-2 whitespace-nowrap ${
            activeTab === 'inkhawm' ? 'border-[#5A5A40] text-[#5A5A40]' : 'border-transparent text-stone-400 hover:text-stone-600'
          }`}
        >
          Inkhawm Programme
        </button>
        <button 
          onClick={() => setActiveTab('tawngtai')}
          className={`px-5 py-3 text-xs uppercase font-bold tracking-widest transition-colors border-b-2 whitespace-nowrap ${
            activeTab === 'tawngtai' ? 'border-[#5A5A40] text-[#5A5A40]' : 'border-transparent text-stone-400 hover:text-stone-600'
          }`}
        >
          Tawngtai Inkhawm Hruaitu
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-stone-500 font-sans">Loading...</div>
      ) : activeTab === 'inkhawm' ? (
        <div className="space-y-6">
          <div className="flex justify-end">
            <button 
              onClick={() => handleOpenInkhawmModal()}
              className="bg-[#5A5A40] text-white px-4 py-2 rounded-xl text-[10px] uppercase font-bold tracking-widest hover:bg-[#4a4a35] transition font-sans flex items-center gap-2"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Programme
            </button>
          </div>
          <div className="grid gap-6">
            {programs.map((program) => (
              <div key={program.id} className="bg-white rounded-[32px] shadow-sm border border-[#e0e0d5] p-6">
                <div className="flex flex-col md:flex-row md:items-start justify-between mb-6">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-stone-400 tracking-wider font-sans mb-1 block">
                      {program.date}
                    </span>
                    <h2 className="text-xl font-serif italic text-[#5A5A40]">{program.title}</h2>
                  </div>
                  <div className="flex gap-2 mt-4 md:mt-0">
                    <button onClick={() => handleOpenInkhawmModal(program)} className="p-2 text-stone-400 hover:text-[#5A5A40] bg-[#fcfaf7] border border-[#ecece0] rounded-xl transition">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDeleteInkhawm(program.id)} className="p-2 text-red-400 hover:text-red-600 bg-red-50 border border-red-100 rounded-xl transition">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 gap-4 text-sm font-sans text-[#2d2d2a] bg-[#fcfaf7] border border-[#ecece0] p-4 rounded-2xl">
                  <div className="flex items-center space-x-3 mb-2 border-b border-[#ecece0] pb-3">
                    <Clock className="w-4 h-4 text-stone-400" />
                    <span className="font-semibold text-[#5A5A40]">{program.time}</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-6">
                    {program.roles.map((r, i) => (
                      <div key={i} className="flex items-start space-x-3">
                        <User className="w-4 h-4 text-stone-400 shrink-0 mt-0.5" />
                        <div>
                          <span className="block text-[10px] uppercase font-bold text-stone-400 tracking-widest">{r.role}</span>
                          <span className="font-semibold">{r.value || 'TBA'}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
            {programs.length === 0 && (
               <div className="text-center py-12 text-stone-500 font-sans italic">No programmes found.</div>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-[#e0e0d5] shadow-sm">
            <div className="flex items-center gap-4 w-full max-w-sm">
              <Calendar className="w-5 h-5 text-stone-400 shrink-0" />
              <select
                value={selectedMonthId}
                onChange={(e) => setSelectedMonthId(e.target.value)}
                className="w-full bg-transparent border-none focus:ring-0 text-sm font-bold text-[#5A5A40] uppercase tracking-widest p-0 cursor-pointer"
              >
                {tawngtaiMonths.length === 0 ? (
                  <option value="">-- No records --</option>
                ) : (
                  tawngtaiMonths.map(m => (
                    <option key={m.id} value={m.id}>{formatMonthName(m.yearMonth)}</option>
                  ))
                )}
              </select>
            </div>
            <div className="flex gap-2 shrink-0">
              {selectedMonthData && (
                <>
                  <button 
                    onClick={() => handleOpenTawngtaiModal(selectedMonthData)}
                    className="p-2.5 text-stone-400 hover:text-[#5A5A40] bg-[#fcfaf7] border border-[#ecece0] rounded-xl transition"
                    title="Edit Month"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => handleDeleteTawngtai(selectedMonthData.id)}
                    className="p-2.5 text-red-400 hover:text-red-600 bg-red-50 border border-red-100 rounded-xl transition"
                    title="Delete Month"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </>
              )}
              <button 
                onClick={() => handleOpenTawngtaiModal()}
                className="bg-[#5A5A40] text-white px-4 py-2 rounded-xl text-[10px] uppercase font-bold tracking-widest hover:bg-[#4a4a35] transition font-sans flex items-center gap-2"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Month
              </button>
            </div>
          </div>

          {selectedMonthData ? (
            <div className="bg-white border border-[#e0e0d5] rounded-3xl overflow-hidden shadow-sm">
              <div className="p-6 text-center border-b border-[#e0e0d5] bg-[#fcfaf7]">
                <h2 className="text-xl sm:text-2xl font-serif italic text-[#5A5A40] uppercase tracking-wide">
                  Ṭawngṭai Inkhawm Hruaitu
                </h2>
                <div className="text-sm font-bold tracking-widest text-stone-500 uppercase mt-2">
                  {formatMonthName(selectedMonthData.yearMonth)}
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-[#ecece0] font-sans">
                  <thead className="bg-[#fcfaf7]">
                    <tr>
                      <th scope="col" className="px-6 py-4 text-left text-[10px] font-bold text-stone-400 uppercase tracking-widest w-[120px]">Date</th>
                      <th scope="col" className="px-6 py-4 text-left text-[10px] font-bold text-stone-400 uppercase tracking-widest">Zing</th>
                      <th scope="col" className="px-6 py-4 text-left text-[10px] font-bold text-stone-400 uppercase tracking-widest">Tlai</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-[#ecece0]">
                    {selectedMonthData.days.map((day, i) => {
                      const isSunday = day.dayName === 'Pathianni';
                      return (
                        <tr key={i} className={`hover:bg-[#f5f5f0]/50 transition-colors ${isSunday ? 'bg-stone-50' : ''}`}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex gap-2">
                              <span className={`font-bold w-5 ${isSunday ? 'text-[#5A5A40]' : 'text-[#2d2d2a]'}`}>{day.date}</span>
                              <span className={`text-xs uppercase tracking-widest ${isSunday ? 'font-bold text-[#5A5A40]' : 'text-stone-500'}`}>{day.dayName}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`text-sm ${isSunday ? 'font-bold text-[#5A5A40]' : 'text-[#2d2d2a]'}`}>{day.zingLeader || '-'}</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-[#2d2d2a]">
                            {!isSunday ? (day.tlaiLeader || '-') : <span className="text-stone-300">-</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-stone-500 font-sans italic bg-white border border-[#e0e0d5] rounded-3xl shadow-sm">
              No Tawngtai Inkhawm data. Add a new month to get started.
            </div>
          )}
        </div>
      )}

      {/* INKHAWM MODAL */}
      {isInkhawmModalOpen && (
        <div className="fixed inset-0 z-50 bg-stone-900/50 flex items-center justify-center p-4">
          <div className="bg-[#f5f5f0] rounded-[32px] w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl border border-[#e0e0d5]">
            <div className="p-6 border-b border-[#e0e0d5] flex justify-between items-center bg-white sticky top-0 z-10">
              <h2 className="text-xl font-serif italic text-[#5A5A40]">
                {editingProgram ? 'Edit Programme' : 'New Programme'}
              </h2>
              <button onClick={() => setIsInkhawmModalOpen(false)} className="p-2 hover:bg-stone-100 rounded-full text-stone-500">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-6 font-sans">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-stone-500 tracking-widest mb-2">Service Type</label>
                  <select 
                    value={title} 
                    onChange={e => setTitle(e.target.value)}
                    className="w-full p-3 bg-white border border-[#ecece0] rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#5A5A40]"
                  >
                    {PROGRAM_TITLES.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-stone-500 tracking-widest mb-2">Date</label>
                  <input 
                    type="date" 
                    value={date} 
                    onChange={e => setDate(e.target.value)}
                    className="w-full p-3 bg-white border border-[#ecece0] rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#5A5A40]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-stone-500 tracking-widest mb-2">Time</label>
                  <input 
                    type="time" 
                    value={time} 
                    onChange={e => setTime(e.target.value)}
                    className="w-full p-3 bg-white border border-[#ecece0] rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#5A5A40]"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-end mb-4">
                  <label className="block text-[10px] uppercase font-bold text-stone-500 tracking-widest">Activities / Roles</label>
                  <button 
                    onClick={handleAddRole}
                    className="text-[#5A5A40] text-[10px] uppercase font-bold tracking-widest flex items-center hover:underline"
                  >
                    <Plus className="w-3 h-3 mr-1" /> Add Extra Field
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
                          placeholder="Role (e.g. Tantu)"
                          className="w-full p-3 bg-white border border-[#ecece0] rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#5A5A40] font-semibold text-[#5A5A40]"
                        />
                      </div>
                      <div className="flex-[2]">
                        <input 
                          type="text" 
                          value={r.value} 
                          onChange={e => handleRoleChange(i, 'value', e.target.value)}
                          placeholder="Person Name or Topic"
                          className="w-full p-3 bg-white border border-[#ecece0] rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#5A5A40]"
                        />
                      </div>
                      <button 
                        onClick={() => handleRemoveRole(i)}
                        className="p-3 text-stone-400 hover:text-red-500 bg-white border border-[#ecece0] rounded-xl"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-[#e0e0d5] bg-white flex justify-end gap-3 sticky bottom-0 z-10">
              <button 
                onClick={() => setIsInkhawmModalOpen(false)}
                className="px-6 py-2 rounded-xl text-xs uppercase font-bold tracking-widest text-stone-500 hover:bg-stone-50 font-sans border border-[#ecece0]"
              >
                Cancel
              </button>
              <button 
                onClick={handleSaveInkhawm}
                className="px-6 py-2 rounded-xl text-xs uppercase font-bold tracking-widest bg-[#5A5A40] text-white hover:bg-[#4a4a35] font-sans"
              >
                Save Programme
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAWNGTAI MODAL */}
      {isTawngtaiModalOpen && (
        <div className="fixed inset-0 z-50 bg-stone-900/50 flex items-center justify-center p-4">
          <div className="bg-[#f5f5f0] rounded-[32px] w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-xl border border-[#e0e0d5]">
            <div className="p-6 border-b border-[#e0e0d5] flex justify-between items-center bg-white shrink-0">
              <h2 className="text-xl font-serif italic text-[#5A5A40]">
                {editingTawngtai ? 'Edit Tawngtai Hruaitu' : 'New Tawngtai Hruaitu Month'}
              </h2>
              <button onClick={() => setIsTawngtaiModalOpen(false)} className="p-2 hover:bg-stone-100 rounded-full text-stone-500">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-6 font-sans">
              <div className="w-64">
                <label className="block text-[10px] uppercase font-bold text-stone-500 tracking-widest mb-2">Month (YYYY-MM)</label>
                <input 
                  type="month" 
                  value={tawngtaiYearMonth} 
                  onChange={e => handleTawngtaiYearMonthChange(e.target.value)}
                  disabled={!!editingTawngtai}
                  className="w-full p-3 bg-white border border-[#ecece0] rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#5A5A40] disabled:opacity-50"
                />
              </div>

              <div className="bg-white border border-[#ecece0] rounded-2xl overflow-hidden">
                <table className="min-w-full divide-y divide-[#ecece0]">
                  <thead className="bg-[#fcfaf7] sticky top-0 z-10">
                    <tr>
                      <th className="px-4 py-3 text-left text-[10px] font-bold text-stone-400 uppercase tracking-widest w-[120px]">Date</th>
                      <th className="px-4 py-3 text-left text-[10px] font-bold text-stone-400 uppercase tracking-widest">Zing Leader</th>
                      <th className="px-4 py-3 text-left text-[10px] font-bold text-stone-400 uppercase tracking-widest">Tlai Leader</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#ecece0]">
                    {tawngtaiDays.map((day, i) => {
                      const isSunday = day.dayName === 'Pathianni';
                      return (
                        <tr key={i} className={isSunday ? 'bg-stone-50' : ''}>
                          <td className="px-4 py-2 whitespace-nowrap">
                            <div className="flex flex-col">
                              <span className={`text-sm font-bold ${isSunday ? 'text-[#5A5A40]' : 'text-[#2d2d2a]'}`}>{day.date}</span>
                              <span className={`text-[10px] uppercase tracking-widest ${isSunday ? 'text-[#5A5A40] font-bold' : 'text-stone-400'}`}>{day.dayName}</span>
                            </div>
                          </td>
                          <td className="px-4 py-2">
                            <input 
                              type="text"
                              value={day.zingLeader}
                              onChange={e => handleTawngtaiDayChange(i, 'zingLeader', e.target.value)}
                              placeholder={isSunday ? "Pathianni Zing" : "Zing"}
                              className={`w-full p-2 bg-transparent border border-[#ecece0] rounded-lg text-sm focus:outline-none focus:border-[#5A5A40] ${isSunday ? 'font-bold' : ''}`}
                            />
                          </td>
                          <td className="px-4 py-2">
                            {!isSunday ? (
                              <input 
                                type="text"
                                value={day.tlaiLeader}
                                onChange={e => handleTawngtaiDayChange(i, 'tlaiLeader', e.target.value)}
                                placeholder="Tlai"
                                className="w-full p-2 bg-transparent border border-[#ecece0] rounded-lg text-sm focus:outline-none focus:border-[#5A5A40]"
                              />
                            ) : (
                              <div className="text-xs text-stone-400 italic px-2">N/A</div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="p-6 border-t border-[#e0e0d5] bg-white flex justify-end gap-3 shrink-0">
              <button 
                onClick={() => setIsTawngtaiModalOpen(false)}
                className="px-6 py-2 rounded-xl text-xs uppercase font-bold tracking-widest text-stone-500 hover:bg-stone-50 font-sans border border-[#ecece0]"
              >
                Cancel
              </button>
              <button 
                onClick={handleSaveTawngtai}
                className="px-6 py-2 rounded-xl text-xs uppercase font-bold tracking-widest bg-[#5A5A40] text-white hover:bg-[#4a4a35] font-sans"
              >
                Save {editingTawngtai ? 'Changes' : 'Month'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
