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

// ── Tiny slider wrapper ────────────────────────────────────────────────────
function Slider({
  label, value, min, max, step, format, onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format?: (v: number) => string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-baseline">
        <span className="text-xs text-white/50 uppercase tracking-widest">{label}</span>
        <span className="text-xs text-white/80 font-mono">
          {format ? format(value) : value}
        </span>
      </div>
      <SliderPrimitive.Root
        className="relative flex items-center select-none w-full h-4"
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={([v]) => onChange(v)}
      >
        <SliderPrimitive.Track className="relative bg-white/10 rounded-full h-px flex-1">
          <SliderPrimitive.Range className="absolute bg-white/60 rounded-full h-full" />
        </SliderPrimitive.Track>
        <SliderPrimitive.Thumb
          className="block w-3 h-3 bg-white rounded-full shadow outline-none focus:ring-1 focus:ring-white/40"
        />
      </SliderPrimitive.Root>
    </div>
  );
}

// ── Toggle row ─────────────────────────────────────────────────────────────
function ToggleRow({
  label, checked, onCheckedChange,
}: {
  label: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-xs text-white/50 uppercase tracking-widest">{label}</span>
      <Switch.Root
        checked={checked}
        onCheckedChange={onCheckedChange}
        className="relative w-9 h-5 rounded-full bg-white/10 data-[state=checked]:bg-white/40 transition-colors outline-none"
      >
        <Switch.Thumb className="block w-3 h-3 bg-white rounded-full translate-x-1 data-[state=checked]:translate-x-5 transition-transform" />
      </Switch.Root>
    </div>
  );
}

// ── Text input row ─────────────────────────────────────────────────────────
function TextRow({
  label, value, onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1">
      <span className="text-xs text-white/50 uppercase tracking-widest block">{label}</span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-white/5 border border-white/10 rounded px-3 py-1.5 text-sm text-white/80 outline-none focus:border-white/30 transition-colors font-mono"
      />
    </div>
  );
}

// ── Section wrapper ────────────────────────────────────────────────────────
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <p className="text-[10px] text-white/30 uppercase tracking-widest border-b border-white/5 pb-2">
        {title}
      </p>
      {children}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────
