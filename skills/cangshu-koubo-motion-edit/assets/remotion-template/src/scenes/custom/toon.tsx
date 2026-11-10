import React from "react";
import { F } from "../../theme";
import wordsJson from "../../../public/words.json";
import { Camera3D, type CamKey, camAt, camVel, orbitAt } from "../kit";
import { QKid } from "./qkid";

// 动画片画风工具（白卡小人太机械、动效像素材库时用它，要亲切感）；带 9 套主题和品牌字墙
// 规则：暖棕描边（不用纯黑）、平涂 + 一点高光、大头小人有表情会眨眼会喘气、线条轻微抖动（手绘感）、
// 道具都圆乎乎的；纸张米黄底 + 飘着的小涂鸦。

export const T = {
  ink: "#3B2A20",
  inkSoft: "rgba(59,42,32,0.55)",
  paper: "#FFFBF2",
  cream0: "#FFF6E3",
  cream1: "#F5E4C3",
  skin: "#FFE0C4",
  blush: "#FF9E8C",
  red: "#F2735A",
  teal: "#3EBFB0",
  gold: "#F4B942",
  sky: "#74B7F0",
  lilac: "#A58BDB",
  pink: "#FF9EB0",
  leaf: "#8CCB6E",
  wood: "#E2A86A",
  woodDark: "#B97C45",
  panel: "#E9D3AE", panelHead: "#3B2A20", panelHeadText: "#FFF6E3", knob: "#F7DDB0", knobLocked: "#C9C0B2", tick: "#D9C9AC", ground: "#F1DDB5", onBg: "#3B2A20", onBgSoft: "rgba(59,42,32,0.55)",
  line: "#3B2A20", shadow: "0 10px 0 rgba(59,42,32,0.16)", // 卡片边框、投影（wall 主题换成产品界面式的细边框和柔和长投影）
};
// 风格测试：主题开关（颜色、描边粗细、手抖、背景）
export type ThemeName = "toon" | "white" | "chalk" | "dark" | "news" | "blue" | "neon" | "water" | "wall";
export const TH = { name: "toon" as ThemeName, sw: 3.2, boil: true, boilScale: 2.6, wall: false, outlineLabels: false, stageT: -1, q: false }; // q：Kid 换成自备角色精灵图
const BASE_T = { ...T };
const PALETTES: Record<ThemeName, Partial<typeof T> & { sw: number; boil: boolean; boilScale?: number; wall?: boolean; outlineLabels?: boolean }> = {
  toon: { sw: 3.2, boil: true },
  white: { ink: "#22303F", inkSoft: "rgba(34,48,63,0.5)", paper: "#FFFFFF", cream0: "#FFFFFF", cream1: "#E4EAF1", skin: "#FFE3CF", blush: "#FFB3A6", red: "#F0464B", teal: "#12B3C9", gold: "#F5A623", sky: "#6FA8FF", lilac: "#9C8CF0", pink: "#FF8FA8", leaf: "#5CC98A", wood: "#C9D3DE", woodDark: "#8796A8",
    panel: "#F3F6FA", panelHead: "#22303F", panelHeadText: "#FFFFFF", knob: "#FFFFFF", knobLocked: "#D5DBE3", tick: "#DDE3EA", ground: "#E9EEF4", sw: 2.4, boil: false },
  chalk: { ink: "#F3F0E6", inkSoft: "rgba(243,240,230,0.55)", paper: "#2C4A3C", cream0: "#2C4A3C", cream1: "#1C3127", skin: "#F2D7BE", blush: "#F0A99A", red: "#F08C7C", teal: "#7FD6C4", gold: "#F2CF5B", sky: "#8FC1EE", lilac: "#C2AEF0", pink: "#F4A9BC", leaf: "#A3D886", wood: "#B58F63", woodDark: "#7E6244",
    panel: "#2F5243", panelHead: "#F3F0E6", panelHeadText: "#23392F", knob: "#3A6152", knobLocked: "#4F5F59", tick: "#4E6B5E", ground: "#2A4638", sw: 3.6, boil: true, boilScale: 3.6 },
  dark: { ink: "#0E1630", inkSoft: "rgba(14,22,48,0.55)", onBgSoft: "rgba(220,230,255,0.62)", paper: "#F4F6FF", cream0: "#F4F6FF", cream1: "#D7DEF5", skin: "#FFD9C2", blush: "#FF9FB0", red: "#FF5D73", teal: "#2DE2C5", gold: "#FFC93C", sky: "#4DA3FF", lilac: "#A07CFF", pink: "#FF8AC2", leaf: "#7BE07B", wood: "#7F8CC7", woodDark: "#4A5694",
    panel: "#26387A", panelHead: "#0E1630", panelHeadText: "#FFFFFF", knob: "#F4F6FF", knobLocked: "#8E98BD", tick: "#3A4C8F", ground: "#1A2A5E", onBg: "#E6ECFF", sw: 3.0, boil: false, wall: true },
  blue: { ink: "#F2F7FF", inkSoft: "rgba(242,247,255,0.55)", paper: "#2A5CB0", cream0: "#2A5CB0", cream1: "#1D4690", skin: "#9FC2F2", blush: "#7FA9E6", red: "#9FC2F2", teal: "#C6DCFA", gold: "#DCEAFF", sky: "#86AEE8", lilac: "#7EA2DE", pink: "#A9C6F2", leaf: "#B8D2F6", wood: "#5B86CC", woodDark: "#3D68B0",
    panel: "#24539F", panelHead: "#F2F7FF", panelHeadText: "#1D4690", knob: "#2F63B8", knobLocked: "#3A5F99", tick: "#3E6DB8", ground: "#1D4690", sw: 2.6, boil: false, outlineLabels: true },
  neon: { ink: "#7CF7FF", inkSoft: "rgba(124,247,255,0.5)", paper: "#12142A", cream0: "#12142A", cream1: "#0A0B18", skin: "#2A2440", blush: "#FF5BD1", red: "#FF3D7F", teal: "#00F0D0", gold: "#FFE14D", sky: "#3DA9FF", lilac: "#B36BFF", pink: "#FF5BD1", leaf: "#5CFF8A", wood: "#2A2D52", woodDark: "#3B3F75",
    panel: "#0F1124", panelHead: "#7CF7FF", panelHeadText: "#07070F", knob: "#1A1D38", knobLocked: "#24263F", tick: "#22264A", ground: "#0A0B18", sw: 2.6, boil: false, outlineLabels: true },
  wall: { line: "rgba(40,32,26,0.16)", shadow: "0 22px 40px -16px rgba(40,30,20,0.34), 0 2px 6px rgba(40,30,20,0.06)", ink: "#34302C", inkSoft: "rgba(52,48,44,0.5)", paper: "#FFFFFF", cream0: "#E8E1D9", cream1: "#D9CFC4", ground: "#E9DCC8", onBg: "#3E352E", onBgSoft: "rgba(62,53,46,0.55)", panel: "#EBDDC6", sw: 2.2, boil: false, wall: true },
  water: { ink: "#5A4E44", inkSoft: "rgba(90,78,68,0.5)", paper: "#FFFDF7", cream0: "#FFFDF7", cream1: "#F1E9DA", skin: "#FBE0CC", blush: "#F2A99A", red: "#E98A7A", teal: "#7FC6BE", gold: "#F1C76B", sky: "#8DB8E0", lilac: "#B9A5D9", pink: "#F2A7B8", leaf: "#A5CF8A", wood: "#D9B48C", woodDark: "#B08A63",
    panel: "#F4ECDD", panelHead: "#5A4E44", panelHeadText: "#FFFDF7", knob: "#FFFDF7", knobLocked: "#E2D8C8", tick: "#E6DCCB", ground: "#F1E9DA", sw: 2.2, boil: true, boilScale: 1.6 },
  news: { ink: "#161616", inkSoft: "rgba(22,22,22,0.55)", paper: "#FBF8F0", cream0: "#FBF8F0", cream1: "#E3D9C3", skin: "#F6D3B5", blush: "#EFA08F", red: "#D8392B", teal: "#1F8A7D", gold: "#F2B705", sky: "#3D6FB6", lilac: "#7B5EA7", pink: "#E77A8F", leaf: "#5BA548", wood: "#C9A27A", woodDark: "#8A6643",
    panel: "#E3D9C3", panelHead: "#161616", panelHeadText: "#FBF8F0", knob: "#FBF8F0", knobLocked: "#BDB4A3", tick: "#CFC5B0", ground: "#E3D9C3", sw: 4.2, boil: false },
};
// 品牌字墙（meta.brand，写你自己的品牌名）：一行一行，相邻行反向、一快一慢；镜头每动一次整面墙被推一下；实心字和空心描边字交替（只在 TH.wall 的主题里画）
/** 品牌字墙。area 给了就按这块世界坐标铺满（段内多块画布、块之间隔得远时用），并只画 view 范围里的行和字 */
export const BrandWall: React.FC<{ t: number; brand: string; kicks: number[]; area?: { x0: number; y0: number; x1: number; y1: number }; view?: { x0: number; y0: number; x1: number; y1: number } }> = ({ t, brand, kicks, area, view }) => {
  if (!TH.wall) return null;
  const kick = kicks.reduce((a, k) => a + (t > k ? 1 - Math.exp(-(t - k) / 0.3) : 0), 0);
  const word = [...brand].reduce((w, c) => w + (c === " " ? 56 : c.charCodeAt(0) < 128 ? 112 : 154), 0) + 110; // 一组品牌字加间隔的宽（中英混排：中文约 154、英文大写约 112、空格 56，字号 150）
  const rgb = (h: string) => { const m = h.replace("#", ""); return [0, 2, 4].map((k) => parseInt(m.slice(k, k + 2), 16)).join(","); };
  const dark = ["dark", "chalk", "neon", "blue"].includes(TH.name);
  const base = TH.name === "dark" ? "150,180,255" : rgb(T.onBg);
  const fill = `rgba(${base},${dark ? 0.1 : TH.name === "wall" ? 0.075 : 0.06})`, line = `rgba(${base},${dark ? 0.22 : TH.name === "wall" ? 0.17 : 0.14})`;
  return (
    <div style={{ position: "absolute", left: 0, top: 0, filter: "blur(1.1px)" }}>
      {Array.from({ length: area ? Math.ceil((area.y1 - area.y0 + 1400) / 190) : 18 }, (_, r) => {
        const odd = r % 2 === 1;
        const v = (odd ? 16 : 46) * (1 + 0.2 * Math.sin(r * 1.7));
        const off = ((odd ? -1 : 1) * (v * t + kick * (odd ? 60 : 160)) + r * 137) % word;
        const top = (area ? area.y0 : 0) - 700 + r * 190, left0 = (area ? area.x0 : 0) - 2 * word - 600 + off;
        if (view && (top > view.y1 + 200 || top < view.y0 - 400)) return null;
        const n = area ? Math.ceil((area.x1 - area.x0 + 1800) / word) + 2 : 14;
        const i0 = view ? Math.max(0, Math.floor((view.x0 - left0) / word) - 1) : 0, i1 = view ? Math.min(n, Math.ceil((view.x1 - left0) / word) + 1) : n;
        return (
          <div key={r} style={{ position: "absolute", left: left0 + i0 * word, top, whiteSpace: "nowrap", fontFamily: F.cn, fontWeight: 900, fontSize: 150, lineHeight: "190px", letterSpacing: 4 }}>
            {Array.from({ length: Math.max(0, i1 - i0) }, (_, j) => { const i = i0 + j; return (
              <span key={i} style={{ display: "inline-block", width: word, color: (i + r) % 2 ? "transparent" : fill, WebkitTextStroke: (i + r) % 2 ? `2.5px ${line}` : undefined }}>{brand}</span>
            ); })}
          </div>
        );
      })}
    </div>
  );
};

