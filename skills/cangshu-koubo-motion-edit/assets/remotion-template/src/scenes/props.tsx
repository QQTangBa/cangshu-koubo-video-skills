import React from "react";
import { Easing, interpolate } from "remotion";
import { C, F, accent } from "../theme";
import { clamp, easeInOut, prog } from "../anim";
import iconData from "../icons.json"; // Tabler Icons（MIT），5184 个线稿图标，任何名词都能当道具

// 道具库：把意思"演"出来的东西。每个道具自带常驻小动画（静着也在动），参数里的时间都是成片绝对秒。
// 画风：主体 propBody/propBody2 + propLine 描边线稿 + 强调色；浅色主题白身深线，深色主题深身白线（对标原版）。
const LW = 7; // 描边线宽

export type PropKind =
  | "camera" | "brain" | "player" | "keyboard" | "waveform" | "scissors" | "person" | "crowd" | "robot" | "building"
  | "scale" | "chart" | "waffle" | "battery" | "pool" | "bulb" | "gauge" | "app" | "code" | "dots" | "coins"
  | "valve" | "speaker" | "machine" | "bars3d" | "network" | "steps" | "ring"
  | "icon" | "wheel" | "seesaw" | "funnel" | "gears" | "snowball" | "pyramid" | "squad";

export type PropSpec =
  | { kind: "camera"; lines: string[]; scrollAt?: number; perLine?: number; recAt?: number; highlight?: boolean }
  | { kind: "brain"; fill?: { at: number; to: number }[]; glowAt?: number; channel?: boolean; blueAt?: number; through?: { at: number; until?: number } }
  | { kind: "player"; playAt?: number; dur?: number; title?: string }
  | { kind: "keyboard"; typeAt?: number; dur?: number }
  | { kind: "waveform"; playAt?: number; dur?: number; cut?: { at: number; from: number; to: number; closeAt?: number } }
  | { kind: "scissors"; snipAt?: number }
  | { kind: "person"; variant?: "plain" | "cap" | "tie" | "crown" | "helmet"; label?: string }
  | { kind: "crowd"; n?: number; squeezeAt?: number; highlight?: number[]; label?: string }
  | { kind: "robot"; powerAt?: number; rideAt?: number; label?: string }
  | { kind: "building"; label?: string; lightsAt?: number }
  | { kind: "scale"; left: string; right: string; tilt?: { at: number; to: number }[] }
  | { kind: "chart"; points: number[]; drawAt?: number; dur?: number; label?: string; down?: boolean }
  | { kind: "waffle"; value: number; at?: number; dur?: number; label?: string }
  | { kind: "battery"; level?: { at: number; to: number }[]; label?: string }
  | { kind: "pool"; level?: { at: number; to: number }[]; label?: string; inflowAt?: number; inflowStop?: number; diveAt?: number } // diveAt：一个人一头扎进去，水太浅头戳池底冒星星
  | { kind: "bulb"; onAt?: number }
  | { kind: "gauge"; to: number; at?: number; label?: string }
  | { kind: "app"; title?: string; rows: string[]; addAt?: number; addLabel?: string; toggleAt?: number; cursor?: { at: number; x: number; y: number; click?: boolean }[] }
  | { kind: "code"; title?: string; lines: { text: string; at: number }[] }
  | { kind: "dots"; title?: string; rows: { label: string; value: number; total?: number; tone?: string; at?: number }[]; foot?: string }
  | { kind: "coins"; count?: number; at?: number; dur?: number; label?: string }
  | { kind: "valve"; closeAt?: number; label?: string }
  | { kind: "speaker"; from?: number; until?: number }
  | { kind: "machine"; name: string; sub?: string; inLabel?: string; outLabel?: string; feedAt?: number; outAt?: number; grey?: boolean }
  | { kind: "bars3d"; items: { label: string; value: number }[]; at?: number; stagger?: number; unit?: string }
  | { kind: "network"; center: string; growAt?: number; lights?: { at: number; label: string }[]; rings?: number[]; collapseAt?: number; coin?: string }
  | { kind: "steps"; items: { label: string; icon?: string }[]; activeAt: number[] }
  | { kind: "ring"; to: number; at?: number; dur?: number; center: string; label?: string }
  | { kind: "icon"; name: string; label?: string; anim?: "bob" | "spin" | "shake" | "pulse" | "none"; tile?: boolean; at?: number }
  | { kind: "wheel"; runAt?: number; stopAt?: number; label?: string }
  | { kind: "seesaw"; left: string; right: string; tilt?: { at: number; to: number }[]; dropAt?: number }
  | { kind: "funnel"; inAt?: number; until?: number; pass?: number; overflowAt?: number; topLabel?: string; outLabel?: string }
  | { kind: "gears"; spinAt?: number; labels?: [string, string, string]; replaceAt?: number; replaceLabel?: string; stopAt?: number }
  | { kind: "snowball"; rollAt?: number; dur?: number; label?: string; endLabel?: string }
  | { kind: "pyramid"; climbAt?: number; topAt?: number; slideAt?: number; topLabel?: string; label?: string } // 塔尖只站得下一个
  | { kind: "squad"; n?: number; armorAt?: number[]; label?: string }; // 一排小人挨个套上机甲

export const propSize = (p: PropSpec): { w: number; h: number } => {
  switch (p.kind) {
    case "camera": return { w: 640, h: 720 };
    case "brain": return { w: 540, h: 520 };
    case "player": return { w: 800, h: 520 };
    case "keyboard": return { w: 860, h: 320 };
    case "waveform": return { w: 880, h: 240 };
    case "scissors": return { w: 240, h: 240 };
    case "person": return { w: 260, h: 400 };
    case "crowd": return { w: 860, h: 560 };
    case "robot": return { w: 540, h: 700 };
    case "building": return { w: 440, h: 560 };
    case "scale": return { w: 820, h: 560 };
    case "chart": return { w: 880, h: 560 };
    case "waffle": return { w: 640, h: 720 };
    case "battery": return { w: 560, h: 280 };
    case "pool": return { w: 640, h: 560 };
    case "bulb": return { w: 320, h: 440 };
    case "gauge": return { w: 560, h: 380 };
    case "app": return { w: 760, h: 140 + p.rows.length * 96 + 120 };
    case "code": return { w: 820, h: 120 + p.lines.length * 56 };
    case "dots": return { w: 880, h: (p.title ? 110 : 40) + p.rows.length * 130 + (p.foot ? 50 : 0) };
    case "coins": return { w: 420, h: 420 };
    case "valve": return { w: 300, h: 200 };
    case "speaker": return { w: 340, h: 300 };
    case "machine": return { w: 920, h: 640 };
    case "bars3d": return { w: 880, h: 640 };
    case "network": return { w: 880, h: 880 };
    case "steps": return { w: 860, h: 80 + p.items.length * 140 };
    case "ring": return { w: 480, h: 520 };
    case "icon": return { w: 320, h: p.label ? 380 : 320 };
    case "wheel": return { w: 640, h: 680 };
    case "seesaw": return { w: 860, h: 460 };
    case "funnel": return { w: 620, h: 700 };
    case "gears": return { w: 860, h: 560 };
    case "snowball": return { w: 880, h: 560 };
    case "pyramid": return { w: 880, h: 760 };
    case "squad": return { w: 900, h: 460 };
  }
};

const seq = (t: number, keys: { at: number; to: number }[] | undefined, from = 0, dur = 0.8) => {
  let v = from;
  for (const k of keys ?? []) v = interpolate(t, [k.at, k.at + dur], [v, k.to], { ...clamp, easing: easeInOut });
  return v;
};
const shadowF = `drop-shadow(0 9px 0 ${C.thick}) drop-shadow(0 18px 24px rgba(22,34,64,0.14))`; // 底部厚度 + 软投影

// ---------- 摄像机 + 提词屏 ----------
const Camera: React.FC<{ p: Extract<PropSpec, { kind: "camera" }>; t: number }> = ({ p, t }) => {
  const per = p.perLine ?? 0.6, sa = p.scrollAt ?? Infinity;
  const off = t > sa ? (t - sa) / per : 0; // 已滚过的行数（连续）
  const rec = p.recAt !== undefined && t >= p.recAt;
  const rows = 5, rowH = 56, top = 250;
  return (
    <svg width={640} height={720} viewBox="0 0 640 720" style={{ filter: shadowF, overflow: "visible" }}>
      <rect x={210} y={70} width={220} height={36} rx={14} fill={C.propBody2} stroke={C.propLine} strokeWidth={LW} />
      <rect x={250} y={100} width={14} height={40} fill={C.propLine} /><rect x={376} y={100} width={14} height={40} fill={C.propLine} />
      <rect x={80} y={140} width={480} height={430} rx={34} fill={C.propBody} stroke={C.propLine} strokeWidth={LW} />
      <rect x={80} y={140} width={480} height={86} rx={34} fill={C.propBody2} stroke={C.propLine} strokeWidth={LW} />
      {rec ? <g opacity={Math.floor(t * 2) % 2 ? 0.35 : 1}><circle cx={124} cy={183} r={11} fill={C.red} /><text x={144} y={194} fontFamily={F.mono} fontWeight={800} fontSize={30} fill={C.red}>REC</text></g> : null}
      <rect x={112} y={top - 10} width={416} height={rows * rowH + 20} rx={18} fill={C.propScreen} stroke={C.propLine} strokeWidth={LW * 0.7} />
      <defs><clipPath id="campr"><rect x={116} y={top - 6} width={408} height={rows * rowH + 12} rx={14} /></clipPath></defs>
      <g clipPath="url(#campr)">
        {p.highlight !== false ? <rect x={116} y={top + 2 * rowH} width={408} height={rowH} fill={C.blue} opacity={0.22} /> : null}
        {p.lines.map((ln, i) => {
          const y = top + (i - off + 2) * rowH + rowH * 0.68;
          const center = Math.abs(i - off) < 0.5;
          return <text key={i} x={320} y={y} textAnchor="middle" fontFamily={F.cn} fontWeight={center ? 900 : 700} fontSize={center ? 34 : 30} fill={C.propLine} opacity={center ? 1 : 0.55}>{ln}</text>;
        })}
      </g>
      <rect x={290} y={570} width={60} height={34} fill={C.propBody2} stroke={C.propLine} strokeWidth={LW} />
      <path d="M320 604 L220 700 M320 604 L420 700 M320 604 L320 704" stroke={C.propLine} strokeWidth={LW} strokeLinecap="round" />
    </svg>
  );
};

