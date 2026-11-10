import React from "react";
import { F } from "../theme";

// 精致画风（卡通粗描边、颜色多、占满屏 = 没有高级感）
// 规则：同一套材质（白卡 + 细线 + 柔和长投影）、一到两个强调色、元素只占画面三到五成、
// 字分三层（大字/中文标签/极小英文或出处）、没有粗黑描边。

export const L = {
  ink: "#0F1A2A",
  sub: "#5B6678",
  faint: "#9AA4B2",
  hair: "rgba(15,26,42,0.09)",
  card: "#FFFFFF",
  blue: "#2F6BFF",
  blueSoft: "#DCE6FF",
  cyan: "#12B3C9",
  gold: "#F5A623",
  goldSoft: "#FFF1D6",
  red: "#F0464B",
  grey1: "#E7EBF1",
  grey2: "#C9D2DF",
  grey3: "#A9B4C4",
  shadow: "0 1px 0 rgba(255,255,255,0.9) inset, 0 2px 6px rgba(15,26,42,0.05), 0 22px 48px -14px rgba(15,26,42,0.22)",
  shadowSm: "0 1px 0 rgba(255,255,255,0.9) inset, 0 1px 3px rgba(15,26,42,0.06), 0 10px 24px -8px rgba(15,26,42,0.18)",
  mono: '"SF Mono", Menlo, monospace',
  num: '"SF Pro Display", "Avenir Next", "Helvetica Neue", sans-serif',
};

/** 极小英文/出处层：等宽、全大写、拉开字距 */
export const Micro: React.FC<{ children: React.ReactNode; color?: string; size?: number; style?: React.CSSProperties }> = ({ children, color = L.faint, size = 15, style }) => (
  <div style={{ fontFamily: L.mono, fontSize: size, letterSpacing: size * 0.16, textTransform: "uppercase", color, whiteSpace: "nowrap", ...style }}>{children}</div>
);

/** 标签胶囊：中文 + 极小英文两层，左边一个色点 */
export const Chip: React.FC<{ cn: string; en?: string; tone?: string; size?: number; dark?: boolean; strike?: number }> = ({ cn, en, tone = L.blue, size = 34, dark, strike = 0 }) => (
  <div style={{ display: "inline-flex", alignItems: "center", gap: size * 0.4, padding: `${size * 0.32}px ${size * 0.62}px ${size * 0.32}px ${size * 0.5}px`, borderRadius: 999,
    background: dark ? "rgba(15,26,42,0.92)" : L.card, border: `1px solid ${dark ? "rgba(255,255,255,0.12)" : L.hair}`, boxShadow: L.shadowSm, whiteSpace: "nowrap" }}>
    <div style={{ width: size * 0.3, height: size * 0.3, borderRadius: 99, background: tone, boxShadow: `0 0 0 ${size * 0.14}px ${tone}22` }} />
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <div style={{ position: "relative", fontFamily: F.cn, fontWeight: 600, fontSize: size, lineHeight: 1.1, color: dark ? "#fff" : L.ink, letterSpacing: 0.5 }}>
        {cn}
        {strike > 0 ? <div style={{ position: "absolute", left: -4, top: "52%", height: 3, width: `calc(${strike * 100}% + 8px)`, background: L.red, borderRadius: 2 }} /> : null}
      </div>
      {en ? <Micro size={Math.max(12, size * 0.36)} color={tone}>{en}</Micro> : null}
    </div>
  </div>
);

/** 卡片底：白、细边、柔和长投影 */
export const LuxCard: React.FC<{ w: number; h?: number; children: React.ReactNode; pad?: number; style?: React.CSSProperties }> = ({ w, h, children, pad = 28, style }) => (
  <div style={{ width: w, height: h, padding: pad, borderRadius: 26, background: L.card, border: `1px solid ${L.hair}`, boxShadow: L.shadow, boxSizing: "border-box", ...style }}>{children}</div>
);

