import React, { useEffect } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/contexts/auth-context';

export default function Login() {
  const { user, loading, signIn } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!loading && user) navigate('/');
  }, [user, loading, navigate]);

  const handleSignIn = async () => {
    try {
      await signIn();
    } catch (e) {
      console.error('Sign in failed', e);
    }
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0,
        background: '#000',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        fontFamily: 'Inter, sans-serif',
        gap: 0,
      }}
    >
      {/* Title */}
      <p style={{ margin: 0, fontSize: 11, fontWeight: 600, letterSpacing: '0.18em', color: 'rgba(255,255,255,0.85)', textTransform: 'uppercase' }}>
        ORB ANT
      </p>
      <p style={{ margin: '6px 0 48px', fontSize: 10, fontWeight: 300, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.06em' }}>
        an artificial creature
      </p>

      {/* Google sign-in button */}
      <button
        onClick={handleSignIn}
        disabled={loading}
        style={{
          display: 'flex', alignItems: 'center', gap: 10,
          background: 'transparent',
          border: '1px solid rgba(255,255,255,0.2)',
          borderRadius: 4,
          padding: '10px 20px',
          cursor: loading ? 'default' : 'pointer',
          color: 'rgba(255,255,255,0.7)',
          fontSize: 12,
          letterSpacing: '0.06em',
          transition: 'border-color 0.2s, color 0.2s',
          opacity: loading ? 0.4 : 1,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.5)';
          e.currentTarget.style.color = 'rgba(255,255,255,0.95)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)';
          e.currentTarget.style.color = 'rgba(255,255,255,0.7)';
        }}
      >
        {/* Google G icon */}
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="rgba(255,255,255,0.6)"/>
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="rgba(255,255,255,0.6)"/>
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="rgba(255,255,255,0.6)"/>
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="rgba(255,255,255,0.6)"/>
        </svg>
        {loading ? '연결 중…' : 'Google로 로그인'}
      </button>

      {/* Back */}
      <a
        href="/"
        style={{
          marginTop: 32,
          fontSize: 10,
          color: 'rgba(255,255,255,0.2)',
          textDecoration: 'none',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.5)')}
        onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.2)')}
      >
        ← 돌아가기
      </a>
    </div>
  );
}