// 每种风格的标志性质感：白卡 = 柔和悬浮投影；深色 = 霓虹微光；报纸 = 黑色硬投影（剪纸贴上去）
const THEME_FX: Record<ThemeName, string | undefined> = {
  toon: undefined, chalk: undefined, wall: "drop-shadow(0 10px 18px rgba(90,64,40,0.13))",
  white: "drop-shadow(0 18px 26px rgba(30,50,80,0.16))",
  dark: "drop-shadow(0 0 14px rgba(90,170,255,0.45))",
  news: "drop-shadow(7px 8px 0 rgba(22,22,22,0.9))",
  blue: "drop-shadow(0 0 1px rgba(255,255,255,0.6))",
  neon: "drop-shadow(0 0 5px rgba(0,229,255,0.9)) drop-shadow(0 0 16px rgba(179,107,255,0.45))",
  water: "url(#wcolor) saturate(0.92)",
};
export const applyTheme = (n: ThemeName) => {
  const p = PALETTES[n];
  Object.assign(T, BASE_T, { onBg: p.ink ?? BASE_T.ink, onBgSoft: p.inkSoft ?? BASE_T.inkSoft }, p);
  for (const k of ["sw", "boil", "boilScale", "wall", "outlineLabels"]) delete (T as Record<string, unknown>)[k];
  TH.name = n; TH.sw = p.sw; TH.boil = p.boil; TH.boilScale = p.boilScale ?? 2.6; TH.wall = p.wall ?? false; TH.outlineLabels = p.outlineLabels ?? false;
};

// ---------- 手绘抖动：同一套滤镜三个种子，每秒换 8 次 ----------
export const BoilDefs: React.FC = () => (
  <svg width={0} height={0} style={{ position: "absolute" }}>
    {[0, 1, 2].map((k) => (
      <filter key={k} id={`boil${k}`} x="-10%" y="-10%" width="120%" height="120%">
        <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed={k * 7 + 3} result="n" />
        <feDisplacementMap in="SourceGraphic" in2="n" scale={TH.boilScale} xChannelSelector="R" yChannelSelector="G" />
      </filter>
    ))}
  </svg>
);
export const boil = (t: number) => `url(#boil${Math.floor(t * 8) % 3})`;
/** 包一层手绘抖动 */
export const Wob: React.FC<{ t: number; children: React.ReactNode; style?: React.CSSProperties; off?: boolean }> = ({ t, children, style, off }) => (
  <div style={{ position: "absolute", inset: 0, filter: off || !TH.boil ? undefined : boil(t), ...style }}>{children}</div>
);

// ---------- 纸张底 + 飘着的小涂鸦 + 角落品牌章 ----------
const DOODLES = Array.from({ length: 26 }, (_, i) => ({
  x: (i * 263 + 97) % 1400 - 160, y: (i * 389 + 151) % 1700 - 130,
  k: i % 5, c: [T.gold, T.teal, T.pink, T.sky, T.leaf][i % 5], s: 0.7 + ((i * 37) % 10) / 14, ph: i * 1.7,
}));
const STARS = Array.from({ length: 70 }, (_, i) => ({ x: (i * 157 + 31) % 1080, y: (i * 263 + 77) % 1440, r: 1 + (i % 3), ph: i * 0.9 }));
export const Paper: React.FC<{ t: number; brand: string }> = ({ t, brand }) => {
  const stamp = <div style={{ position: "absolute", right: 40, bottom: 330, transform: "rotate(-8deg)", fontFamily: F.cn, fontWeight: 600, fontSize: 26, color: ["chalk", "dark", "neon", "blue"].includes(TH.name) ? "rgba(255,255,255,0.3)" : "rgba(120,90,60,0.32)", border: `2.5px solid ${["chalk", "dark", "neon", "blue"].includes(TH.name) ? "rgba(255,255,255,0.25)" : "rgba(120,90,60,0.28)"}`, borderRadius: 10, padding: "2px 10px" }}>{brand}</div>;
  if (TH.name === "wall") return (<>
    {/* 用户实拍墙的颜色（f498 拟合：上 230,222,215 → 下 212,206,198），切镜时空墙淡成这张底不跳色 */}
    <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, #E6DED6 0%, #DFD7CE 55%, #D6CCC2 100%)" }} />
    <div style={{ position: "absolute", inset: 0, background: "radial-gradient(90% 60% at 50% 30%, rgba(255,250,244,0.55) 0%, rgba(255,250,244,0) 70%)" }} />
    <svg width="100%" height="100%" style={{ position: "absolute", inset: 0, opacity: 0.07, mixBlendMode: "multiply" }}>
      <filter id="wallgrain"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="5" /><feColorMatrix values="0 0 0 0 0.35  0 0 0 0 0.28  0 0 0 0 0.2  0 0 0 1 0" /></filter>
      <rect width="100%" height="100%" filter="url(#wallgrain)" />
    </svg>
    </>);
  if (TH.name === "white") return (<>
    <div style={{ position: "absolute", inset: 0, background: "radial-gradient(120% 75% at 50% 30%, #FFFFFF 0%, #F2F5F9 55%, #E3E9F0 100%)" }} />
    <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(34,48,63,0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(34,48,63,0.045) 1px, transparent 1px)", backgroundSize: "60px 60px" }} />
    {stamp}</>);
  if (TH.name === "chalk") return (<>
    <div style={{ position: "absolute", inset: 0, background: "radial-gradient(120% 80% at 50% 35%, #2B4A3C 0%, #223A2F 60%, #18291F 100%)" }} />
    <svg width="100%" height="100%" style={{ position: "absolute", inset: 0, opacity: 0.22 }}>
      <filter id="chalkgrain"><feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="2" seed="9" /><feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.55 0" /></filter>
      <rect width="100%" height="100%" filter="url(#chalkgrain)" />
    </svg>
    {[[200, 260, 420, 120, -12], [760, 980, 520, 140, 8], [520, 620, 600, 90, -4]].map(([x, y, w, h, r], i) => <div key={i} style={{ position: "absolute", left: x - w / 2, top: y - h / 2, width: w, height: h, borderRadius: "50%", background: "rgba(255,255,255,0.05)", filter: "blur(24px)", transform: `rotate(${r}deg)` }} />)}
    <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 40, background: "#5A4128", borderTop: "4px solid #3A2A1A" }} />
    {stamp}</>);
  if (TH.name === "dark") return (<>
    <div style={{ position: "absolute", inset: 0, background: "radial-gradient(110% 75% at 50% 30%, #23367A 0%, #16224F 55%, #0B1230 100%)" }} />
    <svg width="100%" height="100%" style={{ position: "absolute", inset: 0 }}>
      {STARS.map((s, i) => <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#CFE0FF" opacity={0.25 + 0.35 * (0.5 + 0.5 * Math.sin(t * 2 + s.ph))} />)}
    </svg>
    <div style={{ position: "absolute", left: -200, top: 980, width: 1480, height: 900, borderRadius: "50%", background: "radial-gradient(closest-side, rgba(77,163,255,0.25), rgba(77,163,255,0))" }} />
    {stamp}</>);
  if (TH.name === "blue") return (<>
    <div style={{ position: "absolute", inset: 0, background: "radial-gradient(120% 80% at 50% 35%, #2F66BE 0%, #24539F 60%, #183E80 100%)" }} />
    <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(255,255,255,0.10) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.10) 1px, transparent 1px)", backgroundSize: "30px 30px" }} />
    <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(255,255,255,0.22) 2px, transparent 2px), linear-gradient(90deg, rgba(255,255,255,0.22) 2px, transparent 2px)", backgroundSize: "150px 150px" }} />
    <div style={{ position: "absolute", right: 40, bottom: 300, width: 300, height: 110, border: "2px solid rgba(255,255,255,0.5)", fontFamily: F.mono, fontSize: 18, color: "rgba(255,255,255,0.6)", padding: 10, boxSizing: "border-box", lineHeight: 1.5 }}>BEHIND THE TRAFFIC<br />SHEET 01 · {brand}</div>
    </>);
  if (TH.name === "neon") return (<>
    <div style={{ position: "absolute", inset: 0, background: "radial-gradient(110% 70% at 50% 30%, #1A1236 0%, #0B0A1A 60%, #05050C 100%)" }} />
    <svg width="100%" height="100%" style={{ position: "absolute", inset: 0 }}>
      {Array.from({ length: 13 }, (_, i) => { const x = -600 + i * 190; return <line key={i} x1={540} y1={760} x2={x} y2={1440} stroke="rgba(179,107,255,0.35)" strokeWidth="2" />; })}
      {Array.from({ length: 9 }, (_, i) => { const y = 760 + Math.pow((i + ((t * 0.6) % 1)) / 9, 2) * 680; return <line key={i} x1={0} x2={1080} y1={y} y2={y} stroke="rgba(0,229,255,0.28)" strokeWidth="2" />; })}
      <line x1="0" x2="1080" y1="760" y2="760" stroke="rgba(255,91,209,0.6)" strokeWidth="3" />
    </svg>
    <div style={{ position: "absolute", left: 0, right: 0, top: 640, height: 240, background: "radial-gradient(closest-side, rgba(255,91,209,0.25), rgba(255,91,209,0))" }} />
    {stamp}</>);
  if (TH.name === "water") return (<>
    <div style={{ position: "absolute", inset: 0, background: "#FBF7EE" }} />
    {[[260, 300, 520, T.sky], [820, 520, 460, T.pink], [420, 1000, 600, T.gold], [900, 1150, 420, T.teal]].map(([x, y, r, c], i) => <div key={i} style={{ position: "absolute", left: (x as number) - (r as number) / 2, top: (y as number) - (r as number) / 2, width: r as number, height: r as number, borderRadius: "50%", background: c as string, opacity: 0.12, filter: "blur(40px)" }} />)}
    <svg width="100%" height="100%" style={{ position: "absolute", inset: 0, opacity: 0.16, mixBlendMode: "multiply" }}>
      <filter id="wpaper"><feTurbulence type="fractalNoise" baseFrequency="0.55" numOctaves="3" seed="12" /><feColorMatrix values="0 0 0 0 0.45  0 0 0 0 0.38  0 0 0 0 0.3  0 0 0 1 0" /></filter>
      <rect width="100%" height="100%" filter="url(#wpaper)" />
    </svg>
    <svg width="0" height="0" style={{ position: "absolute" }}>
      <filter id="wcolor" x="-5%" y="-5%" width="110%" height="110%">
        <feTurbulence type="fractalNoise" baseFrequency="0.018" numOctaves="2" seed="4" result="n" />
        <feDisplacementMap in="SourceGraphic" in2="n" scale="9" xChannelSelector="R" yChannelSelector="G" result="d" />
        <feGaussianBlur in="d" stdDeviation="0.9" />
      </filter>
    </svg>
    {stamp}</>);
  if (TH.name === "news") return (<>
    <div style={{ position: "absolute", inset: 0, background: "#EFE8D8" }} />
    <div style={{ position: "absolute", inset: 0, opacity: 0.5, backgroundImage: "radial-gradient(rgba(22,22,22,0.16) 1.4px, transparent 1.6px)", backgroundSize: "11px 11px" }} />
    {Array.from({ length: 3 }, (_, c) => Array.from({ length: 34 }, (_, r) => <div key={`${c}-${r}`} style={{ position: "absolute", left: 50 + c * 340, top: 90 + r * 40, width: 300 - ((r * 37 + c * 11) % 5) * 26, height: 9, borderRadius: 2, background: "rgba(22,22,22,0.06)" }} />))}
    <svg width="100%" height="100%" style={{ position: "absolute", inset: 0, opacity: 0.12, mixBlendMode: "multiply" }}>
      <filter id="newsgrain"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="3" /><feColorMatrix values="0 0 0 0 0.3  0 0 0 0 0.25  0 0 0 0 0.15  0 0 0 1 0" /></filter>
      <rect width="100%" height="100%" filter="url(#newsgrain)" />
    </svg>
    {stamp}</>);
  return (
  <>
    <div style={{ position: "absolute", inset: 0, background: `radial-gradient(120% 75% at 50% 32%, ${T.cream0} 0%, #FBEED5 55%, ${T.cream1} 100%)` }} />
    <svg width="100%" height="100%" style={{ position: "absolute", inset: 0, opacity: 0.09, mixBlendMode: "multiply" }}>
      <filter id="grain"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="5" /><feColorMatrix values="0 0 0 0 0.35  0 0 0 0 0.25  0 0 0 0 0.15  0 0 0 1 0" /></filter>
      <rect width="100%" height="100%" filter="url(#grain)" />
    </svg>
    {stamp}
  </>
  );
};
/** 画布上的涂鸦层（放在镜头里，跟镜头走） */
export const DoodleField: React.FC<{ t: number }> = ({ t }) => TH.name !== "toon" && TH.name !== "chalk" ? null : (
  <svg style={{ position: "absolute", left: 0, top: 0, overflow: "visible", opacity: 0.5 }} width={1} height={1}>
    {DOODLES.map((d, i) => {
      const x = d.x + Math.sin(t * 0.4 + d.ph) * 14, y = d.y + Math.cos(t * 0.33 + d.ph) * 12, r = (t * 12 + i * 40) % 360;
      return (
        <g key={i} transform={`translate(${x} ${y}) rotate(${d.k === 0 ? r : 0}) scale(${d.s})`} stroke={TH.name === "chalk" ? "rgba(243,240,230,0.5)" : d.c} strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round">
          {d.k === 0 ? <path d="M0 -10 L2.5 -2.5 L10 0 L2.5 2.5 L0 10 L-2.5 2.5 L-10 0 L-2.5 -2.5 Z" fill={d.c} stroke="none" /> : null}
          {d.k === 1 ? <circle r="5" fill={d.c} stroke="none" /> : null}
          {d.k === 2 ? <path d="M-14 0 Q-7 -8 0 0 T14 0" /> : null}
          {d.k === 3 ? <circle r="8" /> : null}
          {d.k === 4 ? <path d="M-6 -6 L6 6 M6 -6 L-6 6" /> : null}
        </g>
      );
    })}
  </svg>
);

