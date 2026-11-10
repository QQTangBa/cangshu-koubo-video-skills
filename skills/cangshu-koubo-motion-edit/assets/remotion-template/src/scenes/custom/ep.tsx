import React from "react";
import { F } from "../../theme";
import { TablerIcon } from "../props";
import { T } from "./toon";

// 样例道具（wall 主题 + toon 描边）。全片主线：「你」揣着一块 AI 芯片回到 2021 年接外包，旁边一本「日进账」账本一路往上加。
// 颜色只取 T.*；尺寸参数都是世界坐标像素。

const sw = () => 2.4;
const MONO: React.CSSProperties = { fontFamily: F.mono, textTransform: "uppercase", letterSpacing: 3 };
const CARD: React.CSSProperties = { background: "#FFFFFF", border: "1px solid rgba(40,32,26,0.10)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.8), 0 22px 40px -16px rgba(40,30,20,0.34), 0 2px 6px rgba(40,30,20,0.06)" };

export const fmt = (v: number) => Math.round(v).toLocaleString("en-US");

/** AI 芯片：会发光、会脉冲（全片的「外挂」） */
export const Chip: React.FC<{ size?: number; t: number; glow?: number; dim?: number }> = ({ size = 120, t, glow = 1, dim = 0 }) => {
  const pulse = 0.5 + 0.5 * Math.sin(t * 5);
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      {glow > 0 ? <div style={{ position: "absolute", left: -size * 0.45, top: -size * 0.45, width: size * 1.9, height: size * 1.9, borderRadius: "50%", background: `radial-gradient(closest-side, rgba(90,210,255,${0.55 * glow * (0.7 + 0.3 * pulse)}), rgba(90,210,255,0))` }} /> : null}
      <svg width={size} height={size} viewBox="-60 -60 120 120" style={{ position: "absolute", overflow: "visible", filter: dim ? `grayscale(${dim})` : undefined }}>
        {[-30, -10, 10, 30].map((p) => (
          <g key={p} stroke={T.ink} strokeWidth="2.4" strokeLinecap="round">
            <line x1={p} y1={-46} x2={p} y2={-58} /><line x1={p} y1={46} x2={p} y2={58} /><line x1={-46} y1={p} x2={-58} y2={p} /><line x1={46} y1={p} x2={58} y2={p} />
          </g>
        ))}
        <rect x="-46" y="-46" width="92" height="92" rx="16" fill="#2E3A4F" stroke={T.ink} strokeWidth={sw()} />
        <rect x="-32" y="-32" width="64" height="64" rx="10" fill={`rgb(${70 + 60 * glow * pulse},${170 + 40 * glow},${230})`} stroke={T.ink} strokeWidth="2.4" />
        <path d="M-40 -40 L-20 -40" stroke="rgba(255,255,255,0.5)" strokeWidth="4" strokeLinecap="round" />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: F.num, fontWeight: 900, fontSize: size * 0.3, color: "#fff", letterSpacing: 1 }}>AI</div>
    </div>
  );
};

/** 年份转盘（时光机）：大圆盘 + 指针 + 中间年份 */
export const YearDial: React.FC<{ size?: number; year: string; spin: number; t: number; glow?: number }> = ({ size = 360, year, spin, glow = 0 }) => (
  <div style={{ position: "relative", width: size, height: size }}>
    {glow > 0 ? <div style={{ position: "absolute", inset: -40, borderRadius: "50%", background: `radial-gradient(closest-side, rgba(244,185,66,${0.5 * glow}), rgba(244,185,66,0))` }} /> : null}
    <svg width={size} height={size} viewBox="-100 -100 200 200" style={{ position: "absolute", overflow: "visible" }}>
      <circle r="94" fill={T.paper} stroke={T.ink} strokeWidth="2.4" />
      <circle r="78" fill="none" stroke={T.inkSoft} strokeWidth="2" strokeDasharray="3 7" />
      <g transform={`rotate(${spin})`}>
        {Array.from({ length: 12 }, (_, i) => <line key={i} x1="0" y1="-86" x2="0" y2={i % 3 ? -80 : -72} stroke={T.ink} strokeWidth={i % 3 ? 3 : 5} strokeLinecap="round" transform={`rotate(${i * 30})`} />)}
        <path d="M0 0 L0 -64" stroke={T.red} strokeWidth="7" strokeLinecap="round" />
        <path d="M-9 -54 L0 -70 L9 -54 Z" fill={T.red} stroke={T.ink} strokeWidth="2.4" strokeLinejoin="round" />
      </g>
      <circle r="9" fill={T.ink} />
    </svg>
    <div style={{ position: "absolute", left: 0, right: 0, top: size * 0.6, textAlign: "center", fontFamily: F.num, fontWeight: 900, fontSize: size * 0.17, color: T.ink, letterSpacing: 2 }}>{year}</div>
  </div>
);

