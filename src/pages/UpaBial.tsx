import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Phone, Users, Home, Search, ChevronRight, Plus, X, Pencil, Trash2, Upload, Download } from 'lucide-react';
import { db, isFirebaseConfigured } from '../lib/firebase';
import { collection, getDocs, query, orderBy, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { Upa, Member } from '../types';
import { uploadImageToImgbb } from '../lib/imgbb';
import { useAuth } from '../lib/auth';
import Papa from 'papaparse';

export default function UpaBial() {
  const { isAdmin } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [upas, setUpas] = useState<Upa[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUpa, setSelectedUpa] = useState<Upa | null>(null);
  const [memberSearchTerm, setMemberSearchTerm] = useState('');

  // Modals visibility state
  const [isBialModalOpen, setIsBialModalOpen] = useState(false);
  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);

  // Editing states
  const [editingUpa, setEditingUpa] = useState<Upa | null>(null);
  const [editingMember, setEditingMember] = useState<Member | null>(null);

  // Bial / Elder form states
  const [elderName, setElderName] = useState('');
  const [bialName, setBialName] = useState('');
  const [elderPhone, setElderPhone] = useState('');
  const [elderBio, setElderBio] = useState('');
  const [elderImageUrl, setElderImageUrl] = useState('');
  const [mapImageUrl, setMapImageUrl] = useState('');
  const [mapDescription, setMapDescription] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedMapFile, setSelectedMapFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Family Member form states
  const [memberName, setMemberName] = useState('');
  const [memberPhone, setMemberPhone] = useState('');
  const [memberAddress, setMemberAddress] = useState('');
  const [memberBial, setMemberBial] = useState('');
  const [memberFamilyHead, setMemberFamilyHead] = useState('');
  const [memberDob, setMemberDob] = useState('');
  const [memberDzk, setMemberDzk] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    let fetchedUpas: Upa[] = [];
    let fetchedMembers: Member[] = [];

    if (!isFirebaseConfigured || !db) {
      // Read from localStorage to allow seamless offline-mode admin actions
      const localUpas = localStorage.getItem('local_upas');
      const localMembers = localStorage.getItem('local_members');
      fetchedUpas = localUpas ? JSON.parse(localUpas) : [];
      fetchedMembers = localMembers ? JSON.parse(localMembers) : [];
    } else {
      try {
        const upasSnapshot = await getDocs(collection(db, 'upas'));
        fetchedUpas = upasSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Upa));

        const membersSnapshot = await getDocs(query(collection(db, 'members'), orderBy('name', 'asc')));
        fetchedMembers = membersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Member));

        if (fetchedUpas.length === 0) {
          fetchedUpas = [];
        }
        if (fetchedMembers.length === 0) {
          fetchedMembers = [];
        }
      } catch (error) {
        console.error("Error loading Upa Bial data:", error);
        fetchedUpas = [];
        fetchedMembers = [];
      }
    }

    const getBialNumber = (bialStr: string): number => {
      const match = bialStr.match(/\d+/);
      return match ? parseInt(match[0], 10) : 9999;
    };

    fetchedUpas.sort((a, b) => {
      const numA = getBialNumber(a.bial);
      const numB = getBialNumber(b.bial);
      if (numA !== numB) {
        return numA - numB;
      }
      return a.bial.localeCompare(b.bial);
    });

    setUpas(fetchedUpas);
    setMembers(fetchedMembers);
    
    // Maintain selection or select first
    if (fetchedUpas.length > 0) {
      if (selectedUpa) {
        const stillExists = fetchedUpas.find(u => u.id === selectedUpa.id);
        setSelectedUpa(stillExists || fetchedUpas[0]);
      } else {
        setSelectedUpa(fetchedUpas[0]);
      }
    } else {
      setSelectedUpa(null);
    }
    setLoading(false);
  };

  // Filter members belonging to the selected Upa's Bial
  const bialMembers = members.filter(member => {
    if (!selectedUpa) return false;
    const memberBial = member.upaBial.toLowerCase().trim();
    const upaBial = selectedUpa.bial.toLowerCase().trim();
    return memberBial.includes(upaBial) || upaBial.includes(memberBial);
  });

  // Apply secondary search within the bial
  const filteredBialMembers = bialMembers.filter(member =>
    member.name.toLowerCase().includes(memberSearchTerm.toLowerCase()) ||
    member.familyHead.toLowerCase().includes(memberSearchTerm.toLowerCase())
  );

  // Admin Bial (Elder) Save Handler
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleMapFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedMapFile(e.target.files[0]);
    }
  };

  const handleSaveBial = async () => {
    if (!elderName || !bialName || !elderPhone) {
      alert("Khawngaihin a hming, bial leh phone number ziah hmaih suh.");
      return;
    }

    if (!isFirebaseConfigured || !db) {
      alert("Firebase not configured.");
      return;
    }

    setIsUploading(true);
    try {
      let finalImageUrl = elderImageUrl;
      if (selectedFile) {
        finalImageUrl = await uploadImageToImgbb(selectedFile);
      }

      let finalMapImageUrl = mapImageUrl;
      if (selectedMapFile) {
        finalMapImageUrl = await uploadImageToImgbb(selectedMapFile);
      }

      if (!finalMapImageUrl) {
        alert("Khawngaihin Bial Map thlalak (image) thun rawh. (Mandatory)");
        setIsUploading(false);
        return;
      }

      const upaData = {
        name: elderName,
        bial: bialName,
        phone: elderPhone,
        bio: elderBio,
        imageUrl: finalImageUrl,
        mapImageUrl: finalMapImageUrl,
        mapDescription: mapDescription
      };

      if (editingUpa?.id) {
        await updateDoc(doc(db, 'upas', editingUpa.id), upaData);
      } else {
        await addDoc(collection(db, 'upas'), upaData);
      }
      setIsBialModalOpen(false);
      await fetchData();
    } catch (error) {
      console.error("Error saving elder/bial:", error);
      alert("Failed to save elder/bial.");
    } finally {
      setIsUploading(false);
    }
  };

  // Admin Member Save Handler
  const handleSaveMember = async () => {
    if (!memberName || !memberBial) {
      alert("Khawngaihin hming leh upa bial thlang rawh.");
      return;
    }

    const memberData = {
      name: memberName,
      phone: memberPhone,
      address: memberAddress,
      upaBial: memberBial,
      familyHead: memberFamilyHead,
      dob: memberDob,
      dzk: memberDzk
    };

    if (!isFirebaseConfigured || !db) {
      const updatedMembers = [...members];
      if (editingMember) {
        const idx = updatedMembers.findIndex(m => m.id === editingMember.id);
        if (idx !== -1) {
          updatedMembers[idx] = { ...editingMember, ...memberData };
        }
      } else {
        const newMember: Member = {
          id: 'local_member_' + Date.now(),
          ...memberData
        };
        updatedMembers.push(newMember);
      }
      localStorage.setItem('local_members', JSON.stringify(updatedMembers));
      setMembers(updatedMembers);
      setIsMemberModalOpen(false);
      return;
    }

    try {
      if (editingMember?.id) {
        await updateDoc(doc(db, 'members', editingMember.id), memberData);
      } else {
        await addDoc(collection(db, 'members'), memberData);
      }
      setIsMemberModalOpen(false);
      await fetchData();
    } catch (error) {
      console.error("Error saving member:", error);
      alert("Failed to save family member.");
    }
  };

  // CSV File upload handler for family members
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!selectedUpa) {
      alert("Khawngaihin bial pakhat thlang hmasa rawh.");
      return;
    }

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const newMembers: Omit<Member, 'id'>[] = results.data.map((row: any) => {
          const dzkVal = (row['DZK'] || row['dzk'] || '').toLowerCase().trim();
          return {
            name: (row['Name'] || row['Hming'] || '').trim(),
            phone: (row['Phone'] || row['Phone Number'] || row['Contact'] || row['Number'] || '').trim(),
            address: (row['Address'] || row['Veng'] || row['In hmun'] || row['In Luah'] || '').trim(),
            upaBial: selectedUpa.bial,
            familyHead: (row['Family Head'] || row['Chhungkaw Pa'] || row['Chhungkaw pa hming'] || row['Head'] || '').trim(),
            dob: (row['DoB'] || row['dob'] || row['Date of Birth'] || row['Pianni'] || '').trim(),
            dzk: dzkVal === 'yes' || dzkVal === 'true' || dzkVal === '1' || dzkVal === 't' || dzkVal === 'y'
          };
        }).filter((m: any) => m.name !== '');

        if (newMembers.length === 0) {
          alert("Import tur hming thun a awm lo hmel khawp mai. Check tha leh rawh.");
          return;
        }

        setLoading(true);

        if (!isFirebaseConfigured || !db) {
          const updatedMembers = [...members];
          newMembers.forEach((nm, idx) => {
            updatedMembers.push({
              id: 'local_member_' + Date.now() + '_' + idx,
              ...nm
            } as Member);
          });
          localStorage.setItem('local_members', JSON.stringify(updatedMembers));
          setMembers(updatedMembers);
          setLoading(false);
          alert(`Successfully imported ${newMembers.length} members locally.`);
        } else {
          try {
            for (const nm of newMembers) {
              await addDoc(collection(db, 'members'), nm);
            }
            await fetchData();
            alert(`Successfully imported ${newMembers.length} members to ${selectedUpa.bial}.`);
          } catch (error) {
            console.error("Error importing members:", error);
            alert("Failed to import members.");
          } finally {
            setLoading(false);
          }
        }
      }
    });
    // Reset file input value
    e.target.value = '';
  };

  // Download CSV template for importing family members
  const downloadCsvTemplate = () => {
    const headers = ['Name', 'Phone', 'Address', 'Family Head', 'DoB', 'DZK'];
    const rows = [
      ['Rualkhuma', '9876543210', 'Bethlehem Veng', 'Lalnunmawia', '1990-05-15', 'Yes'],
      ['Lalrinsanga', '9862500000', 'Bethlehem, Aizawl', 'Lalrinsanga', '1985-11-22', 'No']
    ];
    
    // Construct CSV with standard RFC 4180 formatting
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(val => `"${val.replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'upa_bial_members_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Open Bial Modal
  const openBialModal = (upa?: Upa) => {
    if (upa) {
      setEditingUpa(upa);
      setElderName(upa.name);
      setBialName(upa.bial);
      setElderPhone(upa.phone);
      setElderBio(upa.bio || '');
      setElderImageUrl(upa.imageUrl || '');
      setMapImageUrl(upa.mapImageUrl || '');
      setMapDescription(upa.mapDescription || '');
    } else {
      setEditingUpa(null);
      setElderName('');
      setBialName('');
      setElderPhone('');
      setElderBio('');
      setElderImageUrl('');
      setMapImageUrl('');
      setMapDescription('');
    }
    setSelectedFile(null);
    setSelectedMapFile(null);
    setIsBialModalOpen(true);
  };

  // Open Member Modal
  const openMemberModal = (member?: Member) => {
    if (member) {
      setEditingMember(member);
      setMemberName(member.name);
      setMemberPhone(member.phone);
      setMemberAddress(member.address);
      setMemberBial(member.upaBial);
      setMemberFamilyHead(member.familyHead);
      setMemberDob(member.dob || '');
      setMemberDzk(member.dzk || false);
    } else {
      setEditingMember(null);
      setMemberName('');
      setMemberPhone('');
      // Pre-populate with current select details for comfort
      setMemberAddress(selectedUpa ? selectedUpa.bial : '');
      setMemberBial(selectedUpa ? selectedUpa.bial : (upas[0]?.bial || ''));
      setMemberFamilyHead('');
      setMemberDob('');
      setMemberDzk(false);
    }
    setIsMemberModalOpen(true);
  };

  // Delete Bial (Elder)
  const handleDeleteBial = async (id: string) => {
    if (!confirm("He Upa Bial hi i delete duh takzet em? (Hemi hnuaia chhungkaw list te erawh an la awm ang)")) return;
    
    if (!isFirebaseConfigured || !db) {
      const updatedUpas = upas.filter(u => u.id !== id);
      localStorage.setItem('local_upas', JSON.stringify(updatedUpas));
      setUpas(updatedUpas);
      if (selectedUpa?.id === id) {
        setSelectedUpa(updatedUpas[0] || null);
      }
      return;
    }

    try {
      await deleteDoc(doc(db, 'upas', id));
      await fetchData();
    } catch (error) {
      console.error("Error deleting bial:", error);
    }
  };

  // Delete Member
  const handleDeleteMember = async (id: string) => {
    if (!confirm("He chhungkaw member hi i delete duh takzet em?")) return;

    if (!isFirebaseConfigured || !db) {
      const updatedMembers = members.filter(m => m.id !== id);
      localStorage.setItem('local_members', JSON.stringify(updatedMembers));
      setMembers(updatedMembers);
      return;
    }

    try {
      await deleteDoc(doc(db, 'members', id));
      await fetchData();
    } catch (error) {
      console.error("Error deleting member:", error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight uppercase">Upa Bial (Area Wise Directory)</h1>
          <p className="mt-1 text-stone-500 font-sans text-xs uppercase tracking-widest">
            View and manage church members grouped under each elder's area (bial)
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <input 
            type="file" 
            accept=".csv" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            className="hidden" 
          />
          {selectedUpa && isAdmin && (
            <>
              <button 
                onClick={downloadCsvTemplate}
                className="bg-white text-[#5A5A40] border border-[#ecece0] px-4 py-2 rounded-xl text-[10px] uppercase font-bold tracking-widest hover:bg-stone-50 transition font-sans flex items-center gap-2"
                title="Download sample CSV template for importing"
              >
                <Download className="w-3.5 h-3.5" />
                Template
              </button>
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="bg-[#fcfaf7] text-[#5A5A40] border border-[#ecece0] px-4 py-2 rounded-xl text-[10px] uppercase font-bold tracking-widest hover:bg-stone-50 transition font-sans flex items-center gap-2"
              >
                <Upload className="w-3.5 h-3.5" />
                Import CSV
              </button>
            </>
          )}
          {isAdmin && (
            <>
              <button 
                onClick={() => openBialModal()}
                className="bg-[#5A5A40] text-white px-4 py-2 rounded-xl text-[10px] uppercase font-bold tracking-widest hover:bg-[#4a4a35] transition font-sans flex items-center gap-2"
              >
                <Plus className="w-3.5 h-3.5" />
                Add New Bial
              </button>
              <button 
                onClick={() => openMemberModal()}
                className="bg-white text-[#5A5A40] border border-[#5A5A40] px-4 py-2 rounded-xl text-[10px] uppercase font-bold tracking-widest hover:bg-stone-50 transition font-sans flex items-center gap-2"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Family Member
              </button>
            </>
          )}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-stone-500 font-sans">Loading data...</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Upas selection */}
          <div className="lg:col-span-4 space-y-4">
            <h2 className="text-xs uppercase tracking-widest font-bold text-stone-400 font-sans px-2">
              Select Upa / Bial
            </h2>
            <div className="space-y-3">
              {upas.map((upa) => {
                const isActive = selectedUpa?.id === upa.id;
                // Count members in this bial
                const count = members.filter(m => {
                  const mb = m.upaBial.toLowerCase().trim();
                  const ub = upa.bial.toLowerCase().trim();
                  return mb.includes(ub) || ub.includes(mb);
                }).length;

                return (
                  <div
                    key={upa.id}
                    className={`group relative rounded-[24px] border transition-all ${
                      isActive
                        ? 'bg-[#5A5A40] text-white border-[#5A5A40] shadow-md'
                        : 'bg-white text-[#2d2d2a] border-[#e0e0d5] hover:border-stone-400'
                    }`}
                  >
                    <button
                      onClick={() => {
                        setSelectedUpa(upa);
                        setMemberSearchTerm('');
                      }}
                      className="w-full text-left p-4 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3 pr-8">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 font-sans ${
                          isActive ? 'bg-white/20 text-white' : 'bg-[#fcfaf7] border border-[#ecece0] text-[#5A5A40]'
                        }`}>
                          {(() => {
                            const m = upa.bial.match(/\d+/);
                            return m ? m[0] : (upa.bial.charAt(0) || 'B');
                          })()}
                        </div>
                        <div>
                          <h3 className="font-serif italic text-base leading-tight">
                            {upa.bial}
                          </h3>
                          <p className={`text-[10px] uppercase font-bold tracking-wider font-sans mt-0.5 ${
                            isActive ? 'text-white/80' : 'text-stone-400'
                          }`}>
                            {upa.name}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className={`text-[10px] font-bold font-sans px-2.5 py-1 rounded-full ${
                          isActive ? 'bg-white/10 text-white' : 'bg-[#fcfaf7] border border-[#ecece0] text-[#5A5A40]'
                        }`}>
                          {count}
                        </span>
                        <ChevronRight className={`w-4 h-4 transition-transform group-hover:translate-x-0.5 ${
                          isActive ? 'text-white/80' : 'text-stone-300'
                        }`} />
                      </div>
                    </button>

                    {/* Admin inline buttons for Upa/Bial */}
                    {isAdmin && (
                      <div className="absolute top-3 right-12 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={(e) => { e.stopPropagation(); openBialModal(upa); }}
                          className={`p-1.5 rounded-lg border transition ${
                            isActive 
                              ? 'bg-white/20 text-white border-white/30 hover:bg-white/35' 
                              : 'bg-[#fcfaf7] text-stone-500 border-[#ecece0] hover:text-[#5A5A40]'
                          }`}
                          title="Edit Bial / Upa"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleDeleteBial(upa.id); }}
                          className={`p-1.5 rounded-lg border transition ${
                            isActive 
                              ? 'bg-red-900/40 text-red-100 border-red-500/30 hover:bg-red-800/55' 
                              : 'bg-red-50 text-red-500 border-red-100 hover:text-red-700 hover:bg-red-100'
                          }`}
                          title="Delete Bial / Upa"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
              {upas.length === 0 && (
                <div className="text-center py-6 text-stone-400 font-sans italic">No elders/bial found.</div>
              )}
            </div>
          </div>

          {/* Right Column: Selected Bial Members */}
          <div className="lg:col-span-8 space-y-6">
            {selectedUpa ? (
              <div className="bg-white rounded-[32px] border border-[#e0e0d5] shadow-sm overflow-hidden">
                {/* Upa Details Header */}
                <div className="p-6 sm:p-8 border-b border-[#e0e0d5] bg-[#fcfaf7]">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-4">
                      {selectedUpa.imageUrl ? (
                        <img 
                          src={selectedUpa.imageUrl} 
                          alt={selectedUpa.name} 
                          className="w-16 h-16 rounded-full object-cover border border-[#ecece0] shrink-0" 
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-16 h-16 bg-white border border-[#ecece0] text-[#5A5A40] rounded-full flex items-center justify-center text-2xl font-bold font-sans shrink-0">
                          {(() => {
                            const m = selectedUpa.bial.match(/\d+/);
                            return m ? m[0] : (selectedUpa.bial.charAt(0) || 'B');
                          })()}
                        </div>
                      )}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] uppercase font-bold text-stone-400 tracking-wider font-sans mb-1 block">
                          Selected Bial Upa
                        </span>
                        {isAdmin && (
                          <button 
                            onClick={() => openBialModal(selectedUpa)}
                            className="p-1 text-stone-400 hover:text-[#5A5A40] transition rounded-md hover:bg-stone-100"
                            title="Edit current Upa details"
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                      <h2 className="text-2xl font-serif italic text-[#5A5A40]">{selectedUpa.bial}</h2>
                      <p className="text-base text-stone-600 font-sans font-medium mt-0.5">{selectedUpa.name}</p>
                      <div className="flex flex-wrap items-center gap-y-1 gap-x-4 mt-2 text-xs text-stone-500 font-sans font-medium">
                        <span className="flex items-center">
                          <Phone className="w-3.5 h-3.5 mr-1.5 text-stone-400" />
                          {selectedUpa.phone}
                        </span>
                      </div>
                    </div>
                    </div>
                    {isAdmin && (
                      <div className="flex flex-wrap items-center gap-3">
                        <button 
                          onClick={() => openMemberModal()}
                          className="bg-[#5A5A40] text-white px-3.5 py-2 rounded-xl text-[10px] uppercase font-bold tracking-widest hover:bg-[#4a4a35] transition font-sans flex items-center gap-1.5"
                        >
                          <Plus className="w-3 h-3" /> Add Family Member
                        </button>
                        <button 
                          onClick={downloadCsvTemplate}
                          className="bg-white text-[#5A5A40] border border-[#ecece0] px-3.5 py-2 rounded-xl text-[10px] uppercase font-bold tracking-widest hover:bg-stone-50 transition font-sans flex items-center gap-1.5"
                          title="Download sample CSV template for importing"
                        >
                          <Download className="w-3 h-3" /> Template
                        </button>
                        <button 
                          onClick={() => fileInputRef.current?.click()}
                          className="bg-[#fcfaf7] text-[#5A5A40] border border-[#ecece0] px-3.5 py-2 rounded-xl text-[10px] uppercase font-bold tracking-widest hover:bg-stone-50 transition font-sans flex items-center gap-1.5"
                          title="Import family members from CSV"
                        >
                          <Upload className="w-3 h-3" /> Import CSV
                        </button>
                        <div className="bg-white border border-[#ecece0] px-4 py-2.5 rounded-2xl flex items-center gap-2 font-sans shrink-0">
                          <Users className="w-4 h-4 text-[#5A5A40]" />
                          <span className="text-xs font-bold text-[#2d2d2a]">
                            {bialMembers.length} Bial Member{bialMembers.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                      </div>
                    )}
                    {!isAdmin && (
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="bg-white border border-[#ecece0] px-4 py-2.5 rounded-2xl flex items-center gap-2 font-sans shrink-0">
                          <Users className="w-4 h-4 text-[#5A5A40]" />
                          <span className="text-xs font-bold text-[#2d2d2a]">
                            {bialMembers.length} Bial Member{bialMembers.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                  {selectedUpa.bio && (
                    <p className="mt-4 text-xs font-sans text-stone-400 italic leading-relaxed border-t border-[#ecece0] pt-3">
                      {selectedUpa.bio}
                    </p>
                  )}
                  {selectedUpa.mapImageUrl && (
                    <div className="mt-4 border-t border-[#ecece0] pt-4">
                      <h3 className="text-[10px] font-bold text-[#5A5A40] uppercase tracking-widest mb-2 font-sans">Bial Map</h3>
                      {selectedUpa.mapDescription && (
                        <p className="text-xs text-stone-500 mb-3 font-sans italic">{selectedUpa.mapDescription}</p>
                      )}
                      <img src={selectedUpa.mapImageUrl} alt={`${selectedUpa.bial} Map`} className="w-full max-w-2xl mx-auto rounded-2xl border border-[#ecece0] object-contain bg-stone-50" referrerPolicy="no-referrer" />
                    </div>
                  )}
                </div>

                {/* Member search bar */}
                <div className="p-6 border-b border-[#ecece0] bg-white">
                  <div className="relative max-w-md font-sans">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Search className="h-4 w-4 text-stone-400" />
                    </div>
                    <input
                      type="text"
                      className="block w-full pl-11 pr-4 py-2.5 bg-[#fcfaf7] border border-[#ecece0] rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#5A5A40] focus:border-[#5A5A40] text-[#2d2d2a] placeholder-stone-400"
                      placeholder={`Search within ${selectedUpa.name.split(' ')[1] || 'Upa'}'s Bial...`}
                      value={memberSearchTerm}
                      onChange={(e) => setMemberSearchTerm(e.target.value)}
                    />
                  </div>
                </div>

                {/* Members list */}
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-[#ecece0] font-sans">
                    <thead className="bg-[#fcfaf7]">
                      <tr>
                        <th scope="col" className="px-6 py-4 text-left text-[10px] font-bold text-stone-400 uppercase tracking-widest">
                          Name
                        </th>
                        <th scope="col" className="px-6 py-4 text-left text-[10px] font-bold text-stone-400 uppercase tracking-widest">
                          Contact Info
                        </th>
                        <th scope="col" className="px-6 py-4 text-left text-[10px] font-bold text-stone-400 uppercase tracking-widest">
                          Head of Family
                        </th>
                        <th scope="col" className="px-6 py-4 text-right text-[10px] font-bold text-stone-400 uppercase tracking-widest">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-[#ecece0]">
                      {filteredBialMembers.map((member) => (
                        <tr key={member.id} className="hover:bg-[#f5f5f0]/50 transition-colors group">
                          <td className="px-6 py-5 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold text-[#2d2d2a]">{member.name}</span>
                              {member.dzk && (
                                <span className="bg-amber-100 text-[#5A5A40] text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">
                                  DZK
                                </span>
                              )}
                            </div>
                            {member.dob && (
                              <div className="text-[10px] text-stone-400 mt-1 font-sans">
                                DoB: {(() => {
                                  const parsed = Date.parse(member.dob);
                                  if (isNaN(parsed)) return member.dob;
                                  return new Date(member.dob).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
                                })()}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-5 whitespace-nowrap">
                            <div className="flex flex-col space-y-1.5 text-xs text-stone-500">
                              <div className="flex items-center">
                                <Phone className="w-3.5 h-3.5 mr-2 text-stone-400" />
                                {member.phone}
                              </div>
                              <div className="flex items-center">
                                <MapPin className="w-3.5 h-3.5 mr-2 text-stone-400" />
                                {member.address}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-5 whitespace-nowrap text-xs text-stone-500">
                            <div className="flex items-center">
                              <Home className="w-4 h-4 mr-2 text-stone-400" />
                              {member.familyHead}
                            </div>
                          </td>
                          <td className="px-6 py-5 whitespace-nowrap text-right text-xs">
                            {isAdmin && (
                              <div className="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button 
                                  onClick={() => openMemberModal(member)} 
                                  className="p-1.5 text-stone-400 hover:text-[#5A5A40] hover:bg-stone-50 border border-[#ecece0] rounded-lg transition"
                                  title="Edit Member"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button 
                                  onClick={() => handleDeleteMember(member.id)} 
                                  className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 border border-red-100 rounded-lg transition"
                                  title="Delete Member"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                      {filteredBialMembers.length === 0 && (
                        <tr>
                          <td colSpan={4} className="px-6 py-12 text-center text-sm text-stone-500 italic">
                            {memberSearchTerm ? 'No matching members found.' : 'No members registered in this Bial yet.'}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-stone-500 font-sans italic bg-white border border-[#e0e0d5] rounded-[32px]">
                Please select an Upa/Bial from the list on the left or add a new Bial to begin.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Bial Modal */}
      {isBialModalOpen && (
        <div className="fixed inset-0 z-50 bg-stone-900/50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-[#f5f5f0] rounded-[32px] w-full max-w-3xl shadow-xl border border-[#e0e0d5] overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-[#e0e0d5] flex justify-between items-center bg-white shrink-0">
              <h2 className="text-xl font-serif italic text-[#5A5A40]">
                {editingUpa ? 'Edit Bial / Upa' : 'Add New Bial / Upa'}
              </h2>
              <button onClick={() => setIsBialModalOpen(false)} className="p-2 hover:bg-stone-100 rounded-full text-stone-500">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 font-sans overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] uppercase font-bold text-stone-500 tracking-widest mb-1">Bial Area Name (Add name of Upa Bial)</label>
                <input 
                  type="text" 
                  value={bialName} 
                  onChange={e => setBialName(e.target.value)}
                  placeholder="e.g. Bial 1 - Venglai"
                  className="w-full p-3 bg-white border border-[#ecece0] rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#5A5A40]"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-stone-500 tracking-widest mb-1">Upa's Name (Upa Hming)</label>
                <input 
                  type="text" 
                  value={elderName} 
                  onChange={e => setElderName(e.target.value)}
                  placeholder="e.g. Upa Lalthlamuana"
                  className="w-full p-3 bg-white border border-[#ecece0] rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#5A5A40]"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-stone-500 tracking-widest mb-1">Phone Number</label>
                <input 
                  type="text" 
                  value={elderPhone} 
                  onChange={e => setElderPhone(e.target.value)}
                  placeholder="e.g. +91 98765 43210"
                  className="w-full p-3 bg-white border border-[#ecece0] rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#5A5A40]"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-[10px] uppercase font-bold text-stone-500 tracking-widest mb-1">Biography / Remarks (Optional)</label>
                <textarea 
                  value={elderBio} 
                  onChange={e => setElderBio(e.target.value)}
                  placeholder="e.g. Ordained in 2018..."
                  rows={3}
                  className="w-full p-3 bg-white border border-[#ecece0] rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#5A5A40] resize-none"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-[10px] uppercase font-bold text-stone-500 tracking-widest mb-1">Bial Map Description (Optional)</label>
                <textarea 
                  value={mapDescription} 
                  onChange={e => setMapDescription(e.target.value)}
                  placeholder="e.g. This area covers the northern part..."
                  rows={2}
                  className="w-full p-3 bg-white border border-[#ecece0] rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#5A5A40] resize-none mb-4"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase font-bold text-stone-500 tracking-widest mb-1">Bial Map Image (Mandatory) *</label>
                <div className="flex items-center gap-4 mb-4">
                  {mapImageUrl && !selectedMapFile && (
                    <img src={mapImageUrl} alt="Map Preview" className="w-16 h-16 rounded-xl object-cover border border-[#ecece0]" />
                  )}
                  <input 
                    type="file"
                    accept="image/*"
                    onChange={handleMapFileChange}
                    className="w-full p-2 bg-white border border-[#ecece0] rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#5A5A40]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] uppercase font-bold text-stone-500 tracking-widest mb-1">Upa Image (Optional)</label>
                <div className="flex items-center gap-4">
                  {elderImageUrl && !selectedFile && (
                    <img src={elderImageUrl} alt="Preview" className="w-12 h-12 rounded-full object-cover border border-[#ecece0]" />
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
            </div>

            <div className="p-6 border-t border-[#e0e0d5] bg-white flex justify-end gap-3 shrink-0">
              <button 
                onClick={() => setIsBialModalOpen(false)}
                disabled={isUploading}
                className="px-6 py-2 rounded-xl text-xs uppercase font-bold tracking-widest text-stone-500 hover:bg-stone-50 font-sans border border-[#ecece0]"
              >
                Cancel
              </button>
              <button 
                onClick={handleSaveBial}
                disabled={isUploading}
                className="px-6 py-2 rounded-xl text-xs uppercase font-bold tracking-widest bg-[#5A5A40] text-white hover:bg-[#4a4a35] font-sans disabled:opacity-50"
              >
                {isUploading ? 'Saving...' : 'Save Bial / Upa'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Member Modal */}
      {isMemberModalOpen && (
        <div className="fixed inset-0 z-50 bg-stone-900/50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-[#f5f5f0] rounded-[32px] w-full max-w-lg shadow-xl border border-[#e0e0d5] overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-[#e0e0d5] flex justify-between items-center bg-white shrink-0">
              <h2 className="text-xl font-serif italic text-[#5A5A40]">
                {editingMember ? 'Edit Family Member' : 'Add Family Member'}
              </h2>
              <button onClick={() => setIsMemberModalOpen(false)} className="p-2 hover:bg-stone-100 rounded-full text-stone-500">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 font-sans overflow-y-auto">
              <div>
                <label className="block text-[10px] uppercase font-bold text-stone-500 tracking-widest mb-1">Select Upa Bial (Respective Bial)</label>
                <select 
                  value={memberBial} 
                  onChange={e => setMemberBial(e.target.value)}
                  className="w-full p-3 bg-white border border-[#ecece0] rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#5A5A40]"
                >
                  <option value="">-- Choose Bial --</option>
                  {upas.map(u => (
                    <option key={u.id} value={u.bial}>{u.bial} ({u.name})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-stone-500 tracking-widest mb-1">Member Name (Hming)</label>
                <input 
                  type="text" 
                  value={memberName} 
                  onChange={e => setMemberName(e.target.value)}
                  placeholder="e.g. Lalramhluna"
                  className="w-full p-3 bg-white border border-[#ecece0] rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#5A5A40]"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-stone-500 tracking-widest mb-1">Head of Family (Chhungkaw Pa/Nu)</label>
                <input 
                  type="text" 
                  value={memberFamilyHead} 
                  onChange={e => setMemberFamilyHead(e.target.value)}
                  placeholder="e.g. Lalramhluna"
                  className="w-full p-3 bg-white border border-[#ecece0] rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#5A5A40]"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-stone-500 tracking-widest mb-1">Phone Number</label>
                <input 
                  type="text" 
                  value={memberPhone} 
                  onChange={e => setMemberPhone(e.target.value)}
                  placeholder="e.g. +91 94361 00000"
                  className="w-full p-3 bg-white border border-[#ecece0] rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#5A5A40]"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-stone-500 tracking-widest mb-1">Address</label>
                <input 
                  type="text" 
                  value={memberAddress} 
                  onChange={e => setMemberAddress(e.target.value)}
                  placeholder="e.g. Bethlehem Vengthlang"
                  className="w-full p-3 bg-white border border-[#ecece0] rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#5A5A40]"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-stone-500 tracking-widest mb-1">Date of Birth (DoB)</label>
                <input 
                  type="date" 
                  value={memberDob} 
                  onChange={e => setMemberDob(e.target.value)}
                  className="w-full p-3 bg-white border border-[#ecece0] rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#5A5A40]"
                />
              </div>

              <div className="flex items-center gap-3 bg-[#fcfaf7] border border-[#ecece0] p-4 rounded-xl md:col-span-1">
                <input 
                  type="checkbox" 
                  id="memberDzkCheckbox"
                  checked={memberDzk} 
                  onChange={e => setMemberDzk(e.target.checked)}
                  className="w-4 h-4 text-[#5A5A40] border-[#ecece0] rounded focus:ring-[#5A5A40] accent-[#5A5A40] cursor-pointer"
                />
                <label htmlFor="memberDzkCheckbox" className="text-sm font-medium text-stone-700 cursor-pointer select-none">
                  DZK Member (Yes / No)
                </label>
              </div>
            </div>

            <div className="p-6 border-t border-[#e0e0d5] bg-white flex justify-end gap-3 shrink-0">
              <button 
                onClick={() => setIsMemberModalOpen(false)}
                className="px-6 py-2 rounded-xl text-xs uppercase font-bold tracking-widest text-stone-500 hover:bg-stone-50 font-sans border border-[#ecece0]"
              >
                Cancel
              </button>
              <button 
                onClick={handleSaveMember}
                className="px-6 py-2 rounded-xl text-xs uppercase font-bold tracking-widest bg-[#5A5A40] text-white hover:bg-[#4a4a35] font-sans"
              >
                Save Member
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

