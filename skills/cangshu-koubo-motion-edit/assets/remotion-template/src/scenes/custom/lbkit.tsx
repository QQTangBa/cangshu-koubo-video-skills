import React from "react";
import { F } from "../../theme";
import { T, TH } from "./toon";

// 样例道具（动画片画风：暖棕描边、平涂 + 一点高光、圆乎乎）
// 贯穿全片的主角：「控制感罐」—— 一只装金色液体的玻璃罐，液面 = 控制感。

/** 控制感罐：level 0–1；crack 裂缝漏液；glow 满了发光 */
export const Jar: React.FC<{ w?: number; h?: number; level: number; t: number; label?: string; color?: string; crack?: number; glow?: number; leak?: number; lid?: boolean }> =
  ({ w = 220, h = 280, level, t, label, color = T.gold, crack = 0, glow = 0, leak = 0, lid = true }) => {
    const lv = Math.max(0, Math.min(1, level));
    const top = 34, bot = h - 10, inner = bot - top - 12;
    const ly = bot - 6 - inner * lv;
    const wav = (k: number) => Array.from({ length: 13 }, (_, i) => { const x = 18 + ((w - 36) * i) / 12; return `${i ? "L" : "M"}${x} ${ly + Math.sin(t * 3.2 + i * 0.9 + k) * 4}`; }).join(" ");
    return (
      <div style={{ position: "relative", width: w, height: h + (label ? 56 : 0) }}>
        <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ position: "absolute", overflow: "visible" }}>
          {glow > 0 ? <ellipse cx={w / 2} cy={h * 0.55} rx={w * 0.75} ry={h * 0.62} fill="#FFE38A" opacity={0.45 * glow} /> : null}
          <defs><clipPath id={`jc${w}${h}`}><rect x="16" y={top} width={w - 32} height={bot - top} rx="34" /></clipPath></defs>
          <rect x="16" y={top} width={w - 32} height={bot - top} rx="34" fill="rgba(255,255,255,0.55)" />
          {lv > 0.005 ? <g clipPath={`url(#jc${w}${h})`}>
            <path d={`${wav(0)} L${w - 18} ${bot} L18 ${bot} Z`} fill={color} />
            <path d={`${wav(1.7)}`} stroke="rgba(255,255,255,0.6)" strokeWidth="4" fill="none" />
            {[0, 1, 2].map((i) => <circle key={i} cx={w * (0.3 + i * 0.2)} cy={bot - 10 - ((t * 40 + i * 37) % Math.max(10, inner * lv))} r={4 + i} fill="rgba(255,255,255,0.5)" />)}
          </g> : null}
          <rect x="16" y={top} width={w - 32} height={bot - top} rx="34" fill="none" stroke={T.ink} strokeWidth="4" />
          <rect x="30" y={top + 18} width="10" height={(bot - top) * 0.55} rx="5" fill="rgba(255,255,255,0.75)" />
          {lid ? <rect x={w * 0.2} y={top - 26} width={w * 0.6} height="30" rx="10" fill={T.woodDark} stroke={T.ink} strokeWidth={TH.sw} /> : null}
          {crack > 0 ? <path d={`M${w * 0.7} ${bot - 30} L${w * 0.62} ${bot - 62} L${w * 0.72} ${bot - 86} L${w * 0.64} ${bot - 120}`} fill="none" stroke={T.ink} strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="120" strokeDashoffset={120 * (1 - crack)} /> : null}
          {leak > 0 ? [0, 1, 2].map((i) => { const p = ((t * 1.6 + i / 3) % 1); return <path key={i} d={`M${w * 0.7} ${bot - 24 + p * 70} c4 6 5 10 0 13 c-5 -3 -4 -7 0 -13 Z`} fill={color} stroke={T.ink} strokeWidth="2" opacity={leak * (1 - p)} />; }) : null}
        </svg>
        {label ? <div style={{ position: "absolute", left: 0, right: 0, top: h + 8, textAlign: "center" }}>
          <span style={{ display: "inline-block", padding: "4px 16px", borderRadius: 12, background: T.paper, border: `${TH.sw}px solid ${T.ink}`, fontFamily: F.cn, fontWeight: 700, fontSize: 32, color: T.ink }}>{label}</span>
        </div> : null}
      </div>
    );
  };

