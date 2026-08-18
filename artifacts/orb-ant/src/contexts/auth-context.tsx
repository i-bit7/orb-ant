import React, {
  createContext, useContext, useEffect, useRef, useState, type ReactNode,
} from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import {
  fetchUserProfile,
  signInWithGoogle,
  signInWithEmail,
  createAccount,
  signOut,
  updateUserScore,
  type DBUser,
} from '@/lib/auth';

// sessionStorage key used to carry guest score across the /login navigation
export const GUEST_SCORE_KEY = 'orb-ant-guest-score';

interface AuthContextValue {
  user: DBUser | null;
  loading: boolean;
  googleSignIn: (guestScore?: number) => Promise<void>;
  emailSignIn: (email: string, password: string, guestScore?: number) => Promise<void>;
  emailCreateAccount: (email: string, password: string, guestScore?: number) => Promise<void>;
  signOut: () => Promise<void>;
  saveScore: (score: number, bestScore: number) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<DBUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const dbUser = await fetchUserProfile(firebaseUser.uid);
        setUser(dbUser);
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  // Merge the guest session score into the account when logging in.
  async function applyGuestScore(dbUser: DBUser, guestScore: number): Promise<DBUser> {
    if (guestScore <= 0) return dbUser;
    const prevBest = dbUser.profile.bestScore ?? 0;
    const newBest = Math.max(prevBest, guestScore);
    // score = current session score (carry it over); bestScore = all-time best
    await updateUserScore(dbUser.uid, guestScore, newBest);
    return {
      ...dbUser,
      profile: { ...dbUser.profile, score: guestScore, bestScore: newBest },
    };
  }

  const handleGoogleSignIn = async (guestScore = 0) => {
    let dbUser = await signInWithGoogle();
    dbUser = await applyGuestScore(dbUser, guestScore);
    setUser(dbUser);
  };

  const handleEmailSignIn = async (email: string, password: string, guestScore = 0) => {
    let dbUser = await signInWithEmail(email, password);
    dbUser = await applyGuestScore(dbUser, guestScore);
    setUser(dbUser);
  };

  const handleEmailCreateAccount = async (email: string, password: string, guestScore = 0) => {
    let dbUser = await createAccount(email, password);
    dbUser = await applyGuestScore(dbUser, guestScore);
    setUser(dbUser);
  };

  const handleSignOut = async () => {
    await signOut();
    setUser(null);
  };

  const saveScore = async (score: number, bestScore: number) => {
    if (!user) return;
    await updateUserScore(user.uid, score, bestScore);
    setUser(prev =>
      prev ? { ...prev, profile: { ...prev.profile, score, bestScore } } : null,
    );
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      googleSignIn: handleGoogleSignIn,
      emailSignIn: handleEmailSignIn,
      emailCreateAccount: handleEmailCreateAccount,
      signOut: handleSignOut,
      saveScore,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
