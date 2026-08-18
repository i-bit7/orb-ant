import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'wouter';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts';
import {
  loadSettings, saveSettings, DEFAULT_SETTINGS, type AppSettings,
} from '@/lib/settings';
import * as Tabs from '@radix-ui/react-tabs';
import * as Switch from '@radix-ui/react-switch';
import * as SliderPrimitive from '@radix-ui/react-slider';

// ── Analytics types ────────────────────────────────────────────────────────
interface AnalyticsData {
  total: number;
  today: number;
  visitsPerDay: { date: string; count: number }[];
  recent: { timestamp: number; userAgent: string; referrer: string }[];
}

// ── Schema prompt text ─────────────────────────────────────────────────────
const SCHEMA_PROMPT = `# ORB ANT — 전체 프로젝트 개발 스키마

## 프로젝트 개요
- 이름: ORB ANT
- 타입: 미니멀 인터랙티브 미디어 아트 웹 경험
- 컨셉: 검은 캔버스 위를 자율 배회하는 구형 몸통의 개미.
  마우스/터치에 반응하며 잉크 트레일을 남기는 생명체처럼 동작.
  사용자와 생명체 사이의 조용한 긴장감을 표현.

---

## 시각 스타일
- 컬러 팔레트: 순수 블랙 배경(#000000), 화이트 요소(rgba(255,255,255,x))
- 폰트: Inter — 타이틀 600 13px / 부제 300 10px / HUD 힌트 300 9px
- HUD: 좌상단 고정. 타이틀 "ORB ANT" + 부제 "an artificial creature"
- 전체 화면 캔버스, cursor: none, margin/padding 0
- 철학: 장식 없음 · 텍스트 최소화 · 여백이 디자인

---

## 기술 스택
- Frontend: React 18 + Vite + TypeScript (pnpm monorepo)
- Canvas: HTML5 Canvas 2D API 직접 사용 (외부 라이브러리 없음)
- UI (관리자 전용): Radix UI Primitives + Tailwind CSS + Recharts
- 라우팅: wouter (useLocation 기반 수동 라우팅)
- 상태: useRef (애니메이션 루프), localStorage (사용자 설정)
- API: Express.js + TypeScript (Node.js, 포트 8080, /api prefix)
- 인프라: Replit 모노레포, GitHub (i-bit7/orb-ant)

---

## 페이지 구성
1. 메인 (/) — 풀스크린 캔버스 (개미 애니메이션)
2. 관리자 (/admin) — 설정·통계 패널 (개발 모드 전용 진입 버튼)

---

## 개미 동작 — State Machine
| 상태      | 진입 조건                              | 동작                          |
|-----------|----------------------------------------|-------------------------------|
| wandering | 기본 / flee 종료 / awareness 이탈      | 3~6초마다 랜덤 방향 전환       |
| aware     | 마우스가 awarenessRadius(기본 180px) 내 진입 | 마우스 방향 주시, 감속        |
| orbiting  | aware 상태 3초 이상 지속               | 마우스 100px 반경 공전         |
| fleeing   | 250px 이내 클릭/탭                     | 도주 (180프레임), 고속 이동   |

---

## 렌더링 구성
### 트레일
- 과거 위치 배열(TrailPoint[]) → 선으로 연결
- age 기반 알파 페이드아웃 (최대 trailLength pts)
- strokeStyle: rgba(255,255,255, alpha)

### 개미 드로잉 (ctx.save/translate/rotate)
- 더듬이: quadraticCurveTo 곡선, sin 흔들림, 끝 원형 관절
- 다리 6개: tripod gait — walkPhase 기반 swing/lift 계산
  - L0 R1 L2 / R0 L1 R2 교대 보행
- 몸통 3구체: 복부(-13, r13) · 흉부(0, r10) · 머리(12, r8)
  - radialGradient로 입체 표현
- bob: sin(walkPhase*2) × speed → 상하 진동

---

## 설정 시스템
저장소: localStorage key = 'orb-ant-settings'
실시간 반영: StorageEvent → settingsRef 갱신 → 다음 프레임 즉시 적용

| 키                       | 범위        | 기본값 | 설명              |
|--------------------------|-------------|--------|-------------------|
| ant.speedMultiplier      | 0.3 ~ 3.0   | 1.0    | 이동 속도 배율    |
| ant.sizeMultiplier       | 0.5 ~ 2.0   | 1.0    | 전체 크기 배율    |
| ant.awarenessRadius      | 50 ~ 400px  | 180    | 마우스 인식 범위  |
| ant.trailLength          | 0 ~ 600pts  | 600    | 트레일 길이       |
| visual.showHUD           | boolean     | true   | HUD 표시 여부     |
| visual.hudTitle          | string      | ORB ANT | HUD 타이틀       |
| visual.hudSubtitle       | string      | an artificial creature | 부제 |
| visual.trailOpacity      | 0 ~ 0.3     | 0.07   | 트레일 투명도     |
| visual.antBrightness     | 0 ~ 1       | 1.0    | 개미 밝기         |

---

## 관리자 페이지 (/admin)
탭 구성:
- 🐜 Behavior — 속도/크기/인식 범위/트레일 슬라이더 + Apply/Reset
- 🎨 Visual — HUD 텍스트 편집, 투명도/밝기 슬라이더
- 📊 Analytics — 총 방문 수, 오늘, 7일 Area 차트, 최근 세션 목록
- 📋 Schema — 이 문서 (복사 가능 프롬프트)

접근: /admin URL 직접 이동 또는 개발 모드 전용 우하단 "Admin ↗" 버튼
보안: import.meta.env.DEV 플래그 — 프로덕션 빌드에서 버튼 미노출

---

## API 서버 (/api)
| Method | Path                   | 설명              |
|--------|------------------------|-------------------|
| GET    | /api/healthz           | 헬스체크          |
| POST   | /api/analytics/visit   | 방문 기록 (인메모리) |
| GET    | /api/analytics         | 통계 반환         |

analytics 응답 형식:
{
  total: number,
  today: number,
  visitsPerDay: [{ date: "M/D", count: number }],  // 최근 7일
  recent: [{ timestamp, userAgent, referrer }]      // 최근 20건
}

---

## GitHub
- 레포: https://github.com/i-bit7/orb-ant
- 브랜치: main
- 푸시 방식: GitHub Git Data API (Replit connector proxy)
  Replit connector는 raw OAuth 토큰 미노출 → git CLI 불가
  → /repos/{owner}/{repo}/git/blobs·trees·commits·refs 직접 호출
`;