/** 2 升大水桶（带提手），level 0–1 */
export const Jug: React.FC<{ s?: number; level?: number; t: number; label?: string; tilt?: number }> = ({ s = 1, level = 0.85, t, label = "大水", tilt = 0 }) => {
  const W0 = 150, H0 = 260;
  const ly = 250 - 190 * level;
  return (
    <svg width={W0 * s} height={H0 * s} viewBox={`0 0 ${W0} ${H0}`} style={{ overflow: "visible", transform: `rotate(${tilt}deg)`, transformOrigin: "50% 60%" }}>
      <defs><clipPath id="jugc"><path d="M40 40 L110 40 L118 70 C140 80 142 100 142 120 L142 230 C142 248 130 254 112 254 L38 254 C20 254 8 248 8 230 L8 120 C8 100 10 80 32 70 Z" /></clipPath></defs>
      <path d="M40 40 L110 40 L118 70 C140 80 142 100 142 120 L142 230 C142 248 130 254 112 254 L38 254 C20 254 8 248 8 230 L8 120 C8 100 10 80 32 70 Z" fill="rgba(210,236,255,0.75)" />
      <g clipPath="url(#jugc)">
        <path d={`M0 ${ly + Math.sin(t * 3) * 3} Q37 ${ly - 6} 75 ${ly} T150 ${ly + Math.cos(t * 3) * 3} L150 260 L0 260 Z`} fill="#7CC4F5" />
        <rect x="18" y="120" width="12" height="110" rx="6" fill="rgba(255,255,255,0.6)" />
      </g>
      <path d="M40 40 L110 40 L118 70 C140 80 142 100 142 120 L142 230 C142 248 130 254 112 254 L38 254 C20 254 8 248 8 230 L8 120 C8 100 10 80 32 70 Z" fill="none" stroke={T.ink} strokeWidth="4" strokeLinejoin="round" />
      <rect x="46" y="14" width="58" height="30" rx="8" fill={T.sky} stroke={T.ink} strokeWidth={TH.sw} />
      <path d="M112 76 C150 60 158 120 138 128" fill="none" stroke={T.ink} strokeWidth="9" strokeLinecap="round" />
      <path d="M112 76 C150 60 158 120 138 128" fill="none" stroke={T.sky} strokeWidth="4" strokeLinecap="round" />
      <rect x="26" y="140" width="98" height="52" rx="10" fill={T.paper} stroke={T.ink} strokeWidth="3" />
      <text x="75" y="178" textAnchor="middle" fontFamily={F.cn} fontWeight="700" fontSize="30" fill={T.ink}>{label}</text>
    </svg>
  );
};

/** 哑铃 */
export const Dumbbell: React.FC<{ s?: number; rot?: number }> = ({ s = 1, rot = 0 }) => (
  <svg width={200 * s} height={90 * s} viewBox="0 0 200 90" style={{ overflow: "visible", transform: `rotate(${rot}deg)` }}>
    <rect x="50" y="38" width="100" height="14" rx="7" fill="#9AA3AD" stroke={T.ink} strokeWidth={TH.sw} />
    {[[14, 52], [148, 186]].map(([a, b], i) => <g key={i}>
      <rect x={a} y="8" width="22" height="74" rx="9" fill="#5B6270" stroke={T.ink} strokeWidth={TH.sw} />
      <rect x={a + (i ? -14 : 22)} y="18" width="16" height="54" rx="7" fill="#737B88" stroke={T.ink} strokeWidth={TH.sw} />
      <rect x={a + 5} y="14" width="5" height="40" rx="2.5" fill="rgba(255,255,255,0.35)" />
    </g>)}
  </svg>
);

