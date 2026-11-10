import React from "react";
import { F } from "../../theme";
import { Camera3D, type CamKey, WordWall, camAt, camVel, orbitAt, popIn, pr, tw, wobble } from "../kit";
import { Chip, Figure, L } from "../lux";
import type { CustomScene } from "./types";

// 样例 · B1（5.95–15.71）—— 主角是一个水箱（互联网大盘），每个新东西都从上一个东西里长出来
// 台词：但是现在进入存量内卷时代 / 再加上每个人都驾驶上了 AI 这台高达 / 大模型算法这些领域 可能确实还需要顶尖人才
// 链条：注水（增量）→ 阀门关、"增量"划掉翻成"存量"（7.45）→ 人追着打转，漩涡中心冒出"内卷"（8.55）
//   → AI 芯片落水（10.05），波纹扫到谁谁套机甲 → 机甲把水挤得溢出（11.05）→ 塔从芯片沉下的地方长出（12.0），伸出"大模型""算法"
//   → 塔顶光束吸上去一人，皇冠从"顶尖人才"标签飞到他头上（14.78）；另一人爬到一半滑回水里
// 联动表：
//   ① 阀门转动 → 水柱上端断开往下落 → "增量"被划掉、翻面成"存量"
//   ② 芯片落点激起波纹 → 波纹扩到谁、谁就套上机甲（按到落点的距离依次）→ 水位被挤高、溢出
//   ③ 芯片沉下去的位置 → 塔从这里长出来；塔顶光束 → 光束下的人被吸上塔顶
//   ④ "顶尖人才"标签 → 皇冠从标签飞出，落到登顶的人头上
// 跨段照应：真人段左上的"增量时代"标签飞到阀门旁变成"增量"；水管和 AI 芯片在第二段再出现

const CX = 540, RIM = 500, BOT = 1040, RX = 300, RY = 46; // 水箱：中心 x、口沿 y、底 y、半宽、透视椭圆半高
const TOP = -270; // 塔顶 y
const N = 7;
const AI_HIT = 10.05, RIPPLE = 260; // AI 芯片落水时刻、波纹扩散速度（世界像素/秒）
const TAG_FROM = { x: 170, y: 200 }; // 真人段左上角标签在 B 段开头对应的世界坐标

const level = (t: number) => tw(t, [[5.95, 0.42], [7.5, 0.6, "outCubic"], [9.9, 0.6], [11.1, 0.8, "inOutCubic"], [11.6, 0.76, "outCubic"]]);
const surfY = (t: number) => BOT - 14 - level(t) * (BOT - RIM - 40);
const swirl = (t: number) => (t < 8.25 ? 0 : Math.min(1, (t - 8.25) / 0.7)); // 漩涡转速 0→1
// 角度：先慢慢漂，漩涡起来后加速；积分写成闭式，保证逐帧连续
const angle = (t: number, i: number) => {
  const base = (i / N) * Math.PI * 2 + 0.3;
  const drift = 0.12 * t;
  const sw = t < 8.25 ? 0 : t < 8.95 ? (1.7 * (t - 8.25) ** 2) / (2 * 0.7) : 1.7 * (0.35 + (t - 8.95));
  return base + drift + sw;
};
const towerP = (t: number) => pr(t, 12.0, 1.0, "inOutCubic");
const towerTop = (t: number) => surfY(t) - towerP(t) * (surfY(t) - TOP);

// 镜头：只在句子交界处动（对标：平均 3.8 秒动一次、停留中位 2.1 秒、一次 0.6–0.9 秒、以推拉为主、缓入缓出），停住时完全静止
const MOVES = [9.0, 12.0];
const CAM: CamKey[] = [
  { t: 5.95, x: 540, y: 690, z: 1.0 },
  { t: 9.0, x: 540, y: 690, z: 1.0 },            // 停：注水 → 阀门关 → 存量 → 打转 → 内卷
  { t: 9.8, x: 540, y: 690, z: 1.3 },            // 推近水面
  { t: 12.0, x: 540, y: 690, z: 1.3 },           // 停：一个个套上机甲，挤到溢出
  { t: 12.85, x: 560, y: 210, z: 0.86 },         // 拉远上摇：塔从水里长出来
  { t: 15.71, x: 560, y: 210, z: 0.86 },         // 停：大模型、算法、一人登顶、另一人滑落
];