// ── Tiny slider wrapper ────────────────────────────────────────────────────
function Slider({
  label, value, min, max, step, format, onChange,
}: {
  label: string; value: number; min: number; max: number; step: number;
  format?: (v: number) => string; onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-baseline">
        <span className="text-xs text-white/50 uppercase tracking-widest">{label}</span>
        <span className="text-xs text-white/80 font-mono">{format ? format(value) : value}</span>
      </div>
      <SliderPrimitive.Root
        className="relative flex items-center select-none w-full h-4"
        value={[value]} min={min} max={max} step={step}
        onValueChange={([v]) => onChange(v)}
      >
        <SliderPrimitive.Track className="relative bg-white/10 rounded-full h-px flex-1">
          <SliderPrimitive.Range className="absolute bg-white/60 rounded-full h-full" />
        </SliderPrimitive.Track>
        <SliderPrimitive.Thumb className="block w-3 h-3 bg-white rounded-full shadow outline-none focus:ring-1 focus:ring-white/40" />
      </SliderPrimitive.Root>
    </div>
  );
}

function ToggleRow({ label, checked, onCheckedChange }: {
  label: string; checked: boolean; onCheckedChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-xs text-white/50 uppercase tracking-widest">{label}</span>
      <Switch.Root
        checked={checked} onCheckedChange={onCheckedChange}
        className="relative w-9 h-5 rounded-full bg-white/10 data-[state=checked]:bg-white/40 transition-colors outline-none"
      >
        <Switch.Thumb className="block w-3 h-3 bg-white rounded-full translate-x-1 data-[state=checked]:translate-x-5 transition-transform" />
      </Switch.Root>
    </div>
  );
}

function TextRow({ label, value, onChange }: {
  label: string; value: string; onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1">
      <span className="text-xs text-white/50 uppercase tracking-widest block">{label}</span>
      <input
        type="text" value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full bg-white/5 border border-white/10 rounded px-3 py-1.5 text-sm text-white/80 outline-none focus:border-white/30 transition-colors font-mono"
      />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <p className="text-[10px] text-white/30 uppercase tracking-widest border-b border-white/5 pb-2">{title}</p>
      {children}
    </div>
  );
}