/** 提神饮料瓶（原创造型，棕瓶 + 标签），tone: "fight" 红色战斗版 / "calm" 浅蓝安静版 */
export const Drink: React.FC<{ s?: number; tone?: "fight" | "calm"; label?: string; rot?: number }> = ({ s = 1, tone = "fight", label = "24H", rot = 0 }) => {
  const band = tone === "fight" ? T.red : "#9ED5E8";
  return (
    <svg width={90 * s} height={220 * s} viewBox="0 0 90 220" style={{ overflow: "visible", transform: `rotate(${rot}deg)`, transformOrigin: "50% 80%" }}>
      <rect x="31" y="6" width="28" height="18" rx="5" fill={T.gold} stroke={T.ink} strokeWidth={TH.sw} />
      <path d="M34 24 L56 24 L58 58 C80 70 84 86 84 104 L84 196 C84 208 76 214 64 214 L26 214 C14 214 6 208 6 196 L6 104 C6 86 10 70 32 58 Z" fill="#8A4B22" stroke={T.ink} strokeWidth="4" strokeLinejoin="round" />
      <rect x="6" y="112" width="78" height="66" fill={band} stroke={T.ink} strokeWidth={TH.sw} />
      <text x="45" y="156" textAnchor="middle" fontFamily={F.num} fontWeight="800" fontSize="28" fill={tone === "fight" ? "#fff" : T.ink}>{label}</text>
      <rect x="16" y="70" width="8" height="120" rx="4" fill="rgba(255,255,255,0.35)" />
    </svg>
  );
};

/** 旋钮：v 0–1 指针角度；locked 上锁（铁链 + 锁头）；tone 刻度主色 */
export const Knob: React.FC<{ size?: number; v: number; locked?: number; tone?: string; shake?: number }> = ({ size = 170, v, locked = 0, tone = T.teal, shake = 0 }) => {
  const a = -130 + 260 * Math.max(0, Math.min(1, v));
  return (
    <svg width={size} height={size} viewBox="-100 -100 200 200" style={{ overflow: "visible", transform: `rotate(${shake}deg)` }}>
      {Array.from({ length: 11 }, (_, i) => { const d = ((-130 + i * 26) * Math.PI) / 180; return <line key={i} x1={Math.sin(d) * 80} y1={-Math.cos(d) * 80} x2={Math.sin(d) * 94} y2={-Math.cos(d) * 94} stroke={i / 10 <= v ? tone : T.tick} strokeWidth="7" strokeLinecap="round" />; })}
      <circle r="66" fill={T.paper} stroke={T.ink} strokeWidth="4" />
      <g transform={`rotate(${a})`}>
        <circle r="48" fill={locked > 0.5 ? T.knobLocked : T.knob} stroke={T.ink} strokeWidth="4" />
        <rect x="-6" y="-46" width="12" height="32" rx="6" fill={T.ink} />
      </g>
      {locked > 0 ? <g opacity={locked}>
        <path d="M-84 -40 L84 40 M-84 40 L84 -40" stroke="#8B8F98" strokeWidth="13" strokeLinecap="round" strokeDasharray="16 7" />
        <path d="M-84 -40 L84 40 M-84 40 L84 -40" stroke={T.ink} strokeWidth="2" strokeLinecap="round" opacity="0.5" />
        <g transform="translate(0 46)">
          <path d="M-16 -14 L-16 -26 A16 16 0 0 1 16 -26 L16 -14" stroke={T.ink} strokeWidth="7" fill="none" />
          <rect x="-26" y="-16" width="52" height="40" rx="8" fill={T.gold} stroke={T.ink} strokeWidth={TH.sw} />
          <circle cy="0" r="5" fill={T.ink} />
        </g>
      </g> : null}
    </svg>
  );
};