/** 水面上的位置（不含被吸上塔、爬塔这些特殊动作） */
const basePos = (t: number, i: number) => {
  const a = angle(t, i);
  const r = 0.62 + 0.12 * Math.sin(i * 2.3) - 0.18 * swirl(t) * (0.5 + 0.5 * Math.sin(t * 3 + i)); // 漩涡里往里收
  return { x: CX + Math.cos(a) * RX * r, y: surfY(t) + Math.sin(a) * RY * r * 0.9, a };
};
/** 波纹扫到第 i 个人的时刻 = 套上机甲的时刻（因果：芯片落水 → 波纹 → 机甲） */
const armorAt = (i: number) => {
  const p = basePos(AI_HIT, i);
  const d = Math.hypot(p.x - CX, (p.y - surfY(AI_HIT)) * (RX / RY));
  return AI_HIT + d / RIPPLE;
};
const ARMOR = Array.from({ length: N }, (_, i) => armorAt(i));
// 被光束吸上去的人挑当时最靠右的，爬塔的人挑最靠左的：路线都在塔身外侧，不会从塔里穿过去（穿模修正）
const LIFT_I = Array.from({ length: N }, (_, i) => i).sort((a, b) => basePos(13.99, b).x - basePos(13.99, a).x)[0];
const CLIMB_I = Array.from({ length: N }, (_, i) => i).filter((i) => i !== LIFT_I).sort((a, b) => basePos(15.15, a).x - basePos(15.15, b).x)[0];
const LIFT_X = CX + 70; // 落在塔顶平台右半边

/** 某个人此刻的位置和状态 */
const fig = (t: number, i: number) => {
  const bp = basePos(t, i);
  let x = bp.x, y = bp.y;
  const depth = Math.sin(bp.a); // -1 后面 … 1 前面
  const mech = pr(t, ARMOR[i], 0.28, "out5");
  let s = (1.0 + 0.12 * depth) * (1 + 0.22 * mech);
  let cut: number | undefined = 40; // 水线：齐腰
  let crown = 0, flail = swirl(t) * 0.6, lift = 0;
  if (i === LIFT_I) {
    // 被送上塔顶：13.99 起沿光束（塔身右外侧）升上去，落在平台右半边
    lift = pr(t, 13.99, 0.95, "inOutCubic");
    if (lift > 0) {
      const p0 = basePos(13.99, i), x0 = p0.x, y0 = surfY(13.99);
      x = x0 + (LIFT_X - x0) * lift;
      y = y0 + (TOP - 8 - y0) * lift;
      s = 1.1 * (1 + 0.22 * mech);
      cut = lift > 0.05 ? undefined : 40;
      flail = 0;
      crown = pr(t, 15.0, 0.3, "outBack"); // 皇冠从"顶尖人才"标签飞过来，15.0 落到头上
    }
  }
  if (i === CLIMB_I && t >= 15.15) {
    // 另一个人贴着塔身左外侧往上爬，爬到一半滑回水里
    const up = pr(t, 15.15, 0.25, "outCubic"), down = pr(t, 15.4, 0.3, "inQuad");
    const x0 = basePos(15.15, i).x;
    x = x0 + (CX - 78 - x0) * up;
    y = surfY(t) - 230 * up + 230 * down;
    cut = up > 0.1 && down < 0.9 ? undefined : 40;
    flail = 1;
  }
  const front = (i === LIFT_I && lift > 0.02) || (i === CLIMB_I && t >= 15.15); // 在塔前面
  return { x, y, s, depth, mech, cut, crown, flail, front };
};

const FigAt: React.FC<{ t: number; i: number }> = ({ t, i }) => {
  const f = fig(t, i);
  const tone = f.crown > 0 ? "gold" : i === LIFT_I && t > 13.9 ? "blue" : "grey";
  // Figure 的 SVG 里 (0,40) 是水线，对应 svg 左上角往右 63s、往下 110s
  return (
    <div style={{ position: "absolute", left: f.x - 63 * f.s, top: f.y - 110 * f.s, zIndex: f.front ? 60 : Math.round(f.depth * 10) + 20 }}>
      <Figure s={f.s} tone={tone} mech={f.mech} crown={f.crown} flail={f.flail} t={t} seed={i} cut={f.cut} />
      {f.cut !== undefined ? (
        <svg style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }} width={1} height={1}>
          <ellipse cx={63 * f.s} cy={110 * f.s} rx={32 * f.s * (1 + 0.25 * f.mech)} ry={7 * f.s} fill="none" stroke="#fff" strokeOpacity="0.85" strokeWidth={2} />
          <ellipse cx={63 * f.s} cy={110 * f.s} rx={(44 + 10 * Math.sin(t * 4 + i)) * f.s} ry={10 * f.s} fill="none" stroke="#fff" strokeOpacity="0.35" strokeWidth={1.5} />
        </svg>
      ) : null}
    </div>
  );
};