// ---------- 说话：嘴跟着口播的字一张一合 ----------
const WORDS = wordsJson as { w: string; start: number; end: number }[];
/** t 落在某个字上时返回 0-1 的张嘴程度（只在 [from, to) 区间内说话） */
export const talkAt = (t: number, from: number, to: number) => {
  if (t < from || t >= to) return 0;
  const w = WORDS.find((x) => t >= x.start && t < x.end);
  if (!w) return 0;
  const n = Math.max(1, [...w.w.replace(/[，。,.]/g, "")].length);
  const u = ((t - w.start) / Math.max(0.05, w.end - w.start)) * n;
  return Math.abs(Math.sin(u * Math.PI)) * 0.9 + 0.1;
};

// ---------- 小人 ----------
export type Look = "tutor" | "viewer" | "creator" | "friend" | "celeb" | "kidA" | "kidB" | "kidC";
export type Mood = "calm" | "smile" | "happy" | "smug" | "angry" | "sad" | "shock" | "sleepy" | "tired";
export type Pose = "down" | "hips" | "point" | "up" | "wave" | "hold" | "fist" | "shrug" | "cross" | "scroll";
const OUTFIT: Record<Look, { body: string; pants: string; hair: string }> = {
  tutor: { body: "#8696B8", pants: "#5D6A86", hair: "#3B2A20" },
  viewer: { body: "#7FB3E6", pants: "#4F6C8F", hair: "#6A4630" },
  creator: { body: "#43C1B5", pants: "#3E5A6E", hair: "#4A3022" },
  friend: { body: "#F4BC4F", pants: "#7A5A3C", hair: "#8A5234" },
  celeb: { body: "#9B7BD8", pants: "#4B3C6E", hair: "#2E2018" },
  kidA: { body: "#FF9EB0", pants: "#6E5A8C", hair: "#5A3A28" },
  kidB: { body: "#8CCB6E", pants: "#4F6C5A", hair: "#3E2A1E" },
  kidC: { body: "#F2A65A", pants: "#5C4A7A", hair: "#2E2018" },
};
type V = [number, number];
const ARMS: Record<Pose, (j: number) => { L: [V, V]; R: [V, V] }> = {
  // [手的位置, 肘部控制点]，肩膀在 (±34, -112)
  down: () => ({ L: [[-46, -64], [-50, -92]], R: [[46, -64], [50, -92]] }),
  hips: () => ({ L: [[-34, -76], [-68, -98]], R: [[34, -76], [68, -98]] }),
  point: () => ({ L: [[-46, -64], [-50, -92]], R: [[94, -150], [66, -128]] }),
  up: (j) => ({ L: [[-60, -206 + j], [-62, -160]], R: [[60, -206 - j], [62, -160]] }),
  wave: (j) => ({ L: [[-46, -64], [-50, -92]], R: [[64 + j * 1.4, -196], [64, -150]] }),
  hold: () => ({ L: [[-16, -90], [-50, -96]], R: [[16, -90], [50, -96]] }),
  fist: (j) => ({ L: [[-58, -182 + j], [-64, -140]], R: [[58, -182 - j], [64, -140]] }),
  shrug: () => ({ L: [[-76, -126], [-58, -92]], R: [[76, -126], [58, -92]] }),
  cross: () => ({ L: [[24, -96], [-44, -88]], R: [[-24, -102], [44, -92]] }),
  scroll: (j) => ({ L: [[-10, -98], [-48, -100]], R: [[14, -104 + j * 0.3], [48, -98]] }),
};

