import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signOut } from 'firebase/auth';
import { auth, db, isFirebaseConfigured } from './firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export interface UserProfile {
  uid: string;
  email: string;
  fullName: string;
  phoneNumber: string;
  role: 'admin' | 'user';
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  isAdmin: boolean;
  loading: boolean;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  isAdmin: false,
  loading: true,
  logout: async () => {},
  refreshProfile: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (u: User) => {
    if (!db) {
      const defaultRole = u.email === 'nkhiangte@gmail.com' ? 'admin' : 'user';
      setProfile({
        uid: u.uid,
        email: u.email || '',
        fullName: u.displayName || (u.email === 'nkhiangte@gmail.com' ? 'Admin' : 'User'),
        phoneNumber: u.phoneNumber || '',
        role: defaultRole
      });
      return;
    }
    try {
      const docRef = doc(db, 'users', u.uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data() as UserProfile;
        setProfile(data);
        try {
          localStorage.setItem(`user_profile_${u.uid}`, JSON.stringify(data));
        } catch (e) {}
      } else {
        // If profile doesn't exist, create a default one (e.g., for the initial admin)
        const defaultRole = u.email === 'nkhiangte@gmail.com' ? 'admin' : 'user';
        const newProfile: UserProfile = {
          uid: u.uid,
          email: u.email || '',
          fullName: u.displayName || (u.email === 'nkhiangte@gmail.com' ? 'Admin' : 'User'),
          phoneNumber: u.phoneNumber || '',
          role: defaultRole
        };
        try {
          await setDoc(docRef, newProfile);
        } catch (e) {
          console.warn("Could not save new profile to Firestore:", e);
        }
        setProfile(newProfile);
        try {
          localStorage.setItem(`user_profile_${u.uid}`, JSON.stringify(newProfile));
        } catch (e) {}
      }
    } catch (err) {
      console.warn("Could not fetch user profile from Firestore, using cached/fallback profile:", err);
      try {
        const cached = localStorage.getItem(`user_profile_${u.uid}`);
        if (cached) {
          setProfile(JSON.parse(cached));
          return;
        }
      } catch (e) {}

      const defaultRole = u.email === 'nkhiangte@gmail.com' ? 'admin' : 'user';
      setProfile({
        uid: u.uid,
        email: u.email || '',
        fullName: u.displayName || (u.email === 'nkhiangte@gmail.com' ? 'Admin' : 'User'),
        phoneNumber: u.phoneNumber || '',
        role: defaultRole
      });
    }
  };

  useEffect(() => {
    if (!isFirebaseConfigured || !auth) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        await fetchProfile(u);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user);
    }
  };

  const logout = async () => {
    if (auth) {
      await signOut(auth);
    }
  };

  const isAdmin = profile?.role === 'admin' || user?.email === 'nkhiangte@gmail.com';

  return (
    <AuthContext.Provider value={{ user, profile, isAdmin, loading, logout, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
