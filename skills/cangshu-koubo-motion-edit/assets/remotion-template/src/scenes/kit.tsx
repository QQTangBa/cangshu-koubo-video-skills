import React from "react";
import { C, F, H, W } from "../theme";

// 手写编排工具：B 段推荐一个演示场景写一个组件，每个元素用关键帧明确写死"什么时候、从哪到哪、什么曲线"。
// 不依赖外部动画库，曲线照 GSAP 常用的那几条实现；全部按绝对时间 t（秒）计算，Remotion 逐帧渲染结果稳定。

// ---------- 缓动 ----------
export const ease = {
  linear: (x: number) => x,
  inQuad: (x: number) => x * x,
  outQuad: (x: number) => 1 - (1 - x) * (1 - x),
  inOutCubic: (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2),
  outCubic: (x: number) => 1 - Math.pow(1 - x, 3),
  outExpo: (x: number) => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * x)),
  inExpo: (x: number) => (x <= 0 ? 0 : Math.pow(2, 10 * x - 10)),
  outBack: (x: number, s = 1.7) => 1 + (s + 1) * Math.pow(x - 1, 3) + s * Math.pow(x - 1, 2),
  inBack: (x: number, s = 1.7) => (s + 1) * x * x * x - s * x * x,
  outElastic: (x: number) => (x === 0 || x === 1 ? x : Math.pow(2, -10 * x) * Math.sin((x * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1),
  smooth: (x: number) => x * x * x * (x * (6 * x - 15) + 10), // smootherstep：首尾速度和加速度都为 0，镜头运动默认用它
  out5: (x: number) => 1 - Math.pow(1 - x, 5), // 快进慢停：元素落位
  outBounce: (x: number) => {
    const n = 7.5625, d = 2.75;
    if (x < 1 / d) return n * x * x;
    if (x < 2 / d) return n * (x -= 1.5 / d) * x + 0.75;
    if (x < 2.5 / d) return n * (x -= 2.25 / d) * x + 0.9375;
    return n * (x -= 2.625 / d) * x + 0.984375;
  },
};
export type EaseName = keyof typeof ease;

/** 关键帧插值：keys = [[时间, 值, 进入这一帧用的曲线?], ...]，时间升序 */
export const tw = (t: number, keys: [number, number, EaseName?][]): number => {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    const [t1, v1, e] = keys[i], [t0, v0] = keys[i - 1];
    if (t <= t1) { const u = (t - t0) / Math.max(1e-6, t1 - t0); return v0 + (v1 - v0) * ease[e ?? "smooth"](u); }
  }
  return keys[keys.length - 1][1];
};
/** 0→1 进度 */
export const pr = (t: number, at: number, dur: number, e: EaseName = "outCubic") => (t <= at ? 0 : t >= at + dur ? 1 : ease[e]((t - at) / dur));
/** 弹出：0 → 过冲 → 1 */
export const popIn = (t: number, at: number, dur = 0.35) => (t <= at ? 0 : t >= at + dur ? 1 : ease.outBack((t - at) / dur, 2.2));
/** 衰减摆动（跟随动作）：触发后摆几下停住 */
export const wobble = (t: number, at: number, amp = 1, freq = 9, decay = 5) => (t < at ? 0 : amp * Math.exp(-(t - at) * decay) * Math.sin((t - at) * freq));

// ---------- 镜头 + 水印字墙 ----------
export type CamKey = { t: number; x: number; y: number; z?: number; e?: EaseName };
/** 镜头关键帧：x/y 是世界坐标里画面中心对准的点 */
export const camAt = (t: number, keys: CamKey[]) => {
  const xs = keys.map((k) => [k.t, k.x, k.e] as [number, number, EaseName?]);
  const ys = keys.map((k) => [k.t, k.y, k.e] as [number, number, EaseName?]);
  const zs = keys.map((k) => [k.t, Math.log(k.z ?? 1), k.e] as [number, number, EaseName?]);
  return { x: tw(t, xs), y: tw(t, ys), z: Math.exp(tw(t, zs)) }; // 缩放走对数插值：推拉速度在眼里是匀的
};

const wmRow = (brand: string, tag: string, unit: number) => {
  const bw = [...brand].length * 122 + 60;
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${unit}' height='175'><g font-size='118' font-weight='900'>` +
    `<text x='20' y='130' font-family='PingFang SC,sans-serif' fill='${C.watermark}'>${brand}</text>` +
    `<text x='${20 + bw}' y='130' font-family='Avenir Next,Helvetica,sans-serif' font-style='italic' fill='none' stroke='${C.watermarkStroke}' stroke-width='2.5'>${tag}</text></g></svg>`;
  return `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}")`;
};

/**
 * 字墙：每行单独一条，跟镜头 1:1 走。对标实测：相邻行反向、一快一慢（约 3:1），镜头一切整面墙会被"推"一下。
 * kicks：切镜头的时刻，每次给字墙一个冲量（快行和慢行各往自己方向猛走一段再回到常速）。
 */