export const Kid: React.FC<{
  x: number; feet: number; s?: number; t: number; seed?: number; look?: Look; mood?: Mood; pose?: Pose;
  talk?: number; flip?: boolean; back?: boolean; squash?: number; dy?: number; rot?: number; op?: number; z?: number;
  walk?: number; eye?: number; prop?: "pointer" | "mega" | "phone" | null; dull?: number; lit?: number; sweat?: boolean; still?: boolean; crop?: "head" | "bust";
}> = ({ x, feet, s = 1, t, seed = 0, look = "viewer", mood = "calm", pose = "down", talk = 0, flip, back, squash = 0, dy = 0, rot = 0, op = 1, z,
  walk, eye = 0, prop = null, dull = 0, lit = 0, sweat, still, crop }) => {
  if (op <= 0.001 || s <= 0.001) return null;
  if (TH.q) return <QKid x={x} feet={feet} s={s} t={t} seed={seed} look={look} mood={mood} pose={pose} flip={flip} squash={squash} dy={dy} rot={rot} op={op} z={z} walk={walk} dull={dull} sweat={sweat} still={still} crop={crop} />;
  const o = OUTFIT[look];
  const id = `k${seed}`;
  // 呼吸 + 眨眼
  const br = still ? 0 : Math.sin(t * 2.3 + seed * 1.3);
  const blinkP = 2.6 + (seed % 5) * 0.37;
  const blink = !still && ((t + seed * 0.71) % blinkP) < 0.11 && mood !== "happy" && mood !== "sleepy";
  const j = Math.sin(t * (pose === "fist" ? 26 : 8) + seed) * (pose === "fist" ? 6 : 10);
  const arms = ARMS[pose](j);
  const ex = eye * 4; // 眼珠往哪看
  const leg = walk === undefined ? 0 : Math.sin(walk) * 20;
  const bob = walk === undefined ? br * 1.4 : -Math.abs(Math.sin(walk)) * 6;
  const armPath = ([h, e]: [V, V], sx: number) => `M${sx} -112 Q${e[0]} ${e[1]} ${h[0]} ${h[1]}`;
  const eyeL = -16, eyeR = 16, eyeY = -163;
  const brow = (sd: -1 | 1) => {
    const x0 = sd * 26, x1 = sd * 8;
    const m: Record<Mood, [number, number]> = { calm: [-182, -183], smile: [-184, -186], happy: [-186, -188], smug: sd < 0 ? [-190, -186] : [-181, -182], angry: [-188, -178], sad: [-178, -186], shock: [-192, -194], sleepy: [-180, -180], tired: [-178, -184] };
    const [y0, y1] = m[mood];
    return <path d={`M${x0} ${y0} Q${(x0 + x1) / 2} ${Math.min(y0, y1) - 3} ${x1} ${y1}`} stroke={o.hair} strokeWidth="4.2" fill="none" strokeLinecap="round" />;
  };
  const eyes = () => {
    if (back) return null;
    if (blink || mood === "sleepy") return <g stroke={T.ink} strokeWidth="3.2" fill="none" strokeLinecap="round">{[eyeL, eyeR].map((ex0) => <path key={ex0} d={`M${ex0 - 6} ${eyeY} Q${ex0} ${eyeY + 4} ${ex0 + 6} ${eyeY}`} />)}</g>;
    if (mood === "happy") return <g stroke={T.ink} strokeWidth="3.4" fill="none" strokeLinecap="round">{[eyeL, eyeR].map((ex0) => <path key={ex0} d={`M${ex0 - 7} ${eyeY + 2} Q${ex0} ${eyeY - 8} ${ex0 + 7} ${eyeY + 2}`} />)}</g>;
    if (mood === "shock") return <g>{[eyeL, eyeR].map((ex0) => <g key={ex0}><circle cx={ex0} cy={eyeY} r="9" fill="#fff" stroke={T.ink} strokeWidth="2.6" /><circle cx={ex0 + ex} cy={eyeY} r="3.4" fill={T.ink} /></g>)}</g>;
    if (mood === "smug" || mood === "tired") return <g>{[eyeL, eyeR].map((ex0) => <g key={ex0}><path d={`M${ex0 - 6.5} ${eyeY - 1} A6.5 6.5 0 0 0 ${ex0 + 6.5} ${eyeY - 1} Z`} fill={T.ink} /><line x1={ex0 - 8} y1={eyeY - 1.5} x2={ex0 + 8} y2={eyeY - 1.5} stroke={T.ink} strokeWidth="3" strokeLinecap="round" /></g>)}</g>;
    return <g>{[eyeL, eyeR].map((ex0) => <g key={ex0}><ellipse cx={ex0 + ex} cy={eyeY} rx="5.6" ry="7.6" fill={T.ink} /><circle cx={ex0 + ex + 2} cy={eyeY - 3} r="2.2" fill="#fff" /></g>)}</g>;
  };
  const mouth = () => {
    if (back) return null;
    const my = -144;
    if (talk > 0.05 || mood === "angry") {
      const oy = mood === "angry" ? 9 + 4 * Math.abs(Math.sin(t * 20)) : 3 + 9 * talk;
      return <g><ellipse cx="0" cy={my} rx={mood === "angry" ? 10 : 7.5} ry={oy} fill="#7A2E2A" stroke={T.ink} strokeWidth="2.6" /><ellipse cx="0" cy={my + oy * 0.45} rx="4.5" ry={Math.max(1, oy * 0.35)} fill="#F07A72" /></g>;
    }
    const d: Record<Mood, string> = {
      calm: `M-7 ${my} Q0 ${my + 4} 7 ${my}`, smile: `M-10 ${my - 2} Q0 ${my + 9} 10 ${my - 2}`, happy: "", smug: `M-8 ${my + 1} Q3 ${my + 5} 11 ${my - 5}`,
      angry: "", sad: `M-8 ${my + 4} Q0 ${my - 4} 8 ${my + 4}`, shock: "", sleepy: `M-5 ${my} Q0 ${my + 3} 5 ${my}`, tired: `M-7 ${my + 2} Q0 ${my - 1} 7 ${my + 2}`,
    };
    if (mood === "happy") return <path d={`M-12 ${my - 3} Q0 ${my + 16} 12 ${my - 3} Z`} fill="#7A2E2A" stroke={T.ink} strokeWidth="2.6" strokeLinejoin="round" />;
    if (mood === "shock") return <ellipse cx="0" cy={my + 1} rx="6" ry="8" fill="#7A2E2A" stroke={T.ink} strokeWidth="2.6" />;
    return <path d={d[mood]} fill="none" stroke={T.ink} strokeWidth="3.2" strokeLinecap="round" />;
  };
  const hairBack = () => (look === "friend" ? <path d="M-54 -150 C-60 -202 -30 -228 0 -226 C30 -228 60 -202 54 -150 C54 -136 44 -130 38 -134 L-38 -134 C-44 -130 -54 -136 -54 -150 Z" fill={o.hair} stroke={T.ink} strokeWidth={TH.sw} /> : look === "kidB" ? <circle cx="0" cy="-222" r="17" fill={o.hair} stroke={T.ink} strokeWidth={TH.sw} /> : null);
  const hairFront = () => {
    if (back) return <path d="M-47 -160 C-52 -210 -20 -218 0 -218 C20 -218 52 -210 47 -160 C44 -140 30 -128 0 -127 C-30 -128 -44 -140 -47 -160 Z" fill={o.hair} stroke={T.ink} strokeWidth={TH.sw} />;
    switch (look) {
      case "tutor": case "celeb": return <path d="M-48 -166 C-52 -205 -20 -222 6 -219 C34 -216 52 -198 48 -168 C42 -186 30 -194 14 -196 C-4 -198 -8 -186 -22 -186 C-34 -186 -42 -178 -48 -166 Z" fill={o.hair} stroke={T.ink} strokeWidth={TH.sw} strokeLinejoin="round" />;
      case "viewer": return <path d="M-47 -168 C-53 -200 -30 -222 -4 -220 C10 -233 32 -224 35 -212 C51 -206 53 -186 47 -168 C40 -180 34 -186 26 -184 C22 -195 12 -199 4 -190 C-6 -201 -20 -197 -26 -186 C-34 -189 -42 -180 -47 -168 Z" fill={o.hair} stroke={T.ink} strokeWidth={TH.sw} strokeLinejoin="round" />;
      case "creator": return <g><path d="M-47 -166 C-49 -206 -18 -220 4 -218 C30 -216 51 -200 47 -166 C40 -184 24 -192 4 -192 C-16 -192 -36 -184 -47 -166 Z" fill={o.hair} stroke={T.ink} strokeWidth={TH.sw} strokeLinejoin="round" /><path d={`M6 -217 C10 ${-232 + br} 24 ${-232 + br} 21 -223`} stroke={T.ink} strokeWidth={TH.sw} fill="none" strokeLinecap="round" /></g>;
      case "friend": return <path d="M-45 -172 C-41 -206 -10 -219 8 -215 C30 -213 47 -197 45 -172 C34 -184 24 -180 16 -187 C10 -178 -2 -176 -10 -185 C-18 -176 -32 -178 -45 -172 Z" fill={o.hair} stroke={T.ink} strokeWidth={TH.sw} strokeLinejoin="round" />;
      case "kidA": return <g><path d="M-47 -176 C-45 -216 45 -216 47 -176 Z" fill={T.sky} stroke={T.ink} strokeWidth={TH.sw} strokeLinejoin="round" /><path d="M8 -178 L66 -175 C62 -168 30 -168 8 -171 Z" fill={T.sky} stroke={T.ink} strokeWidth={TH.sw} strokeLinejoin="round" /></g>;
      case "kidB": return <path d="M-47 -168 C-47 -210 47 -210 47 -168 C30 -184 -30 -184 -47 -168 Z" fill={o.hair} stroke={T.ink} strokeWidth={TH.sw} strokeLinejoin="round" />;
      default: return <path d="M-47 -168 L-40 -204 L-24 -194 L-14 -222 L0 -200 L14 -224 L24 -196 L40 -206 L47 -168 C30 -182 -30 -182 -47 -168 Z" fill={o.hair} stroke={T.ink} strokeWidth={TH.sw} strokeLinejoin="round" />;
    }
  };
  const outfit = () => {
    switch (look) {
      case "tutor": return <g><path d="M-13 -125 L0 -100 L13 -125 Z" fill="#fff" stroke={T.ink} strokeWidth="2.4" strokeLinejoin="round" /><path d="M-5 -117 L5 -117 L8 -80 L0 -70 L-8 -80 Z" fill={T.red} stroke={T.ink} strokeWidth="2.4" strokeLinejoin="round" /></g>;
      case "viewer": return <g><path d="M-22 -72 L22 -72 L18 -54 L-18 -54 Z" fill="rgba(255,255,255,0.25)" stroke={T.ink} strokeWidth="2.4" strokeLinejoin="round" /><path d="M-8 -122 L-10 -100 M8 -122 L10 -100" stroke="#fff" strokeWidth="3" strokeLinecap="round" /></g>;
      case "creator": return <path d="M0 -98 L3 -90 L11 -90 L5 -85 L7 -77 L0 -82 L-7 -77 L-5 -85 L-11 -90 L-3 -90 Z" fill="#fff" />;
      case "friend": return <g stroke="rgba(255,255,255,0.6)" strokeWidth="4" strokeLinecap="round"><line x1="-34" y1="-84" x2="34" y2="-84" /><line x1="-36" y1="-64" x2="36" y2="-64" /></g>;
      case "celeb": return <path d="M-12 -120 L0 -112 L12 -120 L12 -104 L0 -112 L-12 -104 Z" fill={T.gold} stroke={T.ink} strokeWidth="2.2" strokeLinejoin="round" />;
      default: return null;
    }
  };
  const W = 220 * s, Hh = 280 * s;
  return (
    <div style={{ position: "absolute", left: x - 110 * s, top: feet - 262 * s + dy, width: W, height: Hh, opacity: op, zIndex: z,
      transform: `${flip ? "scaleX(-1) " : ""}scaleY(${1 - squash}) scaleX(${1 + squash * 0.5}) rotate(${rot}deg)`, transformOrigin: `${110 * s}px ${262 * s}px`,
      filter: dull > 0 ? `grayscale(${0.85 * dull}) brightness(${1 + 0.05 * dull})` : undefined }}>
      <svg width={W} height={Hh} viewBox="-110 -262 220 280" style={{ overflow: "visible" }}>
        {lit > 0 ? <circle cx="0" cy="-130" r="120" fill={`url(#${id}g)`} opacity={lit} /> : null}
        <defs><radialGradient id={`${id}g`}><stop offset="0" stopColor="#FFE38A" stopOpacity="0.85" /><stop offset="1" stopColor="#FFE38A" stopOpacity="0" /></radialGradient></defs>
        <ellipse cx="0" cy="4" rx="44" ry="8" fill="rgba(59,42,32,0.14)" />
        {/* 腿 */}
        <g transform={`rotate(${leg} -14 -44)`}><path d="M-23 -46 L-6 -46 L-7 -10 L-22 -10 Z" fill={o.pants} stroke={T.ink} strokeWidth={TH.sw} strokeLinejoin="round" /><ellipse cx="-16" cy="-6" rx="15" ry="8" fill={T.ink} /></g>
        <g transform={`rotate(${-leg} 14 -44)`}><path d="M6 -46 L23 -46 L22 -10 L7 -10 Z" fill={o.pants} stroke={T.ink} strokeWidth={TH.sw} strokeLinejoin="round" /><ellipse cx="16" cy="-6" rx="15" ry="8" fill={T.ink} /></g>
        <g transform={`translate(0 ${bob}) scale(1 ${1 + br * 0.01})`}>
          {/* 身体 */}
          <path d="M-35 -122 C-42 -100 -44 -64 -39 -40 L39 -40 C44 -64 42 -100 35 -122 C20 -129 -20 -129 -35 -122 Z" fill={o.body} stroke={T.ink} strokeWidth={TH.sw} strokeLinejoin="round" />
          {back ? null : outfit()}
          {/* 手臂（袖子描边 + 填色）+ 手 */}
          {([["L", -34], ["R", 34]] as const).map(([k, sx]) => (
            <g key={k}>
              <path d={armPath(arms[k], sx)} stroke={T.ink} strokeWidth="21" fill="none" strokeLinecap="round" />
              <path d={armPath(arms[k], sx)} stroke={o.body} strokeWidth="14.5" fill="none" strokeLinecap="round" />
              <circle cx={arms[k][0][0]} cy={arms[k][0][1]} r="10" fill={T.skin} stroke={T.ink} strokeWidth="2.8" />
            </g>
          ))}
          {prop === "pointer" ? <g><line x1={arms.R[0][0]} y1={arms.R[0][1]} x2={arms.R[0][0] + 44} y2={arms.R[0][1] - 40} stroke={T.woodDark} strokeWidth="6" strokeLinecap="round" /><circle cx={arms.R[0][0] + 44} cy={arms.R[0][1] - 40} r="4.5" fill={T.red} /></g> : null}
          {prop === "mega" ? (
            <g transform={`translate(${arms.R[0][0]} ${arms.R[0][1]}) rotate(-30)`}>
              <path d="M2 -9 L40 -24 L40 24 L2 9 Z" fill={T.gold} stroke={T.ink} strokeWidth="2.8" strokeLinejoin="round" />
              <ellipse cx="40" cy="0" rx="6" ry="24" fill="#FFE7A8" stroke={T.ink} strokeWidth="2.8" />
            </g>
          ) : null}
          {prop === "phone" ? <g transform={`translate(${arms.L[0][0] + 4} ${arms.L[0][1] - 18}) rotate(-8)`}><rect x="-13" y="-22" width="26" height="42" rx="6" fill={T.pink} stroke={T.ink} strokeWidth="2.6" /><rect x="-8" y="-16" width="16" height="28" rx="3" fill="#FFF7E8" /></g> : null}
          {/* 头 */}
          {hairBack()}
          <circle cx="-46" cy="-158" r="9" fill={T.skin} stroke={T.ink} strokeWidth={TH.sw} />
          <circle cx="46" cy="-158" r="9" fill={T.skin} stroke={T.ink} strokeWidth={TH.sw} />
          <circle cx="0" cy="-164" r="47" fill={T.skin} stroke={T.ink} strokeWidth={TH.sw} />
          {back ? null : <g><ellipse cx="-27" cy="-147" rx="9" ry="5.5" fill={T.blush} opacity="0.55" /><ellipse cx="27" cy="-147" rx="9" ry="5.5" fill={T.blush} opacity="0.55" /></g>}
          {hairFront()}
          {back ? null : <>{brow(-1)}{brow(1)}{eyes()}{mouth()}</>}
          {!back && look === "tutor" ? (
            <g>
              <g fill="rgba(255,255,255,0.28)" stroke={T.ink} strokeWidth="2.8"><circle cx={eyeL} cy={eyeY} r="13" /><circle cx={eyeR} cy={eyeY} r="13" /></g>
              <line x1="-3" y1={eyeY - 1} x2="3" y2={eyeY - 1} stroke={T.ink} strokeWidth="2.8" />
              <path d={`M-16 -153 C-9 -${159 + talk * 2} -2 -156 0 -152 C2 -156 9 -${159 + talk * 2} 16 -153 C9 -149 2 -150 0 -152 C-2 -150 -9 -149 -16 -153 Z`} fill={o.hair} />
            </g>
          ) : null}
          {!back && look === "celeb" ? <g fill={T.ink}><rect x="-30" y={eyeY - 9} width="24" height="16" rx="6" /><rect x="6" y={eyeY - 9} width="24" height="16" rx="6" /><line x1="-6" y1={eyeY - 3} x2="6" y2={eyeY - 3} stroke={T.ink} strokeWidth="3" /></g> : null}
          {sweat ? <path d={`M38 ${-186 + ((t * 30) % 18)} C44 -176 46 -170 40 -166 C34 -168 34 -176 38 ${-186 + ((t * 30) % 18)} Z`} fill="#9CD3FF" stroke={T.ink} strokeWidth="2" /> : null}
        </g>
      </svg>
    </div>
  );
};
export const kidHead = (feet: number, s = 1) => feet - 164 * s; // 头中心 y
export const kidTop = (feet: number, s = 1) => feet - 222 * s; // 头发顶 y