/** 价签（产品界面式定价卡）：上面一行等宽小字，下面大号数字，可划掉；color 不是白色时整张卡用那个颜色当强调 */
export const PriceTag: React.FC<{ text: string; sub?: string; color?: string; fg?: string; size?: number; strike?: number; rot?: number }> = ({ text, sub, color = T.gold, fg = T.ink, size = 54, strike = 0, rot = -6 }) => {
  const accent = color !== T.paper && color !== "#FFFFFF";
  return (
    <div style={{ position: "relative", display: "inline-flex", flexDirection: "column", gap: size * 0.06, padding: `${size * 0.22}px ${size * 0.42}px ${size * 0.26}px`, borderRadius: size * 0.34, ...CARD,
      background: accent ? `linear-gradient(180deg, ${color}, ${color})` : "#FFFFFF", transform: `rotate(${rot * 0.4}deg)` }}>
      {sub ? <div style={{ ...MONO, fontSize: size * 0.22, color: accent ? fg : T.inkSoft, opacity: 0.8, whiteSpace: "nowrap" }}>{sub}</div> : null}
      <div style={{ fontFamily: F.num, fontWeight: 800, fontSize: size, lineHeight: 1, color: fg, letterSpacing: -1, whiteSpace: "nowrap" }}>{text}</div>
      {strike > 0 ? <div style={{ position: "absolute", left: size * 0.3, top: "58%", height: 5, width: `${strike * 82}%`, background: T.red, borderRadius: 3 }} /> : null}
    </div>
  );
};

/** 外包订单（任务卡）：左边一道彩色竖条 + 图标 + 两行灰条，像任务列表里的一条 */
export const Order: React.FC<{ w?: number; title?: string; color?: string; price?: string; icon?: string }> = ({ w = 150, title = "订单", color = T.teal, price, icon = "file-text" }) => (
  <div style={{ position: "relative", width: w, height: w * 1.12, borderRadius: w * 0.14, ...CARD, overflow: "hidden" }}>
    <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: w * 0.07, background: color }} />
    <div style={{ display: "flex", alignItems: "center", gap: 6, padding: `${w * 0.1}px ${w * 0.1}px 0 ${w * 0.16}px` }}>
      <div style={{ width: w * 0.24, height: w * 0.24, borderRadius: w * 0.07, background: color, display: "flex", alignItems: "center", justifyContent: "center" }}><TablerIcon name={icon} size={w * 0.16} color="#FFFFFF" width={2.4} /></div>
      <span style={{ fontFamily: F.cn, fontWeight: 700, fontSize: w * 0.14, color: T.ink }}>{title}</span>
    </div>
    {[0, 1, 2].map((i) => <div key={i} style={{ margin: `${w * 0.09}px ${w * 0.1}px 0 ${w * 0.16}px`, height: w * 0.05, borderRadius: 4, background: "rgba(40,32,26,0.12)", width: `${[66, 52, 58][i]}%` }} />)}
    {price ? <div style={{ position: "absolute", right: 8, bottom: 6, fontFamily: F.num, fontWeight: 800, fontSize: w * 0.16, color: T.red }}>{price}</div> : null}
  </div>
);