function SaveBar({ saved, onSave, onReset }: {
  saved: boolean; onSave: () => void; onReset: () => void;
}) {
  return (
    <div className="flex gap-3 pt-4 border-t border-white/5">
      <button onClick={onSave}
        className="flex-1 py-2 rounded border border-white/20 text-xs text-white/80 hover:bg-white/5 transition-colors">
        {saved ? '✓ Applied' : 'Apply'}
      </button>
      <button onClick={onReset}
        className="px-4 py-2 rounded border border-white/10 text-xs text-white/30 hover:text-white/60 hover:border-white/20 transition-colors">
        Reset
      </button>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="border border-white/8 rounded-lg px-5 py-4">
      <p className="text-[10px] text-white/30 uppercase tracking-widest mb-1">{label}</p>
      <p className="text-3xl font-light text-white/90 tabular-nums">{value}</p>
    </div>
  );
}

// ── Schema tab ─────────────────────────────────────────────────────────────
function SchemaTab() {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(SCHEMA_PROMPT).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-[10px] text-white/30 uppercase tracking-widest">
          개발 스키마 — 복사 후 다른 개발 라인에 활용
        </p>
        <button
          onClick={handleCopy}
          className="px-3 py-1 rounded border border-white/15 text-[10px] text-white/40 hover:text-white/70 hover:border-white/30 transition-colors uppercase tracking-widest"
        >
          {copied ? '✓ Copied' : 'Copy'}
        </button>
      </div>
      <pre
        className="bg-white/3 border border-white/8 rounded-lg p-5 text-[11px] text-white/55 leading-relaxed overflow-auto font-mono whitespace-pre-wrap"
        style={{ maxHeight: '60vh' }}
      >
        {SCHEMA_PROMPT}
      </pre>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────
export default function Admin() {
  const [settings, setSettings] = useState<AppSettings>(loadSettings);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [analyticsError, setAnalyticsError] = useState(false);
  const [saved, setSaved] = useState(false);

  const fetchAnalytics = useCallback(async () => {
    try {
      const res = await fetch('/api/analytics');
      if (!res.ok) throw new Error('failed');
      setAnalytics(await res.json());
      setAnalyticsError(false);
    } catch {
      setAnalyticsError(true);
    }
  }, []);

  useEffect(() => {
    fetchAnalytics();
    const id = setInterval(fetchAnalytics, 15_000);
    return () => clearInterval(id);
  }, [fetchAnalytics]);

  const updateAnt = useCallback((patch: Partial<AppSettings['ant']>) =>
    setSettings((p) => ({ ...p, ant: { ...p.ant, ...patch } })), []);

  const updateVisual = useCallback((patch: Partial<AppSettings['visual']>) =>
    setSettings((p) => ({ ...p, visual: { ...p.visual, ...patch } })), []);

  const handleSave = () => {
    saveSettings(settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  };

  const handleReset = () => {
    setSettings(DEFAULT_SETTINGS);
    saveSettings(DEFAULT_SETTINGS);
  };

  return (
    <div className="min-h-screen bg-black text-white" style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* Header */}
      <header className="border-b border-white/8 px-8 py-5 flex items-center justify-between">
        <div>
          <p className="text-[10px] text-white/30 uppercase tracking-widest mb-0.5">Admin</p>
          <h1 className="text-sm font-semibold tracking-wide text-white/90">ORB ANT</h1>
        </div>
        <Link href="/">
          <span className="text-[11px] text-white/30 hover:text-white/60 transition-colors cursor-pointer tracking-widest uppercase">
            ← Back
          </span>
        </Link>
      </header>

      <div className="max-w-2xl mx-auto px-6 py-10">
        <Tabs.Root defaultValue="ant">
          <Tabs.List className="flex gap-1 mb-10 border-b border-white/8 pb-0">
            {(['ant', 'visual', 'analytics', 'schema'] as const).map((tab) => (
              <Tabs.Trigger key={tab} value={tab}
                className="px-4 py-2.5 text-[11px] uppercase tracking-widest text-white/30
                  data-[state=active]:text-white/80 data-[state=active]:border-b data-[state=active]:border-white/50
                  -mb-px transition-colors outline-none cursor-pointer">
                {tab === 'ant' ? '🐜 Behavior'
                  : tab === 'visual' ? '🎨 Visual'
                  : tab === 'analytics' ? '📊 Analytics'
                  : '📋 Schema'}
              </Tabs.Trigger>
            ))}
          </Tabs.List>

          {/* BEHAVIOR */}
          <Tabs.Content value="ant" className="space-y-8 outline-none">
            <Section title="Movement">
              <Slider label="Speed" value={settings.ant.speedMultiplier}
                min={0.3} max={3.0} step={0.1} format={(v) => `${v.toFixed(1)}×`}
                onChange={(v) => updateAnt({ speedMultiplier: v })} />
              <Slider label="Size" value={settings.ant.sizeMultiplier}
                min={0.5} max={2.0} step={0.1} format={(v) => `${v.toFixed(1)}×`}
                onChange={(v) => updateAnt({ sizeMultiplier: v })} />
            </Section>
            <Section title="Reaction">
              <Slider label="Awareness radius" value={settings.ant.awarenessRadius}
                min={50} max={400} step={10} format={(v) => `${v}px`}
                onChange={(v) => updateAnt({ awarenessRadius: v })} />
            </Section>
            <Section title="Trail">
              <Slider label="Trail length" value={settings.ant.trailLength}
                min={0} max={600} step={20} format={(v) => (v === 0 ? 'off' : `${v} pts`)}
                onChange={(v) => updateAnt({ trailLength: v })} />
            </Section>
            <SaveBar saved={saved} onSave={handleSave} onReset={handleReset} />
          </Tabs.Content>

          {/* VISUAL */}
          <Tabs.Content value="visual" className="space-y-8 outline-none">
            <Section title="HUD Text">
              <ToggleRow label="Show HUD" checked={settings.visual.showHUD}
                onCheckedChange={(v) => updateVisual({ showHUD: v })} />
              {settings.visual.showHUD && (
                <>
                  <TextRow label="Title" value={settings.visual.hudTitle}
                    onChange={(v) => updateVisual({ hudTitle: v })} />
                  <TextRow label="Subtitle" value={settings.visual.hudSubtitle}
                    onChange={(v) => updateVisual({ hudSubtitle: v })} />
                </>
              )}
            </Section>
            <Section title="Rendering">
              <Slider label="Trail opacity" value={settings.visual.trailOpacity}
                min={0} max={0.3} step={0.005} format={(v) => v.toFixed(3)}
                onChange={(v) => updateVisual({ trailOpacity: v })} />
              <Slider label="Ant brightness" value={settings.visual.antBrightness}
                min={0} max={1} step={0.05} format={(v) => `${Math.round(v * 100)}%`}
                onChange={(v) => updateVisual({ antBrightness: v })} />
            </Section>
            <SaveBar saved={saved} onSave={handleSave} onReset={handleReset} />
          </Tabs.Content>

          {/* ANALYTICS */}
          <Tabs.Content value="analytics" className="space-y-8 outline-none">
            {analyticsError ? (
              <p className="text-white/30 text-sm text-center py-16">API server not reachable</p>
            ) : !analytics ? (
              <p className="text-white/30 text-sm text-center py-16 animate-pulse">Loading…</p>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <StatCard label="Total visits" value={analytics.total} />
                  <StatCard label="Today" value={analytics.today} />
                </div>
                <Section title="Last 7 days">
                  <div className="h-40">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={analytics.visitsPerDay} margin={{ top: 4, right: 4, bottom: 0, left: -30 }}>
                        <defs>
                          <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#ffffff" stopOpacity={0.15} />
                            <stop offset="95%" stopColor="#ffffff" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="date" tick={{ fill: 'rgba(255,255,255,0.25)', fontSize: 10 }} axisLine={false} tickLine={false} />
                        <YAxis allowDecimals={false} tick={{ fill: 'rgba(255,255,255,0.25)', fontSize: 10 }} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={{ background: '#111', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 4, fontSize: 11, color: '#fff' }} itemStyle={{ color: 'rgba(255,255,255,0.7)' }} />
                        <Area type="monotone" dataKey="count" stroke="rgba(255,255,255,0.4)" strokeWidth={1.5} fill="url(#grad)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </Section>
                <Section title="Recent sessions">
                  {analytics.recent.length === 0 ? (
                    <p className="text-white/20 text-xs text-center py-4">No sessions yet</p>
                  ) : (
                    <div className="space-y-2">
                      {analytics.recent.slice(0, 10).map((s) => (
                        <div key={s.timestamp} className="border border-white/5 rounded p-3 space-y-0.5">
                          <p className="text-[10px] text-white/25 font-mono">{new Date(s.timestamp).toLocaleString()}</p>
                          <p className="text-[11px] text-white/50 truncate">{s.userAgent || '—'}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </Section>
              </>
            )}
          </Tabs.Content>

          {/* SCHEMA */}
          <Tabs.Content value="schema" className="outline-none">
            <SchemaTab />
          </Tabs.Content>
        </Tabs.Root>
      </div>
    </div>
  );
}
