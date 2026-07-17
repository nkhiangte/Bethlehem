import { useAuth } from '../lib/auth';
import { useState, useEffect, useRef, ChangeEvent } from 'react';
import { Filter, Plus, X, Pencil, Trash2, Upload } from 'lucide-react';
import { db, isFirebaseConfigured } from '../lib/firebase';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import { RecordType, ChurchRecord, DamloKanRecord, Upa } from '../types';
import Papa from 'papaparse';

const recordTypes: { value: RecordType | 'all', label: string }[] = [
  { value: 'all', label: 'All Records' },
  { value: 'baptism', label: 'Baptism' },
  { value: 'marriage', label: 'Marriage' },
  { value: 'death', label: 'Death' },
  { value: 'pem', label: 'Pem (Emigrate)' },
  { value: 'dawnsawn', label: 'Dawnsawn (Immigrate)' },
  { value: 'testimonial_received', label: 'Testimonial Received' },
  { value: 'testimonial_disbursement', label: 'Testimonial Disbursement' },
  { value: 'converted', label: 'Converted from other denom.' }
];

export default function Records() {
  const { isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<'records' | 'damlokan'>('records');
  const [filterType, setFilterType] = useState<RecordType | 'all'>('all');
  
  const [upas, setUpas] = useState<Upa[]>([]);
  const [damloKanRecords, setDamloKanRecords] = useState<DamloKanRecord[]>([]);
  const [churchRecords, setChurchRecords] = useState<ChurchRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Damlo modal state
  const [isDamloModalOpen, setIsDamloModalOpen] = useState(false);
  const [editingDamlo, setEditingDamlo] = useState<DamloKanRecord | null>(null);
  const [damloName, setDamloName] = useState('');
  const [damloMonth, setDamloMonth] = useState('');
  const [damloUpaBial, setDamloUpaBial] = useState('');

  // Record modal state
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<ChurchRecord | null>(null);
  const [recordFormType, setRecordFormType] = useState<RecordType>('baptism');
  const [recordMemberName, setRecordMemberName] = useState('');
  const [recordDate, setRecordDate] = useState('');
  const [recordDetails, setRecordDetails] = useState('');
  const [recordOfficiant, setRecordOfficiant] = useState('');
  const [recordBirthDate, setRecordBirthDate] = useState('');
  const [recordGroomName, setRecordGroomName] = useState('');
  const [recordBrideName, setRecordBrideName] = useState('');
  const [recordDeathReason, setRecordDeathReason] = useState('');
  const [recordFamilyMembers, setRecordFamilyMembers] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredRecords = churchRecords.filter(record => 
    filterType === 'all' || record.type === filterType
  );

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    if (!isFirebaseConfigured || !db) {
      const localDamlo = localStorage.getItem('local_damlo_kan');
      if (localDamlo) setDamloKanRecords(JSON.parse(localDamlo));
      
      const localUpas = localStorage.getItem('local_upas');
      if (localUpas) setUpas(JSON.parse(localUpas));

      const localRecords = localStorage.getItem('local_church_records');
      if (localRecords) {
        setChurchRecords(JSON.parse(localRecords));
      } else {
        setChurchRecords([]);
      }
      setLoading(false);
      return;
    }

    try {
      const uSnap = await getDocs(query(collection(db, 'upas'), orderBy('name', 'asc')));
      setUpas(uSnap.docs.map(d => ({ id: d.id, ...d.data() } as Upa)));

      const dSnap = await getDocs(query(collection(db, 'damlokan'), orderBy('month', 'desc')));
      setDamloKanRecords(dSnap.docs.map(d => ({ id: d.id, ...d.data() } as DamloKanRecord)));

      const rSnap = await getDocs(query(collection(db, 'records'), orderBy('date', 'desc')));
      setChurchRecords(rSnap.docs.map(d => ({ id: d.id, ...d.data() } as ChurchRecord)));
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  // --- CHURCH RECORDS ACTIONS ---
  const openRecordModal = (record?: ChurchRecord) => {
    if (record) {
      setEditingRecord(record);
      setRecordFormType(record.type);
      setRecordMemberName(record.memberName || '');
      setRecordDate(record.date || '');
      setRecordDetails(record.details || '');
      setRecordOfficiant(record.officiant || '');
      setRecordBirthDate(record.birthDate || '');
      setRecordGroomName(record.groomName || '');
      setRecordBrideName(record.brideName || '');
      setRecordDeathReason(record.deathReason || '');
      setRecordFamilyMembers(record.familyMembers || '');
    } else {
      setEditingRecord(null);
      setRecordFormType(filterType !== 'all' ? filterType : 'baptism');
      setRecordMemberName('');
      setRecordDate(new Date().toISOString().split('T')[0]);
      setRecordDetails('');
      setRecordOfficiant('');
      setRecordBirthDate('');
      setRecordGroomName('');
      setRecordBrideName('');
      setRecordDeathReason('');
      setRecordFamilyMembers('');
    }
    setIsRecordModalOpen(true);
  };

  const handleSaveRecord = async () => {
    let nameToSave = recordMemberName;
    if (recordFormType === 'marriage') {
      nameToSave = `${recordGroomName} & ${recordBrideName}`;
    }

    const data: Partial<ChurchRecord> = {
      type: recordFormType,
      memberName: nameToSave,
      date: recordDate,
      details: recordDetails,
      officiant: recordOfficiant,
    };

    if (recordFormType === 'baptism') {
      data.birthDate = recordBirthDate;
    } else if (recordFormType === 'marriage') {
      data.groomName = recordGroomName;
      data.brideName = recordBrideName;
    } else if (recordFormType === 'death') {
      data.deathReason = recordDeathReason;
    } else if (['pem', 'dawnsawn', 'testimonial_received', 'testimonial_disbursement'].includes(recordFormType)) {
      data.familyMembers = recordFamilyMembers;
    }

    if (!isFirebaseConfigured || !db) {
      const updated = [...churchRecords];
      if (editingRecord) {
        const idx = updated.findIndex(r => r.id === editingRecord.id);
        if (idx !== -1) updated[idx] = { ...editingRecord, ...data } as ChurchRecord;
      } else {
        updated.push({ id: 'local_rec_' + Date.now(), ...data } as ChurchRecord);
      }
      updated.sort((a, b) => b.date.localeCompare(a.date));
      localStorage.setItem('local_church_records', JSON.stringify(updated));
      setChurchRecords(updated);
      setIsRecordModalOpen(false);
      return;
    }

    try {
      if (editingRecord?.id) {
        await updateDoc(doc(db, 'records', editingRecord.id), data);
      } else {
        await addDoc(collection(db, 'records'), data);
      }
      setIsRecordModalOpen(false);
      fetchData();
    } catch (error) {
      console.error("Error saving record:", error);
      alert("Failed to save record");
    }
  };

  const handleDeleteRecord = async (id: string) => {
    if (!confirm("Are you sure you want to delete this record?")) return;
    
    if (!isFirebaseConfigured || !db) {
      const updated = churchRecords.filter(r => r.id !== id);
      localStorage.setItem('local_church_records', JSON.stringify(updated));
      setChurchRecords(updated);
      return;
    }

    try {
      await deleteDoc(doc(db, 'records', id));
      fetchData();
    } catch (error) {
      console.error("Error deleting record:", error);
    }
  };

  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (filterType === 'all') {
      alert("Please select a specific record type (e.g. Baptism, Marriage) from the filter before importing.");
      return;
    }

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const newRecords: Partial<ChurchRecord>[] = results.data.map((row: any) => {
          let rec: Partial<ChurchRecord> = {
            type: filterType as RecordType,
            date: row['Date'] || row['Ni'] || row['Inneih Ni'] || row['Baptisma Ni'] || row['Thih Ni'] || row['Pem Ni'] || row['Dawnsawn Ni'] || new Date().toISOString().split('T')[0],
            officiant: row['Officiant'] || row['Pastor'] || row['Inneih tirtu'] || row['Vuitu'] || '',
            details: row['Details'] || row['Veng'] || '',
          };

          if (filterType === 'baptism') {
            rec.memberName = row['Name'] || row['Hming'] || '';
            rec.birthDate = row['Birth Date'] || row['Pian Ni'] || '';
          } else if (filterType === 'marriage') {
            rec.groomName = row['Groom'] || row['Moneitu'] || '';
            rec.brideName = row['Bride'] || row['Mo'] || '';
            rec.memberName = `${rec.groomName} & ${rec.brideName}`;
          } else if (filterType === 'death') {
            rec.memberName = row['Name'] || row['Hming'] || '';
            rec.deathReason = row['Reason'] || row['Thih Chhan'] || '';
          } else if (['pem', 'dawnsawn', 'testimonial_received', 'testimonial_disbursement'].includes(filterType)) {
            rec.memberName = row['Name'] || row['Hming'] || '';
            rec.familyMembers = row['Family Members'] || row['Chhungkaw Member Zat'] || '';
          } else {
            rec.memberName = row['Name'] || row['Hming'] || '';
          }

          return rec;
        });

        if (!isFirebaseConfigured || !db) {
          const updated = [...churchRecords];
          newRecords.forEach((nr, i) => {
            updated.push({ id: `local_rec_${Date.now()}_${i}`, ...nr } as ChurchRecord);
          });
          updated.sort((a, b) => b.date.localeCompare(a.date));
          localStorage.setItem('local_church_records', JSON.stringify(updated));
          setChurchRecords(updated);
          alert(`Successfully imported ${newRecords.length} records locally.`);
        } else {
          try {
            for (const nr of newRecords) {
              await addDoc(collection(db, 'records'), nr);
            }
            fetchData();
            alert(`Successfully imported ${newRecords.length} records to Firebase.`);
          } catch (error) {
            console.error("Error importing records:", error);
            alert("Failed to import some or all records.");
          }
        }
      },
      error: (error) => {
        console.error("CSV Parse Error:", error);
        alert("Failed to parse CSV file.");
      }
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // --- DAMLO KAN ACTIONS ---
  const openDamloModal = (record?: DamloKanRecord) => {
    if (record) {
      setEditingDamlo(record);
      setDamloName(record.name);
      setDamloMonth(record.month);
      setDamloUpaBial(record.upaBial);
    } else {
      setEditingDamlo(null);
      setDamloName('');
      setDamloMonth(new Date().toISOString().slice(0, 7));
      setDamloUpaBial(upas[0]?.bial || '');
    }
    setIsDamloModalOpen(true);
  };

  const handleSaveDamlo = async () => {
    if (!damloName || !damloMonth || !damloUpaBial) return;
    
    const data = {
      name: damloName,
      month: damloMonth,
      upaBial: damloUpaBial
    };

    if (!isFirebaseConfigured || !db) {
      const updated = [...damloKanRecords];
      if (editingDamlo) {
        const idx = updated.findIndex(r => r.id === editingDamlo.id);
        if (idx !== -1) updated[idx] = { ...editingDamlo, ...data };
      } else {
        updated.push({ id: 'local_damlo_' + Date.now(), ...data });
      }
      updated.sort((a, b) => b.month.localeCompare(a.month));
      localStorage.setItem('local_damlo_kan', JSON.stringify(updated));
      setDamloKanRecords(updated);
      setIsDamloModalOpen(false);
      return;
    }

    try {
      if (editingDamlo?.id) {
        await updateDoc(doc(db, 'damlokan', editingDamlo.id), data);
      } else {
        await addDoc(collection(db, 'damlokan'), data);
      }
      setIsDamloModalOpen(false);
      fetchData();
    } catch (error) {
      console.error("Error saving damlo kan record:", error);
      alert("Failed to save record");
    }
  };

  const handleDeleteDamlo = async (id: string) => {
    if (!confirm("Are you sure you want to delete this record?")) return;
    
    if (!isFirebaseConfigured || !db) {
      const updated = damloKanRecords.filter(r => r.id !== id);
      localStorage.setItem('local_damlo_kan', JSON.stringify(updated));
      setDamloKanRecords(updated);
      return;
    }

    try {
      await deleteDoc(doc(db, 'damlokan', id));
      fetchData();
    } catch (error) {
      console.error("Error deleting damlo kan record:", error);
    }
  };

  const formatMonthName = (ym: string) => {
    if (!ym) return '';
    const [y, m] = ym.split('-');
    const d = new Date(parseInt(y), parseInt(m) - 1, 1);
    return d.toLocaleString('en-US', { month: 'long', year: 'numeric' });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight uppercase">Records</h1>
          <p className="mt-1 text-stone-500 font-sans text-xs uppercase tracking-widest">Digital registry of church records</p>
        </div>
      </div>

      <div className="flex space-x-2 border-b border-[#e0e0d5] pb-px overflow-x-auto no-scrollbar">
        <button 
          onClick={() => setActiveTab('records')}
          className={`px-5 py-3 text-xs uppercase font-bold tracking-widest transition-colors border-b-2 whitespace-nowrap ${
            activeTab === 'records' ? 'border-[#5A5A40] text-[#5A5A40]' : 'border-transparent text-stone-400 hover:text-stone-600'
          }`}
        >
          Church Records
        </button>
        <button 
          onClick={() => setActiveTab('damlokan')}
          className={`px-5 py-3 text-xs uppercase font-bold tracking-widest transition-colors border-b-2 whitespace-nowrap ${
            activeTab === 'damlokan' ? 'border-[#5A5A40] text-[#5A5A40]' : 'border-transparent text-stone-400 hover:text-stone-600'
          }`}
        >
          Damlo Kan
        </button>
      </div>

      {activeTab === 'records' ? (
        <div className="space-y-6">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div className="flex flex-wrap items-center gap-2">
              {recordTypes.map(type => (
                <button
                  key={type.value}
                  onClick={() => setFilterType(type.value as any)}
                  className={`px-4 py-2 rounded-xl border text-[10px] font-bold uppercase tracking-widest transition-colors ${
                    filterType === type.value 
                      ? 'bg-[#5A5A40] text-white border-[#5A5A40]' 
                      : 'bg-white text-stone-500 border-[#ecece0] hover:bg-stone-50'
                  }`}
                >
                  {type.label}
                </button>
              ))}
            </div>
            
            <div className="flex gap-2">
              <input 
                type="file" 
                accept=".csv" 
                ref={fileInputRef} 
                onChange={handleFileUpload} 
                className="hidden" 
              />
              <button 
                onClick={() => {
                  if (filterType === 'all') {
                    alert('Please select a specific record type (e.g. Baptism) to import CSV');
                  } else {
                    fileInputRef.current?.click();
                  }
                }}
                className="bg-[#fcfaf7] text-[#5A5A40] border border-[#ecece0] px-4 py-2 rounded-xl text-[10px] uppercase font-bold tracking-widest hover:bg-stone-50 transition shrink-0 font-sans flex items-center gap-2"
              >
                <Upload className="w-3.5 h-3.5" />
                Import CSV
              </button>
              <button 
                onClick={() => openRecordModal()}
                className="bg-[#5A5A40] text-white px-4 py-2 rounded-xl text-[10px] uppercase font-bold tracking-widest hover:bg-[#4a4a35] transition shrink-0 font-sans flex items-center gap-2"
              >
                <Plus className="w-3.5 h-3.5" />
                New Record
              </button>
            </div>
          </div>

          <div className="bg-white rounded-[32px] shadow-sm border border-[#e0e0d5] overflow-hidden">
            {loading ? (
              <div className="p-12 text-center text-sm text-stone-500 font-sans italic">Loading...</div>
            ) : (
              <div className="divide-y divide-[#ecece0]">
                {filteredRecords.map((record) => (
                  <div key={record.id} className="p-6 hover:bg-[#f5f5f0]/50 transition group">
                    <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
                      <div>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mb-2">
                          <h3 className="text-xl font-serif italic text-[#5A5A40]">
                            {record.type === 'marriage' ? `${record.groomName || '?'} & ${record.brideName || '?'}` : record.memberName}
                          </h3>
                          <span className="inline-flex items-center px-2 py-1 rounded-md text-[9px] uppercase tracking-wider font-bold bg-[#fcfaf7] border border-[#ecece0] text-stone-500 font-sans w-fit">
                            {record.type.replace('_', ' ')}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 mb-2">
                          <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest font-sans">
                            {record.type === 'baptism' ? 'Baptisma Ni: ' : record.type === 'marriage' ? 'Inneih Ni: ' : record.type === 'death' ? 'Thih Ni: ' : record.type === 'pem' ? 'Pem Ni: ' : record.type === 'dawnsawn' ? 'Dawnsawn Ni: ' : 'Date: '} 
                            <span className="text-[#5A5A40]">{record.date}</span>
                          </p>
                          {record.type === 'baptism' && record.birthDate && (
                            <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest font-sans">
                              Pian Ni: <span className="text-[#5A5A40]">{record.birthDate}</span>
                            </p>
                          )}
                          {record.type === 'death' && record.deathReason && (
                            <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest font-sans">
                              Thih Chhan: <span className="text-[#5A5A40]">{record.deathReason}</span>
                            </p>
                          )}
                          {['pem', 'dawnsawn', 'testimonial_received', 'testimonial_disbursement'].includes(record.type) && record.familyMembers && (
                            <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest font-sans">
                              Chhungkaw Member Zat: <span className="text-[#5A5A40]">{record.familyMembers}</span>
                            </p>
                          )}
                        </div>
                        {record.details && <p className="text-sm text-[#2d2d2a] font-sans">{record.details}</p>}
                      </div>
                      <div className="flex flex-col items-end gap-3">
                        {record.officiant && (
                          <div className="text-sm font-sans md:text-right p-3 bg-[#fcfaf7] rounded-xl border border-[#ecece0]">
                            <span className="block text-[9px] uppercase tracking-widest text-stone-400 font-bold mb-1">
                              {record.type === 'baptism' ? 'Pastor' : record.type === 'marriage' ? 'Inneih tirtu' : record.type === 'death' ? 'Vuitu' : 'Officiant'}
                            </span>
                            <span className="font-semibold text-[#5A5A40]">{record.officiant}</span>
                          </div>
                        )}
                        <div className="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => openRecordModal(record)} 
                            className="p-1.5 text-stone-400 hover:text-[#5A5A40] hover:bg-white border border-[#ecece0] rounded-lg transition"
                            title="Edit Record"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button 
                            onClick={() => handleDeleteRecord(record.id)} 
                            className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 border border-red-100 rounded-lg transition"
                            title="Delete Record"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {filteredRecords.length === 0 && (
                  <div className="p-12 text-center text-sm text-stone-500 font-sans italic">
                    No records found for the selected type.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex justify-end">
            <button 
              onClick={() => openDamloModal()}
              className="bg-[#5A5A40] text-white px-4 py-2 rounded-xl text-[10px] uppercase font-bold tracking-widest hover:bg-[#4a4a35] transition shrink-0 font-sans flex items-center gap-2"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Damlo Kan Record
            </button>
          </div>

          <div className="bg-white rounded-[32px] shadow-sm border border-[#e0e0d5] overflow-hidden">
            {loading ? (
              <div className="p-12 text-center text-sm text-stone-500 font-sans italic">Loading...</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-[#ecece0] font-sans">
                  <thead className="bg-[#fcfaf7]">
                    <tr>
                      <th scope="col" className="px-6 py-4 text-left text-[10px] font-bold text-stone-400 uppercase tracking-widest">Hming (Name)</th>
                      <th scope="col" className="px-6 py-4 text-left text-[10px] font-bold text-stone-400 uppercase tracking-widest">Thla (Month)</th>
                      <th scope="col" className="px-6 py-4 text-left text-[10px] font-bold text-stone-400 uppercase tracking-widest">Upa Bial</th>
                      <th scope="col" className="px-6 py-4 text-right text-[10px] font-bold text-stone-400 uppercase tracking-widest">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-[#ecece0]">
                    {damloKanRecords.map((record) => (
                      <tr key={record.id} className="hover:bg-[#f5f5f0]/50 transition-colors group">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-semibold text-[#2d2d2a]">{record.name}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-stone-500">{formatMonthName(record.month)}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-[10px] font-bold uppercase tracking-widest text-[#5A5A40] bg-[#fcfaf7] border border-[#ecece0] rounded-lg px-2.5 py-1 w-fit">
                            {record.upaBial}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={() => openDamloModal(record)} 
                              className="p-1.5 text-stone-400 hover:text-[#5A5A40] hover:bg-white border border-[#ecece0] rounded-lg transition"
                              title="Edit Record"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button 
                              onClick={() => handleDeleteDamlo(record.id)} 
                              className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 border border-red-100 rounded-lg transition"
                              title="Delete Record"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {damloKanRecords.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-6 py-12 text-center text-sm text-stone-500 italic">
                          No Damlo Kan records found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal for Church Record */}
      {isRecordModalOpen && (
        <div className="fixed inset-0 z-50 bg-stone-900/50 flex items-center justify-center p-4 backdrop-blur-sm overflow-y-auto py-10">
          <div className="bg-[#f5f5f0] rounded-[32px] w-full max-w-xl shadow-xl border border-[#e0e0d5] overflow-hidden my-auto">
            <div className="p-6 border-b border-[#e0e0d5] flex justify-between items-center bg-white sticky top-0 z-10">
              <h2 className="text-xl font-serif italic text-[#5A5A40]">
                {editingRecord ? 'Edit Record' : 'Add Record'}
              </h2>
              <button onClick={() => setIsRecordModalOpen(false)} className="p-2 hover:bg-stone-100 rounded-full text-stone-500">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5 font-sans">
              <div>
                <label className="block text-[10px] uppercase font-bold text-stone-500 tracking-widest mb-1">Type</label>
                <select 
                  value={recordFormType} 
                  onChange={e => setRecordFormType(e.target.value as RecordType)}
                  className="w-full p-3 bg-white border border-[#ecece0] rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#5A5A40]"
                >
                  {recordTypes.filter(t => t.value !== 'all').map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>

              {recordFormType === 'baptism' ? (
                <>
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-stone-500 tracking-widest mb-1">Hming (Name)</label>
                    <input 
                      type="text" 
                      value={recordMemberName} 
                      onChange={e => setRecordMemberName(e.target.value)}
                      placeholder="e.g. Lalramhluna"
                      className="w-full p-3 bg-white border border-[#ecece0] rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#5A5A40]"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-stone-500 tracking-widest mb-1">Pian Ni (Birth Date)</label>
                      <input 
                        type="date" 
                        value={recordBirthDate} 
                        onChange={e => setRecordBirthDate(e.target.value)}
                        className="w-full p-3 bg-white border border-[#ecece0] rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#5A5A40]"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-stone-500 tracking-widest mb-1">Baptisma Ni</label>
                      <input 
                        type="date" 
                        value={recordDate} 
                        onChange={e => setRecordDate(e.target.value)}
                        className="w-full p-3 bg-white border border-[#ecece0] rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#5A5A40]"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-stone-500 tracking-widest mb-1">Pastor (Officiant)</label>
                    <input 
                      type="text" 
                      value={recordOfficiant} 
                      onChange={e => setRecordOfficiant(e.target.value)}
                      placeholder="e.g. Rev. Lalthangliana"
                      className="w-full p-3 bg-white border border-[#ecece0] rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#5A5A40]"
                    />
                  </div>
                </>
              ) : recordFormType === 'marriage' ? (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-stone-500 tracking-widest mb-1">Moneitu (Groom)</label>
                      <input 
                        type="text" 
                        value={recordGroomName} 
                        onChange={e => setRecordGroomName(e.target.value)}
                        placeholder="Groom's name"
                        className="w-full p-3 bg-white border border-[#ecece0] rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#5A5A40]"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-stone-500 tracking-widest mb-1">Mo (Bride)</label>
                      <input 
                        type="text" 
                        value={recordBrideName} 
                        onChange={e => setRecordBrideName(e.target.value)}
                        placeholder="Bride's name"
                        className="w-full p-3 bg-white border border-[#ecece0] rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#5A5A40]"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-stone-500 tracking-widest mb-1">Inneih Ni (Date)</label>
                    <input 
                      type="date" 
                      value={recordDate} 
                      onChange={e => setRecordDate(e.target.value)}
                      className="w-full p-3 bg-white border border-[#ecece0] rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#5A5A40]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-stone-500 tracking-widest mb-1">Inneih tirtu (Officiant)</label>
                    <input 
                      type="text" 
                      value={recordOfficiant} 
                      onChange={e => setRecordOfficiant(e.target.value)}
                      placeholder="e.g. Rev. Lalthangliana"
                      className="w-full p-3 bg-white border border-[#ecece0] rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#5A5A40]"
                    />
                  </div>
                </>
              ) : recordFormType === 'death' ? (
                <>
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-stone-500 tracking-widest mb-1">Hming (Name)</label>
                    <input 
                      type="text" 
                      value={recordMemberName} 
                      onChange={e => setRecordMemberName(e.target.value)}
                      className="w-full p-3 bg-white border border-[#ecece0] rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#5A5A40]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-stone-500 tracking-widest mb-1">Thih Ni (Date)</label>
                    <input 
                      type="date" 
                      value={recordDate} 
                      onChange={e => setRecordDate(e.target.value)}
                      className="w-full p-3 bg-white border border-[#ecece0] rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#5A5A40]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-stone-500 tracking-widest mb-1">Thih Chhan (Reason)</label>
                    <input 
                      type="text" 
                      value={recordDeathReason} 
                      onChange={e => setRecordDeathReason(e.target.value)}
                      className="w-full p-3 bg-white border border-[#ecece0] rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#5A5A40]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-stone-500 tracking-widest mb-1">Vuitu (Officiant)</label>
                    <input 
                      type="text" 
                      value={recordOfficiant} 
                      onChange={e => setRecordOfficiant(e.target.value)}
                      className="w-full p-3 bg-white border border-[#ecece0] rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#5A5A40]"
                    />
                  </div>
                </>
              ) : ['pem', 'dawnsawn', 'testimonial_received', 'testimonial_disbursement'].includes(recordFormType) ? (
                <>
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-stone-500 tracking-widest mb-1">Hming (Name)</label>
                    <input 
                      type="text" 
                      value={recordMemberName} 
                      onChange={e => setRecordMemberName(e.target.value)}
                      className="w-full p-3 bg-white border border-[#ecece0] rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#5A5A40]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-stone-500 tracking-widest mb-1">
                      {recordFormType === 'pem' ? 'Pem Ni (Date)' : recordFormType === 'dawnsawn' ? 'Dawnsawn Ni (Date)' : 'Ni (Date)'}
                    </label>
                    <input 
                      type="date" 
                      value={recordDate} 
                      onChange={e => setRecordDate(e.target.value)}
                      className="w-full p-3 bg-white border border-[#ecece0] rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#5A5A40]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-stone-500 tracking-widest mb-1">Chhungkaw Member Zat</label>
                    <input 
                      type="number" 
                      value={recordFamilyMembers} 
                      onChange={e => setRecordFamilyMembers(e.target.value)}
                      className="w-full p-3 bg-white border border-[#ecece0] rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#5A5A40]"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-stone-500 tracking-widest mb-1">Member Name</label>
                    <input 
                      type="text" 
                      value={recordMemberName} 
                      onChange={e => setRecordMemberName(e.target.value)}
                      className="w-full p-3 bg-white border border-[#ecece0] rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#5A5A40]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-stone-500 tracking-widest mb-1">Date</label>
                    <input 
                      type="date" 
                      value={recordDate} 
                      onChange={e => setRecordDate(e.target.value)}
                      className="w-full p-3 bg-white border border-[#ecece0] rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#5A5A40]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-stone-500 tracking-widest mb-1">Officiant (Optional)</label>
                    <input 
                      type="text" 
                      value={recordOfficiant} 
                      onChange={e => setRecordOfficiant(e.target.value)}
                      className="w-full p-3 bg-white border border-[#ecece0] rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#5A5A40]"
                    />
                  </div>
                </>
              )}
              
              <div>
                <label className="block text-[10px] uppercase font-bold text-stone-500 tracking-widest mb-1">Details / Notes</label>
                <textarea 
                  value={recordDetails} 
                  onChange={e => setRecordDetails(e.target.value)}
                  rows={3}
                  className="w-full p-3 bg-white border border-[#ecece0] rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#5A5A40] resize-none"
                />
              </div>
            </div>

            <div className="p-6 border-t border-[#e0e0d5] bg-white flex justify-end gap-3 sticky bottom-0 z-10">
              <button 
                onClick={() => setIsRecordModalOpen(false)}
                className="px-6 py-2 rounded-xl text-xs uppercase font-bold tracking-widest text-stone-500 hover:bg-stone-50 font-sans border border-[#ecece0]"
              >
                Cancel
              </button>
              <button 
                onClick={handleSaveRecord}
                className="px-6 py-2 rounded-xl text-xs uppercase font-bold tracking-widest bg-[#5A5A40] text-white hover:bg-[#4a4a35] font-sans"
              >
                Save Record
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal for Damlo Kan */}
      {isDamloModalOpen && (
        <div className="fixed inset-0 z-50 bg-stone-900/50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-[#f5f5f0] rounded-[32px] w-full max-w-lg shadow-xl border border-[#e0e0d5] overflow-hidden">
            <div className="p-6 border-b border-[#e0e0d5] flex justify-between items-center bg-white">
              <h2 className="text-xl font-serif italic text-[#5A5A40]">
                {editingDamlo ? 'Edit Damlo Kan Record' : 'Add Damlo Kan Record'}
              </h2>
              <button onClick={() => setIsDamloModalOpen(false)} className="p-2 hover:bg-stone-100 rounded-full text-stone-500">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 font-sans">
              <div>
                <label className="block text-[10px] uppercase font-bold text-stone-500 tracking-widest mb-1">Hming (Name)</label>
                <input 
                  type="text" 
                  value={damloName} 
                  onChange={e => setDamloName(e.target.value)}
                  placeholder="e.g. Lalramhluna"
                  className="w-full p-3 bg-white border border-[#ecece0] rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#5A5A40]"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-stone-500 tracking-widest mb-1">Thla (Month)</label>
                <input 
                  type="month" 
                  value={damloMonth} 
                  onChange={e => setDamloMonth(e.target.value)}
                  className="w-full p-3 bg-white border border-[#ecece0] rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#5A5A40]"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-stone-500 tracking-widest mb-1">Upa Bial</label>
                {upas.length > 0 ? (
                  <select 
                    value={damloUpaBial} 
                    onChange={e => setDamloUpaBial(e.target.value)}
                    className="w-full p-3 bg-white border border-[#ecece0] rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#5A5A40]"
                  >
                    <option value="">-- Choose Bial --</option>
                    {upas.map(u => (
                      <option key={u.id} value={u.bial}>{u.bial} ({u.name})</option>
                    ))}
                  </select>
                ) : (
                  <input 
                    type="text" 
                    value={damloUpaBial} 
                    onChange={e => setDamloUpaBial(e.target.value)}
                    placeholder="e.g. Bial 1"
                    className="w-full p-3 bg-white border border-[#ecece0] rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#5A5A40]"
                  />
                )}
              </div>
            </div>

            <div className="p-6 border-t border-[#e0e0d5] bg-white flex justify-end gap-3">
              <button 
                onClick={() => setIsDamloModalOpen(false)}
                className="px-6 py-2 rounded-xl text-xs uppercase font-bold tracking-widest text-stone-500 hover:bg-stone-50 font-sans border border-[#ecece0]"
              >
                Cancel
              </button>
              <button 
                onClick={handleSaveDamlo}
                className="px-6 py-2 rounded-xl text-xs uppercase font-bold tracking-widest bg-[#5A5A40] text-white hover:bg-[#4a4a35] font-sans"
              >
                Save Record
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