// ---------- 小人：圆头 + 胶囊身，渐变灰；可套机甲壳、可戴皇冠 ----------
export const Figure: React.FC<{ s?: number; tone?: "grey" | "blue" | "gold"; mech?: number; crown?: number; flail?: number; t?: number; seed?: number; cut?: number }> = ({ s = 1, tone = "grey", mech = 0, crown = 0, flail = 0, t = 0, seed = 0, cut }) => {
  const id = `fg${seed}`;
  const body = tone === "blue" ? ["#6C95FF", "#2F6BFF"] : tone === "gold" ? ["#FFD27A", "#F5A623"] : ["#DDE3EC", "#B4BFCF"];
  const arm = flail ? Math.sin(t * 18 + seed) * 30 * flail : 0;
  const w = 70 * s, h = 110 * s;
  return (
    <svg width={w * 1.8} height={h * 1.5} viewBox="-63 -70 126 165" style={{ overflow: "visible" }}>
      <defs>
        <linearGradient id={`${id}b`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={body[0]} /><stop offset="1" stopColor={body[1]} /></linearGradient>
        <linearGradient id={`${id}m`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#FFFFFF" stopOpacity="0.95" /><stop offset="0.5" stopColor="#C7D7FF" stopOpacity="0.75" /><stop offset="1" stopColor="#2F6BFF" stopOpacity="0.8" /></linearGradient>
        {cut !== undefined ? <clipPath id={`${id}c`}><rect x="-80" y="-120" width="160" height={120 + cut} /></clipPath> : null}
      </defs>
      <g clipPath={cut !== undefined ? `url(#${id}c)` : undefined}>
        {/* 手臂 */}
        <g stroke={body[1]} strokeWidth="9" strokeLinecap="round">
          <line x1="-22" y1="8" x2={-34 - arm * 0.3} y2={-14 - Math.abs(arm) * 0.5} />
          <line x1="22" y1="8" x2={34 + arm * 0.3} y2={-14 - Math.abs(arm) * 0.5} />
        </g>
        <rect x="-24" y="0" width="48" height="70" rx="24" fill={`url(#${id}b)`} />
        <circle cx="0" cy="-20" r="19" fill={`url(#${id}b)`} />
        <ellipse cx="-6" cy="-27" rx="7" ry="4.5" fill="#fff" opacity="0.55" />
        {/* 机甲：外面罩一层玻璃壳 + 青色面罩光条 + 肩甲 */}
        {mech > 0 ? (
          <g opacity={Math.min(1, mech * 1.4)} transform={`scale(${0.7 + 0.3 * mech})`}>
            <rect x="-38" y="-6" width="76" height="86" rx="30" fill={`url(#${id}m)`} stroke="#fff" strokeWidth="2" />
            <path d="M-40 4 q-12 0 -14 16 l14 4z M40 4 q12 0 14 16 l-14 4z" fill="#2F6BFF" opacity="0.85" />
            <rect x="-30" y="-50" width="60" height="50" rx="22" fill={`url(#${id}m)`} stroke="#fff" strokeWidth="2" />
            <rect x="-20" y="-30" width="40" height="8" rx="4" fill="#12B3C9" />
            <rect x="-20" y="-30" width="40" height="8" rx="4" fill="#9FF3FF" opacity={0.5 + 0.5 * Math.sin(t * 6 + seed)} />
            <circle cx="0" cy="-56" r="4" fill="#12B3C9" />
          </g>
        ) : null}
        {crown > 0 ? (
          <g transform={`translate(0 ${-50 - (1 - crown) * 30}) scale(${crown})`} opacity={crown}>
            <path d="M-16 6 L-16 -8 L-8 0 L0 -12 L8 0 L16 -8 L16 6 Z" fill="#F5A623" stroke="#fff" strokeWidth="1.5" strokeLinejoin="round" />
          </g>
        ) : null}
      </g>
    </svg>
  );
};

/** 虚线连接（带流动光点） */
export const Dotted: React.FC<{ x1: number; y1: number; x2: number; y2: number; t: number; p?: number; color?: string }> = ({ x1, y1, x2, y2, t, p = 1, color = L.blue }) => {
  const len = Math.hypot(x2 - x1, y2 - y1);
  const k = (t * 0.6) % 1;
  return (
    <svg style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }} width={1} height={1}>
      <line x1={x1} y1={y1} x2={x1 + (x2 - x1) * p} y2={y1 + (y2 - y1) * p} stroke={color} strokeOpacity="0.45" strokeWidth="2.5" strokeDasharray="2 10" strokeLinecap="round" />
      {p >= 1 && len > 0 ? <circle cx={x1 + (x2 - x1) * k} cy={y1 + (y2 - y1) * k} r="5" fill={color} /> : null}
    </svg>
  );
};