/** 卡通小狗（原创）：pose stand / jump / lie；zap 0–1 被电时的白闪和炸毛 */
export const Dog: React.FC<{ x: number; feet: number; s?: number; t: number; pose?: "stand" | "jump" | "lie"; zap?: number; mood?: "ok" | "scared" | "sad" | "dizzy"; flip?: boolean; dy?: number; z?: number; op?: number }> =
  ({ x, feet, s = 1, t, pose = "stand", zap = 0, mood = "ok", flip, dy = 0, z, op = 1 }) => {
    if (op <= 0.001) return null;
    const lie = pose === "lie";
    const jitter = zap > 0 ? Math.sin(t * 90) * 3 * zap : 0;
    const tail = lie ? 0 : Math.sin(t * (mood === "ok" ? 12 : 3)) * (mood === "ok" ? 18 : 5);
    const breath = Math.sin(t * 2.4) * (lie ? 1.5 : 1);
    const body = zap > 0.3 ? "#FFF6D8" : "#F2C48D";
    const eyes = mood === "dizzy" ? (
      <g stroke={T.ink} strokeWidth="3" fill="none"><path d="M-22 -6 l8 8 m0 -8 l-8 8" /><path d="M8 -6 l8 8 m0 -8 l-8 8" /></g>
    ) : mood === "sad" ? (
      <g stroke={T.ink} strokeWidth="3.2" fill="none" strokeLinecap="round"><path d="M-23 0 Q-17 -4 -11 0" /><path d="M9 0 Q15 -4 21 0" /></g>
    ) : (
      <g fill={T.ink}><ellipse cx="-17" cy="-2" rx={mood === "scared" ? 6 : 5} ry={mood === "scared" ? 8 : 6.5} /><ellipse cx="15" cy="-2" rx={mood === "scared" ? 6 : 5} ry={mood === "scared" ? 8 : 6.5} /><circle cx="-15" cy="-5" r="2" fill="#fff" /><circle cx="17" cy="-5" r="2" fill="#fff" /></g>
    );
    return (
      <div style={{ position: "absolute", left: x - 120 * s + jitter, top: feet - 200 * s + dy, width: 240 * s, height: 210 * s, zIndex: z, opacity: op, transform: flip ? "scaleX(-1)" : undefined }}>
        <svg width={240 * s} height={210 * s} viewBox="-120 -200 240 210" style={{ overflow: "visible" }}>
          <ellipse cx="0" cy="4" rx="80" ry="10" fill="rgba(59,42,32,0.14)" />
          {zap > 0 ? <g stroke="#FFD23F" strokeWidth="5" strokeLinecap="round" opacity={zap}>{[0, 1, 2, 3, 4, 5].map((i) => { const a = (i / 6) * 6.28 + t * 3; return <line key={i} x1={Math.cos(a) * 95} y1={-70 + Math.sin(a) * 70} x2={Math.cos(a) * 118} y2={-70 + Math.sin(a) * 86} />; })}</g> : null}
          {lie ? (
            <g>
              <path d={`M-90 -4 C-96 -40 -60 -54 -10 -50 C40 -54 86 -44 88 -10 C90 0 80 4 60 4 L-70 4 C-84 4 -90 2 -90 -4 Z`} transform={`scale(1 ${1 + breath * 0.01})`} fill={body} stroke={T.ink} strokeWidth={TH.sw} />
              <path d="M70 -20 Q100 -14 110 -4" stroke={T.ink} strokeWidth="9" fill="none" strokeLinecap="round" /><path d="M70 -20 Q100 -14 110 -4" stroke={body} strokeWidth="4" fill="none" strokeLinecap="round" />
              <g transform="translate(-70 -34)">
                <circle r="40" fill={body} stroke={T.ink} strokeWidth={TH.sw} />
                <path d="M-34 -18 C-56 -10 -56 24 -38 30 C-30 20 -28 0 -24 -14 Z" fill="#B97C45" stroke={T.ink} strokeWidth="2.8" />
                <path d="M30 -24 C50 -20 54 12 40 22 C34 10 30 -4 22 -16 Z" fill="#B97C45" stroke={T.ink} strokeWidth="2.8" />
                <g transform="translate(0 4)">{eyes}</g>
                <ellipse cx="0" cy="16" rx="8" ry="5.5" fill={T.ink} />
              </g>
            </g>
          ) : (
            <g transform={pose === "jump" ? "rotate(-14 0 -60)" : undefined}>
              <path d={`M60 -80 Q${92 + tail * 0.3} ${-110 + tail} ${98 + tail * 0.4} ${-124 + tail * 0.6}`} stroke={T.ink} strokeWidth="10" fill="none" strokeLinecap="round" />
              <path d={`M60 -80 Q${92 + tail * 0.3} ${-110 + tail} ${98 + tail * 0.4} ${-124 + tail * 0.6}`} stroke={body} strokeWidth="5" fill="none" strokeLinecap="round" />
              {[-52, -24, 30, 56].map((lx, i) => <rect key={i} x={lx - 9} y={pose === "jump" ? -50 : -44} width="18" height={pose === "jump" ? 30 : 44} rx="8" fill={body} stroke={T.ink} strokeWidth={TH.sw} />)}
              <path d="M-70 -76 C-74 -104 -40 -112 0 -110 C40 -112 72 -104 70 -76 C68 -50 50 -40 0 -40 C-50 -40 -68 -50 -70 -76 Z" fill={body} stroke={T.ink} strokeWidth={TH.sw} />
              <ellipse cx="10" cy="-82" rx="22" ry="14" fill="#E8A866" opacity="0.7" />
              <g transform="translate(-64 -118)">
                <circle r="44" fill={body} stroke={T.ink} strokeWidth={TH.sw} />
                <path d="M-36 -22 C-60 -14 -60 26 -40 34 C-32 22 -30 0 -26 -16 Z" fill="#B97C45" stroke={T.ink} strokeWidth="2.8" />
                <path d="M32 -28 C54 -24 58 14 42 26 C36 12 32 -4 24 -18 Z" fill="#B97C45" stroke={T.ink} strokeWidth="2.8" />
                {eyes}
                <ellipse cx="-2" cy="18" rx="9" ry="6" fill={T.ink} />
                {mood === "scared" ? <ellipse cx="-2" cy="32" rx="7" ry="8" fill="#7A2E2A" stroke={T.ink} strokeWidth="2.4" /> : <path d="M-12 28 Q-2 34 8 28" stroke={T.ink} strokeWidth="3" fill="none" strokeLinecap="round" />}
                <ellipse cx="-28" cy="16" rx="8" ry="5" fill={T.blush} opacity="0.5" />
              </g>
            </g>
          )}
        </svg>
      </div>
    );
  };