// ---------- 大脑 + 液面 ----------
const BRAIN = "M270 70c-38-30-96-16-112 26-44-6-78 30-70 72-36 16-48 66-20 96-20 34 0 80 40 88 6 44 52 70 92 56 22 34 70 40 98 14 28 26 76 20 98-14 40 14 86-12 92-56 40-8 60-54 40-88 28-30 16-80-20-96 8-42-26-78-70-72-16-42-74-56-112-26z";
const Brain: React.FC<{ p: Extract<PropSpec, { kind: "brain" }>; t: number }> = ({ p, t }) => {
  const lv = Math.max(0, Math.min(1, seq(t, p.fill, 0, 1.2)));
  const top = 470, bottom = 60, y = top - (top - bottom) * lv;
  const wave = (k: number) => Array.from({ length: 13 }, (_, i) => `${40 + i * 40},${y + Math.sin(t * 3 + i * 0.8 + k) * 8}`).join(" L ");
  const glow = p.glowAt !== undefined ? prog(t, p.glowAt, 0.5) : 0;
  const blue = p.blueAt === undefined ? 1 : prog(t, p.blueAt, 0.6);
  const liq = blue >= 1 ? C.blue : blue <= 0 ? "#8A8F99" : interpolateColor(blue);
  const thr = p.through && t >= p.through.at && (p.through.until === undefined || t < p.through.until);
  return (
    <svg width={540} height={520} viewBox="0 0 540 520" style={{ filter: shadowF, overflow: "visible" }}>
      <defs><clipPath id="brainclip"><path d={BRAIN} /></clipPath></defs>
      {glow > 0 ? <path d={BRAIN} fill="none" stroke={C.blue} strokeWidth={30} opacity={0.25 * glow} /> : null}
      <path d={BRAIN} fill={C.propBody} />
      <g clipPath="url(#brainclip)">
        <path d={`M40 520 L ${wave(0)} L 520 520 Z`} fill={liq} opacity={0.95} />
        <path d={`M40 520 L ${wave(2)} L 520 520 Z`} fill={liq} opacity={0.35} transform="translate(0,-10)" />
      </g>
      <path d={BRAIN} fill="none" stroke={C.propLine} strokeWidth={LW + 2} strokeLinejoin="round" />
      <path d="M270 80 V430 M270 200c-30 0-46-20-60-40 M270 300c34 0 52 18 66 40 M200 300c-20 10-40 6-56-6 M340 190c22-8 40-2 54 10" stroke={C.propLine} strokeWidth={LW} fill="none" strokeLinecap="round" />
      {p.channel ? Array.from({ length: 7 }, (_, i) => <circle key={i} cx={270} cy={90 + ((i * 50 + t * 120) % 340)} r={7} fill={C.blue} />) : null}
      {thr ? Array.from({ length: 10 }, (_, i) => <circle key={`f${i}`} cx={270} cy={-60 + ((i * 64 + (t - p.through!.at) * 260) % 640)} r={10} fill={C.blue} />) : null}
    </svg>
  );
};

const interpolateColor = (q: number) => {
  const a = [0x8a, 0x8f, 0x99], b = [parseInt(C.blue.slice(1, 3), 16), parseInt(C.blue.slice(3, 5), 16), parseInt(C.blue.slice(5, 7), 16)];
  return `rgb(${a.map((x, i) => Math.round(x + (b[i] - x) * q)).join(",")})`;
};

// ---------- 播放器 ----------
const Player: React.FC<{ p: Extract<PropSpec, { kind: "player" }>; t: number }> = ({ p, t }) => {
  const pa = p.playAt ?? Infinity, d = p.dur ?? 6;
  const q = t > pa ? Math.min(1, (t - pa) / d) : 0;
  const sec = Math.floor(q * d * 10);
  return (
    <svg width={800} height={520} viewBox="0 0 800 520" style={{ filter: shadowF }}>
      <rect x={10} y={10} width={780} height={500} rx={30} fill={C.propBody} stroke={C.propLine} strokeWidth={LW} />
      <rect x={40} y={40} width={720} height={360} rx={18} fill={C.propBody2} />
      {q === 0 ? <path d="M360 160 L460 220 L360 280 Z" fill={C.propLine} /> : <g>{[0, 1].map((k) => <rect key={k} x={355 + k * 50} y={170} width={30} height={100} rx={6} fill={C.propLine} opacity={0.85} />)}</g>}
      <rect x={40} y={440} width={560} height={14} rx={7} fill={C.propBody2} /><rect x={40} y={440} width={560 * q} height={14} rx={7} fill={C.blue} />
      <circle cx={40 + 560 * q} cy={447} r={14} fill={C.blue} />
      <text x={760} y={456} textAnchor="end" fontFamily={F.mono} fontWeight={700} fontSize={30} fill={C.propLine}>{`00:${String(Math.floor(sec / 10)).padStart(2, "0")}`}</text>
      {p.title ? <text x={60} y={90} fontFamily={F.cn} fontWeight={800} fontSize={34} fill={C.propLine}>{p.title}</text> : null}
    </svg>
  );
};

// ---------- 键盘 ----------
const Keyboard: React.FC<{ p: Extract<PropSpec, { kind: "keyboard" }>; t: number }> = ({ p, t }) => {
  const ta = p.typeAt ?? Infinity, d = p.dur ?? 2;
  const typing = t >= ta && t <= ta + d;
  const hit = typing ? Math.floor((t - ta) * 12) : -1;
  const keys: React.ReactNode[] = [];
  for (let r = 0; r < 4; r++) for (let c = 0; c < 11 - (r === 3 ? 4 : 0); c++) {
    const idx = r * 11 + c, lit = typing && ((hit * 7 + 3) % 40 === idx || (hit * 13 + 5) % 40 === idx);
    const w = r === 3 && c === 3 ? 300 : 62;
    const x = 40 + c * 72 + (r === 3 ? 72 * 1.5 : r * 18) + (r === 3 && c > 3 ? 238 : 0);
    keys.push(<rect key={idx} x={x} y={36 + r * 66} width={w} height={54} rx={10} fill={lit ? C.blue : C.propBody} stroke={C.propLine} strokeWidth={4} />);
  }
  return <svg width={860} height={320} viewBox="0 0 860 320" style={{ filter: shadowF }}><rect x={10} y={10} width={840} height={300} rx={28} fill={C.propBody2} stroke={C.propLine} strokeWidth={LW} />{keys}</svg>;
};

// ---------- 波形 + 剪段 ----------
const Waveform: React.FC<{ p: Extract<PropSpec, { kind: "waveform" }>; t: number }> = ({ p, t }) => {
  const N = 46, pa = p.playAt ?? Infinity, d = p.dur ?? 4;
  const head = t > pa ? ((t - pa) / d) % 1 : 0;
  const cut = p.cut, cutOn = cut && t >= cut.at, close = cut?.closeAt !== undefined ? prog(t, cut.closeAt, 0.4, easeInOut) : 0;
  const gapW = cut ? (cut.to - cut.from) * 800 : 0;
  return (
    <svg width={880} height={240} viewBox="0 0 880 240" style={{ filter: shadowF }}>
      <rect x={10} y={10} width={860} height={220} rx={26} fill={C.propBody} stroke={C.propLine} strokeWidth={LW} />
      {Array.from({ length: N }, (_, i) => {
        const u = i / N; const inCut = cut && u >= cut.from && u < cut.to;
        if (inCut && close > 0.05) return null;
        const x = 40 + u * 800 - (cut && u >= cut.to ? gapW * close : 0);
        const h = 30 + Math.abs(Math.sin(i * 1.7) * 60 + Math.sin(i * 0.6 + t * 4) * 20);
        return <rect key={i} x={x} y={120 - h / 2} width={11} height={h} rx={5} fill={inCut && cutOn ? C.red : C.blue} opacity={inCut && cutOn ? 1 - close : 1} />;
      })}
      <rect x={40 + head * 800} y={30} width={5} height={180} fill={C.propLine} />
    </svg>
  );
};

const Scissors: React.FC<{ p: Extract<PropSpec, { kind: "scissors" }>; t: number }> = ({ p, t }) => {
  const sn = p.snipAt !== undefined ? Math.sin(Math.min(1, Math.max(0, (t - p.snipAt) / 0.3)) * Math.PI) : 0;
  return (
    <svg width={240} height={240} viewBox="0 0 240 240" style={{ filter: shadowF }}>
      <g transform={`rotate(${-sn * 16} 120 120)`}><line x1={80} y1={90} x2={210} y2={170} stroke={C.propLine} strokeWidth={14} strokeLinecap="round" /><circle cx={62} cy={78} r={30} fill={C.propBody} stroke={C.propLine} strokeWidth={LW} /></g>
      <g transform={`rotate(${sn * 16} 120 120)`}><line x1={80} y1={150} x2={210} y2={70} stroke={C.propLine} strokeWidth={14} strokeLinecap="round" /><circle cx={62} cy={162} r={30} fill={C.red} stroke={C.propLine} strokeWidth={LW} /></g>
    </svg>
  );
};

