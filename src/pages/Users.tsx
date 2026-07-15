import { useState, useEffect } from 'react';
import { db, isFirebaseConfigured } from '../lib/firebase';
import { collection, getDocs, updateDoc, doc, query, orderBy } from 'firebase/firestore';
import { UserProfile, useAuth } from '../lib/auth';
import { Users as UsersIcon, Shield, ShieldAlert, User as UserIcon } from 'lucide-react';

export default function Users() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const { isAdmin } = useAuth();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    if (!isFirebaseConfigured || !db) {
      setLoading(false);
      return;
    }
    try {
      const snap = await getDocs(query(collection(db, 'users'), orderBy('email', 'asc')));
      setUsers(snap.docs.map(doc => doc.data() as UserProfile));
    } catch (err) {
      console.error("Error fetching users:", err);
    } finally {
      setLoading(false);
    }
  };

  const toggleRole = async (userId: string, currentRole: 'admin' | 'user') => {
    if (!db) return;
    const newRole = currentRole === 'admin' ? 'user' : 'admin';
    try {
      await updateDoc(doc(db, 'users', userId), { role: newRole });
      setUsers(users.map(u => u.uid === userId ? { ...u, role: newRole } : u));
    } catch (err) {
      console.error("Error updating user role:", err);
      alert("Failed to update role. You might not have permission.");
    }
  };

  if (!isAdmin) {
    return (
      <div className="p-12 text-center text-stone-500 font-sans italic border border-dashed border-[#d0d0c5] rounded-[32px]">
        <ShieldAlert className="w-12 h-12 mx-auto mb-4 text-stone-300" />
        <p>Access Denied. You must be an administrator to view this page.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight uppercase">User Management</h1>
          <p className="mt-1 text-stone-500 font-sans text-xs uppercase tracking-widest">Manage application access and roles</p>
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-sm text-stone-500 font-sans italic">Loading users...</div>
      ) : (
        <div className="bg-white rounded-[32px] shadow-sm border border-[#e0e0d5] overflow-hidden">
          <div className="p-6 border-b border-[#ecece0] flex justify-between items-center bg-[#fcfaf7]">
            <h2 className="text-xl font-serif italic text-[#5A5A40] flex items-center gap-2">
              <UsersIcon className="w-5 h-5 text-stone-400" />
              Registered Users
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left font-sans text-sm">
              <thead className="bg-[#fcfaf7] border-b border-[#ecece0]">
                <tr>
                  <th className="p-4 font-bold text-[10px] uppercase tracking-widest text-stone-500">Name</th>
                  <th className="p-4 font-bold text-[10px] uppercase tracking-widest text-stone-500">Email</th>
                  <th className="p-4 font-bold text-[10px] uppercase tracking-widest text-stone-500">Phone</th>
                  <th className="p-4 font-bold text-[10px] uppercase tracking-widest text-stone-500">Role</th>
                  <th className="p-4 font-bold text-[10px] uppercase tracking-widest text-stone-500 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#ecece0]">
                {users.map(user => (
                  <tr key={user.uid} className="hover:bg-stone-50/50 transition-colors">
                    <td className="p-4 font-medium text-[#2d2d2a]">{user.fullName}</td>
                    <td className="p-4 text-stone-600">{user.email}</td>
                    <td className="p-4 text-stone-600">{user.phoneNumber || '-'}</td>
                    <td className="p-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] uppercase font-bold tracking-widest ${
                        user.role === 'admin' 
                          ? 'bg-amber-100 text-amber-800' 
                          : 'bg-stone-100 text-stone-600'
                      }`}>
                        {user.role === 'admin' ? <Shield className="w-3 h-3" /> : <UserIcon className="w-3 h-3" />}
                        {user.role}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      {user.email !== 'nkhiangte@gmail.com' && (
                        <button
                          onClick={() => toggleRole(user.uid, user.role)}
                          className={`text-[10px] uppercase font-bold tracking-widest px-3 py-1.5 rounded-lg border transition-colors ${
                            user.role === 'admin'
                              ? 'border-red-200 text-red-600 hover:bg-red-50'
                              : 'border-amber-200 text-amber-600 hover:bg-amber-50'
                          }`}
                        >
                          {user.role === 'admin' ? 'Remove Admin' : 'Make Admin'}
                        </button>
                      )}
                      {user.email === 'nkhiangte@gmail.com' && (
                        <span className="text-[10px] uppercase font-bold tracking-widest text-stone-400 italic">
                          Super Admin
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-stone-500 italic">
                      No users found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