/** 闪电 */
export const Bolt: React.FC<{ s?: number; op?: number }> = ({ s = 1, op = 1 }) => (
  <svg width={60 * s} height={110 * s} viewBox="0 0 60 110" style={{ overflow: "visible", opacity: op }}>
    <path d="M36 2 L6 62 L28 62 L18 108 L56 40 L32 40 L44 2 Z" fill="#FFD23F" stroke={T.ink} strokeWidth="3.4" strokeLinejoin="round" />
  </svg>
);

/** 彩票：n 个号码格，picked = 圈起来的格子序号；price 价签文字 */
export const Ticket: React.FC<{ w?: number; picked?: number[]; pk?: number; random?: boolean; title?: string }> = ({ w = 300, picked = [], pk = 1, random, title = "彩票 $1" }) => {
  const h = w * 0.62;
  const cells = Array.from({ length: 12 }, (_, i) => i);
  return (
    <div style={{ position: "relative", width: w, height: h }}>
      <svg width={w} height={h} viewBox="0 0 300 186" style={{ position: "absolute", overflow: "visible" }}>
        <path d="M10 6 L290 6 L290 70 A16 16 0 0 0 290 102 L290 180 L10 180 L10 102 A16 16 0 0 0 10 70 Z" fill="#FFF3C8" stroke={T.ink} strokeWidth="4" strokeLinejoin="round" />
        <line x1="60" y1="16" x2="60" y2="170" stroke={T.inkSoft} strokeWidth="2.5" strokeDasharray="6 6" />
        <text x="35" y="100" textAnchor="middle" fontFamily={F.num} fontWeight="800" fontSize="26" fill={T.red} transform="rotate(-90 35 94)">$1</text>
        {cells.map((i) => {
          const cx = 90 + (i % 6) * 34, cy = 70 + Math.floor(i / 6) * 50;
          const on = picked.indexOf(i);
          return <g key={i}>
            <rect x={cx - 13} y={cy - 16} width="26" height="32" rx="6" fill={random && [1, 4, 8, 11].includes(i) ? "#FFD9A8" : "#fff"} stroke={T.ink} strokeWidth="2.4" />
            <text x={cx} y={cy + 8} textAnchor="middle" fontFamily={F.num} fontWeight="700" fontSize="20" fill={T.ink}>{i + 1}</text>
            {on >= 0 ? <circle cx={cx} cy={cy} r="21" fill="none" stroke={T.red} strokeWidth="4" strokeDasharray="132" strokeDashoffset={132 * (1 - Math.max(0, Math.min(1, pk * picked.length - on)))} /> : null}
          </g>;
        })}
      </svg>
      <div style={{ position: "absolute", left: 70, top: 6, fontFamily: F.cn, fontWeight: 700, fontSize: 24, color: T.ink }}>{title}</div>
    </div>
  );
};