// ---------- 表情符号（漫画里的小符号） ----------
export const Emote: React.FC<{ kind: "anger" | "sweat" | "sparkle" | "question" | "exclaim" | "zzz" | "heart" | "note" | "dizzy"; x: number; y: number; s?: number; t: number; at?: number; z?: number; rot?: number }> = ({ kind, x, y, s = 1, t, at = 0, z = 30, rot = 0 }) => {
  const k = t < at ? 0 : Math.min(1, (t - at) / 0.25);
  if (k <= 0) return null;
  const pop = k < 1 ? 1 + Math.sin(k * Math.PI) * 0.35 : 1 + Math.sin((t - at) * 6) * 0.05;
  const body = (() => {
    switch (kind) {
      case "anger": return <g stroke={T.red} strokeWidth="6" fill="none" strokeLinecap="round"><path d="M-16 -4 Q-6 -6 -4 -16" /><path d="M4 -16 Q6 -6 16 -4" /><path d="M-16 4 Q-6 6 -4 16" /><path d="M4 16 Q6 6 16 4" /></g>;
      case "sweat": return <path d="M0 -20 C10 -4 12 6 0 12 C-12 6 -10 -4 0 -20 Z" fill="#9CD3FF" stroke={T.ink} strokeWidth="2.6" />;
      case "sparkle": return <g fill={T.gold} stroke={T.ink} strokeWidth="2.2" strokeLinejoin="round"><path d="M0 -20 Q3 -3 20 0 Q3 3 0 20 Q-3 3 -20 0 Q-3 -3 0 -20 Z" /><path d="M22 -18 Q23 -13 28 -12 Q23 -11 22 -6 Q21 -11 16 -12 Q21 -13 22 -18 Z" /></g>;
      case "question": return <text x="0" y="14" textAnchor="middle" fontFamily={F.num} fontWeight="800" fontSize="44" fill={T.sky} stroke={T.ink} strokeWidth="2">?</text>;
      case "exclaim": return <text x="0" y="16" textAnchor="middle" fontFamily={F.num} fontWeight="800" fontSize="48" fill={T.red} stroke={T.ink} strokeWidth="2">!</text>;
      case "zzz": return <g fontFamily={F.num} fontWeight="800" fill={T.sky} stroke={T.ink} strokeWidth="1.6">{[0, 1, 2].map((i) => <text key={i} x={i * 16} y={-i * 18 - ((t * 20) % 12)} fontSize={22 + i * 6} opacity={0.6 + 0.4 * Math.sin(t * 3 + i)}>z</text>)}</g>;
      case "heart": return <path d="M0 14 C-22 0 -16 -18 -4 -14 C-1 -13 0 -10 0 -9 C0 -10 1 -13 4 -14 C16 -18 22 0 0 14 Z" fill={T.red} stroke={T.ink} strokeWidth="2.6" strokeLinejoin="round" />;
      case "note": return <g fill={T.ink}><ellipse cx="-6" cy="10" rx="7" ry="5" /><rect x="0" y="-16" width="3.5" height="26" /><path d="M3.5 -16 Q14 -12 12 -2" stroke={T.ink} strokeWidth="3.5" fill="none" /></g>;
      case "dizzy": return <g stroke={T.gold} strokeWidth="4" fill="none" strokeLinecap="round" transform={`rotate(${t * 220})`}><path d="M-14 0 A14 14 0 1 1 0 14" /><path d="M-6 0 A6 6 0 1 1 0 6" /></g>;
    }
  })();
  return (
    <svg style={{ position: "absolute", left: x, top: y, overflow: "visible", zIndex: z }} width={1} height={1}>
      <g transform={`scale(${s * pop}) rotate(${rot})`}>{body}</g>
    </svg>
  );
};