// ---------- 小人 / 人群 ----------
const PersonShape: React.FC<{ x: number; y: number; s?: number; color?: string; variant?: string; bob?: number }> = ({ x, y, s = 1, color, variant = "plain", bob = 0 }) => (
  <g transform={`translate(${x} ${y + bob}) scale(${s})`}>
    <circle cx={0} cy={-150} r={52} fill={C.propBody} stroke={C.propLine} strokeWidth={LW} />
    <path d="M-90 40 C-90 -60 -50 -86 0 -86 C50 -86 90 -60 90 40 Z" fill={color ?? C.propBody2} stroke={C.propLine} strokeWidth={LW} strokeLinejoin="round" />
    {variant === "cap" ? <g><path d="M-70 -196 L0 -226 L70 -196 L0 -168 Z" fill={C.propLine} /><line x1={58} y1={-196} x2={58} y2={-160} stroke={C.yellow} strokeWidth={6} /></g> : null}
    {variant === "tie" ? <path d="M0 -84 L14 -60 L6 10 L0 20 L-6 10 L-14 -60 Z" fill={C.red} stroke={C.propLine} strokeWidth={4} /> : null}
    {variant === "crown" ? <path d="M-44 -196 L-44 -230 L-22 -210 L0 -240 L22 -210 L44 -230 L44 -196 Z" fill={C.yellow} stroke={C.propLine} strokeWidth={5} strokeLinejoin="round" /> : null}
    {variant === "helmet" ? <path d="M-56 -158 A56 56 0 0 1 56 -158 L66 -150 L-66 -150 Z" fill={C.yellow} stroke={C.propLine} strokeWidth={5} /> : null}
  </g>
);
const Person: React.FC<{ p: Extract<PropSpec, { kind: "person" }>; t: number; tone?: string }> = ({ p, t, tone }) => (
  <svg width={260} height={400} viewBox="0 0 260 400" style={{ filter: shadowF, overflow: "visible" }}>
    <PersonShape x={130} y={290} color={tone ? accent(tone) : undefined} variant={p.variant} bob={Math.sin(t * 2.2) * 3} />
    {p.label ? <text x={130} y={385} textAnchor="middle" fontFamily={F.cn} fontWeight={800} fontSize={34} fill={C.cardText}>{p.label}</text> : null}
  </svg>
);
const Crowd: React.FC<{ p: Extract<PropSpec, { kind: "crowd" }>; t: number }> = ({ p, t }) => {
  const n = p.n ?? 18, cols = 6, sq = p.squeezeAt !== undefined ? prog(t, p.squeezeAt, 0.8, easeInOut) : 0;
  const boxW = 800 - 300 * sq, boxX = 430 - boxW / 2;
  return (
    <svg width={860} height={560} viewBox="0 0 860 560" style={{ filter: shadowF, overflow: "visible" }}>
      <rect x={boxX} y={60} width={boxW} height={430} rx={30} fill="none" stroke={C.propLine} strokeWidth={LW} strokeDasharray={sq > 0 ? "18 12" : undefined} />
      {Array.from({ length: n }, (_, i) => {
        const r = Math.floor(i / cols), c = i % cols, gx = (boxW - 60) / (cols - 1);
        const jit = sq * Math.sin(i * 2.3 + t * 5) * 1.5; // 挤压时轻微躁动，别抖得太凶
        return <PersonShape key={i} x={boxX + 30 + c * gx + jit} y={170 + r * 120 + (c % 2) * sq * 18} s={0.42 - sq * 0.06} color={(p.highlight ?? []).includes(i) ? C.red : undefined} bob={Math.sin(t * 2 + i) * 2} />;
      })}
      {p.label ? <text x={430} y={540} textAnchor="middle" fontFamily={F.cn} fontWeight={800} fontSize={38} fill={C.cardText}>{p.label}</text> : null}
    </svg>
  );
};

// ---------- 机器人（原创通用方块造型） ----------
const Robot: React.FC<{ p: Extract<PropSpec, { kind: "robot" }>; t: number }> = ({ p, t }) => {
  const on = p.powerAt !== undefined ? prog(t, p.powerAt, 0.4) : 0;
  const ride = p.rideAt !== undefined ? prog(t, p.rideAt, 0.5, easeInOut) : 0;
  const eye = on > 0 ? C.blue : C.propBody2;
  return (
    <svg width={540} height={700} viewBox="0 0 540 700" style={{ filter: shadowF, overflow: "visible" }}>
      {on > 0 ? <circle cx={270} cy={300} r={260} fill={C.blue} opacity={0.08 * on + 0.04 * Math.sin(t * 4) * on} /> : null}
      <line x1={270} y1={40} x2={270} y2={90} stroke={C.propLine} strokeWidth={LW} /><circle cx={270} cy={34} r={14} fill={on && Math.floor(t * 2) % 2 ? C.red : C.propBody2} stroke={C.propLine} strokeWidth={5} />
      <rect x={140} y={90} width={260} height={170} rx={40} fill={C.propBody} stroke={C.propLine} strokeWidth={LW} />
      <rect x={180} y={140} width={60} height={50} rx={14} fill={eye} stroke={C.propLine} strokeWidth={5} /><rect x={300} y={140} width={60} height={50} rx={14} fill={eye} stroke={C.propLine} strokeWidth={5} />
      <rect x={220} y={215} width={100} height={12} rx={6} fill={C.propLine} />
      <rect x={110} y={280} width={320} height={230} rx={44} fill={C.propBody2} stroke={C.propLine} strokeWidth={LW} />
      <rect x={200} y={320} width={140} height={110} rx={22} fill={C.propScreen} stroke={C.propLine} strokeWidth={5} />
      {ride > 0 ? <PersonShape x={270} y={420 - 20 * (1 - ride)} s={0.3} color={C.yellow} /> : null}
      <rect x={40} y={300} width={56} height={180} rx={26} fill={C.propBody} stroke={C.propLine} strokeWidth={LW} transform={`rotate(${Math.sin(t * 2) * 4 * on} 68 300)`} />
      <rect x={444} y={300} width={56} height={180} rx={26} fill={C.propBody} stroke={C.propLine} strokeWidth={LW} transform={`rotate(${-Math.sin(t * 2) * 4 * on} 472 300)`} />
      <rect x={160} y={510} width={80} height={110} rx={24} fill={C.propBody} stroke={C.propLine} strokeWidth={LW} /><rect x={300} y={510} width={80} height={110} rx={24} fill={C.propBody} stroke={C.propLine} strokeWidth={LW} />
      {p.label ? <text x={270} y={690} textAnchor="middle" fontFamily={F.cn} fontWeight={800} fontSize={34} fill={C.cardText}>{p.label}</text> : null}
    </svg>
  );
};

const Building: React.FC<{ p: Extract<PropSpec, { kind: "building" }>; t: number }> = ({ p, t }) => (
  <svg width={440} height={560} viewBox="0 0 440 560" style={{ filter: shadowF }}>
    <rect x={60} y={60} width={320} height={440} rx={20} fill={C.propBody} stroke={C.propLine} strokeWidth={LW} />
    {Array.from({ length: 15 }, (_, i) => { const lit = p.lightsAt !== undefined && t > p.lightsAt + i * 0.05; return <rect key={i} x={100 + (i % 3) * 90} y={100 + Math.floor(i / 3) * 70} width={60} height={44} rx={8} fill={lit ? C.yellow : C.propBody2} stroke={C.propLine} strokeWidth={4} />; })}
    <rect x={180} y={430} width={80} height={70} rx={8} fill={C.propBody2} stroke={C.propLine} strokeWidth={5} />
    {p.label ? <text x={220} y={545} textAnchor="middle" fontFamily={F.cn} fontWeight={800} fontSize={34} fill={C.cardText}>{p.label}</text> : null}
  </svg>
);

// ---------- 天平 ----------
const Scale: React.FC<{ p: Extract<PropSpec, { kind: "scale" }>; t: number }> = ({ p, t }) => {
  const tilt = seq(t, p.tilt, 0, 0.6) * 14 + Math.sin(t * 1.6) * 1.2;
  const pan = (x: number, lab: string, dy: number) => (
    <g transform={`translate(${x} ${dy})`}>
      <line x1={0} y1={0} x2={-80} y2={150} stroke={C.propLine} strokeWidth={4} /><line x1={0} y1={0} x2={80} y2={150} stroke={C.propLine} strokeWidth={4} />
      <path d="M-120 150 H120 A120 40 0 0 1 -120 150 Z" fill={C.propBody2} stroke={C.propLine} strokeWidth={LW} />
      <text x={0} y={136} textAnchor="middle" fontFamily={F.cn} fontWeight={900} fontSize={40} fill={C.cardText}>{lab}</text>
    </g>
  );
  const a = (tilt * Math.PI) / 180, L = 300;
  return (
    <svg width={820} height={560} viewBox="0 0 820 560" style={{ filter: shadowF, overflow: "visible" }}>
      <path d="M410 120 L410 500 M300 520 H520" stroke={C.propLine} strokeWidth={LW + 3} strokeLinecap="round" />
      <g transform={`rotate(${tilt} 410 120)`}><rect x={100} y={110} width={620} height={20} rx={10} fill={C.propBody} stroke={C.propLine} strokeWidth={LW} /></g>
      {pan(410 - L * Math.cos(a), p.left, 120 - L * Math.sin(a))}
      {pan(410 + L * Math.cos(a), p.right, 120 + L * Math.sin(a))}
      <circle cx={410} cy={120} r={22} fill={C.yellow} stroke={C.propLine} strokeWidth={LW} />
    </svg>
  );
};

// ---------- 折线 ----------
const Chart: React.FC<{ p: Extract<PropSpec, { kind: "chart" }>; t: number }> = ({ p, t }) => {
  const q = prog(t, p.drawAt ?? 0, p.dur ?? 1.4, easeInOut);
  const pts = p.points.map((v, i) => [80 + (i / (p.points.length - 1)) * 720, 470 - v * 380] as const);
  const path = pts.map((pt, i) => `${i ? "L" : "M"}${pt[0]},${pt[1]}`).join(" ");
  const len = pts.reduce((a, pt, i) => (i ? a + Math.hypot(pt[0] - pts[i - 1][0], pt[1] - pts[i - 1][1]) : 0), 0);
  const k = Math.min(pts.length - 1, Math.floor(q * (pts.length - 1))), f = q * (pts.length - 1) - k;
  const head = k < pts.length - 1 ? [pts[k][0] + (pts[k + 1][0] - pts[k][0]) * f, pts[k][1] + (pts[k + 1][1] - pts[k][1]) * f] : pts[pts.length - 1];
  const col = p.down ? C.red : C.blue;
  return (
    <svg width={880} height={560} viewBox="0 0 880 560" style={{ filter: shadowF }}>
      <rect x={10} y={10} width={860} height={540} rx={30} fill={C.cardBg} stroke={C.cardLine} strokeWidth={2} />
      {[0, 1, 2, 3].map((i) => <line key={i} x1={80} x2={800} y1={110 + i * 120} y2={110 + i * 120} stroke={C.cardLine} strokeWidth={2} />)}
      <path d={path} fill="none" stroke={col} strokeWidth={10} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={len} strokeDashoffset={len * (1 - q)} />
      {q > 0 ? <circle cx={head[0]} cy={head[1]} r={16 + Math.sin(t * 6) * 2} fill={col} stroke="#fff" strokeWidth={5} /> : null}
      {p.label && q > 0.95 ? <text x={head[0] - 10} y={head[1] - 34} textAnchor="end" fontFamily={F.cn} fontWeight={900} fontSize={42} fill={col}>{p.label}</text> : null}
    </svg>
  );
};