/** 噪点图：随机色块，可选在里面"脑补"出一个形状（reveal 0–1 画出虚线轮廓） */
const rnd = (i: number) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
export const Noise: React.FC<{ w?: number; seed?: number; t: number; reveal?: number; shape?: "face" | "arrow" | "star" }> = ({ w = 200, seed = 0, t, reveal = 0, shape = "face" }) => {
  const n = 14, c = w / n;
  const flick = Math.floor(t * 6);
  const path = shape === "face" ? "M60 80 A40 40 0 1 1 140 80 A40 40 0 1 1 60 80 M82 72 l0 2 M118 72 l0 2 M80 104 Q100 120 120 104" :
    shape === "arrow" ? "M40 140 L140 60 M100 56 L144 56 L144 100" : "M100 30 L118 82 L172 82 L128 112 L144 166 L100 134 L56 166 L72 112 L28 82 L82 82 Z";
  return (
    <div style={{ position: "relative", width: w, height: w, borderRadius: 18, overflow: "hidden", border: `4px solid ${T.ink}`, background: "#EEE" }}>
      <svg width={w} height={w} viewBox={`0 0 ${w} ${w}`} style={{ position: "absolute" }}>
        {Array.from({ length: n * n }, (_, i) => { const v = rnd(i + seed * 997 + (rnd(i + flick) > 0.93 ? flick : 0)); const g = Math.round(90 + v * 150); return <rect key={i} x={(i % n) * c} y={Math.floor(i / n) * c} width={c + 0.5} height={c + 0.5} fill={`rgb(${g},${g - 6},${g - 14})`} />; })}
      </svg>
      {reveal > 0 ? <svg width={w} height={w} viewBox="0 0 200 200" style={{ position: "absolute" }}>
        <path d={path} fill="none" stroke={T.red} strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="700" strokeDashoffset={700 * (1 - reveal)} />
      </svg> : null}
    </div>
  );
};

/** 硬币 */
export const Coin: React.FC<{ s?: number; ch?: string }> = ({ s = 1, ch = "¥" }) => (
  <svg width={56 * s} height={56 * s} viewBox="-28 -28 56 56" style={{ overflow: "visible" }}>
    <circle r="24" fill={T.gold} stroke={T.ink} strokeWidth="3" /><circle r="17" fill="none" stroke="#E09A2A" strokeWidth="2.5" />
    <text x="0" y="9" textAnchor="middle" fontFamily={F.num} fontWeight="800" fontSize="24" fill="#A8661C">{ch}</text>
  </svg>
);

/** 唱片 */
export const Record: React.FC<{ s?: number; t: number; spin?: number }> = ({ s = 1, t, spin = 1 }) => (
  <svg width={120 * s} height={120 * s} viewBox="-60 -60 120 120" style={{ overflow: "visible" }}>
    <g transform={`rotate(${t * 200 * spin})`}>
      <circle r="56" fill="#2E2A30" stroke={T.ink} strokeWidth="3" />
      {[44, 36, 28].map((r) => <circle key={r} r={r} fill="none" stroke="#4A4550" strokeWidth="2" />)}
      <circle r="18" fill={T.red} stroke={T.ink} strokeWidth="2.6" /><circle r="4" fill={T.paper} />
      <path d="M-40 -20 A44 44 0 0 1 -20 -40" stroke="rgba(255,255,255,0.35)" strokeWidth="5" fill="none" strokeLinecap="round" />
    </g>
  </svg>
);