/** 速度线 / 落地扬尘 */
export const Dust: React.FC<{ x: number; y: number; t: number; at: number; w?: number }> = ({ x, y, t, at, w = 1 }) => {
  const k = (t - at) / 0.5;
  if (k <= 0 || k >= 1) return null;
  return (
    <svg style={{ position: "absolute", left: x, top: y, overflow: "visible", zIndex: 25 }} width={1} height={1}>
      {[-1, 1].map((sd) => [0, 1, 2].map((i) => <circle key={`${sd}${i}`} cx={sd * (30 + 70 * k * w + i * 18)} cy={-6 - i * 8 - 10 * k} r={(12 - i * 3) * (1 - k * 0.7)} fill="#FFF3DC" stroke={T.ink} strokeWidth="2" opacity={1 - k} />))}
    </svg>
  );
};

// ---------- 漫画气泡 ----------
export const Say: React.FC<{ x: number; y: number; text: string; tone?: "paper" | "red" | "teal" | "dark"; size?: number; tail?: "left" | "right" | "down" | "none"; s?: number; op?: number; z?: number; ax?: "c" | "l" | "r"; rot?: number; icon?: React.ReactNode; maxW?: number }> =
  ({ x, y, text, tone = "paper", size = 38, tail = "left", s = 1, op = 1, z = 40, ax = "c", rot = 0, icon, maxW }) => {
    if (op <= 0.001 || s <= 0.001) return null;
    const bg = tone === "red" ? T.red : tone === "teal" ? T.teal : tone === "dark" ? "#4A3628" : T.paper;
    const fg = tone === "paper" ? T.ink : "#fff";
    return (
      <div style={{ position: "absolute", left: x, top: y, zIndex: z, opacity: op, transform: `translate(${ax === "c" ? "-50%" : ax === "l" ? "0" : "-100%"}, -50%) scale(${s}) rotate(${rot}deg)`, transformOrigin: ax === "l" ? "0 60%" : ax === "r" ? "100% 60%" : "50% 60%" }}>
        <div style={{ position: "relative", display: "flex", alignItems: "center", gap: size * 0.3, padding: `${size * 0.36}px ${size * 0.6}px`, borderRadius: size * 0.8, background: bg, border: `${TH.sw}px solid ${T.ink}`, boxShadow: `0 ${size * 0.14}px 0 rgba(59,42,32,0.18)`, maxWidth: maxW, whiteSpace: maxW ? "normal" : "nowrap" }}>
          {icon}
          <span style={{ fontFamily: F.cn, fontWeight: 700, fontSize: size, lineHeight: 1.15, color: fg, letterSpacing: 0.5 }}>{text}</span>
          {tail === "none" ? null : (
            <svg width="34" height="28" viewBox="0 0 34 28" style={{ position: "absolute", overflow: "visible", bottom: -24, ...(tail === "left" ? { left: size * 0.6 } : tail === "right" ? { right: size * 0.6, transform: "scaleX(-1)" } : { left: "50%", marginLeft: -17 }) }}>
              <path d="M2 0 L30 0 L6 26 Z" fill={bg} stroke={T.ink} strokeWidth={TH.sw} strokeLinejoin="round" />
              <rect x="3.5" y="-5" width="25" height="6.5" fill={bg} />
            </svg>
          )}
        </div>
      </div>
    );
  };

/** 纸片标签（有点歪，像贴上去的） */
export const Label: React.FC<{ text: string; color?: string; size?: number; rot?: number; strike?: number; fg?: string }> = ({ text, color = T.gold, size = 34, rot = -3, strike = 0, fg: fg0 = T.ink }) => {
  const ol = TH.outlineLabels, fg = ol ? (color === T.paper ? T.ink : color) : fg0;
  if (TH.name === "wall") return (
    // 产品界面式胶囊——细边框、上沿一道高光、柔和长投影，不要卡通粗描边和硬投影
    <div style={{ position: "relative", display: "inline-flex", alignItems: "center", gap: size * 0.28, padding: `${size * 0.22}px ${size * 0.55}px`, borderRadius: size * 0.6, background: color,
      border: "1px solid rgba(40,32,26,0.12)", boxShadow: `inset 0 1.5px 0 rgba(255,255,255,0.55), 0 ${size * 0.35}px ${size * 0.7}px -${size * 0.25}px rgba(40,30,20,0.35)`, transform: `rotate(${rot * 0.5}deg)`, whiteSpace: "nowrap" }}>
      <span style={{ width: size * 0.22, height: size * 0.22, borderRadius: "50%", background: fg, opacity: 0.55 }} />
      <span style={{ fontFamily: F.cn, fontWeight: 700, fontSize: size, color: fg, lineHeight: 1.1, letterSpacing: 0.5 }}>{text}</span>
      {strike > 0 ? <div style={{ position: "absolute", left: "6%", top: "48%", height: 4, width: `${88 * strike}%`, background: T.red, borderRadius: 2 }} /> : null}
    </div>
  );
  return (
  <div style={{ position: "relative", display: "inline-block", padding: `${size * 0.24}px ${size * 0.5}px`, borderRadius: size * 0.3, background: ol ? T.paper : color, border: `${TH.sw}px solid ${ol ? (color === T.paper ? T.ink : color) : T.ink}`, boxShadow: `0 ${size * 0.12}px 0 rgba(59,42,32,0.2)`, transform: `rotate(${rot}deg)`, whiteSpace: "nowrap" }}>
    <span style={{ fontFamily: F.cn, fontWeight: 700, fontSize: size, color: fg, lineHeight: 1.1 }}>{text}</span>
    {strike > 0 ? <div style={{ position: "absolute", left: "6%", top: "48%", height: 5, width: `${88 * strike}%`, background: T.red, borderRadius: 3 }} /> : null}
  </div>
);
};

// ---------- 道具 ----------
/** 木头讲台：floor 地面，h 台子高（人站在 floor-h）。高了以后柱子一节节木板摞起来，顶上一支话筒 */
export const Lectern: React.FC<{ x: number; floor: number; h: number; w?: number; z?: number; op?: number; t?: number; mic?: boolean }> = ({ x, floor, h, w = 150, z, op = 1, mic = true }) => {
  if (h <= 1 || op <= 0.001) return null;
  const planks = Math.max(1, Math.round(h / 46));
  return (
    <div style={{ position: "absolute", left: x - w / 2, top: floor - h, width: w, height: h, zIndex: z, opacity: op }}>
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ position: "absolute", overflow: "visible" }}>
        <rect x={w * 0.14} y="16" width={w * 0.72} height={Math.max(0, h - 26)} fill={T.wood} stroke={T.ink} strokeWidth={TH.sw} />
        {Array.from({ length: planks - 1 }, (_, i) => <line key={i} x1={w * 0.14} x2={w * 0.86} y1={16 + ((h - 26) / planks) * (i + 1)} y2={16 + ((h - 26) / planks) * (i + 1)} stroke={T.woodDark} strokeWidth="2.6" />)}
        <rect x={w * 0.22} y="30" width="7" height={Math.max(0, h - 50)} rx="3" fill="rgba(255,255,255,0.35)" />
        <rect x={w * 0.04} y={h - 14} width={w * 0.92} height="14" rx="5" fill={T.woodDark} stroke={T.ink} strokeWidth={TH.sw} />
        <path d={`M${-8} 0 L${w + 8} 0 L${w - 2} 22 L2 22 Z`} fill={T.gold} stroke={T.ink} strokeWidth={TH.sw} strokeLinejoin="round" />
        {mic ? <g><path d={`M${w * 0.72} 2 Q${w * 0.78} -26 ${w * 0.66} -40`} stroke={T.ink} strokeWidth="3.5" fill="none" strokeLinecap="round" /><ellipse cx={w * 0.64} cy={-44} rx="9" ry="11" fill="#5C5C66" stroke={T.ink} strokeWidth="2.6" /></g> : null}
      </svg>
    </div>
  );
};

export const Phone: React.FC<{ w: number; h: number; children?: React.ReactNode; color?: string }> = ({ w, h, children, color = T.pink }) => (
  <div style={{ position: "relative", width: w, height: h, borderRadius: 56, background: color, border: `4px solid ${T.ink}`, boxShadow: "0 10px 0 rgba(59,42,32,0.18)", padding: 16, boxSizing: "border-box" }}>
    <div style={{ position: "relative", width: "100%", height: "100%", borderRadius: 40, background: "#FFF9EE", border: `3px solid ${T.ink}`, overflow: "hidden" }}>
      {children}
      <div style={{ position: "absolute", left: "50%", top: 12, width: 84, height: 22, marginLeft: -42, borderRadius: 11, background: T.ink }} />
    </div>
  </div>
);

/** 视频卡：圆角小屏幕 + 播放键，可以装一颗宝石 */
export const Vid: React.FC<{ w?: number; h?: number; t: number; red?: number; children?: React.ReactNode }> = ({ w = 240, h = 300, t, red = 0, children }) => (
  <div style={{ position: "relative", width: w, height: h, borderRadius: 30, background: red > 0.5 ? "#FFE0D8" : T.paper, border: `4px solid ${red > 0.5 ? T.red : T.ink}`, boxShadow: `0 10px 0 rgba(59,42,32,0.18)${red > 0.05 ? `, 0 0 ${36 * red}px rgba(242,115,90,${0.6 * red})` : ""}`, overflow: "hidden" }}>
    <div style={{ position: "absolute", left: 14, right: 14, top: 14, bottom: 48, borderRadius: 20, background: red > 0.5 ? "linear-gradient(160deg,#FFB3A3,#F2735A)" : "linear-gradient(160deg,#D9F5EF,#9FE0D6)", border: `3px solid ${T.ink}`, display: "flex", alignItems: "center", justifyContent: "center" }}>{children}</div>
    <div style={{ position: "absolute", left: 20, right: 20, bottom: 20, height: 10, borderRadius: 5, background: "#EADCC2", border: `2px solid ${T.ink}` }}>
      <div style={{ width: `${((t * 0.15) % 1) * 100}%`, height: "100%", borderRadius: 5, background: red > 0.5 ? T.red : T.teal }} />
    </div>
  </div>
);

