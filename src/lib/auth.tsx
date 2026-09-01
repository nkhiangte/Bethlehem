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

const IDLE_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  isAdmin: boolean;
  loading: boolean;
  sessionExpiredNotice: boolean;
  clearSessionExpiredNotice: () => void;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  isAdmin: false,
  loading: true,
  sessionExpiredNotice: false,
  clearSessionExpiredNotice: () => {},
  logout: async () => {},
  refreshProfile: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionExpiredNotice, setSessionExpiredNotice] = useState(false);

  const isDefaultAdmin = (email?: string | null) => {
    if (!email) return false;
    const normalized = email.toLowerCase().trim();
    return normalized === 'nkhiangte@gmail.com' || normalized === 'kohhranb@gmail.com';
  };

  const fetchProfile = async (u: User) => {
    const adminStatus = isDefaultAdmin(u.email);
    const defaultRole = adminStatus ? 'admin' : 'user';

    if (!db) {
      setProfile({
        uid: u.uid,
        email: u.email || '',
        fullName: u.displayName || (adminStatus ? 'Admin' : 'User'),
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
        // If user is designated admin email, ensure admin role
        if (adminStatus && data.role !== 'admin') {
          data.role = 'admin';
          await setDoc(docRef, { ...data, role: 'admin' }, { merge: true });
        }
        setProfile(data);
        try {
          localStorage.setItem(`user_profile_${u.uid}`, JSON.stringify(data));
        } catch (e) {}
      } else {
        // If profile doesn't exist, create a default one (e.g., for the initial admin)
        const newProfile: UserProfile = {
          uid: u.uid,
          email: u.email || '',
          fullName: u.displayName || (adminStatus ? 'Admin' : 'User'),
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
          const parsed = JSON.parse(cached);
          if (adminStatus) parsed.role = 'admin';
          setProfile(parsed);
          return;
        }
      } catch (e) {}

      setProfile({
        uid: u.uid,
        email: u.email || '',
        fullName: u.displayName || (adminStatus ? 'Admin' : 'User'),
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
        try {
          localStorage.setItem('auth_last_activity', Date.now().toString());
        } catch (e) {}
        await fetchProfile(u);
      } else {
        setProfile(null);
        try {
          localStorage.removeItem('auth_last_activity');
        } catch (e) {}
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Idle timeout tracking (10 minutes)
  useEffect(() => {
    if (!user || !auth) return;

    let lastRecordedActivity = Date.now();
    try {
      localStorage.setItem('auth_last_activity', lastRecordedActivity.toString());
    } catch (e) {}

    const recordUserActivity = () => {
      const now = Date.now();
      // Throttle localStorage writes to once every 2 seconds
      if (now - lastRecordedActivity >= 2000) {
        lastRecordedActivity = now;
        try {
          localStorage.setItem('auth_last_activity', now.toString());
        } catch (e) {}
      }
    };

    const activityEvents = [
      'mousedown',
      'mousemove',
      'keydown',
      'touchstart',
      'scroll',
      'click',
      'wheel',
    ];

    activityEvents.forEach((eventName) => {
      window.addEventListener(eventName, recordUserActivity, { passive: true });
    });

    const checkIdleTimeout = async () => {
      try {
        const storedLastActive = localStorage.getItem('auth_last_activity');
        const lastActiveTime = storedLastActive ? parseInt(storedLastActive, 10) : lastRecordedActivity;
        const elapsed = Date.now() - lastActiveTime;

        if (elapsed >= IDLE_TIMEOUT_MS) {
          console.info(`User idle for ${Math.round(elapsed / 1000)}s (>= 10 minutes). Auto logging out.`);
          setSessionExpiredNotice(true);
          try {
            localStorage.removeItem('auth_last_activity');
          } catch (e) {}
          if (auth) {
            await signOut(auth);
          }
        }
      } catch (err) {
        console.error('Error during idle timeout check:', err);
      }
    };

    // Check periodically every 5 seconds
    const intervalId = setInterval(checkIdleTimeout, 5000);

    const handleVisibilityOrFocus = () => {
      checkIdleTimeout();
    };

    window.addEventListener('visibilitychange', handleVisibilityOrFocus);
    window.addEventListener('focus', handleVisibilityOrFocus);

    return () => {
      clearInterval(intervalId);
      activityEvents.forEach((eventName) => {
        window.removeEventListener(eventName, recordUserActivity);
      });
      window.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      window.removeEventListener('focus', handleVisibilityOrFocus);
    };
  }, [user]);

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user);
    }
  };

  const logout = async () => {
    setSessionExpiredNotice(false);
    try {
      localStorage.removeItem('auth_last_activity');
    } catch (e) {}
    if (auth) {
      await signOut(auth);
    }
  };

  const clearSessionExpiredNotice = () => {
    setSessionExpiredNotice(false);
  };

  const isAdmin = profile?.role === 'admin' || isDefaultAdmin(user?.email);

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        isAdmin,
        loading,
        sessionExpiredNotice,
        clearSessionExpiredNotice,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