export const WordWall: React.FC<{ t: number; brand: string; tag?: string; kicks?: number[]; fast?: number; slow?: number; rows?: number; top?: number }> = ({ t, brand, tag = "ORIGINAL", kicks = [], fast = 15, slow = 5, rows = 26, top = -1600 }) => {
  const unit = [...brand].length * 122 + 60 + 840; // ORIGINAL 斜体 118px 约 720 宽，再留 120 间隔
  const img = wmRow(brand, tag, unit);
  const kick = kicks.reduce((a, k) => a + (t > k ? 1 - Math.exp(-(t - k) / 0.28) : 0), 0);
  return (
    <>
      {Array.from({ length: rows }, (_, r) => {
        const odd = r % 2 === 1;
        // 每行速度再错开一点（±25%），整面墙不像一块板在平移
        const v = (odd ? slow : fast) * (1 + 0.25 * Math.sin(r * 1.7 + 0.4));
        const x = odd ? -(v * t + kick * 40) - (r % 3) * 310 : v * t + kick * 110 + (r % 4) * 230;
        return <div key={r} style={{ position: "absolute", left: -3 * W, top: top + r * 175, width: 9 * W, height: 175, backgroundImage: img, backgroundSize: `${unit}px 175px`, backgroundPosition: `${x}px 0`, backgroundRepeat: "repeat-x" }} />;
      })}
    </>
  );
};

/** 摄像机容器：子元素用世界坐标摆放。mb = 屏幕上每帧位移（像素），甩镜时沿运动方向模糊（SVG 定向高斯，不是整体糊） */
export const Camera: React.FC<{ t: number; cam: { x: number; y: number; z: number }; mb?: { x: number; y: number }; children: React.ReactNode; viewY?: number; id?: string }> = ({ cam, mb, children, viewY = 600, id = "cam" }) => {
  const bx = mb ? Math.min(28, Math.abs(mb.x) * 0.45) : 0, by = mb ? Math.min(28, Math.abs(mb.y) * 0.45) : 0;
  const on = bx > 0.6 || by > 0.6;
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
      {on ? <svg width={0} height={0} style={{ position: "absolute" }}><filter id={`mb-${id}`} x="-5%" y="-5%" width="110%" height="110%"><feGaussianBlur stdDeviation={`${bx.toFixed(2)} ${by.toFixed(2)}`} /></filter></svg> : null}
      <div style={{ position: "absolute", left: 0, top: 0, width: W, height: H, transformOrigin: "0 0", transform: `translate(${W / 2 - cam.x * cam.z}px, ${viewY - cam.y * cam.z}px) scale(${cam.z})`, filter: on ? `url(#mb-${id})` : undefined, textRendering: "geometricPrecision" }}>
        {children}
      </div>
    </div>
  );
};
/**
 * 3D 摄像机（对标实测）：画布连同字墙、卡片是同一个平面，摄像机在它正前方"转头"看不同区域，
 * 所以画面一直带透视。每段图形里 yaw 从约 -7.5° 扫到 +7.5°、pitch 从 +2.5° 到 -2.5°（两者相关 -0.98），
 * 角度只在镜头运动前后变化（97% 的镜头运动伴随角度变化），而且比机位移动拖得更久（1–4 秒、缓入缓出），停留时角度不动。
 * 画布做大一圈（pad），转出角度时边缘不会露底。
 */
export const orbitAt = (t: number, moves: number[], o: { yaw?: [number, number]; pitch?: [number, number]; lead?: number; dur?: number } = {}) => {
  // CSS 角度，方向已用同一套测量程序和对标对过：开头 rotateY +7.5°（量出来和对标一样是"左远右近"）、rotateX -2.5°，结尾反过来
  const [y0, y1] = o.yaw ?? [7.5, -7.5];
  const [p0, p1] = o.pitch ?? [-2.5, 2.5];
  const lead = o.lead ?? 0.6, dur = o.dur ?? 2.4;
  const n = Math.max(1, moves.length);
  let k = 0;
  for (const m of moves) k += ease.smooth(Math.min(1, Math.max(0, (t - (m - lead)) / dur)));
  const u = k / n;
  return { yaw: y0 + (y1 - y0) * u, pitch: p0 + (p1 - p0) * u };
};

export const Camera3D: React.FC<{ t: number; cam: { x: number; y: number; z: number }; yaw: number; pitch: number; mb?: { x: number; y: number }; persp?: number; pad?: number; children: React.ReactNode; viewY?: number; id?: string }> = ({ cam, yaw, pitch, mb, persp = W, pad = 0.22, children, viewY = 600, id = "cam3" }) => {
  const bx = mb ? Math.min(28, Math.abs(mb.x) * 0.45) : 0, by = mb ? Math.min(28, Math.abs(mb.y) * 0.45) : 0;
  const on = bx > 0.6 || by > 0.6;
  const px = W * pad, py = H * pad;
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", perspective: `${persp}px`, perspectiveOrigin: `${W / 2}px ${viewY}px` }}>
      {on ? <svg width={0} height={0} style={{ position: "absolute" }}><filter id={`mb-${id}`} x="-5%" y="-5%" width="110%" height="110%"><feGaussianBlur stdDeviation={`${bx.toFixed(2)} ${by.toFixed(2)}`} /></filter></svg> : null}
      <div style={{ position: "absolute", left: -px, top: -py, width: W + 2 * px, height: H + 2 * py, overflow: "hidden", transformOrigin: `${W / 2 + px}px ${viewY + py}px`, transform: `rotateX(${pitch}deg) rotateY(${yaw}deg)` }}>
        <div style={{ position: "absolute", left: 0, top: 0, width: W, height: H, transformOrigin: "0 0", transform: `translate(${W / 2 + px - cam.x * cam.z}px, ${viewY + py - cam.y * cam.z}px) scale(${cam.z})`, filter: on ? `url(#mb-${id})` : undefined, textRendering: "geometricPrecision" }}>
          {children}
        </div>
      </div>
    </div>
  );
};