/** 水箱后半部分：地面投影、玻璃后壁、水体、水面、漩涡 */
const TankBack: React.FC<{ t: number }> = ({ t }) => {
  const sy = surfY(t), sw = swirl(t);
  const rot = t * 2.4 * sw;
  const spiral = Array.from({ length: 90 }, (_, k) => {
    const u = k / 89, r = 0.95 * (1 - u), th = u * Math.PI * 5 + rot;
    return `${k ? "L" : "M"}${CX + Math.cos(th) * RX * 0.92 * r} ${sy + Math.sin(th) * RY * 0.92 * r}`;
  }).join(" ");
  const ripple = (k: number) => 4 * Math.sin(t * 3 + k);
  return (
    <svg style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }} width={1} height={1}>
      <defs>
        <linearGradient id="t1w" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#7DB6FF" stopOpacity="0.92" /><stop offset="1" stopColor="#2F6BFF" stopOpacity="0.95" /></linearGradient>
        <linearGradient id="t1s" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#CFE5FF" /><stop offset="0.5" stopColor="#F4FAFF" /><stop offset="1" stopColor="#BFDBFF" /></linearGradient>
        <radialGradient id="t1f" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stopColor="#0F1A2A" stopOpacity="0.16" /><stop offset="1" stopColor="#0F1A2A" stopOpacity="0" /></radialGradient>
        <linearGradient id="t1g" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#FFFFFF" stopOpacity="0.55" /><stop offset="0.5" stopColor="#FFFFFF" stopOpacity="0.18" /><stop offset="1" stopColor="#FFFFFF" stopOpacity="0.5" /></linearGradient>
      </defs>
      <ellipse cx={CX} cy={BOT + 24} rx={RX * 1.25} ry={RY * 1.1} fill="url(#t1f)" />
      {/* 玻璃后壁 */}
      <path d={`M${CX - RX} ${RIM} L${CX - RX} ${BOT} A${RX} ${RY} 0 0 0 ${CX + RX} ${BOT} L${CX + RX} ${RIM} A${RX} ${RY} 0 0 0 ${CX - RX} ${RIM} Z`} fill="url(#t1g)" stroke="rgba(15,26,42,0.10)" strokeWidth="1.5" />
      {/* 水体 */}
      <path d={`M${CX - RX + 3} ${sy} L${CX - RX + 3} ${BOT} A${RX - 3} ${RY} 0 0 0 ${CX + RX - 3} ${BOT} L${CX + RX - 3} ${sy} A${RX - 3} ${RY} 0 0 1 ${CX - RX + 3} ${sy} Z`} fill="url(#t1w)" />
      {/* 水下的光纹 */}
      {[0, 1, 2].map((k) => <path key={k} d={`M${CX - RX + 40} ${sy + 60 + k * 70 + ripple(k)} Q${CX} ${sy + 40 + k * 70 - ripple(k)} ${CX + RX - 40} ${sy + 60 + k * 70 + ripple(k)}`} fill="none" stroke="#fff" strokeOpacity={0.12} strokeWidth="6" strokeLinecap="round" />)}
      {/* 水面 */}
      <ellipse cx={CX} cy={sy} rx={RX - 3} ry={RY} fill="url(#t1s)" />
      <ellipse cx={CX} cy={sy} rx={RX - 3} ry={RY} fill="none" stroke="#fff" strokeWidth="2" />
      {sw > 0 ? <path d={spiral} fill="none" stroke="#2F6BFF" strokeOpacity={0.35 * sw} strokeWidth="3" strokeLinecap="round" /> : null}
    </svg>
  );
};