export default function Admin() {
  const [settings, setSettings] = useState<AppSettings>(loadSettings);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [analyticsError, setAnalyticsError] = useState(false);
  const [saved, setSaved] = useState(false);

  // Load analytics
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

  const update = useCallback((patch: Partial<AppSettings>) => {
    setSettings((prev) => ({ ...prev, ...patch }));
  }, []);

  const updateAnt = useCallback((patch: Partial<AppSettings['ant']>) => {
    setSettings((prev) => ({ ...prev, ant: { ...prev.ant, ...patch } }));
  }, []);

  const updateVisual = useCallback((patch: Partial<AppSettings['visual']>) => {
    setSettings((prev) => ({ ...prev, visual: { ...prev.visual, ...patch } }));
  }, []);

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
    <div
      className="min-h-screen bg-black text-white"
      style={{ fontFamily: 'Inter, sans-serif' }}
    >
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
          {/* Tab list */}
          <Tabs.List className="flex gap-1 mb-10 border-b border-white/8 pb-0">
            {(['ant', 'visual', 'analytics'] as const).map((tab) => (
              <Tabs.Trigger
                key={tab}
                value={tab}
                className="px-4 py-2.5 text-[11px] uppercase tracking-widest text-white/30
                  data-[state=active]:text-white/80 data-[state=active]:border-b data-[state=active]:border-white/50
                  -mb-px transition-colors outline-none cursor-pointer"
              >
                {tab === 'ant' ? '🐜 Behavior' : tab === 'visual' ? '🎨 Visual' : '📊 Analytics'}
              </Tabs.Trigger>
            ))}
          </Tabs.List>

          {/* ── ANT BEHAVIOR ── */}
          <Tabs.Content value="ant" className="space-y-8 outline-none">
            <Section title="Movement">
              <Slider
                label="Speed"
                value={settings.ant.speedMultiplier}
                min={0.3} max={3.0} step={0.1}
                format={(v) => `${v.toFixed(1)}×`}
                onChange={(v) => updateAnt({ speedMultiplier: v })}
              />
              <Slider
                label="Size"
                value={settings.ant.sizeMultiplier}
                min={0.5} max={2.0} step={0.1}
                format={(v) => `${v.toFixed(1)}×`}
                onChange={(v) => updateAnt({ sizeMultiplier: v })}
              />
            </Section>

            <Section title="Reaction">
              <Slider
                label="Awareness radius"
                value={settings.ant.awarenessRadius}
                min={50} max={400} step={10}
                format={(v) => `${v}px`}
                onChange={(v) => updateAnt({ awarenessRadius: v })}
              />
            </Section>

            <Section title="Trail">
              <Slider
                label="Trail length"
                value={settings.ant.trailLength}
                min={0} max={600} step={20}
                format={(v) => (v === 0 ? 'off' : `${v} pts`)}
                onChange={(v) => updateAnt({ trailLength: v })}
              />
            </Section>

            <SaveBar saved={saved} onSave={handleSave} onReset={handleReset} />
          </Tabs.Content>

          {/* ── VISUAL ── */}
          <Tabs.Content value="visual" className="space-y-8 outline-none">
            <Section title="HUD Text">
              <ToggleRow
                label="Show HUD"
                checked={settings.visual.showHUD}
                onCheckedChange={(v) => updateVisual({ showHUD: v })}
              />
              {settings.visual.showHUD && (
                <>
                  <TextRow
                    label="Title"
                    value={settings.visual.hudTitle}
                    onChange={(v) => updateVisual({ hudTitle: v })}
                  />
                  <TextRow
                    label="Subtitle"
                    value={settings.visual.hudSubtitle}
                    onChange={(v) => updateVisual({ hudSubtitle: v })}
                  />
                </>
              )}
            </Section>

            <Section title="Rendering">
              <Slider
                label="Trail opacity"
                value={settings.visual.trailOpacity}
                min={0} max={0.3} step={0.005}
                format={(v) => v.toFixed(3)}
                onChange={(v) => updateVisual({ trailOpacity: v })}
              />
              <Slider
                label="Ant brightness"
                value={settings.visual.antBrightness}
                min={0} max={1} step={0.05}
                format={(v) => `${Math.round(v * 100)}%`}
                onChange={(v) => updateVisual({ antBrightness: v })}
              />
            </Section>

            <SaveBar saved={saved} onSave={handleSave} onReset={handleReset} />
          </Tabs.Content>

          {/* ── ANALYTICS ── */}
          <Tabs.Content value="analytics" className="space-y-8 outline-none">
            {analyticsError ? (
              <p className="text-white/30 text-sm text-center py-16">
                API server not reachable
              </p>
            ) : !analytics ? (
              <p className="text-white/30 text-sm text-center py-16 animate-pulse">
                Loading…
              </p>
            ) : (
              <>
                {/* Stat cards */}
                <div className="grid grid-cols-2 gap-4">
                  <StatCard label="Total visits" value={analytics.total} />
                  <StatCard label="Today" value={analytics.today} />
                </div>

                {/* Chart */}
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
                        <XAxis
                          dataKey="date"
                          tick={{ fill: 'rgba(255,255,255,0.25)', fontSize: 10 }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          allowDecimals={false}
                          tick={{ fill: 'rgba(255,255,255,0.25)', fontSize: 10 }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <Tooltip
                          contentStyle={{
                            background: '#111', border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: 4, fontSize: 11, color: '#fff',
                          }}
                          itemStyle={{ color: 'rgba(255,255,255,0.7)' }}
                        />
                        <Area
                          type="monotone"
                          dataKey="count"
                          stroke="rgba(255,255,255,0.4)"
                          strokeWidth={1.5}
                          fill="url(#grad)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </Section>

                {/* Recent sessions */}
                <Section title="Recent sessions">
                  {analytics.recent.length === 0 ? (
                    <p className="text-white/20 text-xs text-center py-4">No sessions yet</p>
                  ) : (
                    <div className="space-y-2">
                      {analytics.recent.slice(0, 10).map((s) => (
                        <div
                          key={s.timestamp}
                          className="border border-white/5 rounded p-3 space-y-0.5"
                        >
                          <p className="text-[10px] text-white/25 font-mono">
                            {new Date(s.timestamp).toLocaleString()}
                          </p>
                          <p className="text-[11px] text-white/50 truncate">{s.userAgent || '—'}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </Section>
              </>
            )}
          </Tabs.Content>
        </Tabs.Root>
      </div>
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

function SaveBar({
  saved, onSave, onReset,
}: {
  saved: boolean;
  onSave: () => void;
  onReset: () => void;
}) {
  return (
    <div className="flex gap-3 pt-4 border-t border-white/5">
      <button
        onClick={onSave}
        className="flex-1 py-2 rounded border border-white/20 text-xs text-white/80 hover:bg-white/5 transition-colors"
      >
        {saved ? '✓ Applied' : 'Apply'}
      </button>
      <button
        onClick={onReset}
        className="px-4 py-2 rounded border border-white/10 text-xs text-white/30 hover:text-white/60 hover:border-white/20 transition-colors"
      >
        Reset
      </button>
    </div>
  );
}