/** 「一天能赚」数据卡：产品界面式——小字标题 + 图标、大号数字、分隔线下面一行行明细 */
export const Ledger: React.FC<{ w?: number; value: number; label?: string; rows?: { k: string; v: string; on?: number }[]; flash?: number; unit?: string; display?: string }> = ({ w = 360, value, label = "一天能赚", rows = [], flash = 0, unit = "元", display }) => (
  <div style={{ width: w, borderRadius: w * 0.07, ...CARD, boxShadow: `${CARD.boxShadow}, 0 0 ${40 * flash}px rgba(244,185,66,${0.8 * flash})`, padding: `${w * 0.05}px ${w * 0.065}px ${w * 0.055}px` }}>
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{ width: w * 0.09, height: w * 0.09, borderRadius: w * 0.025, background: "#FFF3D6", display: "flex", alignItems: "center", justifyContent: "center" }}><TablerIcon name="chart-line" size={w * 0.06} color="#D9961A" width={2.2} /></div>
      <span style={{ fontFamily: F.cn, fontWeight: 700, fontSize: w * 0.062, color: T.inkSoft }}>{label}</span>
    </div>
    <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: w * 0.02 }}>
      <span style={{ fontFamily: F.num, fontWeight: 800, fontSize: w * 0.085, color: T.ink }}>¥</span>
      <span style={{ fontFamily: F.num, fontWeight: 800, fontSize: w * 0.17, color: T.ink, letterSpacing: -1 }}>{display ?? fmt(value)}</span>
      <span style={{ fontFamily: F.cn, fontWeight: 600, fontSize: w * 0.05, color: T.inkSoft }}>{unit}</span>
    </div>
    {rows.map((r, i) => (r.on ?? 1) > 0 ? (
      <div key={i} style={{ display: "flex", justifyContent: "space-between", fontFamily: F.cn, fontWeight: 600, fontSize: w * 0.056, color: T.ink, borderTop: "1px solid rgba(40,32,26,0.10)", paddingTop: 8, marginTop: 8, opacity: r.on ?? 1, transform: `translateX(${(1 - (r.on ?? 1)) * -20}px)` }}>
        <span>{r.k}</span><span style={{ fontFamily: F.num, fontWeight: 800, color: "#12A37F" }}>{r.v}</span>
      </div>
    ) : null)}
  </div>
);

/** 市场摊位：条纹遮阳棚 + 招牌 + 柜台 */
export const Stall: React.FC<{ w?: number; sign: string; color?: string; dim?: number; t: number; icon?: string }> = ({ w = 420, sign, color = T.red, dim = 0, icon = "fish" }) => {
  const h = w * 0.86;
  return (
    <div style={{ position: "relative", width: w, height: h, filter: dim ? `saturate(${1 - dim * 0.8}) brightness(${1 - dim * 0.08})` : undefined }}>
      {/* 柱子 */}
      <div style={{ position: "absolute", left: w * 0.08, top: h * 0.2, width: 14, height: h * 0.8, background: T.woodDark, border: `1.5px solid ${T.line}`, borderRadius: 6 }} />
      <div style={{ position: "absolute", right: w * 0.08, top: h * 0.2, width: 14, height: h * 0.8, background: T.woodDark, border: `1.5px solid ${T.line}`, borderRadius: 6 }} />
      {/* 遮阳棚 */}
      <svg width={w} height={h * 0.34} viewBox={`0 0 ${w} ${h * 0.34}`} style={{ position: "absolute", left: 0, top: h * 0.06, overflow: "visible" }}>
        {Array.from({ length: 6 }, (_, i) => {
          const x0 = (i * w) / 6, x1 = ((i + 1) * w) / 6, y = h * 0.2;
          return <path key={i} d={`M${x0} 0 L${x1} 0 L${x1} ${y} Q${(x0 + x1) / 2} ${y + 26} ${x0} ${y} Z`} fill={i % 2 ? T.paper : color} stroke={T.ink} strokeWidth="2.4" strokeLinejoin="round" />;
        })}
      </svg>
      {/* 招牌 */}
      <div style={{ position: "absolute", left: "50%", top: -h * 0.12, transform: "translateX(-50%)", background: T.paper, border: `1.5px solid ${T.line}`, borderRadius: 14, padding: "6px 18px", display: "flex", alignItems: "center", gap: 8, whiteSpace: "nowrap", boxShadow: T.shadow }}>
        <TablerIcon name={icon} size={w * 0.09} color={T.ink} width={2.4} />
        <span style={{ fontFamily: F.cn, fontWeight: 800, fontSize: w * 0.085, color: T.ink }}>{sign}</span>
      </div>
      {/* 柜台 */}
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: h * 0.36, background: T.wood, border: `1.5px solid ${T.line}`, borderRadius: 16, boxShadow: T.shadow }}>
        <div style={{ position: "absolute", left: 16, right: 16, top: 16, height: 10, borderRadius: 5, background: "rgba(255,255,255,0.35)" }} />
      </div>
    </div>
  );
};