// ---------- 百格图 ----------
const Waffle: React.FC<{ p: Extract<PropSpec, { kind: "waffle" }>; t: number; tone?: string }> = ({ p, t, tone }) => {
  const q = prog(t, p.at ?? 0, p.dur ?? 1.2, Easing.out(Easing.cubic));
  const n = Math.round(p.value * q);
  return (
    <svg width={640} height={720} viewBox="0 0 640 720" style={{ filter: shadowF }}>
      <rect x={10} y={10} width={620} height={700} rx={30} fill={C.cardBg} stroke={C.cardLine} strokeWidth={2} />
      {Array.from({ length: 100 }, (_, i) => { const r = Math.floor(i / 10), c = i % 10, on = i < n; return <rect key={i} x={50 + c * 55} y={50 + (9 - r) * 55} width={44} height={44} rx={10} fill={on ? accent(tone ?? "blue") : C.slot} transform={on && i === n - 1 ? `translate(${50 + c * 55 + 22} ${50 + (9 - r) * 55 + 22}) scale(1.15) translate(${-(50 + c * 55 + 22)} ${-(50 + (9 - r) * 55 + 22)})` : undefined} />; })}
      <text x={50} y={670} fontFamily={F.num} fontWeight={900} fontSize={64} fill={accent(tone ?? "blue")}>{n}%</text>
      {p.label ? <text x={590} y={668} textAnchor="end" fontFamily={F.cn} fontWeight={800} fontSize={34} fill={C.cardText}>{p.label}</text> : null}
    </svg>
  );
};

const Battery: React.FC<{ p: Extract<PropSpec, { kind: "battery" }>; t: number }> = ({ p, t }) => {
  const lv = Math.max(0, Math.min(1, seq(t, p.level, 1, 0.8)));
  const col = lv < 0.2 ? C.red : lv < 0.5 ? C.yellow : C.green;
  const blink = lv < 0.2 && Math.floor(t * 3.5) % 2 ? 0.4 : 1;
  return (
    <svg width={560} height={280} viewBox="0 0 560 280" style={{ filter: shadowF }}>
      <rect x={20} y={30} width={460} height={200} rx={36} fill={C.propBody} stroke={C.propLine} strokeWidth={LW + 2} />
      <rect x={490} y={95} width={40} height={70} rx={12} fill={C.propLine} />
      <rect x={46} y={56} width={408 * lv} height={148} rx={20} fill={col} opacity={blink} />
      <text x={250} y={152} textAnchor="middle" fontFamily={F.num} fontWeight={900} fontSize={70} fill={C.cardText}>{Math.round(lv * 100)}%</text>
      {p.label ? <text x={250} y={272} textAnchor="middle" fontFamily={F.cn} fontWeight={800} fontSize={32} fill={C.cardText}>{p.label}</text> : null}
    </svg>
  );
};

const Pool: React.FC<{ p: Extract<PropSpec, { kind: "pool" }>; t: number }> = ({ p, t }) => {
  const lv = Math.max(0, Math.min(1, seq(t, p.level, 0.2, 1.2)));
  const y = 460 - lv * 330;
  const flowing = p.inflowAt !== undefined && t >= p.inflowAt && (p.inflowStop === undefined || t < p.inflowStop);
  return (
    <svg width={640} height={560} viewBox="0 0 640 560" style={{ filter: shadowF, overflow: "visible" }}>
      <defs><clipPath id="poolclip"><path d="M90 110 L130 470 Q320 500 510 470 L550 110 Z" /></clipPath></defs>
      <path d="M90 110 L130 470 Q320 500 510 470 L550 110 Z" fill={C.propBody} />
      <g clipPath="url(#poolclip)"><path d={`M60 560 L60 ${y} ${Array.from({ length: 12 }, (_, i) => `L${60 + i * 50} ${y + Math.sin(t * 3 + i) * 7}`).join(" ")} L620 ${y} L620 560 Z`} fill={C.blue} opacity={0.9} /></g>
      <path d="M90 110 L130 470 Q320 500 510 470 L550 110" fill="none" stroke={C.propLine} strokeWidth={LW + 2} strokeLinejoin="round" />
      {flowing ? Array.from({ length: 8 }, (_, i) => <circle key={i} cx={320 + Math.sin(i) * 6} cy={((i * 45 + t * 260) % 360) - 40} r={10} fill={C.blue} />) : null}
      {p.diveAt !== undefined && t >= p.diveAt - 0.6 ? (() => {
        const u = t - p.diveAt; // 0 时刻头碰池底
        const fall = interpolate(u, [-0.6, 0], [0, 1], { ...clamp, easing: Easing.in(Easing.quad) });
        const bottom = 452, hy = interpolate(fall, [0, 1], [-260, bottom - 30]);
        const hx = interpolate(fall, [0, 1], [220, 330]);
        const rot = interpolate(fall, [0, 0.4, 1], [-40, 150, 180]);
        const squash = u > 0 ? 1 - 0.12 * Math.exp(-u * 8) * Math.cos(u * 30) : 1;
        return (
          <g>
            <g transform={`translate(${hx} ${hy}) rotate(${rot}) scale(1 ${squash})`}>
              <circle cx={0} cy={-58} r={26} fill={C.propBody} stroke={C.propLine} strokeWidth={LW} />
              <rect x={-20} y={-34} width={40} height={74} rx={18} fill={C.yellow} stroke={C.propLine} strokeWidth={LW} />
              <path d={`M-10 38 L${-24 - (u > 0 ? Math.sin(u * 14) * 10 : 0)} 104 M10 38 L${24 + (u > 0 ? Math.sin(u * 14 + 1) * 10 : 0)} 104`} stroke={C.propLine} strokeWidth={LW + 3} strokeLinecap="round" />
            </g>
            {u > 0 ? [0, 1, 2].map((k) => { const a = t * 3 + (k * Math.PI * 2) / 3; return <path key={k} d="M0 -14 L4 -4 L14 -4 L6 3 L9 13 L0 7 L-9 13 L-6 3 L-14 -4 L-4 -4 Z" fill={C.yellow} stroke={C.propLine} strokeWidth={3} transform={`translate(${hx + Math.cos(a) * 70} ${bottom - 60 + Math.sin(a) * 18})`} opacity={Math.min(1, u * 4)} />; }) : null}
            {u > 0 && u < 0.6 ? [0, 1, 2, 3].map((k) => <circle key={`d${k}`} cx={hx - 60 + k * 40} cy={bottom - 20 - Math.sin(Math.min(1, u / 0.6) * Math.PI) * (60 + k * 10)} r={9} fill={C.blue} />) : null}
          </g>
        );
      })() : null}
      {p.label ? <text x={320} y={545} textAnchor="middle" fontFamily={F.cn} fontWeight={800} fontSize={36} fill={C.cardText}>{p.label}</text> : null}
    </svg>
  );
};

const Bulb: React.FC<{ p: Extract<PropSpec, { kind: "bulb" }>; t: number }> = ({ p, t }) => {
  const on = p.onAt !== undefined ? prog(t, p.onAt, 0.25) : 0;
  return (
    <svg width={320} height={440} viewBox="0 0 320 440" style={{ filter: shadowF, overflow: "visible" }}>
      {on > 0 ? Array.from({ length: 8 }, (_, i) => { const a = (i / 8) * Math.PI * 2; const r1 = 150, r2 = 150 + 30 * on + Math.sin(t * 5 + i) * 6; return <line key={i} x1={160 + Math.cos(a) * r1} y1={150 + Math.sin(a) * r1} x2={160 + Math.cos(a) * r2} y2={150 + Math.sin(a) * r2} stroke={C.yellow} strokeWidth={10} strokeLinecap="round" />; }) : null}
      <path d="M160 30 A120 120 0 0 1 230 245 L220 300 H100 L90 245 A120 120 0 0 1 160 30 Z" fill={on > 0 ? C.yellow : C.propBody} stroke={C.propLine} strokeWidth={LW} />
      <rect x={100} y={300} width={120} height={70} rx={14} fill={C.propBody2} stroke={C.propLine} strokeWidth={LW} />
    </svg>
  );
};

const Gauge: React.FC<{ p: Extract<PropSpec, { kind: "gauge" }>; t: number }> = ({ p, t }) => {
  const v = p.to * prog(t, p.at ?? 0, 1.1, easeInOut) + Math.sin(t * 7) * 0.008;
  const a = Math.PI * (1 - v);
  const col = v > 0.8 ? C.red : v > 0.5 ? C.yellow : C.green;
  return (
    <svg width={560} height={380} viewBox="0 0 560 380" style={{ filter: shadowF }}>
      <path d="M60 300 A220 220 0 0 1 500 300" fill="none" stroke={C.slot} strokeWidth={40} strokeLinecap="round" />
      <path d="M60 300 A220 220 0 0 1 500 300" fill="none" stroke={col} strokeWidth={40} strokeLinecap="round" strokeDasharray={691} strokeDashoffset={691 * (1 - v)} />
      <line x1={280} y1={300} x2={280 + Math.cos(a) * 180} y2={300 - Math.sin(a) * 180} stroke={C.propLine} strokeWidth={12} strokeLinecap="round" />
      <circle cx={280} cy={300} r={24} fill={C.propLine} />
      <text x={280} y={372} textAnchor="middle" fontFamily={F.num} fontWeight={900} fontSize={48} fill={C.cardText}>{Math.round(v * 100)}%{p.label ? ` ${p.label}` : ""}</text>
    </svg>
  );
};

