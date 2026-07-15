import React, { useState } from 'react';
import { X, LogIn, UserPlus } from 'lucide-react';
import { auth, db, isFirebaseConfigured } from '../lib/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';

interface LoginModalProps {
  onClose: () => void;
}

export function LoginModal({ onClose }: LoginModalProps) {
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('nkhiangte@gmail.com');
  const [password, setPassword] = useState('marka123');
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFirebaseConfigured || !auth || !db) {
      setError('Firebase is not configured.');
      return;
    }
    
    setLoading(true);
    setError('');

    try {
      if (isRegistering) {
        if (!fullName.trim() || !phoneNumber.trim()) {
          setError('Full Name and Phone Number are required.');
          setLoading(false);
          return;
        }
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const u = userCredential.user;
        // Save additional user info to Firestore
        await setDoc(doc(db, 'users', u.uid), {
          uid: u.uid,
          email: u.email,
          fullName,
          phoneNumber,
          role: u.email === 'nkhiangte@gmail.com' ? 'admin' : 'user'
        });
        onClose();
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        onClose();
      }
    } catch (err: any) {
      if (!isRegistering && (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential')) {
        if (email === 'nkhiangte@gmail.com') {
          try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const u = userCredential.user;
            await setDoc(doc(db, 'users', u.uid), {
              uid: u.uid,
              email: u.email,
              fullName: 'Admin',
              phoneNumber: '',
              role: 'admin'
            });
            onClose();
          } catch (createErr: any) {
            setError(createErr.message || 'Failed to create and sign in admin user.');
          }
        } else {
          setError('Invalid email or password.');
        }
      } else {
        setError(err.message || (isRegistering ? 'Failed to create account.' : 'Failed to sign in.'));
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
            {isRegistering ? (
              <><UserPlus className="w-5 h-5 text-stone-400" /> Register</>
            ) : (
              <><LogIn className="w-5 h-5 text-stone-400" /> Sign In</>
            )}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-stone-100 rounded-full text-stone-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 font-sans">
          {error && (
            <div className="p-3 bg-red-50 text-red-600 text-xs rounded-xl border border-red-100">
              {error}
            </div>
          )}
          
          {isRegistering && (
            <>
              <div>
                <label className="block text-[10px] uppercase font-bold text-stone-500 tracking-widest mb-1">Full Name</label>
                <input 
                  type="text" 
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  className="w-full p-3 bg-[#fcfaf7] border border-[#ecece0] rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#5A5A40]"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase font-bold text-stone-500 tracking-widest mb-1">Phone Number</label>
                <input 
                  type="tel" 
                  value={phoneNumber}
                  onChange={e => setPhoneNumber(e.target.value)}
                  className="w-full p-3 bg-[#fcfaf7] border border-[#ecece0] rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#5A5A40]"
                  required
                />
              </div>
            </>
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

          <div className="pt-2 space-y-3">
            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-[#5A5A40] text-white py-3 rounded-xl text-xs uppercase font-bold tracking-widest hover:bg-[#4a4a35] transition disabled:opacity-50"
            >
              {loading ? 'Please wait...' : (isRegistering ? 'Create Account' : 'Sign In')}
            </button>
            <button
              type="button"
              onClick={() => {
                setIsRegistering(!isRegistering);
                setError('');
              }}
              className="w-full text-xs text-stone-500 hover:text-stone-800 font-medium"
            >
              {isRegistering ? 'Already have an account? Sign In' : 'Need an account? Register'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