export const Gem: React.FC<{ size?: number; t: number; crack?: number; glow?: number }> = ({ size = 100, t, crack = 0, glow = 1 }) => {
  const tw = 0.5 + 0.5 * Math.sin(t * 5);
  return (
    <svg width={size} height={size} viewBox="-50 -50 100 100" style={{ overflow: "visible" }}>
      {glow > 0 && crack < 0.5 ? <circle r={52 + 4 * tw} fill="#FFE38A" opacity={0.45 * glow} /> : null}
      <path d="M-34 -12 L-18 -32 L18 -32 L34 -12 L0 34 Z" fill={crack > 0.5 ? "#C9BBA8" : "#7FD8F0"} stroke={T.ink} strokeWidth="3.4" strokeLinejoin="round" />
      <path d="M-34 -12 L34 -12 M-18 -32 L-8 -12 L0 34 L8 -12 L18 -32" fill="none" stroke={T.ink} strokeWidth="2.2" strokeLinejoin="round" />
      <path d="M-22 -26 L-12 -26" stroke="#fff" strokeWidth="4" strokeLinecap="round" />
      {crack > 0 ? <path d="M-3 -32 L5 -18 L-6 -6 L6 8 L-2 26" fill="none" stroke={T.ink} strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="90" strokeDashoffset={90 * (1 - crack)} /> : null}
      {crack < 0.5 ? <path d={`M30 -36 Q32 -30 38 -28 Q32 -26 30 -20 Q28 -26 22 -28 Q28 -30 30 -36 Z`} fill="#fff" stroke={T.ink} strokeWidth="1.6" transform={`scale(${0.6 + 0.6 * tw})`} /> : null}
    </svg>
  );
};

export const Heart: React.FC<{ size?: number; color?: string }> = ({ size = 50, color = T.red }) => (
  <svg width={size} height={size} viewBox="-22 -20 44 40" style={{ overflow: "visible" }}>
    <path d="M0 15 C-24 0 -17 -19 -4 -15 C-1 -14 0 -11 0 -10 C0 -11 1 -14 4 -15 C17 -19 24 0 0 15 Z" fill={color} stroke={T.ink} strokeWidth="2.8" strokeLinejoin="round" />
    <path d="M-12 -8 Q-10 -12 -6 -12" stroke="#fff" strokeWidth="2.6" fill="none" strokeLinecap="round" />
  </svg>
);

export const Bulb: React.FC<{ size?: number; on?: number; t: number }> = ({ size = 70, on = 1, t }) => {
  const g = on * (0.85 + 0.15 * Math.sin(t * 7));
  return (
    <svg width={size} height={size * 1.3} viewBox="-32 -42 64 82" style={{ overflow: "visible" }}>
      {on > 0 ? [0, 1, 2, 3, 4].map((k) => { const a = ((-160 + k * 35) * Math.PI) / 180; return <line key={k} x1={Math.cos(a) * 30} y1={-8 + Math.sin(a) * 30} x2={Math.cos(a) * (40 + 4 * g)} y2={-8 + Math.sin(a) * (40 + 4 * g)} stroke={T.gold} strokeWidth="4.5" strokeLinecap="round" opacity={on} />; }) : null}
      <path d="M-17 4 A21 21 0 1 1 17 4 Q10 11 10 19 L-10 19 Q-10 11 -17 4 Z" fill={on > 0.5 ? "#FFE27A" : "#F2EAD8"} stroke={T.ink} strokeWidth="3" />
      <rect x="-11" y="20" width="22" height="7" rx="2.5" fill="#B8AFA2" stroke={T.ink} strokeWidth="2.4" />
      <path d="M-8 -16 Q-12 -8 -8 0" stroke="#fff" strokeWidth="3.5" fill="none" strokeLinecap="round" />
    </svg>
  );
};

export const Crown: React.FC<{ size?: number }> = ({ size = 70 }) => (
  <svg width={size} height={size * 0.75} viewBox="-22 -16 44 32" style={{ overflow: "visible" }}>
    <path d="M-18 12 L-18 -6 L-9 3 L0 -13 L9 3 L18 -6 L18 12 Z" fill={T.gold} stroke={T.ink} strokeWidth="2.6" strokeLinejoin="round" />
    <circle cx="0" cy="4" r="3" fill={T.red} stroke={T.ink} strokeWidth="1.6" />
  </svg>
);

/** 木头字块（像小孩的积木） */
export const Block: React.FC<{ ch: string; size?: number; color?: string; dim?: number; flipX?: number; glow?: number }> = ({ ch, size = 150, color = T.ink, dim = 0, flipX = 1, glow = 0 }) => (
  <div style={{ position: "relative", width: size, height: size, transform: `scaleX(${flipX})`, opacity: 1 - dim * 0.5 }}>
    <div style={{ position: "absolute", inset: 0, borderRadius: size * 0.16, background: glow > 0.5 ? "#D9F5EF" : "#F7DDB0", border: `4px solid ${T.ink}`, boxShadow: `0 ${size * 0.07}px 0 ${T.woodDark}, 0 ${size * 0.1}px 0 rgba(59,42,32,0.2)` }} />
    <div style={{ position: "absolute", inset: size * 0.1, borderRadius: size * 0.1, border: `2.5px dashed rgba(185,124,69,0.45)` }} />
    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: F.cn, fontWeight: 700, fontSize: size * 0.58, color, lineHeight: 1 }}>{ch}</div>
  </div>
);

/** 沙发 */
export const Sofa: React.FC<{ w?: number; squash?: number }> = ({ w = 380, squash = 0 }) => (
  <svg width={w} height={w * 0.5} viewBox="0 0 380 190" style={{ overflow: "visible", transform: `scaleY(${1 - squash * 0.12})`, transformOrigin: "50% 100%" }}>
    <ellipse cx="190" cy="186" rx="176" ry="10" fill="rgba(59,42,32,0.14)" />
    <rect x="34" y="14" width="312" height="116" rx="42" fill="#F08A5D" stroke={T.ink} strokeWidth={TH.sw} />
    <rect x="70" y="34" width="110" height="78" rx="26" fill="#F7A57E" stroke={T.ink} strokeWidth="2.6" />
    <rect x="200" y="34" width="110" height="78" rx="26" fill="#F7A57E" stroke={T.ink} strokeWidth="2.6" />
    <rect x="4" y="74" width="72" height="104" rx="30" fill="#F08A5D" stroke={T.ink} strokeWidth={TH.sw} />
    <rect x="304" y="74" width="72" height="104" rx="30" fill="#F08A5D" stroke={T.ink} strokeWidth={TH.sw} />
    <rect x="52" y="112" width="276" height="62" rx="22" fill="#F49C72" stroke={T.ink} strokeWidth={TH.sw} />
    <rect x="70" y="174" width="12" height="14" fill={T.woodDark} stroke={T.ink} strokeWidth="2" />
    <rect x="298" y="174" width="12" height="14" fill={T.woodDark} stroke={T.ink} strokeWidth="2" />
  </svg>
);

/** 有表情的电池：没电时累得冒汗，充满了笑 */
export const BatteryBuddy: React.FC<{ w?: number; h?: number; segs: { frac: number; color: string }[]; low?: number; t: number; mood?: "tired" | "ok" | "happy" }> = ({ w = 210, h = 400, segs, low = 0, t, mood = "ok" }) => {
  const pad = 16, inner = h - 2 * pad;
  let acc = 0;
  const blink = low > 0 ? 0.5 + 0.5 * Math.abs(Math.sin(t * 6)) : 1;
  const fy = h * 0.3;
  return (
    <div style={{ position: "relative", width: w, height: h + 30 }}>
      <div style={{ position: "absolute", left: w / 2 - 38, top: 0, width: 76, height: 36, borderRadius: 12, background: "#E8D8BC", border: `${TH.sw}px solid ${T.ink}` }} />
      <div style={{ position: "absolute", left: 0, top: 28, width: w, height: h, borderRadius: 44, background: T.paper, border: `4px solid ${T.ink}`, boxShadow: "0 10px 0 rgba(59,42,32,0.16)", overflow: "hidden" }}>
        {low > 0 ? <div style={{ position: "absolute", left: pad, right: pad, bottom: pad, height: inner * 0.07 * low, borderRadius: 14, background: T.red, opacity: blink, border: `2.5px solid ${T.ink}` }} /> : null}
        {segs.map((sg, i) => {
          const hh = inner * sg.frac, b = pad + acc;
          acc += hh;
          return sg.frac > 0.003 ? <div key={i} style={{ position: "absolute", left: pad, right: pad, bottom: b, height: hh, borderRadius: 14, background: sg.color, border: `2.5px solid ${T.ink}`, boxSizing: "border-box" }}>
            <div style={{ position: "absolute", left: 10, right: 10, top: 6, height: 5, borderRadius: 3, background: "rgba(255,255,255,0.45)" }} />
          </div> : null;
        })}
        {/* 脸 */}
        <svg width={w} height={h} style={{ position: "absolute", left: 0, top: 0 }}>
          <g transform={`translate(${w / 2} ${fy})`} stroke={T.ink} strokeWidth="4" fill="none" strokeLinecap="round">
            {mood === "happy" ? (<><path d="M-34 0 Q-26 -12 -18 0" /><path d="M18 0 Q26 -12 34 0" /><path d="M-16 18 Q0 36 16 18 Z" fill="#7A2E2A" /></>)
              : mood === "tired" ? (<><path d="M-34 -2 Q-26 4 -18 -2" /><path d="M18 -2 Q26 4 34 -2" /><path d="M-10 24 Q0 18 10 24" /></>)
                : (<><circle cx="-26" cy="0" r="5" fill={T.ink} stroke="none" /><circle cx="26" cy="0" r="5" fill={T.ink} stroke="none" /><path d="M-10 20 Q0 28 10 20" /></>)}
          </g>
          <g fill={T.blush} opacity="0.5"><ellipse cx={w / 2 - 46} cy={fy + 18} rx="12" ry="7" /><ellipse cx={w / 2 + 46} cy={fy + 18} rx="12" ry="7" /></g>
        </svg>
      </div>
    </div>
  );
};

