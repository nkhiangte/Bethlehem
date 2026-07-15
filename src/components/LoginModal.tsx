import React, { useState } from 'react';
import { X, LogIn } from 'lucide-react';
import { auth, isFirebaseConfigured } from '../lib/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';

interface LoginModalProps {
  onClose: () => void;
}

export function LoginModal({ onClose }: LoginModalProps) {
  const [email, setEmail] = useState('nkhiangte@gmail.com');
  const [password, setPassword] = useState('marka123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFirebaseConfigured || !auth) {
      setError('Firebase is not configured.');
      return;
    }
    
    setLoading(true);
    setError('');

    try {
      await signInWithEmailAndPassword(auth, email, password);
      onClose();
    } catch (err: any) {
      // If user not found, try to create it (for initial setup of the admin)
      if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
        if (email === 'nkhiangte@gmail.com') {
          try {
            await createUserWithEmailAndPassword(auth, email, password);
            onClose();
          } catch (createErr: any) {
            setError(createErr.message || 'Failed to create and sign in admin user.');
          }
        } else {
          setError('Invalid email or password.');
        }
      } else {
        setError(err.message || 'Failed to sign in.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-[32px] w-full max-w-sm shadow-xl border border-[#e0e0d5] overflow-hidden">
        <div className="p-6 border-b border-[#e0e0d5] flex justify-between items-center bg-[#fcfaf7]">
          <h2 className="text-xl font-serif italic text-[#5A5A40] flex items-center gap-2">
            <LogIn className="w-5 h-5 text-stone-400" />
            Admin Login
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-stone-100 rounded-full text-stone-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleLogin} className="p-6 space-y-4 font-sans">
          {error && (
            <div className="p-3 bg-red-50 text-red-600 text-xs rounded-xl border border-red-100">
              {error}
            </div>
          )}
          <div>
            <label className="block text-[10px] uppercase font-bold text-stone-500 tracking-widest mb-1">Email</label>
            <input 
              type="email" 
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full p-3 bg-[#fcfaf7] border border-[#ecece0] rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#5A5A40]"
              required
            />
          </div>
          <div>
            <label className="block text-[10px] uppercase font-bold text-stone-500 tracking-widest mb-1">Password</label>
            <input 
              type="password" 
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full p-3 bg-[#fcfaf7] border border-[#ecece0] rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#5A5A40]"
              required
            />
          </div>

          <div className="pt-2">
            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-[#5A5A40] text-white py-3 rounded-xl text-xs uppercase font-bold tracking-widest hover:bg-[#4a4a35] transition disabled:opacity-50"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
