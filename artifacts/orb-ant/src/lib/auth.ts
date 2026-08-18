import {
  signInWithPopup,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
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
  provider: 'google' | 'email';
  createdAt: number;
  lastLoginAt: number;
  score: number;      // current / last session score
  bestScore: number;  // all-time best session score
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

// ── helpers ────────────────────────────────────────────────────────────────

function makeNewUserData(
  name: string,
  email: string,
  photoURL: string,
  provider: 'google' | 'email',
  now: number,
): Omit<DBUser, 'uid'> {
  return {
    profile: {
      name,
      email,
      photoURL,
      role: 'user',
      provider,
      createdAt: now,
      lastLoginAt: now,
      score: 0,
      bestScore: 0,
    },
    stats: { visitCount: 1, lastVisitAt: now },
  };
}

async function touchExistingUser(uid: string, raw: any, now: number): Promise<DBUser> {
  await update(ref(db, `Users/${uid}/profile`), { lastLoginAt: now });
  await update(ref(db, `Users/${uid}/stats`), {
    visitCount: (raw.stats?.visitCount ?? 0) + 1,
    lastVisitAt: now,
  });
  return { uid, ...raw, profile: { ...raw.profile, lastLoginAt: now } };
}

// ── public API ─────────────────────────────────────────────────────────────

/** Google 팝업 로그인 */
export async function signInWithGoogle(): Promise<DBUser> {
  const provider = new GoogleAuthProvider();
  const result = await signInWithPopup(auth, provider);
  const { uid, displayName, email, photoURL } = result.user;

  const snap = await get(ref(db, `Users/${uid}`));
  const now = Date.now();

  if (!snap.exists()) {
    const data = makeNewUserData(displayName ?? email ?? 'User', email ?? '', photoURL ?? '', 'google', now);
    await set(ref(db, `Users/${uid}`), data);
    return { uid, ...data };
  }
  return touchExistingUser(uid, snap.val(), now);
}

/** Email / Password 로그인 */
export async function signInWithEmail(email: string, password: string): Promise<DBUser> {
  const result = await signInWithEmailAndPassword(auth, email, password);
  const { uid } = result.user;

  const snap = await get(ref(db, `Users/${uid}`));
  const now = Date.now();

  if (!snap.exists()) {
    const data = makeNewUserData(email.split('@')[0], email, '', 'email', now);
    await set(ref(db, `Users/${uid}`), data);
    return { uid, ...data };
  }
  return touchExistingUser(uid, snap.val(), now);
}

/** Email / Password 회원가입 */
export async function createAccount(email: string, password: string): Promise<DBUser> {
  const result = await createUserWithEmailAndPassword(auth, email, password);
  const { uid } = result.user;

  const now = Date.now();
  const data = makeNewUserData(email.split('@')[0], email, '', 'email', now);
  await set(ref(db, `Users/${uid}`), data);
  return { uid, ...data };
}

/** 로그아웃 */
export async function signOut(): Promise<void> {
  await firebaseSignOut(auth);
}

/** RTDB 사용자 조회 */
export async function fetchUserProfile(uid: string): Promise<DBUser | null> {
  const snap = await get(ref(db, `Users/${uid}`));
  if (!snap.exists()) return null;
  return { uid, ...snap.val() };
}

/** 점수 저장 */
export async function updateUserScore(uid: string, score: number, bestScore: number): Promise<void> {
  await update(ref(db, `Users/${uid}/profile`), { score, bestScore });
}

// ── PlayData ────────────────────────────────────────────────────────────────

/** 랭킹·통계·관리자 페이지에서 사용하는 상세 플레이 기록 (playdata/{uid}) */
export interface PlayData {
  currentScore: number;    // 현재(마지막) 세션 점수
  bestScore: number;       // 전체 최고 세션 점수
  totalScore: number;      // 누적 획득 점수 합산
  totalCatches: number;    // 총 포획 횟수
  normalCatches: number;   // 일반(방황) 상태 포획 (+1)
  fleeingCatches: number;  // 도망 상태 포획 (+10)
  maxCombo: number;        // 역대 최고 콤보
  playCount: number;       // 총 플레이 세션 수
  totalPlayTime: number;   // 총 플레이 시간 (초)
  lastPlayedAt: number;    // 마지막 세션 시작 타임스탬프 (ms)
}

export const PLAY_DATA_DEFAULTS: PlayData = {
  currentScore: 0,
  bestScore: 0,
  totalScore: 0,
  totalCatches: 0,
  normalCatches: 0,
  fleeingCatches: 0,
  maxCombo: 0,
  playCount: 0,
  totalPlayTime: 0,
  lastPlayedAt: 0,
};

/** playdata/{uid} 조회 (없으면 기본값 반환) */
export async function fetchPlayData(uid: string): Promise<PlayData> {
  const snap = await get(ref(db, `playdata/${uid}`));
  if (!snap.exists()) return { ...PLAY_DATA_DEFAULTS };
  return { ...PLAY_DATA_DEFAULTS, ...snap.val() };
}

/** playdata/{uid} 부분 업데이트 */
export async function writePlayData(uid: string, data: Partial<PlayData>): Promise<void> {
  await update(ref(db, `playdata/${uid}`), data);
}