/** 水箱前半部分：前沿口、玻璃高光、刻字、溢出的水花 */
const TankFront: React.FC<{ t: number }> = ({ t }) => (
  <svg style={{ position: "absolute", left: 0, top: 0, overflow: "visible", zIndex: 40 }} width={1} height={1}>
    <path d={`M${CX - RX} ${RIM} A${RX} ${RY} 0 0 0 ${CX + RX} ${RIM}`} fill="none" stroke="#fff" strokeWidth="3" />
    <path d={`M${CX - RX} ${RIM} A${RX} ${RY} 0 0 0 ${CX + RX} ${RIM}`} fill="none" stroke="rgba(15,26,42,0.14)" strokeWidth="1.2" />
    <rect x={CX - RX + 26} y={RIM + 40} width="14" height={BOT - RIM - 60} rx="7" fill="#fff" opacity="0.5" />
    <rect x={CX - RX + 50} y={RIM + 60} width="5" height={BOT - RIM - 120} rx="3" fill="#fff" opacity="0.35" />
    <rect x={CX + RX - 34} y={RIM + 50} width="8" height={BOT - RIM - 90} rx="4" fill="#fff" opacity="0.28" />
    <text x={CX} y={BOT + 10} textAnchor="middle" fontFamily={F.cn} fontWeight={600} fontSize="30" fill="#fff" opacity="0.9">互联网大盘</text>
    <text x={CX} y={BOT + 34} textAnchor="middle" fontFamily={L.mono} fontSize="13" letterSpacing="3" fill="#fff" opacity="0.7">INTERNET MARKET · STOCK</text>
    {t > 10.95 && t < 12.2 ? Array.from({ length: 14 }, (_, k) => {
      const u = (t - 10.95 - (k % 4) * 0.06) / 0.9;
      if (u <= 0 || u >= 1) return null;
      const side = k % 2 ? 1 : -1, sp = 60 + ((k * 37) % 90);
      const x = CX + side * (RX - 20 + sp * u), y = RIM - 10 - 120 * u + 380 * u * u;
      return <circle key={k} cx={x} cy={y} r={7 - 3 * u} fill="#5AA2FF" opacity={1 - u} />;
    }) : null}
  </svg>
);

/** 进水管 + 阀门（停在水箱口上方，不插进玻璃；退场时向左滑出淡掉，不穿过顶部进度条） */
const PIPE_Y = 360, PIPE_END = PIPE_Y + 80; // 管口在水箱口沿（y≈454）上方
const pipeOut = (t: number) => pr(t, 8.85, 0.4, "inQuad");
const Pipe: React.FC<{ t: number }> = ({ t }) => {
  const out = pipeOut(t);
  if (out >= 1) return null;
  const dx = -620 * out;
  const valve = tw(t, [[7.3, 0], [7.6, 90, "outBack"]]);
  const d = `M${CX - 520} ${PIPE_Y} L${CX - 40} ${PIPE_Y} Q${CX} ${PIPE_Y} ${CX} ${PIPE_Y + 40} L${CX} ${PIPE_END}`;
  return (
    <svg style={{ position: "absolute", left: dx, top: 0, overflow: "visible", zIndex: 5, opacity: 1 - out }} width={1} height={1}>
      <defs><linearGradient id="p1" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#E9EEF5" /><stop offset="0.45" stopColor="#FFFFFF" /><stop offset="1" stopColor="#C9D2DF" /></linearGradient></defs>
      <path d={d} fill="none" stroke="rgba(15,26,42,0.10)" strokeWidth="47" strokeLinecap="round" />
      <path d={d} fill="none" stroke="url(#p1)" strokeWidth="44" strokeLinecap="round" />
      <g transform={`translate(${CX - 200} ${PIPE_Y})`}>
        <rect x="-14" y="-40" width="28" height="22" rx="5" fill="#fff" stroke="rgba(15,26,42,0.14)" strokeWidth="1.2" />
        <g transform={`translate(0 -58) rotate(${valve})`}>
          <circle r="34" fill="none" stroke={L.blue} strokeWidth="7" />
          {[0, 60, 120].map((a) => <line key={a} x1={-34 * Math.cos((a * Math.PI) / 180)} y1={-34 * Math.sin((a * Math.PI) / 180)} x2={34 * Math.cos((a * Math.PI) / 180)} y2={34 * Math.sin((a * Math.PI) / 180)} stroke={L.blue} strokeWidth="5" strokeLinecap="round" />)}
          <circle r="9" fill="#fff" stroke={L.blue} strokeWidth="4" />
        </g>
      </g>
    </svg>
  );
};
/** 水柱：从管口落进水箱开口，画在后壁和水面之上、前沿之下 */
const Stream: React.FC<{ t: number }> = ({ t }) => {
  const sy = surfY(t);
  const stopP = pr(t, 7.5, 0.45, "inQuad"); // 阀门一关，水柱上端跟着往下掉
  const top = PIPE_END + stopP * (sy - PIPE_END), bot = sy;
  if (bot <= top + 2) return null;
  return (
    <svg style={{ position: "absolute", left: 0, top: 0, overflow: "visible", zIndex: 8 }} width={1} height={1}>
      <rect x={CX - 11} y={top} width="22" height={bot - top} rx="11" fill="#5AA2FF" opacity="0.9" />
      <ellipse cx={CX} cy={sy} rx={26 + 4 * Math.sin(t * 20)} ry={6} fill="none" stroke="#fff" strokeOpacity={0.8 * (1 - stopP)} strokeWidth={2} />
    </svg>
  );
};