/** 工位：一张小桌 + 桌上的活（翻译稿 / 画板 / 幻灯片 / 代码屏 / 书稿） */
export type Work = "doc" | "paint" | "ppt" | "code" | "book";
export const WORK_ICON: Record<Work, string> = { doc: "language", paint: "brush", ppt: "presentation", code: "code", book: "book-2" };
export const WORK_NAME: Record<Work, string> = { doc: "翻译", paint: "画图", ppt: "PPT", code: "写代码", book: "网文" };
export const WORK_COLOR = (w: Work) => ({ doc: T.sky, paint: T.pink, ppt: T.gold, code: T.teal, book: T.lilac }[w]);
export const Desk: React.FC<{ w?: number; work: Work; label?: boolean }> = ({ w = 190, work, label = true }) => (
  <div style={{ position: "relative", width: w, height: w * 0.9 }}>
    <div style={{ position: "absolute", left: w * 0.18, top: 0, width: w * 0.64, height: w * 0.5, borderRadius: 14, background: WORK_COLOR(work), border: `1.5px solid ${T.line}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <TablerIcon name={WORK_ICON[work]} size={w * 0.3} color={T.ink} width={2.2} />
    </div>
    <div style={{ position: "absolute", left: 0, right: 0, top: w * 0.5, height: w * 0.12, background: T.wood, border: `1.5px solid ${T.line}`, borderRadius: 8 }} />
    <div style={{ position: "absolute", left: w * 0.1, top: w * 0.6, width: 10, height: w * 0.28, background: T.woodDark, border: `1.5px solid ${T.line}` }} />
    <div style={{ position: "absolute", right: w * 0.1, top: w * 0.6, width: 10, height: w * 0.28, background: T.woodDark, border: `1.5px solid ${T.line}` }} />
    {label ? <div style={{ position: "absolute", left: 0, right: 0, top: w * 0.92, textAlign: "center", fontFamily: F.cn, fontWeight: 800, fontSize: w * 0.17, color: T.onBg }}>{WORK_NAME[work]}</div> : null}
  </div>
);

/** 圆形钟：指针转圈（熬时间） */
export const Clock: React.FC<{ size?: number; turns: number }> = ({ size = 120, turns }) => (
  <svg width={size} height={size} viewBox="-60 -60 120 120" style={{ overflow: "visible" }}>
    <circle r="52" fill={T.paper} stroke={T.ink} strokeWidth="2.4" />
    {Array.from({ length: 12 }, (_, i) => <line key={i} x1="0" y1="-44" x2="0" y2="-38" stroke={T.ink} strokeWidth="2.4" transform={`rotate(${i * 30})`} />)}
    <line x1="0" y1="0" x2="0" y2="-24" stroke={T.ink} strokeWidth="2.4" strokeLinecap="round" transform={`rotate(${turns * 30})`} />
    <line x1="0" y1="0" x2="0" y2="-38" stroke={T.red} strokeWidth="4" strokeLinecap="round" transform={`rotate(${turns * 360})`} />
    <circle r="5" fill={T.ink} />
  </svg>
);

/** 纸稿（产品界面式文档窗口）：标题栏三个小圆点 + 标题 + 语言标签，正文若干灰条，可以逐行出字 */
export const Doc: React.FC<{ w?: number; h?: number; title?: string; lines?: number; fill?: number; color?: string; lang?: string; stamp?: React.ReactNode }> = ({ w = 300, h = 380, title, lines = 9, fill = 1, color = T.sky, lang, stamp }) => (
  <div style={{ position: "relative", width: w, height: h, borderRadius: w * 0.06, ...CARD, overflow: "hidden" }}>
    <div style={{ height: w * 0.15, borderBottom: "1px solid rgba(40,32,26,0.08)", display: "flex", alignItems: "center", gap: w * 0.022, padding: `0 ${w * 0.05}px`, background: "#FAFAF8" }}>
      {["#FF5F57", "#FEBC2E", "#28C840"].map((c) => <div key={c} style={{ width: w * 0.032, height: w * 0.032, borderRadius: "50%", background: c }} />)}
      {title ? <span style={{ marginLeft: w * 0.03, fontFamily: F.cn, fontWeight: 700, fontSize: w * 0.065, color: T.ink }}>{title}</span> : null}
      {lang ? <span style={{ marginLeft: "auto", padding: "2px 10px", borderRadius: 10, background: color, fontFamily: F.num, fontWeight: 700, fontSize: w * 0.05, color: "#FFFFFF" }}>{lang}</span> : null}
    </div>
    {Array.from({ length: lines }, (_, i) => {
      const k = Math.max(0, Math.min(1, fill * lines - i));
      return <div key={i} style={{ margin: `${w * 0.045}px ${w * 0.06}px 0`, height: w * 0.03, borderRadius: 4, background: i % 4 === 0 ? color : "rgba(40,32,26,0.14)", opacity: i % 4 === 0 ? 0.55 : 1, width: `${[88, 76, 92, 64, 84, 70, 90, 58, 80, 72][i % 10] * k}%` }} />;
    })}
    {stamp}
  </div>
);