// ---------- App 界面 + 鼠标 ----------
const App: React.FC<{ p: Extract<PropSpec, { kind: "app" }>; t: number }> = ({ p, t }) => {
  const sz = propSize(p);
  const add = p.addAt !== undefined ? prog(t, p.addAt, 0.25) : 0;
  const tog = p.toggleAt !== undefined ? prog(t, p.toggleAt, 0.2) : 0;
  let cx = sz.w * 0.8, cy = sz.h + 40, click = 0;
  for (const k of p.cursor ?? []) {
    const q = prog(t, k.at - 0.45, 0.45, easeInOut);
    cx = interpolate(q, [0, 1], [cx, k.x * sz.w]); cy = interpolate(q, [0, 1], [cy, k.y * sz.h]);
    if (k.click && t >= k.at && t < k.at + 0.2) click = 1;
  }
  return (
    <svg width={sz.w} height={sz.h} viewBox={`0 0 ${sz.w} ${sz.h}`} style={{ filter: shadowF, overflow: "visible" }}>
      <rect x={6} y={6} width={sz.w - 12} height={sz.h - 12} rx={28} fill={C.cardBg} stroke={C.propLine} strokeWidth={5} />
      <rect x={6} y={6} width={sz.w - 12} height={80} rx={28} fill={C.propBody2} />
      {["#FF5F57", "#FEBC2E", "#28C840"].map((c, i) => <circle key={c} cx={46 + i * 34} cy={46} r={11} fill={c} />)}
      {p.title ? <text x={sz.w / 2} y={58} textAnchor="middle" fontFamily={F.cn} fontWeight={800} fontSize={30} fill={C.cardText}>{p.title}</text> : null}
      {p.rows.map((r, i) => (
        <g key={i}>
          <rect x={40} y={116 + i * 96} width={sz.w - 80} height={72} rx={16} fill={C.slot} />
          <text x={66} y={162 + i * 96} fontFamily={F.cn} fontWeight={700} fontSize={32} fill={C.cardText}>{r}</text>
          {i === p.rows.length - 1 && p.toggleAt !== undefined ? (
            <g><rect x={sz.w - 170} y={130 + i * 96} width={100} height={46} rx={23} fill={tog > 0.5 ? C.green : C.cardLine} /><circle cx={sz.w - 147 + 54 * tog} cy={153 + i * 96} r={19} fill="#fff" /></g>
          ) : null}
        </g>
      ))}
      {add > 0 ? (
        <g transform={`translate(${sz.w / 2} ${130 + p.rows.length * 96 + 30}) scale(${add < 0.6 ? 0.4 + add : 1.2 - (add - 0.6) * 0.5}) translate(${-sz.w / 2} ${-(130 + p.rows.length * 96 + 30)})`} opacity={Math.min(1, add * 2)}>
          <rect x={sz.w / 2 - 150} y={100 + p.rows.length * 96 + 20} width={300} height={76} rx={38} fill={C.blue} />
          <text x={sz.w / 2} y={150 + p.rows.length * 96 + 20} textAnchor="middle" fontFamily={F.cn} fontWeight={900} fontSize={34} fill="#fff">{p.addLabel ?? "新按钮"}</text>
        </g>
      ) : null}
      {p.cursor?.length ? (
        <g transform={`translate(${cx} ${cy}) scale(${click ? 0.85 : 1})`}>
          {click ? <circle r={36} fill={C.blue} opacity={0.25} /> : null}
          <path d="M0 0 L0 56 L15 42 L26 66 L37 61 L26 38 L46 38 Z" fill="#fff" stroke={C.propLine} strokeWidth={4} strokeLinejoin="round" />
        </g>
      ) : null}
    </svg>
  );
};