/** 日历页 */
export const Calendar: React.FC<{ text: string; sub?: string; s?: number; color?: string }> = ({ text, sub, s = 1, color = T.red }) => (
  <div style={{ position: "relative", width: 200 * s, height: 220 * s, borderRadius: 22 * s, background: T.paper, border: `${4}px solid ${T.ink}`, boxShadow: "0 8px 0 rgba(59,42,32,0.18)", overflow: "hidden" }}>
    <div style={{ height: 62 * s, background: color, borderBottom: `4px solid ${T.ink}` }} />
    {[0.28, 0.72].map((k) => <div key={k} style={{ position: "absolute", left: `${k * 100}%`, top: 14 * s, width: 16 * s, height: 30 * s, marginLeft: -8 * s, borderRadius: 8 * s, background: T.paper, border: `3px solid ${T.ink}` }} />)}
    <div style={{ position: "absolute", left: 0, right: 0, top: 80 * s, textAlign: "center", fontFamily: F.num, fontWeight: 800, fontSize: 60 * s, color: T.ink, lineHeight: 1 }}>{text}</div>
    {sub ? <div style={{ position: "absolute", left: 0, right: 0, top: 146 * s, textAlign: "center", fontFamily: F.cn, fontWeight: 700, fontSize: 40 * s, color: T.inkSoft }}>{sub}</div> : null}
  </div>
);

/** 钢琴键盘 + 正在按下的键 */
export const Piano: React.FC<{ w?: number; t: number; play?: number }> = ({ w = 420, t, play = 1 }) => {
  const n = 10, kw = w / n;
  const down = play > 0 ? Math.floor(t * 4) % n : -1;
  return (
    <svg width={w} height={160} viewBox={`0 0 ${w} 160`} style={{ overflow: "visible" }}>
      <rect x="-14" y="-24" width={w + 28} height="190" rx="18" fill="#3E3440" stroke={T.ink} strokeWidth="4" />
      {Array.from({ length: n }, (_, i) => <rect key={i} x={i * kw + 2} y={down === i ? 6 : 0} width={kw - 4} height="150" rx="8" fill={down === i ? "#FFE9B0" : "#FFFDF6"} stroke={T.ink} strokeWidth="3" />)}
      {Array.from({ length: n - 1 }, (_, i) => [0, 1, 3, 4, 5].includes(i % 7) ? <rect key={i} x={(i + 1) * kw - kw * 0.3} y="0" width={kw * 0.6} height="92" rx="6" fill="#2E2A30" stroke={T.ink} strokeWidth="2.6" /> : null)}
    </svg>
  );
};

/** 音符 */
export const Note: React.FC<{ s?: number; color?: string }> = ({ s = 1, color = T.ink }) => (
  <svg width={40 * s} height={56 * s} viewBox="-20 -36 40 56" style={{ overflow: "visible" }}>
    <ellipse cx="-6" cy="10" rx="10" ry="7.5" fill={color} transform="rotate(-20 -6 10)" /><rect x="2" y="-30" width="4.5" height="40" fill={color} />
    <path d="M6.5 -30 Q20 -24 16 -10" stroke={color} strokeWidth="4.5" fill="none" strokeLinecap="round" />
  </svg>
);

/** 方块进度格：n 格里点亮 on 格 */
export const Grid10: React.FC<{ on: number; color?: string; size?: number }> = ({ on, color = T.red, size = 44 }) => (
  <div style={{ display: "flex", gap: 8 }}>
    {Array.from({ length: 10 }, (_, i) => {
      const k = Math.max(0, Math.min(1, on - i));
      return <div key={i} style={{ position: "relative", width: size, height: size, borderRadius: 10, background: T.paper, border: `3px solid ${T.ink}`, overflow: "hidden" }}>
        <div style={{ position: "absolute", left: 0, bottom: 0, width: "100%", height: `${k * 100}%`, background: color }} />
      </div>;
    })}
  </div>
);
