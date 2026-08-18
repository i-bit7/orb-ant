import React, { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { useAuth, GUEST_SCORE_KEY } from '@/contexts/auth-context';

type Mode = 'signin' | 'create';

const INPUT_STYLE: React.CSSProperties = {
  width: '100%',
  background: 'transparent',
  border: 'none',
  borderBottom: '1px solid rgba(255,255,255,0.15)',
  padding: '8px 0',
  color: 'rgba(255,255,255,0.85)',
  fontSize: 13,
  fontFamily: 'Inter, sans-serif',
  letterSpacing: '0.04em',
  outline: 'none',
  boxSizing: 'border-box',
};

const BTN_BASE: React.CSSProperties = {
  background: 'transparent',
  border: '1px solid rgba(255,255,255,0.2)',
  borderRadius: 3,
  padding: '9px 18px',
  color: 'rgba(255,255,255,0.65)',
  fontSize: 11,
  fontFamily: 'Inter, sans-serif',
  letterSpacing: '0.08em',
  cursor: 'pointer',
  transition: 'border-color 0.18s, color 0.18s',
};

export default function Login() {
  const { user, loading, googleSignIn, emailSignIn, emailCreateAccount } = useAuth();
  const [, navigate] = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<Mode>('signin');

  // Read guest score that was saved before navigating here
  const guestScore = parseInt(sessionStorage.getItem(GUEST_SCORE_KEY) ?? '0', 10) || 0;

  // If already logged in, go home
  useEffect(() => {
    if (!loading && user) navigate('/');
  }, [user, loading, navigate]);

  function friendlyError(code: string): string {
    const map: Record<string, string> = {
      'auth/user-not-found':      '등록된 계정이 없습니다.',
      'auth/wrong-password':      '비밀번호가 올바르지 않습니다.',
      'auth/invalid-credential':  '이메일 또는 비밀번호가 올바르지 않습니다.',
      'auth/email-already-in-use':'이미 사용 중인 이메일입니다.',
      'auth/weak-password':       '비밀번호는 6자 이상이어야 합니다.',
      'auth/invalid-email':       '올바른 이메일 형식이 아닙니다.',
      'auth/popup-blocked':       '팝업이 차단됐습니다. 팝업 허용 후 다시 시도해주세요.',
      'auth/popup-closed-by-user':'로그인 창이 닫혔습니다.',
      'auth/network-request-failed': '네트워크 오류. 연결을 확인해주세요.',
    };
    return map[code] ?? '오류가 발생했습니다. 다시 시도해주세요.';
  }

  async function handleGoogle() {
    setError('');
    setBusy(true);
    try {
      await googleSignIn(guestScore);
      sessionStorage.removeItem(GUEST_SCORE_KEY);
      navigate('/');
    } catch (e: any) {
      setError(friendlyError(e?.code ?? ''));
    } finally {
      setBusy(false);
    }
  }

  async function handleEmailSignIn() {
    if (!email || !password) { setError('이메일과 비밀번호를 입력해주세요.'); return; }
    setError('');
    setBusy(true);
    try {
      await emailSignIn(email.trim(), password, guestScore);
      sessionStorage.removeItem(GUEST_SCORE_KEY);
      navigate('/');
    } catch (e: any) {
      setError(friendlyError(e?.code ?? ''));
    } finally {
      setBusy(false);
    }
  }

  async function handleCreate() {
    if (!email || !password) { setError('이메일과 비밀번호를 입력해주세요.'); return; }
    if (password.length < 6) { setError('비밀번호는 6자 이상이어야 합니다.'); return; }
    setError('');
    setBusy(true);
    try {
      await emailCreateAccount(email.trim(), password, guestScore);
      sessionStorage.removeItem(GUEST_SCORE_KEY);
      navigate('/');
    } catch (e: any) {
      setError(friendlyError(e?.code ?? ''));
    } finally {
      setBusy(false);
    }
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      mode === 'signin' ? handleEmailSignIn() : handleCreate();
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: '#000',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      fontFamily: 'Inter, sans-serif',
    }}>
      {/* Title */}
      <p style={{ margin: 0, fontSize: 11, fontWeight: 600, letterSpacing: '0.18em', color: 'rgba(255,255,255,0.85)', textTransform: 'uppercase' }}>
        ORB ANT
      </p>
      <p style={{ margin: '5px 0 40px', fontSize: 10, fontWeight: 300, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.06em' }}>
        an artificial creature
      </p>

      {/* Guest score carry-over notice */}
      {guestScore > 0 && (
        <p style={{ margin: '-24px 0 28px', fontSize: 10, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.05em' }}>
          현재 점수 {guestScore}점이 계정으로 이어집니다
        </p>
      )}

      <div style={{ width: 260, display: 'flex', flexDirection: 'column', gap: 0 }}>
        {/* Google */}
        <button
          onClick={handleGoogle}
          disabled={busy}
          style={{
            ...BTN_BASE,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            width: '100%', opacity: busy ? 0.4 : 1,
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.45)'; e.currentTarget.style.color = 'rgba(255,255,255,0.95)'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; e.currentTarget.style.color = 'rgba(255,255,255,0.65)'; }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="rgba(255,255,255,0.55)"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="rgba(255,255,255,0.55)"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="rgba(255,255,255,0.55)"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="rgba(255,255,255,0.55)"/>
          </svg>
          Continue with Google
        </button>

        {/* Divider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0' }}>
          <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.08em' }}>OR</span>
          <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
        </div>

        {/* Email / Password form — wrapped in <form> to satisfy browser */}
        <form onSubmit={e => { e.preventDefault(); mode === 'signin' ? handleEmailSignIn() : handleCreate(); }}>
          <label style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.12em', display: 'block', marginBottom: 4 }}>
            ID (EMAIL)
          </label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="email@example.com"
            autoComplete="email"
            style={{ ...INPUT_STYLE, marginBottom: 20 }}
          />

          <label style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.12em', display: 'block', marginBottom: 4 }}>
            PASSWORD
          </label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="••••••"
            autoComplete={mode === 'create' ? 'new-password' : 'current-password'}
            style={{ ...INPUT_STYLE, marginBottom: 8 }}
          />

          {/* Error */}
          {error && (
            <p style={{ margin: '4px 0 8px', fontSize: 10, color: 'rgba(255,120,120,0.8)', letterSpacing: '0.03em' }}>
              {error}
            </p>
          )}

          {/* Buttons */}
          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <button
              type="submit"
              onClick={() => setMode('signin')}
              disabled={busy}
              style={{
                ...BTN_BASE,
                flex: 1,
                whiteSpace: 'nowrap',
                opacity: busy ? 0.4 : 1,
                background: mode === 'signin' ? 'rgba(255,255,255,0.06)' : 'transparent',
                borderColor: mode === 'signin' ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.15)',
                color: mode === 'signin' ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.4)',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.5)'; e.currentTarget.style.color = 'rgba(255,255,255,0.95)'; }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = mode === 'signin' ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.15)';
                e.currentTarget.style.color = mode === 'signin' ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.4)';
              }}
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => { setMode('create'); handleCreate(); }}
              disabled={busy}
              style={{
                ...BTN_BASE,
                flex: 1,
                whiteSpace: 'nowrap',
                opacity: busy ? 0.4 : 1,
                background: mode === 'create' ? 'rgba(255,255,255,0.06)' : 'transparent',
                borderColor: mode === 'create' ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.15)',
                color: mode === 'create' ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.4)',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.5)'; e.currentTarget.style.color = 'rgba(255,255,255,0.95)'; }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = mode === 'create' ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.15)';
                e.currentTarget.style.color = mode === 'create' ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.4)';
              }}
            >
              Create account
            </button>
          </div>
        </form>
      </div>

      {/* Back */}
      <a
        href="/"
        style={{
          marginTop: 40, fontSize: 10,
          color: 'rgba(255,255,255,0.15)', textDecoration: 'none',
          letterSpacing: '0.1em', textTransform: 'uppercase',
        }}
        onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.4)')}
        onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.15)')}
      >
        ← Back
      </a>
    </div>
  );
}