/** 中间升起来的细塔 */
const Tower: React.FC<{ t: number }> = ({ t }) => {
  const p = towerP(t);
  if (p <= 0) return null;
  const sy = surfY(t), top = towerTop(t);
  const glow = pr(t, 13.85, 0.4);
  return (
    <svg style={{ position: "absolute", left: 0, top: 0, overflow: "visible", zIndex: 15 }} width={1} height={1}>
      <defs>
        <linearGradient id="tw1" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#F4F7FB" /><stop offset="0.4" stopColor="#FFFFFF" /><stop offset="1" stopColor="#C9D2DF" /></linearGradient>
        <radialGradient id="tw2" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stopColor="#FFD27A" stopOpacity="0.85" /><stop offset="1" stopColor="#FFD27A" stopOpacity="0" /></radialGradient>
      </defs>
      <rect x={CX - 40} y={top} width="80" height={sy - top} rx="6" fill="url(#tw1)" stroke="rgba(15,26,42,0.12)" strokeWidth="1.2" />
      {Array.from({ length: 14 }, (_, k) => { const y = sy - 60 - k * 60; return y > top + 20 ? <line key={k} x1={CX - 40} x2={CX + 40} y1={y} y2={y} stroke="rgba(15,26,42,0.10)" strokeWidth="1.2" /> : null; })}
      {p > 0.95 ? (
        <g>
          <ellipse cx={CX} cy={TOP} rx={140 * glow} ry={50 * glow} fill="url(#tw2)" />
          <ellipse cx={CX} cy={TOP + 2} rx="100" ry="22" fill="#FFFFFF" stroke="rgba(15,26,42,0.14)" strokeWidth="1.2" />
          <ellipse cx={CX} cy={TOP} rx="100" ry="20" fill="#F7F9FC" />
          <ellipse cx={CX} cy={TOP} rx="52" ry="10" fill="none" stroke={L.gold} strokeOpacity={glow} strokeWidth="3" />
        </g>
      ) : null}
    </svg>
  );
};

/** AI 芯片从上面掉进水里，激起两圈波纹（波纹到达谁，谁就套上机甲） */
const AiDrop: React.FC<{ t: number }> = ({ t }) => {
  if (t < AI_HIT - 0.3 || t > AI_HIT + 1.4) return null;
  const sy = surfY(t);
  const fall = pr(t, AI_HIT - 0.3, 0.3, "inQuad");
  const y = sy - 300 + 300 * fall; // 从顶部进度条下方开始落，不穿过进度条
  const sink = pr(t, AI_HIT, 0.25);
  const rings = [0, 0.18].map((d) => {
    const u = t - AI_HIT - d;
    if (u <= 0) return null;
    const rx = RIPPLE * u, ry = rx * (RY / RX);
    const o = Math.max(0, 1 - rx / (RX * 1.05));
    return o > 0 ? <ellipse key={d} cx={CX} cy={sy} rx={rx} ry={ry} fill="none" stroke={L.cyan} strokeWidth={4} strokeOpacity={0.85 * o} /> : null;
  });
  return (
    <>
      <svg style={{ position: "absolute", left: 0, top: 0, overflow: "visible", zIndex: 35 }} width={1} height={1}>{rings}</svg>
      {sink < 1 ? (
        <div style={{ position: "absolute", left: CX, top: y, transform: `translate(-50%, -100%) scale(${1 - 0.6 * sink})`, opacity: pr(t, AI_HIT - 0.3, 0.1) * (1 - sink), zIndex: 36 }}>
          <div style={{ padding: "10px 18px", borderRadius: 14, background: L.cyan, color: "#fff", fontFamily: F.num, fontWeight: 700, fontSize: 34, letterSpacing: 1, boxShadow: "0 10px 24px -8px rgba(18,179,201,0.7)" }}>AI</div>
        </div>
      ) : null}
    </>
  );
};

