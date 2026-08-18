import {
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import { ref, get, set, update } from 'firebase/database';
import { auth, db } from './firebase';

export type UserRole = 'admin' | 'user';

export interface UserProfile {
  name: string;
  email: string;
  photoURL: string;
  role: UserRole;
  provider: 'google';
  createdAt: number;
  lastLoginAt: number;
}

export interface UserStats {
  visitCount: number;
  lastVisitAt: number;
}

export interface DBUser {
  uid: string;
  profile: UserProfile;
  stats: UserStats;
}

/** Google 팝업 로그인 → RTDB Users/{uid} 생성 또는 갱신 */
export async function signInWithGoogle(): Promise<DBUser> {
  const provider = new GoogleAuthProvider();
  const result = await signInWithPopup(auth, provider);
  const { uid, displayName, email, photoURL } = result.user;

  const userRef = ref(db, `Users/${uid}`);
  const snapshot = await get(userRef);
  const now = Date.now();

  if (!snapshot.exists()) {
    // 신규 사용자 생성
    const newUser: Omit<DBUser, 'uid'> = {
      profile: {
        name: displayName ?? '',
        email: email ?? '',
        photoURL: photoURL ?? '',
        role: 'user',
        provider: 'google',
        createdAt: now,
        lastLoginAt: now,
      },
      stats: {
        visitCount: 1,
        lastVisitAt: now,
      },
    };
    await set(userRef, newUser);
    return { uid, ...newUser };
  } else {
    // 기존 사용자 — lastLoginAt, stats 갱신
    await update(ref(db, `Users/${uid}/profile`), { lastLoginAt: now });
    await update(ref(db, `Users/${uid}/stats`), {
      visitCount: (snapshot.val().stats?.visitCount ?? 0) + 1,
      lastVisitAt: now,
    });
    return { uid, ...snapshot.val(), profile: { ...snapshot.val().profile, lastLoginAt: now } };
  }
}

/** 로그아웃 */
export async function signOut(): Promise<void> {
  await firebaseSignOut(auth);
}

/** RTDB에서 사용자 프로필 한 번 조회 */
export async function fetchUserProfile(uid: string): Promise<DBUser | null> {
  const snapshot = await get(ref(db, `Users/${uid}`));
  if (!snapshot.exists()) return null;
  return { uid, ...snapshot.val() };
}