/** 秤砣（压力） */
export const Weight: React.FC<{ w?: number; h?: number; label?: string }> = ({ w = 300, h = 240, label = "压力" }) => (
  <div style={{ position: "relative", width: w, height: h }}>
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ position: "absolute", overflow: "visible" }}>
      <path d={`M${w * 0.36} ${h * 0.2} C${w * 0.36} ${-h * 0.04} ${w * 0.64} ${-h * 0.04} ${w * 0.64} ${h * 0.2}`} fill="none" stroke={T.ink} strokeWidth="16" />
      <path d={`M${w * 0.36} ${h * 0.2} C${w * 0.36} ${-h * 0.04} ${w * 0.64} ${-h * 0.04} ${w * 0.64} ${h * 0.2}`} fill="none" stroke="#6B6470" strokeWidth="9" />
      <path d={`M${w * 0.18} ${h * 0.2} L${w * 0.82} ${h * 0.2} L${w} ${h} L0 ${h} Z`} fill="#5B5560" stroke={T.ink} strokeWidth="4" strokeLinejoin="round" />
      <path d={`M${w * 0.24} ${h * 0.3} L${w * 0.4} ${h * 0.3}`} stroke="rgba(255,255,255,0.35)" strokeWidth="7" strokeLinecap="round" />
    </svg>
    <div style={{ position: "absolute", left: 0, right: 0, top: h * 0.42, textAlign: "center", fontFamily: F.cn, fontWeight: 700, fontSize: w * 0.22, color: "#FFF3DC", lineHeight: 1 }}>{label}</div>
  </div>
);

export const Dial: React.FC<{ size?: number; v: number }> = ({ size = 180, v }) => {
  const a = -120 + 240 * Math.max(0, Math.min(1, v));
  const r = 66;
  const arc = (a0: number, a1: number) => {
    const p = (d: number) => [Math.sin((d * Math.PI) / 180) * r, -Math.cos((d * Math.PI) / 180) * r];
    const [x0, y0] = p(a0), [x1, y1] = p(a1);
    return `M${x0} ${y0} A${r} ${r} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${x1} ${y1}`;
  };
  return (
    <svg width={size} height={size} viewBox="-100 -100 200 200" style={{ overflow: "visible" }}>
      <circle r="92" fill={T.paper} stroke={T.ink} strokeWidth="4" />
      <path d={arc(-120, -42)} fill="none" stroke={T.teal} strokeWidth="14" strokeLinecap="round" />
      <path d={arc(-38, 38)} fill="none" stroke={T.gold} strokeWidth="14" strokeLinecap="round" />
      <path d={arc(42, 120)} fill="none" stroke={T.red} strokeWidth="14" strokeLinecap="round" />
      <g transform={`rotate(${a})`}><circle r="38" fill="#F7DDB0" stroke={T.ink} strokeWidth="4" /><rect x="-5" y="-36" width="10" height="28" rx="5" fill={T.ink} /></g>
    </svg>
  );
};

/** 弧线：东西飞过去 */
export const arc = (k: number, x0: number, y0: number, x1: number, y1: number, lift = 120) => ({ x: x0 + (x1 - x0) * k, y: y0 + (y1 - y0) * k - lift * Math.sin(k * Math.PI) });
/** 一跳一落：0→1 进度上的竖直位移（向上为负） */
export const hop = (k: number, hgt = 40) => -hgt * Math.sin(Math.max(0, Math.min(1, k)) * Math.PI);

/** 红叉 / 绿勾 的小印章（描边、有点歪） */
export const Stamp: React.FC<{ kind: "x" | "ok"; size?: number; k?: number; rot?: number }> = ({ kind, size = 70, k = 1, rot = -8 }) => (
  <svg width={size} height={size} viewBox="-30 -30 60 60" style={{ overflow: "visible", transform: `scale(${k}) rotate(${rot}deg)` }}>
    <circle r="24" fill={kind === "x" ? T.red : T.teal} stroke={T.ink} strokeWidth="3.2" />
    <path d={kind === "x" ? "M-9 -9 L9 9 M9 -9 L-9 9" : "M-11 1 L-3 9 L12 -8"} stroke="#fff" strokeWidth="6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/** 动画片温度计（调性计）：level 0-1，到顶会抖 */
export const Thermo: React.FC<{ h: number; level: number; t: number; label?: string }> = ({ h, level, t, label = "调性" }) => {
  const shake = level > 0.95 ? Math.sin(t * 40) * 2 : 0;
  const tube = h - 70, fill = Math.max(0, Math.min(1, level)) * (tube - 20);
  return (
    <div style={{ position: "relative", width: 90, height: h, transform: `translateX(${shake}px)` }}>
      <svg width={90} height={h} viewBox={`0 0 90 ${h}`} style={{ position: "absolute", overflow: "visible" }}>
        <rect x="27" y="8" width="36" height={tube} rx="18" fill={T.paper} stroke={T.ink} strokeWidth={TH.sw} />
        <rect x="35" y={8 + tube - 12 - fill} width="20" height={fill + 14} rx="10" fill={T.red} />
        <circle cx="45" cy={h - 36} r="30" fill={T.red} stroke={T.ink} strokeWidth={TH.sw} />
        <circle cx="36" cy={h - 46} r="7" fill="rgba(255,255,255,0.55)" />
        {Array.from({ length: Math.floor(tube / 40) }, (_, i) => <line key={i} x1="63" x2="74" y1={30 + i * 40} y2={30 + i * 40} stroke={T.ink} strokeWidth="2.6" strokeLinecap="round" />)}
      </svg>
      <div style={{ position: "absolute", left: -6, top: -54, fontFamily: F.cn, fontWeight: 700, fontSize: 32, color: T.ink, whiteSpace: "nowrap", transform: "rotate(-4deg)" }}>{label}</div>
    </div>
  );
};

// ---------- 场景底座：纸张底 + 抖动滤镜 + 3D 镜头（角度比白卡画风小，动画片平一点）+ 涂鸦层 ----------
export const Stage: React.FC<{ t: number; brand: string; cam: CamKey[]; moves: number[]; shake?: { x?: number; y?: number }; children: React.ReactNode; wallArea?: { x0: number; y0: number; x1: number; y1: number }; yaw?: number; pitch?: number; blurK?: number /* 动态模糊倍数：段内大运镜用 0.3，不然推镜那一下整屏糊掉 */ }> = ({ t, brand, cam, moves, shake, children, wallArea, yaw, pitch, blurK = 1 }) => {
  TH.stageT = t; // 告诉进度条：这一帧画的是 toon 场景（深色主题时它换白字）
  const c = camAt(t, cam), mv = camVel(t, cam), mb = { x: mv.x * blurK, y: mv.y * blurK }, orb = orbitAt(t, moves, { yaw: [4.5, -4.5], pitch: [-1.5, 1.5] });
  const c2 = { ...c, x: c.x + (shake?.x ?? 0), y: c.y + (shake?.y ?? 0) };
  // wallArea：只画镜头看得见的那一块字墙（Camera3D 四周各多留 22% + 透视余量）
  const view = wallArea ? { x0: c2.x - 1100 / c2.z, x1: c2.x + 1100 / c2.z, y0: c2.y - 1200 / c2.z, y1: c2.y + 1500 / c2.z } : undefined;
  return (
    <>
      <Paper t={t} brand={brand} />
      <BoilDefs />
      <Camera3D t={t} cam={c2} mb={mb} yaw={yaw ?? orb.yaw} pitch={pitch ?? orb.pitch}>
        <BrandWall t={t} brand={brand} kicks={moves} area={wallArea} view={view} />
        <DoodleField t={t} />
        <div style={{ position: "absolute", inset: 0, filter: THEME_FX[TH.name] }}>{children}</div>
      </Camera3D>
      {TH.name === "water" ? <svg width="100%" height="100%" style={{ position: "absolute", inset: 0, opacity: 0.35, mixBlendMode: "multiply", pointerEvents: "none" }}>
        <filter id="wpaper2"><feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="4" seed="21" /><feColorMatrix values="0 0 0 0 0.92  0 0 0 0 0.86  0 0 0 0 0.78  0 0 0 0.9 0" /></filter>
        <rect width="100%" height="100%" filter="url(#wpaper2)" />
      </svg> : null}
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", background: `radial-gradient(140% 90% at 50% 40%, rgba(255,255,255,0) 62%, ${["chalk", "dark", "neon", "blue"].includes(TH.name) ? "rgba(0,0,0,0.25)" : "rgba(120,80,40,0.10)"} 100%)` }} />
    </>
  );
};
/** 卡通手（食指点） */
export const Finger: React.FC<{ s?: number; press?: number }> = ({ s = 1, press = 0 }) => (
  <svg width={120 * s} height={150 * s} viewBox="-60 -20 120 150" style={{ overflow: "visible", transform: `scale(${1 - press * 0.08})` }}>
    <path d="M-8 0 C-8 -14 10 -14 10 0 L10 52 C18 46 30 48 32 58 C40 54 52 58 52 70 L52 104 C52 126 34 140 10 140 C-16 140 -34 124 -40 102 L-52 64 C-56 52 -40 46 -32 56 L-8 82 Z"
      fill={T.skin} stroke={T.ink} strokeWidth="3.4" strokeLinejoin="round" />
    <path d="M10 60 L10 76 M32 62 L32 78" stroke={T.ink} strokeWidth="2.6" strokeLinecap="round" />
    <path d="M-4 4 Q1 0 6 4" stroke={T.ink} strokeWidth="2.4" fill="none" />
  </svg>
);
