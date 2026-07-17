import { useAuth } from '../lib/auth';
import { useState, useEffect } from 'react';
import { Search, MapPin, Phone, Home, Plus, X, Pencil, Trash2 } from 'lucide-react';
import { db, isFirebaseConfigured } from '../lib/firebase';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import { Member } from '../types';

export default function Directory() {
  const { isAdmin } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [upaBial, setUpaBial] = useState('');
  const [familyHead, setFamilyHead] = useState('');

  useEffect(() => {
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    if (!isFirebaseConfigured || !db) {
      setMembers([]);
      setLoading(false);
      return;
    }
    try {
      const q = query(collection(db, 'members'), orderBy('name', 'asc'));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Member));
      
      if (data.length === 0) {
        setMembers([]);
      } else {
        setMembers(data);
      }
    } catch (error) {
      console.error("Error fetching members:", error);
      setMembers([]); // Fallback
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (member?: Member) => {
    if (member) {
      setEditingMember(member);
      setName(member.name);
      setPhone(member.phone);
      setAddress(member.address);
      setUpaBial(member.upaBial);
      setFamilyHead(member.familyHead);
    } else {
      setEditingMember(null);
      setName('');
      setPhone('');
      setAddress('');
      setUpaBial('');
      setFamilyHead('');
    }
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!name || !address || !phone || !upaBial || !familyHead) {
      alert("Please fill in all fields.");
      return;
    }

    const memberData = { name, phone, address, upaBial, familyHead };

    if (!isFirebaseConfigured || !db) {
      alert("Firebase not configured. Cannot save.");
      return;
    }

    try {
      if (editingMember?.id) {
        await updateDoc(doc(db, 'members', editingMember.id), memberData);
      } else {
        await addDoc(collection(db, 'members'), memberData);
      }
      setIsModalOpen(false);
      fetchMembers();
    } catch (error) {
      console.error("Error saving member:", error);
      alert("Failed to save member.");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this member?")) return;
    if (!isFirebaseConfigured || !db) return;

    try {
      await deleteDoc(doc(db, 'members', id));
      fetchMembers();
    } catch (error) {
      console.error("Error deleting member:", error);
    }
  };

  const filteredMembers = members.filter(member => 
    member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.upaBial.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.familyHead.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight uppercase">Member Directory</h1>
          <p className="mt-1 text-stone-500 font-sans text-xs uppercase tracking-widest">Church members and contact information</p>
        </div>
        {isAdmin && (
          <button 
            onClick={() => handleOpenModal()}
            className="bg-[#5A5A40] text-white px-4 py-2 rounded-xl text-[10px] uppercase font-bold tracking-widest hover:bg-[#4a4a35] transition shrink-0 font-sans flex items-center gap-2"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Member
          </button>
        )}
      </div>

      <div className="bg-white rounded-[32px] shadow-sm border border-[#e0e0d5] overflow-hidden">
        <div className="p-6 border-b border-[#e0e0d5]">
          <div className="relative max-w-md font-sans">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-stone-400" />
            </div>
            <input
              type="text"
              className="block w-full pl-11 pr-4 py-2.5 bg-[#fcfaf7] border border-[#ecece0] rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#5A5A40] focus:border-[#5A5A40] text-[#2d2d2a] placeholder-stone-400"
              placeholder="Search members by name, area, or family head..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-stone-500 font-sans">Loading directory...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-[#ecece0] font-sans">
              <thead className="bg-[#fcfaf7]">
                <tr>
                  <th scope="col" className="px-6 py-4 text-left text-[10px] font-bold text-stone-400 uppercase tracking-widest">
                    Name
                  </th>
                  <th scope="col" className="px-6 py-4 text-left text-[10px] font-bold text-stone-400 uppercase tracking-widest">
                    Contact
                  </th>
                  <th scope="col" className="px-6 py-4 text-left text-[10px] font-bold text-stone-400 uppercase tracking-widest">
                    Area (Bial)
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
                {filteredMembers.map((member) => (
                  <tr key={member.id} className="hover:bg-[#f5f5f0]/50 transition-colors">
                    <td className="px-6 py-5 whitespace-nowrap">
                      <div className="text-sm font-semibold text-[#2d2d2a]">{member.name}</div>
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
                    <td className="px-6 py-5 whitespace-nowrap">
                      <span className="inline-flex items-center px-2 py-1 rounded-md text-[9px] uppercase tracking-wider font-bold bg-[#fcfaf7] border border-[#ecece0] text-stone-500">
                        {member.upaBial}
                      </span>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap text-xs text-stone-500">
                      <div className="flex items-center">
                        <Home className="w-4 h-4 mr-2 text-stone-400" />
                        {member.familyHead}
                      </div>
                    </td>
                    {isAdmin ? (
                      <td className="px-6 py-5 whitespace-nowrap text-right text-xs">
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => handleOpenModal(member)} 
                            className="p-1.5 text-stone-400 hover:text-[#5A5A40] hover:bg-[#fcfaf7] border border-[#ecece0] rounded-lg transition"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button 
                            onClick={() => handleDelete(member.id)} 
                            className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 border border-red-100 rounded-lg transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    ) : (
                      <td className="px-6 py-5 whitespace-nowrap text-right text-xs"></td>
                    )}
                  </tr>
                ))}
                {filteredMembers.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-sm text-stone-500 font-sans italic">
                      No members found matching your search.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Form Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-stone-900/50 flex items-center justify-center p-4">
          <div className="bg-[#f5f5f0] rounded-[32px] w-full max-w-lg shadow-xl border border-[#e0e0d5] overflow-hidden">
            <div className="p-6 border-b border-[#e0e0d5] flex justify-between items-center bg-white">
              <h2 className="text-xl font-serif italic text-[#5A5A40]">
                {editingMember ? 'Edit Member Details' : 'New Member Details'}
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
                  placeholder="e.g. Lalramhluna"
                  className="w-full p-3 bg-white border border-[#ecece0] rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#5A5A40]"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-stone-500 tracking-widest mb-1">Phone Number</label>
                <input 
                  type="text" 
                  value={phone} 
                  onChange={e => setPhone(e.target.value)}
                  placeholder="e.g. +91 94361 00000"
                  className="w-full p-3 bg-white border border-[#ecece0] rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#5A5A40]"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-stone-500 tracking-widest mb-1">Address / Quarter</label>
                <input 
                  type="text" 
                  value={address} 
                  onChange={e => setAddress(e.target.value)}
                  placeholder="e.g. Bethlehem Vengthlang"
                  className="w-full p-3 bg-white border border-[#ecece0] rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#5A5A40]"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-stone-500 tracking-widest mb-1">Upa Bial Area (Must match Upa's area name)</label>
                <input 
                  type="text" 
                  value={upaBial} 
                  onChange={e => setUpaBial(e.target.value)}
                  placeholder="e.g. Bial 1 - Venglai"
                  className="w-full p-3 bg-white border border-[#ecece0] rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#5A5A40]"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-stone-500 tracking-widest mb-1">Head of Family (Chhungkaw Pa/Nu)</label>
                <input 
                  type="text" 
                  value={familyHead} 
                  onChange={e => setFamilyHead(e.target.value)}
                  placeholder="e.g. Lalramhluna"
                  className="w-full p-3 bg-white border border-[#ecece0] rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#5A5A40]"
                />
              </div>
            </div>

            <div className="p-6 border-t border-[#e0e0d5] bg-white flex justify-end gap-3">
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
                Save Member
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