const Code: React.FC<{ p: Extract<PropSpec, { kind: "code" }>; t: number }> = ({ p, t }) => {
  const sz = propSize(p);
  return (
    <div style={{ width: sz.w, height: sz.h, borderRadius: 24, background: C.cardBg, border: `2px solid ${C.cardLine}`, boxShadow: C.shadow, overflow: "hidden", fontFamily: F.mono }}>
      <div style={{ height: 60, display: "flex", alignItems: "center", gap: 10, padding: "0 22px", background: C.propBody2 }}>
        {["#FF5F57", "#FEBC2E", "#28C840"].map((x) => <div key={x} style={{ width: 16, height: 16, borderRadius: 8, background: x }} />)}
        <span style={{ marginLeft: 12, color: C.cardSub, fontSize: 22 }}>{p.title ?? "main.java"}</span>
      </div>
      <div style={{ padding: "24px 28px" }}>
        {p.lines.map((ln, i) => {
          if (t < ln.at) return null;
          const n = Math.floor((t - ln.at) * 22);
          return (
            <div key={i} style={{ height: 56, display: "flex", alignItems: "center", fontSize: 28, color: C.cardText, whiteSpace: "pre" }}>
              <span style={{ color: C.cardFaint, width: 44 }}>{i + 1}</span>
              <span style={{ color: i % 3 === 0 ? C.purple : i % 3 === 1 ? C.blue : C.cardText }}>{[...ln.text].slice(0, n).join("")}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ---------- 点阵对比（对标"83% vs 11%"那种） ----------
const Dots: React.FC<{ p: Extract<PropSpec, { kind: "dots" }>; t: number; born: number }> = ({ p, t, born }) => {
  const sz = propSize(p);
  return (
    <div style={{ width: sz.w, height: sz.h, borderRadius: 30, background: C.cardBg, border: `1px solid ${C.cardLine}`, boxShadow: C.shadow, padding: "28px 36px", boxSizing: "border-box" }}>
      {p.title ? <div style={{ fontFamily: F.cn, fontWeight: 800, fontSize: 38, color: C.cardText, height: 70 }}>{p.title}</div> : null}
      {p.rows.map((r, i) => {
        const total = r.total ?? 18, on = Math.round((r.value / 100) * total);
        const at = r.at ?? born + 0.2 + i * 0.4;
        const lit = Math.floor(Math.max(0, (t - at) / 0.045));
        const col = accent(r.tone ?? (i === 0 ? "red" : "blue"));
        const shown = Math.min(on, lit);
        return (
          <div key={i} style={{ height: 130 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <span style={{ fontFamily: F.cn, fontWeight: 700, fontSize: 32, color: C.cardText }}>{r.label}</span>
              <span style={{ fontFamily: F.num, fontWeight: 900, fontSize: 60, color: col }}>{on ? Math.round((r.value * shown) / on) : 0}%</span>
            </div>
            <div style={{ display: "flex", gap: 9, marginTop: 8 }}>
              {Array.from({ length: total }, (_, k) => <div key={k} style={{ width: 34, height: 34, borderRadius: 17, background: k < shown ? col : C.slot, transform: k === shown - 1 ? "scale(1.2)" : undefined }} />)}
            </div>
          </div>
        );
      })}
      {p.foot ? <div style={{ fontFamily: F.mono, fontSize: 16, letterSpacing: 2.5, color: C.cardFaint, textTransform: "uppercase", marginTop: 6 }}>{p.foot}</div> : null}
    </div>
  );
};

const Coins: React.FC<{ p: Extract<PropSpec, { kind: "coins" }>; t: number }> = ({ p, t }) => {
  const n = p.count ?? 6, q = prog(t, p.at ?? 0, p.dur ?? 1, Easing.out(Easing.cubic));
  const k = Math.round(n * q);
  return (
    <svg width={420} height={420} viewBox="0 0 420 420" style={{ filter: shadowF, overflow: "visible" }}>
      {Array.from({ length: k }, (_, i) => <g key={i} transform={`translate(0 ${-i * 34})`}><ellipse cx={210} cy={350} rx={130} ry={40} fill={C.yellow} stroke={C.propLine} strokeWidth={LW} /><path d="M80 350 v-16 a130 40 0 0 1 260 0 v16" fill={C.yellow} stroke={C.propLine} strokeWidth={LW} /></g>)}
      {p.label ? <text x={210} y={415} textAnchor="middle" fontFamily={F.cn} fontWeight={800} fontSize={34} fill={C.cardText}>{p.label}</text> : null}
    </svg>
  );
};

// ---------- 阀门（流走 → 留住） ----------
const Valve: React.FC<{ p: Extract<PropSpec, { kind: "valve" }>; t: number }> = ({ p, t }) => {
  const c = p.closeAt !== undefined ? prog(t, p.closeAt, 0.08) : 0;
  const pop = p.closeAt !== undefined ? 1 + Math.sin(prog(t, p.closeAt, 0.2) * Math.PI) * 0.12 : 1;
  return (
    <svg width={300} height={200} viewBox="0 0 300 200" style={{ filter: shadowF, overflow: "visible" }}>
      <g transform={`translate(150 90) scale(${pop}) translate(-150 -90)`}>
        {c < 0.5 ? <g><rect x={40} y={60} width={220} height={60} rx={30} fill={C.propBody2} stroke={C.propLine} strokeWidth={LW} /><circle cx={150} cy={90} r={14} fill={C.propLine} /></g>
          : <g><rect x={80} y={30} width={140} height={120} rx={24} fill={C.cyan} stroke={C.propLine} strokeWidth={LW} /><rect x={142} y={46} width={16} height={88} rx={8} fill="#fff" /><circle cx={150} cy={90} r={14} fill={C.propLine} /></g>}
      </g>
      {p.label ? <text x={150} y={192} textAnchor="middle" fontFamily={F.cn} fontWeight={800} fontSize={30} fill={c >= 0.5 ? C.cyan : C.red}>{p.label}</text> : null}
    </svg>
  );
};

// ---------- 喇叭 ----------
const Speaker: React.FC<{ p: Extract<PropSpec, { kind: "speaker" }>; t: number }> = ({ p, t }) => {
  const on = (p.from === undefined || t >= p.from) && (p.until === undefined || t < p.until);
  return (
    <svg width={340} height={300} viewBox="0 0 340 300" style={{ filter: shadowF, overflow: "visible" }}>
      <circle cx={110} cy={150} r={96} fill={C.propBody} stroke={C.propLine} strokeWidth={LW} />
      <circle cx={110} cy={150} r={56} fill={C.propBody2} stroke={C.propLine} strokeWidth={LW} /><circle cx={110} cy={150} r={20} fill={C.propLine} />
      {on ? [0, 1, 2].map((i) => { const ph = ((t * 1.6 + i / 3) % 1); return <path key={i} d={`M ${230 + ph * 60} ${80 - ph * 30} Q ${270 + ph * 80} 150 ${230 + ph * 60} ${220 + ph * 30}`} fill="none" stroke={C.propLine} strokeWidth={LW} strokeLinecap="round" opacity={1 - ph} />; }) : null}
    </svg>
  );
};

// ---------- 加工机 + 传送带（原料进 → 处理框 → 新版本出） ----------
const Machine: React.FC<{ p: Extract<PropSpec, { kind: "machine" }>; t: number }> = ({ p, t }) => {
  const fa = p.feedAt ?? Infinity, oa = p.outAt ?? fa + 0.8;
  const inX = interpolate(t, [fa, fa + 0.45], [40, 330], { ...clamp, easing: easeInOut });
  const inVis = t < fa + 0.45;
  const outQ = prog(t, oa, 0.35);
  const belt = (t * 120) % 60;
  return (
    <svg width={920} height={640} viewBox="0 0 920 640" style={{ filter: shadowF, overflow: "visible", opacity: p.grey ? 0.45 : 1 }}>
      <rect x={40} y={500} width={840} height={56} rx={28} fill={C.propBody2} stroke={C.propLine} strokeWidth={LW} />
      <defs><clipPath id="beltclip"><rect x={44} y={504} width={832} height={48} rx={24} /></clipPath><clipPath id="boxclip"><rect x={0} y={0} width={340} height={640} /></clipPath></defs>
      <g clipPath="url(#beltclip)">{Array.from({ length: 16 }, (_, i) => <rect key={i} x={i * 60 - belt} y={518} width={30} height={20} rx={6} fill={C.propLine} opacity={0.25} />)}</g>
      <rect x={330} y={60} width={260} height={440} rx={30} fill={C.propBody} stroke={C.propLine} strokeWidth={LW} />
      <text x={460} y={130} textAnchor="middle" fontFamily={F.cn} fontWeight={900} fontSize={42} fill={C.cardText}>{p.name}</text>
      {p.sub ? <text x={460} y={176} textAnchor="middle" fontFamily={F.cn} fontWeight={700} fontSize={28} fill={C.cardSub}>{p.sub}</text> : null}
      <rect x={360} y={220} width={200} height={240} rx={18} fill={C.propLine} />
      {[0, 1, 2].map((i) => <path key={i} d={`M ${410 + i * 40} 300 l 26 40 l -26 40`} fill="none" stroke={C.cyan} strokeWidth={10} strokeLinecap="round" strokeLinejoin="round" opacity={0.35 + 0.65 * ((Math.floor(t * 6) - i + 30) % 3 === 0 ? 1 : 0)} />)}
      {inVis ? <g clipPath="url(#boxclip)"><g transform={`translate(${inX - 40} 0)`}><rect x={60} y={330} width={150} height={170} rx={16} fill={C.cardBg} stroke={C.propLine} strokeWidth={5} /><rect x={80} y={370} width={100} height={12} rx={6} fill={C.red} opacity={0.7} /><rect x={80} y={400} width={80} height={12} rx={6} fill={C.cardFaint} />{p.inLabel ? <text x={135} y={310} textAnchor="middle" fontFamily={F.cn} fontWeight={800} fontSize={28} fill={C.red}>{p.inLabel}</text> : null}</g></g> : null}
      {outQ > 0 ? <g transform={`translate(${interpolate(outQ, [0, 1], [-200, 0])} 0)`} opacity={Math.min(1, outQ * 3)}><rect x={650} y={330} width={160} height={170} rx={16} fill={C.cardBg} stroke={C.propLine} strokeWidth={5} /><rect x={670} y={370} width={110} height={12} rx={6} fill={C.cyan} /><rect x={670} y={400} width={90} height={12} rx={6} fill={C.cardFaint} />{p.outLabel ? <text x={730} y={310} textAnchor="middle" fontFamily={F.cn} fontWeight={800} fontSize={28} fill={C.cyan}>{p.outLabel}</text> : null}</g> : null}
    </svg>
  );
};

// ---------- 3D 立柱 ----------
const Bars3d: React.FC<{ p: Extract<PropSpec, { kind: "bars3d" }>; t: number }> = ({ p, t }) => {
  const max = Math.max(...p.items.map((i) => i.value)), n = p.items.length, gap = 760 / n;
  return (
    <svg width={880} height={640} viewBox="0 0 880 640" style={{ overflow: "visible" }}>
      {p.items.map((it, i) => {
        const q = prog(t, (p.at ?? 0) + i * (p.stagger ?? 0.08), 0.6, Easing.out(Easing.cubic));
        const h = (it.value / max) * 420 * q, x = 70 + i * gap, w = gap * 0.58, d = 26;
        const col = i === n - 1 ? C.yellow : C.blue;
        return (
          <g key={i}>
            <path d={`M${x} ${540 - h} L${x + d} ${540 - h - d} L${x + w + d} ${540 - h - d} L${x + w} ${540 - h} Z`} fill={col} opacity={0.65} />
            <path d={`M${x + w} ${540 - h} L${x + w + d} ${540 - h - d} L${x + w + d} ${540 - d} L${x + w} 540 Z`} fill={col} opacity={0.45} />
            <rect x={x} y={540 - h} width={w} height={h} fill={col} />
            <text x={x + w / 2} y={530 - h - d - 14} textAnchor="middle" fontFamily={F.num} fontWeight={900} fontSize={40} fill={C.cardText} opacity={q}>{Math.round(it.value * q)}{p.unit ?? ""}</text>
            <text x={x + w / 2} y={590} textAnchor="middle" fontFamily={F.cn} fontWeight={800} fontSize={28} fill={C.cardSub}>{it.label}</text>
          </g>
        );
      })}
      <line x1={50} y1={540} x2={850} y2={540} stroke={C.propLine} strokeWidth={5} />
    </svg>
  );
};

// ---------- 知识星座网（铺满 → 点亮 → 扩圈 → 坍缩成金币） ----------
const NET = Array.from({ length: 26 }, (_, i) => { const a = i * 2.39996, r = 120 + ((i * 97) % 300); return [440 + Math.cos(a) * r, 440 + Math.sin(a) * r * 0.92] as [number, number]; });
const Network: React.FC<{ p: Extract<PropSpec, { kind: "network" }>; t: number }> = ({ p, t }) => {
  const g = prog(t, p.growAt ?? 0, 1.4, easeInOut);
  const col = p.collapseAt !== undefined ? prog(t, p.collapseAt, 0.25, Easing.in(Easing.cubic)) : 0;
  const coin = p.collapseAt !== undefined ? prog(t, p.collapseAt + 0.22, 0.25) : 0;
  const ringR = (p.rings ?? []).filter((r) => t >= r).length;
  return (
    <svg width={880} height={880} viewBox="0 0 880 880" style={{ overflow: "visible" }}>
      {Array.from({ length: ringR }, (_, k) => { const q = prog(t, p.rings![k], 0.2); return <circle key={k} cx={440} cy={440} r={(150 + k * 90) * q * (1 - col)} fill="none" stroke={C.yellow} strokeWidth={k === ringR - 1 ? 6 : 3} opacity={0.9} />; })}
      {NET.map(([x, y], i) => {
        const vis = g * NET.length > i ? 1 : 0;
        const [nx, ny] = [x + (440 - x) * col, y + (440 - y) * col];
        const [mx, my] = NET[(i * 7 + 3) % NET.length];
        const inRing = ringR && Math.hypot(x - 440, y - 440) < 150 + (ringR - 1) * 90;
        return vis ? (
          <g key={i} opacity={1 - col}>
            <line x1={nx} y1={ny} x2={mx + (440 - mx) * col} y2={my + (440 - my) * col} stroke={C.cardFaint} strokeWidth={2} opacity={0.6} />
            <circle cx={nx} cy={ny} r={9 + Math.sin(t * 2 + i) * 1.5} fill={inRing ? C.cyan : C.cardFaint} />
          </g>
        ) : null;
      })}
      {(p.lights ?? []).map((l, i) => {
        const q = prog(t, l.at, 0.13), [x, y] = NET[(i * 5 + 2) % NET.length];
        if (q <= 0 || col > 0.5) return null;
        return <g key={`l${i}`} opacity={1 - col}><circle cx={x} cy={y} r={18} fill={C.yellow} /><g transform={`translate(${x} ${y - 46}) scale(${q < 0.6 ? 0.4 + q : 1.2 - (q - 0.6) * 0.5})`}><rect x={-90} y={-30} width={180} height={56} rx={28} fill={C.cardBg} stroke={C.propLine} strokeWidth={3} /><text x={0} y={9} textAnchor="middle" fontFamily={F.cn} fontWeight={800} fontSize={28} fill={C.cardText}>{l.label}</text></g></g>;
      })}
      {coin <= 0 ? <g><circle cx={440} cy={440} r={86} fill={C.propBody} stroke={C.propLine} strokeWidth={LW} /><text x={440} y={452} textAnchor="middle" fontFamily={F.cn} fontWeight={900} fontSize={34} fill={C.cardText}>{p.center}</text></g>
        : <g transform={`translate(440 440) scale(${coin < 0.6 ? 0.3 + coin * 1.25 : 1.05 - (coin - 0.6) * 0.12})`}><circle r={120} fill={C.yellow} stroke={C.propLine} strokeWidth={LW} /><circle r={92} fill="none" stroke={C.propLine} strokeWidth={3} /><text y={16} textAnchor="middle" fontFamily={F.cn} fontWeight={900} fontSize={46} fill={C.ink}>{p.coin ?? "成果"}</text></g>}
    </svg>
  );
};

// ---------- 竖向流程节点线 ----------
const Steps: React.FC<{ p: Extract<PropSpec, { kind: "steps" }>; t: number }> = ({ p, t }) => {
  const sz = propSize(p);
  const act = p.activeAt.filter((a) => t >= a).length;
  const fill = p.activeAt.length ? interpolate(t, [p.activeAt[0], p.activeAt[p.activeAt.length - 1] + 0.2], [0, 1], clamp) : 0;
  return (
    <svg width={sz.w} height={sz.h} viewBox={`0 0 ${sz.w} ${sz.h}`} style={{ overflow: "visible" }}>
      <line x1={110} y1={100} x2={110} y2={100 + (p.items.length - 1) * 140} stroke={C.slot} strokeWidth={10} strokeLinecap="round" />
      <line x1={110} y1={100} x2={110} y2={100 + (p.items.length - 1) * 140 * fill} stroke={C.cyan} strokeWidth={10} strokeLinecap="round" />
      {p.items.map((it, i) => {
        const on = i < act, q = on ? prog(t, p.activeAt[i], 0.13) : 0;
        return (
          <g key={i}>
            <circle cx={110} cy={100 + i * 140} r={44 * (on ? (q < 0.6 ? 0.8 + q * 0.5 : 1.1 - (q - 0.6) * 0.25) : 1)} fill={on ? C.cyan : C.cardBg} stroke={C.propLine} strokeWidth={5} />
            <text x={110} y={114 + i * 140} textAnchor="middle" fontFamily={F.num} fontWeight={900} fontSize={36} fill={on ? "#fff" : C.cardFaint}>{String(i + 1).padStart(2, "0")}</text>
            <text x={190} y={114 + i * 140} fontFamily={F.cn} fontWeight={800} fontSize={46} fill={on ? C.cardText : C.cardFaint}>{it.label}</text>
          </g>
        );
      })}
    </svg>
  );
};

// ---------- 计时环 / 进度环 ----------
const Ring: React.FC<{ p: Extract<PropSpec, { kind: "ring" }>; t: number }> = ({ p, t }) => {
  const v = p.to * interpolate(t, [p.at ?? 0, (p.at ?? 0) + (p.dur ?? 1.6)], [0, 1], { ...clamp, easing: Easing.inOut(Easing.sin) });
  const C2 = 2 * Math.PI * 170;
  return (
    <svg width={480} height={520} viewBox="0 0 480 520" style={{ filter: shadowF, overflow: "visible" }}>
      <circle cx={240} cy={230} r={200} fill={C.propBody} stroke={C.propLine} strokeWidth={LW} />
      <circle cx={240} cy={230} r={170} fill="none" stroke={C.slot} strokeWidth={28} />
      <circle cx={240} cy={230} r={170} fill="none" stroke={C.cyan} strokeWidth={28} strokeLinecap="round" strokeDasharray={C2} strokeDashoffset={C2 * (1 - v)} transform="rotate(-90 240 230)" />
      <text x={240} y={258} textAnchor="middle" fontFamily={F.num} fontWeight={900} fontSize={84} fill={C.cardText}>{p.center}</text>
      {p.label ? <text x={240} y={505} textAnchor="middle" fontFamily={F.cn} fontWeight={800} fontSize={34} fill={C.cardText}>{p.label}</text> : null}
    </svg>
  );
};

// ---------- 图标道具（Tabler） ----------
type IconEl = [string, Record<string, string>];
const ICONS = iconData as unknown as Record<string, IconEl[]>;
export const TablerIcon: React.FC<{ name: string; size: number; color: string; width?: number }> = ({ name, size, color, width = 2 }) => {
  const els = ICONS[name] ?? ICONS["help-circle"] ?? [];
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" style={{ overflow: "visible" }}>
      {els.map(([tag, a], i) => React.createElement(tag, { key: i, ...a }))}
    </svg>
  );
};
const IconProp: React.FC<{ p: Extract<PropSpec, { kind: "icon" }>; t: number; tone?: string }> = ({ p, t, tone }) => {
  const a = p.anim ?? "bob";
  const tr = a === "bob" ? `translateY(${Math.sin(t * 2.4) * 6}px)` : a === "spin" ? `rotate(${t * 90}deg)` : a === "shake" ? `rotate(${Math.sin(t * 18) * 6}deg)` : a === "pulse" ? `scale(${1 + Math.sin(t * 5) * 0.05})` : "none";
  const col = tone ? accent(tone) : C.blue;
  return (
    <div style={{ width: 320, height: p.label ? 380 : 320, display: "flex", flexDirection: "column", alignItems: "center", filter: shadowF }}>
      <div style={{ width: 300, height: 300, borderRadius: 70, background: p.tile === false ? "transparent" : C.propBody, border: p.tile === false ? "none" : `${LW}px solid ${C.propLine}`, display: "grid", placeItems: "center" }}>
        <div style={{ transform: tr }}><TablerIcon name={p.name} size={p.tile === false ? 280 : 200} color={p.tile === false ? col : C.propLine} width={p.tile === false ? 1.8 : 1.9} /></div>
      </div>
      {p.label ? <div style={{ marginTop: 14, fontFamily: F.cn, fontWeight: 800, fontSize: 38, color: C.cardText }}>{p.label}</div> : null}
    </div>
  );
};

// ---------- 跑轮（内卷：拼命跑、原地不动） ----------
const Wheel: React.FC<{ p: Extract<PropSpec, { kind: "wheel" }>; t: number }> = ({ p, t }) => {
  const run = p.runAt !== undefined && t >= p.runAt && (p.stopAt === undefined || t < p.stopAt);
  const ang = run ? (t - p.runAt!) * 220 : 0, leg = run ? Math.sin((t - p.runAt!) * 18) : 0;
  return (
    <svg width={640} height={680} viewBox="0 0 640 680" style={{ filter: shadowF, overflow: "visible" }}>
      <path d="M320 330 L170 640 M320 330 L470 640 M130 640 H510" stroke={C.propLine} strokeWidth={LW + 3} strokeLinecap="round" />
      <circle cx={320} cy={330} r={270} fill={C.propBody} stroke={C.propLine} strokeWidth={LW + 3} />
      <g transform={`rotate(${ang} 320 330)`}>
        {Array.from({ length: 24 }, (_, i) => { const a = (i / 24) * Math.PI * 2; return <line key={i} x1={320 + Math.cos(a) * 240} y1={330 + Math.sin(a) * 240} x2={320 + Math.cos(a) * 262} y2={330 + Math.sin(a) * 262} stroke={C.propLine} strokeWidth={6} />; })}
        {Array.from({ length: 6 }, (_, i) => { const a = (i / 6) * Math.PI * 2; return <line key={`s${i}`} x1={320} y1={330} x2={320 + Math.cos(a) * 240} y2={330 + Math.sin(a) * 240} stroke={C.propBody2} strokeWidth={8} />; })}
      </g>
      <circle cx={320} cy={330} r={22} fill={C.propLine} />
      <g transform={`translate(320 520) scale(1.7) rotate(${run ? -10 : 0})`}>
        <circle cx={10} cy={-120} r={30} fill={C.propBody} stroke={C.propLine} strokeWidth={LW} />
        <path d="M0 -88 L-6 -10" stroke={C.propLine} strokeWidth={LW + 6} strokeLinecap="round" />
        <path d={`M-6 -10 L${-30 * leg} 50 M-6 -10 L${30 * leg} 50`} stroke={C.red} strokeWidth={LW + 4} strokeLinecap="round" />
        <path d={`M0 -70 L${36 * leg} -30 M0 -70 L${-36 * leg} -30`} stroke={C.propLine} strokeWidth={LW + 1} strokeLinecap="round" />
        {run ? [0, 1].map((k) => <circle key={k} cx={52 + k * 14} cy={-150 + ((t * 120 + k * 30) % 60)} r={6} fill={C.blue} opacity={0.8} />) : null}
      </g>
      {p.label ? <text x={320} y={676} textAnchor="middle" fontFamily={F.cn} fontWeight={800} fontSize={36} fill={C.cardText}>{p.label}</text> : null}
    </svg>
  );
};

// ---------- 跷跷板（杠杆 / 此消彼长） ----------
const Seesaw: React.FC<{ p: Extract<PropSpec, { kind: "seesaw" }>; t: number }> = ({ p, t }) => {
  const tilt = seq(t, p.tilt, 0, 0.5) * 16 + Math.sin(t * 2) * 0.8;
  const drop = p.dropAt !== undefined ? prog(t, p.dropAt, 0.35, Easing.in(Easing.quad)) : 0;
  return (
    <svg width={860} height={460} viewBox="0 0 860 460" style={{ filter: shadowF, overflow: "visible" }}>
      <path d="M430 300 L340 420 H520 Z" fill={C.yellow} stroke={C.propLine} strokeWidth={LW} strokeLinejoin="round" />
      <g transform={`rotate(${tilt} 430 290)`}>
        <rect x={60} y={272} width={740} height={30} rx={15} fill={C.propBody} stroke={C.propLine} strokeWidth={LW} />
        <g><rect x={90} y={182} width={170} height={90} rx={18} fill={C.propBody2} stroke={C.propLine} strokeWidth={LW} /><text x={175} y={240} textAnchor="middle" fontFamily={F.cn} fontWeight={900} fontSize={40} fill={C.cardText}>{p.left}</text></g>
        <g transform={`translate(0 ${-260 * (1 - drop)})`} opacity={p.dropAt !== undefined ? Math.min(1, drop * 3) : 1}><rect x={600} y={182} width={170} height={90} rx={18} fill={C.red} stroke={C.propLine} strokeWidth={LW} /><text x={685} y={240} textAnchor="middle" fontFamily={F.cn} fontWeight={900} fontSize={40} fill="#fff">{p.right}</text></g>
      </g>
    </svg>
  );
};

// ---------- 漏斗（筛选 / 转化 / 溢出） ----------
const Funnel: React.FC<{ p: Extract<PropSpec, { kind: "funnel" }>; t: number }> = ({ p, t }) => {
  const on = p.inAt !== undefined && t >= p.inAt && (p.until === undefined || t < p.until);
  const ov = p.overflowAt !== undefined ? prog(t, p.overflowAt, 0.4) : 0;
  const passEvery = Math.max(1, Math.round(1 / Math.max(0.05, p.pass ?? 0.2)));
  return (
    <svg width={620} height={700} viewBox="0 0 620 700" style={{ filter: shadowF, overflow: "visible" }}>
      <path d="M60 140 L560 140 L370 430 L370 560 L250 600 L250 430 Z" fill={C.propBody} stroke={C.propLine} strokeWidth={LW + 2} strokeLinejoin="round" />
      {on ? Array.from({ length: 18 }, (_, i) => { const ph = ((t - p.inAt!) * 0.9 + i / 18) % 1; const x = 110 + ((i * 137) % 400); const passing = i % passEvery === 0;
        const y = ph * 640 - 40, cx = y < 140 ? x : passing ? x + (310 - x) * Math.min(1, (y - 140) / 290) : x + (310 - x) * Math.min(0.75, (y - 140) / 290);
        if (!passing && y > 330) return ov > 0 ? <circle key={i} cx={x < 310 ? 60 - (y - 330) * 0.4 : 560 + (y - 330) * 0.4} cy={140 + (y - 330) * 0.8} r={12} fill={C.red} opacity={ov} /> : null;
        return <circle key={i} cx={cx} cy={y} r={12} fill={passing ? C.cyan : C.blue} />; }) : null}
      {p.topLabel ? <text x={310} y={110} textAnchor="middle" fontFamily={F.cn} fontWeight={800} fontSize={36} fill={C.cardText}>{p.topLabel}</text> : null}
      {p.outLabel ? <text x={310} y={680} textAnchor="middle" fontFamily={F.cn} fontWeight={900} fontSize={38} fill={C.cyan}>{p.outLabel}</text> : null}
    </svg>
  );
};

// ---------- 联动齿轮（协作 / 替代：中间那个被换掉） ----------
const gearPath = (r: number, teeth: number) => Array.from({ length: teeth * 2 }, (_, i) => { const a = (i / (teeth * 2)) * Math.PI * 2, rr = i % 2 ? r : r + 26; const a2 = a + Math.PI / teeth; return `${i ? "L" : "M"}${Math.cos(a) * rr},${Math.sin(a) * rr} L${Math.cos(a2 - 0.08) * rr},${Math.sin(a2 - 0.08) * rr}`; }).join(" ") + " Z";
const Gears: React.FC<{ p: Extract<PropSpec, { kind: "gears" }>; t: number }> = ({ p, t }) => {
  const spin = p.spinAt !== undefined && t >= p.spinAt && (p.stopAt === undefined || t < p.stopAt) ? (t - p.spinAt) * 60 : 0;
  const rep = p.replaceAt !== undefined ? prog(t, p.replaceAt, 0.5, easeInOut) : 0;
  const G = (cx: number, r: number, dir: number, fill: string, lab?: string, dy = 0, op = 1) => (
    <g transform={`translate(${cx} ${280 + dy})`} opacity={op}>
      <g transform={`rotate(${spin * dir})`}><path d={gearPath(r, Math.round(r / 14))} fill={fill} stroke={C.propLine} strokeWidth={LW} strokeLinejoin="round" /><circle r={r * 0.35} fill={C.propBody2} stroke={C.propLine} strokeWidth={LW} /></g>
      {lab ? <text y={r + 70} textAnchor="middle" fontFamily={F.cn} fontWeight={800} fontSize={34} fill={C.cardText}>{lab}</text> : null}
    </g>
  );
  const L = p.labels ?? ["", "", ""];
  return (
    <svg width={860} height={560} viewBox="0 0 860 560" style={{ filter: shadowF, overflow: "visible" }}>
      {G(190, 120, 1, C.propBody, L[0])}
      {G(430, 105, -1.14, C.propBody, L[1], rep * 420, 1 - rep)}
      {rep > 0 ? G(430, 105, -1.14, C.cyan, p.replaceLabel ?? "AI", -420 * (1 - rep)) : null}
      {G(666, 120, 1, C.propBody, L[2])}
    </svg>
  );
};

// ---------- 雪球（复利：越滚越大） ----------
const Snowball: React.FC<{ p: Extract<PropSpec, { kind: "snowball" }>; t: number }> = ({ p, t }) => {
  const q = prog(t, p.rollAt ?? 0, p.dur ?? 2.4, Easing.in(Easing.quad));
  const x = 120 + q * 620, y = 120 + q * 300, r = 26 + q * 110;
  return (
    <svg width={880} height={560} viewBox="0 0 880 560" style={{ filter: shadowF, overflow: "visible" }}>
      <path d="M40 150 L860 470 L860 540 L40 540 Z" fill={C.propBody2} stroke={C.propLine} strokeWidth={LW} strokeLinejoin="round" />
      <path d={`M120 ${146} L${x} ${y + 26}`} stroke={C.blue} strokeWidth={10 + q * 30} strokeLinecap="round" opacity={0.25} />
      <g transform={`translate(${x} ${y - r + 26}) rotate(${q * 900})`}><circle r={r} fill="#fff" stroke={C.propLine} strokeWidth={LW} /><path d={`M${-r * 0.5} ${-r * 0.2} q ${r * 0.3} ${-r * 0.3} ${r * 0.6} 0`} stroke={C.cardFaint} strokeWidth={5} fill="none" /></g>
      {p.label ? <text x={140} y={110} fontFamily={F.cn} fontWeight={800} fontSize={34} fill={C.cardText}>{p.label}</text> : null}
      {p.endLabel && q >= 1 ? <text x={720} y={y - 2 * r - 10} textAnchor="middle" fontFamily={F.cn} fontWeight={900} fontSize={46} fill={C.blue}>{p.endLabel}</text> : null}
    </svg>
  );
};

// ---------- 金字塔（塔尖只站得下一个） ----------
const Pyramid: React.FC<{ p: Extract<PropSpec, { kind: "pyramid" }>; t: number }> = ({ p, t }) => {
  const climb = p.climbAt !== undefined ? prog(t, p.climbAt, 1.0, easeInOut) : 0;
  const top = p.topAt !== undefined ? prog(t, p.topAt, 0.3) : 0;
  const slide = p.slideAt !== undefined ? prog(t, p.slideAt, 0.7, Easing.in(Easing.quad)) : 0;
  const tiers = [[440, 120, 120], [440, 260, 300], [440, 400, 480], [440, 540, 660]];
  const climbers = [[-1, 0.62], [1, 0.55], [-1, 0.4], [1, 0.3], [-1, 0.75], [1, 0.82]];
  return (
    <svg width={880} height={760} viewBox="0 0 880 760" style={{ filter: shadowF, overflow: "visible" }}>
      {top > 0 ? <circle cx={440} cy={110} r={110 + Math.sin(t * 4) * 6} fill={C.yellow} opacity={0.25 * top} /> : null}
      <path d="M440 90 L800 660 L80 660 Z" fill={C.propBody} stroke={C.propLine} strokeWidth={LW + 2} strokeLinejoin="round" />
      {tiers.slice(1).map(([cx, y, w], i) => <line key={i} x1={cx - w / 2 + 10} y1={y} x2={cx + w / 2 - 10} y2={y} stroke={C.propLine} strokeWidth={4} opacity={0.5} />)}
      {climbers.map(([side, h], i) => {
        const hh = Math.min(h, climb * (0.55 + i * 0.08));
        const fallen = i < 5 ? slide : 0; // 塔尖站不下：除了最后一个，都滑下去
        const lift = hh * (1 - fallen);
        const y = 640 - lift * 470, halfW = ((y - 90) / 570) * 360;
        const x = 440 + side * (halfW * 0.62 + (fallen > 0.85 ? (fallen - 0.85) * 900 : 0));
        return <PersonShape key={i} x={x} y={y + (fallen > 0.85 ? (fallen - 0.85) * 300 : 0)} s={0.26} color={i % 2 ? C.propBody2 : C.blue} bob={Math.sin(t * 6 + i) * 3} />;
      })}
      {top > 0 ? <g transform={`translate(440 ${150 - 30 * top})`}><PersonShape x={0} y={0} s={0.34 * (top < 0.6 ? 0.6 + top : 1.2 - (top - 0.6) * 0.5)} color={C.yellow} variant="crown" /></g> : null}
      {p.topLabel && top > 0 ? <text x={600} y={130} fontFamily={F.cn} fontWeight={900} fontSize={40} fill={C.cardText} opacity={top}>{p.topLabel}</text> : null}
      {p.label ? <text x={440} y={730} textAnchor="middle" fontFamily={F.cn} fontWeight={800} fontSize={38} fill={C.cardText}>{p.label}</text> : null}
    </svg>
  );
};

// ---------- 一排小人挨个套上机甲（"人人都"） ----------
const Squad: React.FC<{ p: Extract<PropSpec, { kind: "squad" }>; t: number }> = ({ p, t }) => {
  const n = p.n ?? 5, gap = 820 / n;
  return (
    <svg width={900} height={460} viewBox="0 0 900 460" style={{ filter: shadowF, overflow: "visible" }}>
      {Array.from({ length: n }, (_, i) => {
        const at = p.armorAt?.[i] ?? Infinity, q = prog(t, at, 0.18);
        const cx = 40 + gap * (i + 0.5), base = 360;
        const s = q < 0.6 ? 0.6 + q * 0.95 : 1.17 - (q - 0.6) * 0.42;
        return (
          <g key={i}>
            {q <= 0 ? <PersonShape x={cx} y={base} s={0.42} bob={Math.sin(t * 2 + i) * 2} />
              : <g transform={`translate(${cx} ${base - 90}) scale(${s})`}>
                  <rect x={-58} y={-120} width={116} height={86} rx={24} fill={C.propBody} stroke={C.propLine} strokeWidth={LW} />
                  <rect x={-38} y={-96} width={28} height={24} rx={7} fill={C.cyan} /><rect x={10} y={-96} width={28} height={24} rx={7} fill={C.cyan} />
                  <rect x={-70} y={-24} width={140} height={110} rx={28} fill={C.propBody2} stroke={C.propLine} strokeWidth={LW} />
                  <circle cx={0} cy={30} r={22} fill={C.yellow} stroke={C.propLine} strokeWidth={5} />
                  <rect x={-50} y={86} width={34} height={60} rx={14} fill={C.propBody} stroke={C.propLine} strokeWidth={LW} /><rect x={16} y={86} width={34} height={60} rx={14} fill={C.propBody} stroke={C.propLine} strokeWidth={LW} />
                  {q < 1 ? <circle r={150 * q} cy={0} fill="none" stroke={C.cyan} strokeWidth={8} opacity={1 - q} /> : null}
                </g>}
          </g>
        );
      })}
      {p.label ? <text x={450} y={450} textAnchor="middle" fontFamily={F.cn} fontWeight={800} fontSize={38} fill={C.cardText}>{p.label}</text> : null}
    </svg>
  );
};

export const PropView: React.FC<{ p: PropSpec; t: number; born: number; tone?: string }> = ({ p, t, born, tone }) => {
  switch (p.kind) {
    case "camera": return <Camera p={p} t={t} />;
    case "brain": return <Brain p={p} t={t} />;
    case "player": return <Player p={p} t={t} />;
    case "keyboard": return <Keyboard p={p} t={t} />;
    case "waveform": return <Waveform p={p} t={t} />;
    case "scissors": return <Scissors p={p} t={t} />;
    case "person": return <Person p={p} t={t} tone={tone} />;
    case "crowd": return <Crowd p={p} t={t} />;
    case "robot": return <Robot p={p} t={t} />;
    case "building": return <Building p={p} t={t} />;
    case "scale": return <Scale p={p} t={t} />;
    case "chart": return <Chart p={p} t={t} />;
    case "waffle": return <Waffle p={p} t={t} tone={tone} />;
    case "battery": return <Battery p={p} t={t} />;
    case "pool": return <Pool p={p} t={t} />;
    case "bulb": return <Bulb p={p} t={t} />;
    case "gauge": return <Gauge p={p} t={t} />;
    case "app": return <App p={p} t={t} />;
    case "code": return <Code p={p} t={t} />;
    case "dots": return <Dots p={p} t={t} born={born} />;
    case "coins": return <Coins p={p} t={t} />;
    case "valve": return <Valve p={p} t={t} />;
    case "speaker": return <Speaker p={p} t={t} />;
    case "machine": return <Machine p={p} t={t} />;
    case "bars3d": return <Bars3d p={p} t={t} />;
    case "network": return <Network p={p} t={t} />;
    case "steps": return <Steps p={p} t={t} />;
    case "ring": return <Ring p={p} t={t} />;
    case "icon": return <IconProp p={p} t={t} tone={tone} />;
    case "wheel": return <Wheel p={p} t={t} />;
    case "seesaw": return <Seesaw p={p} t={t} />;
    case "funnel": return <Funnel p={p} t={t} />;
    case "gears": return <Gears p={p} t={t} />;
    case "snowball": return <Snowball p={p} t={t} />;
    case "pyramid": return <Pyramid p={p} t={t} />;
    case "squad": return <Squad p={p} t={t} />;
  }
};