/** 镜头在屏幕上的每帧位移（给 Camera 的 mb 用） */
export const camVel = (t: number, keys: CamKey[], fps = 30, viewY = 600) => {
  const scr = (c: { x: number; y: number; z: number }, wx: number, wy: number) => [W / 2 + (wx - c.x) * c.z, viewY + (wy - c.y) * c.z];
  const a = camAt(t, keys), b = camAt(t - 1 / fps, keys);
  // 取画面中心那个世界点在两帧之间的屏幕位移，再加上缩放引起的边缘位移
  const [x1, y1] = scr(a, b.x, b.y), [x0, y0] = scr(b, b.x, b.y);
  const zEdge = Math.abs(a.z / b.z - 1) * 500;
  return { x: x1 - x0 + zEdge, y: y1 - y0 + zEdge };
};

/** 放一个元素：世界坐标 (x,y) 为中心，s 缩放，r 旋转（度），o 透明度 */
export const Put: React.FC<{ x: number; y: number; s?: number; r?: number; o?: number; w: number; h: number; children: React.ReactNode; z?: number }> = ({ x, y, s = 1, r = 0, o = 1, w, h, children, z }) =>
  o <= 0.001 ? null : (
    <div style={{ position: "absolute", left: x - w / 2, top: y - h / 2, width: w, height: h, transform: `scale(${s}) rotate(${r}deg)`, opacity: o, zIndex: z, display: "flex", alignItems: "center", justifyContent: "center" }}>{children}</div>
  );

/** 标签：普通文字排版（不画在 SVG 里，镜头推拉时不抖） */
export const Tag2: React.FC<{ text: string; tone?: "ink" | "blue" | "red" | "cyan" | "yellow"; size?: number; chip?: boolean }> = ({ text, tone = "ink", size = 40, chip = true }) => {
  const col = { ink: C.cardText, blue: C.blue, red: C.red, cyan: C.cyan, yellow: C.inkYellow }[tone];
  return chip ? (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 10, padding: `${size * 0.22}px ${size * 0.55}px`, borderRadius: 999, background: C.cardBg, border: `1.5px solid ${C.cardLine}`, boxShadow: `0 6px 0 ${C.thick}, ${C.shadow}`, fontFamily: F.cn, fontWeight: 800, fontSize: size, color: col, whiteSpace: "nowrap" }}>
      <span style={{ width: size * 0.3, height: size * 0.3, borderRadius: 99, background: tone === "ink" ? C.blue : col }} />{text}
    </div>
  ) : <div style={{ fontFamily: F.cn, fontWeight: 900, fontSize: size, color: col, whiteSpace: "nowrap", textShadow: "0 2px 0 rgba(255,255,255,0.6)" }}>{text}</div>;
};

/** 落地压扁回弹：t0 落地 */
export const land = (t: number, t0: number, amt = 0.12) => (t < t0 ? 1 : 1 - amt * Math.exp(-(t - t0) * 9) * Math.cos((t - t0) * 28));

/**
 * 立体倾斜：只在画面太平的时候用（一张孤零零的卡、一行字、一个印章），不是每张卡都加。
 * 进场从大角度翻进来，落到一个小的残留角度停住（rest），之后随时间轻轻摆，让平面元素有纵深。
 */
export const Tilt: React.FC<{ t: number; at: number; from?: [number, number]; rest?: [number, number]; dur?: number; sway?: number; origin?: string; children: React.ReactNode }> = ({ t, at, from = [55, -18], rest = [6, -8], dur = 0.55, sway = 1.5, origin = "50% 50%", children }) => {
  const k = t <= at ? 0 : t >= at + dur ? 1 : ease.outBack((t - at) / dur, 1.6);
  const sw = Math.sin((t - at) * 1.3) * sway;
  const rx = from[0] + (rest[0] - from[0]) * k + sw * 0.6, ry = from[1] + (rest[1] - from[1]) * k + sw;
  return <div style={{ perspective: 1400, perspectiveOrigin: "50% 40%" }}><div style={{ transform: `rotateX(${rx}deg) rotateY(${ry}deg)`, transformOrigin: origin, transformStyle: "preserve-3d" }}>{children}</div></div>;
};

/** 安全区：B 段内容必须落在这里（字幕在 y≈1150） */
export const SAFE_Y = { top: 110, bottom: 1090 };