/** 塔顶打下来的光束：把第 0 个人吸上塔顶 */
const Beam: React.FC<{ t: number }> = ({ t }) => {
  const o = pr(t, 13.82, 0.2) * (1 - pr(t, 15.05, 0.3));
  if (o <= 0) return null;
  const p = basePos(13.99, LIFT_I);
  const bx = p.x, by = surfY(t) + 10;
  return (
    <svg style={{ position: "absolute", left: 0, top: 0, overflow: "visible", zIndex: 18, opacity: o }} width={1} height={1}>
      <defs><linearGradient id="bm1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#FFD27A" stopOpacity="0.75" /><stop offset="1" stopColor="#FFD27A" stopOpacity="0.12" /></linearGradient></defs>
      <polygon points={`${LIFT_X - 34},${TOP + 8} ${LIFT_X + 34},${TOP + 8} ${bx + 70},${by} ${bx - 50},${by}`} fill="url(#bm1)" />
      <ellipse cx={bx + 10} cy={by} rx={70} ry={14} fill="none" stroke={L.gold} strokeOpacity="0.6" strokeWidth="3" />
    </svg>
  );
};

const Stock1: CustomScene["Comp"] = ({ t, brand }) => {
  const cam = camAt(t, CAM);
  const mb = camVel(t, CAM);
  const orb = orbitAt(t, MOVES);
  const sh = wobble(t, 11.05, 6, 40, 9);
  const c2 = { ...cam, y: cam.y + sh };
  const sy = surfY(t);

  // 标签都从它的"母体"长出来：阀门、漩涡中心、人群、塔身
  const sProg = (at: number) => popIn(t, at, 0.4);
  const strike = pr(t, 7.5, 0.25, "outCubic");
  const toStock = pr(t, 7.78, 0.3, "outCubic");
  const out1 = 1 - pr(t, 11.95, 0.3);
  const pipeY = PIPE_Y;

  return (
    <>
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(120% 70% at 50% 28%, #FFFFFF 0%, #F1F4F8 55%, #E3E8EF 100%)" }} />
      <Camera3D t={t} cam={c2} mb={mb} yaw={orb.yaw} pitch={orb.pitch}>
        <div style={{ position: "absolute", inset: 0, filter: "blur(1.4px)", opacity: 0.75 }}><WordWall t={t} brand={brand} kicks={MOVES} /></div>
        <Pipe t={t} />
        <TankBack t={t} />
        <Stream t={t} />
        <Tower t={t} />
        {Array.from({ length: N }, (_, i) => <FigAt key={i} t={t} i={i} />)}
        <TankFront t={t} />

        {/* 增量 → 存量：从真人段左上角"增量时代"标签的位置飞到阀门旁（跨世界接力），阀门一关就被划掉翻面 */}
        {t < 9.05 ? (
          <div style={{ position: "absolute", left: TAG_FROM.x + (CX - 170 - TAG_FROM.x) * pr(t, 5.95, 0.5, "inOutCubic") - 620 * pipeOut(t), top: TAG_FROM.y + (pipeY - 150 - TAG_FROM.y) * pr(t, 5.95, 0.5, "inOutCubic"),
            transform: `scale(${(0.88 + 0.12 * pr(t, 5.95, 0.5)) * (1 - pr(t, 8.75, 0.25))})`, transformOrigin: "0px 60px", zIndex: 60 }}>
            {toStock < 0.5 ? <Chip cn="增量" en="INFLOW" tone={L.blue} size={34} strike={strike} /> : null}
            {toStock >= 0.5 ? <div style={{ transform: `perspective(600px) rotateX(${(1 - toStock) * 90}deg)` }}><Chip cn="存量" en="STOCK ONLY" tone={L.red} size={38} /></div> : null}
          </div>
        ) : null}
        {/* 内卷：从漩涡中心冒出来，停在水面上方 */}
        {t >= 8.55 ? (
          <div style={{ position: "absolute", left: CX + 90, top: sy - 60 - 120 * sProg(8.55), transform: `translate(0%, -100%) scale(${sProg(8.55) * (1 - pr(t, AI_HIT - 0.1, 0.25))})`, transformOrigin: "0% 100%", zIndex: 60 }}>
            <Chip cn="内卷" en="INVOLUTION" tone={L.blue} size={40} />
          </div>
        ) : null}
        {/* AI 芯片落水 → 波纹 → 波纹扫到谁谁套机甲 */}
        <AiDrop t={t} />
        {/* "人人都驾驶 AI 机甲"从水花中心升起 */}
        {t >= AI_HIT + 0.1 ? (
          <div style={{ position: "absolute", left: CX, top: sy - 40 - (sy - RIM + 50) * pr(t, AI_HIT + 0.1, 0.5, "out5"), transform: `translate(-50%, -100%) scale(${(0.3 + 0.7 * pr(t, AI_HIT + 0.1, 0.45, "outBack")) * out1})`, transformOrigin: "50% 100%", opacity: pr(t, AI_HIT + 0.1, 0.15), zIndex: 60 }}>
            <Chip cn="人人都驾驶 AI 机甲" en="EVERYONE + AI" tone={L.cyan} size={34} />
          </div>
        ) : null}
        {/* 塔顶的光束把人吸上去 */}
        <Beam t={t} />
        {/* 塔身标签：塔长过去时从塔边上伸出来 */}
        {[{ at: 12.55, y: 290, cn: "大模型", en: "FOUNDATION MODELS" }, { at: 13.05, y: 60, cn: "算法", en: "ALGORITHMS" }].map((g) => (t >= g.at ? (
          <div key={g.cn} style={{ position: "absolute", left: CX + 50, top: g.y - 44, transform: `scaleX(${pr(t, g.at, 0.35, "out5")})`, transformOrigin: "0% 50%", opacity: pr(t, g.at, 0.2), zIndex: 30 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ width: 40, height: 2, background: L.grey3 }} />
              <Chip cn={g.cn} en={g.en} tone={L.blue} size={44} />
            </div>
          </div>
        ) : null))}
        {t >= 14.55 ? (
          <div style={{ position: "absolute", left: CX - 120, top: TOP - 50, transform: `translate(-100%, -50%) scale(${sProg(14.55)})`, transformOrigin: "100% 50%", zIndex: 60 }}>
            <Chip cn="顶尖人才" en="TOP TALENT · ONE SEAT" tone={L.gold} size={44} />
          </div>
        ) : null}
        {/* 皇冠从"顶尖人才"标签上飞到登顶的人头上 */}
        {t >= 14.78 && t < 15.02 ? (() => {
          const k = pr(t, 14.78, 0.24, "inOutCubic");
          const x = CX - 230 + (LIFT_X - (CX - 230)) * k, y = TOP - 50 + (TOP - 70 - (TOP - 50)) * k - 90 * Math.sin(k * Math.PI);
          return <svg style={{ position: "absolute", left: x - 22, top: y - 16, overflow: "visible", zIndex: 70 }} width={44} height={32} viewBox="-22 -16 44 32"><path d="M-18 10 L-18 -6 L-9 2 L0 -12 L9 2 L18 -6 L18 10 Z" fill={L.gold} stroke="#fff" strokeWidth="2" strokeLinejoin="round" /></svg>;
        })() : null}
      </Camera3D>
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", background: "radial-gradient(140% 90% at 50% 40%, rgba(255,255,255,0) 60%, rgba(15,26,42,0.06) 100%)" }} />
    </>
  );
};

// 音效：只放在关键的联动时刻（太密就是污染）。全段 5 个
export const scene: CustomScene = {
  Comp: Stock1,
  cues: [
    { at: 7.45, role: "click", vol: 0.5, v: 1 },      // 关阀门：开关声
    { at: AI_HIT, role: "splash", vol: 0.5 },         // AI 芯片落水：真水声
    { at: 11.05, role: "impact", vol: 0.5 },          // 挤到溢出
    { at: 12.42, role: "whoosh", vol: 0.5 },          // 塔长出来 + 镜头拉远
    { at: 15.0, role: "ding", vol: 0.45 },            // 皇冠落到头上
  ],
};
