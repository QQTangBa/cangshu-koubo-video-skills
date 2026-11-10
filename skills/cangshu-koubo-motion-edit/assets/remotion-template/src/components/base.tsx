import React from "react";
import { AbsoluteFill } from "remotion";
import { C, F, H, SAFE, W } from "../theme";
import { D, fadeUp, life, prog } from "../anim";
import type { Caption, Chapter, Icon as IconName } from "../plan";

const PATHS: Record<IconName, string> = {
  bulb: "M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5c.8.8 1.2 1.6 1.3 2.5h5.4c.1-.9.5-1.7 1.3-2.5A6 6 0 0 0 12 3z",
  check: "M5 12.5l4.5 4.5L19 7.5",
  doc: "M7 3h7l5 5v13H7zM14 3v5h5M10 13h6M10 17h6",
  chart: "M4 20h16M7 16v-5M12 16V7M17 16v-8",
  phone: "M8 2h8a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zM11 18h2",
  brain: "M9 4a3 3 0 0 0-3 3 3 3 0 0 0-2 5 3 3 0 0 0 2 5 3 3 0 0 0 6 1V5a2 2 0 0 0-3-1zM15 4a3 3 0 0 1 3 3 3 3 0 0 1 2 5 3 3 0 0 1-2 5 3 3 0 0 1-6 1",
  clock: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7v5l3 2",
  bolt: "M13 2L4 14h7l-1 8 9-12h-7z",
  user: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0",
  star: "M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z",
  warn: "M12 3l10 18H2zM12 10v5M12 18h.01",
  eye: "M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
  coin: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM9 9h4.5a1.8 1.8 0 0 1 0 3.6H10.5a1.8 1.8 0 0 0 0 3.6H15M12 7v2M12 16v2",
  scissors: "M6 7a3 3 0 1 0 0-.01M6 17a3 3 0 1 0 0-.01M8.5 8.5L20 18M8.5 15.5L20 6",
};

export const Icon: React.FC<{ name: IconName; size?: number; color?: string; stroke?: number }> = ({ name, size = 40, color = C.ink, stroke = 2.2 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round">
    <path d={PATHS[name]} />
  </svg>
);

/** 深灰底 + 平铺品牌水印（实心粗体 + 描边斜体交替）。black 为纯黑点阵变体。 */
export const Canvas: React.FC<{ brand: string; tag?: string; variant?: "watermark" | "black"; drift?: number; cam?: { z: number; tx: number; ty: number }; plain?: boolean }> = ({ brand, tag = "ORIGINAL", variant = "watermark", drift = 0, cam, plain }) => {
  if (plain) return <AbsoluteFill style={{ background: C.canvas }} />;
  // 背景永远不死：水印相邻行反向慢漂（对标实测 3–10px/s），并跟画板镜头做 0.25 倍视差
  const par: React.CSSProperties = cam ? { transform: `translate(${cam.tx * 0.25}px, ${cam.ty * 0.25}px) scale(${1 + (cam.z - 1) * 0.3})` } : {};
  if (variant === "black") {
    return (
      <AbsoluteFill style={{ background: C.canvasAlt, overflow: "hidden" }}>
        <AbsoluteFill style={{ inset: -200, backgroundImage: `radial-gradient(${C.dot} 1.6px, transparent 1.6px)`, backgroundSize: "34px 34px", backgroundPosition: `${drift * 6}px ${drift * 3}px`, ...par }} />
      </AbsoluteFill>
    );
  }
  const rows = Array.from({ length: 13 });
  return (
    <AbsoluteFill style={{ background: C.canvas, overflow: "hidden" }}>
      <AbsoluteFill style={par}>
      {rows.map((_, r) => (
        <div key={r} style={{ position: "absolute", top: (r - 2) * 175 - 40, left: (r % 2 ? -860 : -640) + (r % 2 ? -1 : 1) * drift * 14, whiteSpace: "nowrap", fontSize: 118, lineHeight: 1, letterSpacing: -2 }}>
          {Array.from({ length: 8 }).map((__, k) => (
            <span key={k}>
              <span style={{ fontFamily: F.cn, fontWeight: 900, color: C.watermark, marginRight: 70 }}>{brand}</span>
              <span style={{ fontFamily: F.num, fontWeight: 900, fontStyle: "italic", color: "transparent", WebkitTextStroke: `2.5px ${C.watermarkStroke}`, marginRight: 70 }}>{tag}</span>
            </span>
          ))}
        </div>
      ))}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/** 模拟 RGB 氛围灯：紫→红→绿→青 连续循环，柔光叠在口播画面上。 */
export const Ambient: React.FC<{ t: number; period?: number; opacity?: number }> = ({ t, period = 4, opacity = 0.32 }) => {
  const hue = (285 + (t / period) * 360) % 360;
  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(120% 90% at 15% 20%, hsl(${hue} 85% 55%), transparent 60%), radial-gradient(110% 90% at 90% 80%, hsl(${(hue + 120) % 360} 80% 50%), transparent 65%)`,
        mixBlendMode: "soft-light",
        opacity,
      }}
    />
  );
};

/** 底部居中字幕：白色中黑 + 半透明黑底框，可选英文小字。 */
export const Captions: React.FC<{ t: number; captions: Caption[]; en?: boolean; style?: "box" | "burn" | "pop" }> = ({ t, captions, en, style = "box" }) => {
  const c = captions.find((x) => t >= x.start && t < x.end);
  if (!c) return null;
  const hls = c.hl ? (Array.isArray(c.hl) ? c.hl : [c.hl]) : [];
  // 按出现顺序把一行切成 普通 / 重点 片段
  const parts: { s: string; hl: boolean }[] = [];
  let rest = c.text;
  while (rest.length) {
    let best = -1, bw = "";
    for (const w of hls) { const i = rest.indexOf(w); if (i >= 0 && (best < 0 || i < best)) { best = i; bw = w; } }
    if (best < 0) { parts.push({ s: rest, hl: false }); break; }
    if (best > 0) parts.push({ s: rest.slice(0, best), hl: false });
    parts.push({ s: bw, hl: true }); rest = rest.slice(best + bw.length);
  }
  if (style === "pop") {
    // 字幕：白粗字 + 深色柔阴影；重点词放大 1.32 倍、亮黄，出字那一下弹一下
    const sh = "0 0 3px rgba(0,0,0,0.85), 0 0 14px rgba(0,0,0,0.55), 0 4px 6px rgba(0,0,0,0.5)";
    const k = Math.min(1, (t - c.start) / 0.22);
    const pop = k < 1 ? 1 + 0.32 * (1 - Math.pow(1 - k, 3)) + 0.12 * Math.sin(k * Math.PI) : 1.32;
    return (
      <div style={{ position: "absolute", left: 40, right: 40, top: 1190, transform: "translateY(-50%)", textAlign: "center", fontFamily: F.cn, fontWeight: 700, fontSize: 58, lineHeight: "84px", color: "#FFFFFF", WebkitTextStroke: "1.2px currentColor", textShadow: sh, letterSpacing: 1, whiteSpace: "nowrap" }}>
        {parts.map((p, i) => p.hl
          ? <span key={i} style={{ display: "inline-block", color: "#FFD23F", fontSize: 58 * pop, lineHeight: "84px", verticalAlign: "bottom", margin: "0 4px" }}>{p.s}</span>
          : <span key={i}>{p.s}</span>)}
      </div>
    );
  }
  if (style === "burn") {
    // 仿原片剪映字幕：白粗字，关键词金黄，深色柔阴影；一行最多约 10 字，超了自然折行
    const sh = "0 0 3px rgba(0,0,0,0.9), 0 0 12px rgba(0,0,0,0.7), 0 4px 6px rgba(0,0,0,0.55)";
    return (
      <div style={{ position: "absolute", left: (W - 860) / 2, width: 860, top: 1083 - 46, textAlign: "center", fontFamily: F.cn, fontWeight: 600, fontSize: 80, lineHeight: "88px", color: "#F7F6F2", WebkitTextStroke: "1.6px currentColor", textShadow: sh, letterSpacing: 1 }}>
        {parts.map((p, i) => <span key={i} style={p.hl ? { color: "#E8C24A" } : undefined}>{p.s}</span>)}
      </div>
    );
  }
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: SAFE.captionY, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
      <div style={{ fontFamily: F.cn, fontWeight: 600, fontSize: 54, color: C.text, background: "rgba(0,0,0,0.42)", padding: "6px 18px", borderRadius: 10, textShadow: "0 2px 6px rgba(0,0,0,0.5)", maxWidth: W - 2 * SAFE.side, textAlign: "center" }}>
        {c.text}
      </div>
      {en && c.en ? <div style={{ fontFamily: F.num, fontWeight: 500, fontSize: 28, color: "rgba(255,255,255,0.9)", textShadow: "0 2px 6px rgba(0,0,0,0.7)" }}>{c.en}</div> : null}
    </div>
  );
};

/** 左上章节导航：当前项点亮，讲完的打勾变灰，没讲的半透明。 */
export const ChapterNav: React.FC<{ t: number; chapters: Chapter[] }> = ({ t, chapters }) => {
  const cur = chapters.filter((c) => t >= c.start).length - 1;
  if (cur < 0) return null;
  const appear = prog(t, chapters[0].start, D.in);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, ...fadeUp(appear, 12, 6) }}>
      {chapters.map((c, i) => {
        const done = i < cur, now = i === cur;
        const on = prog(t, c.start, D.in);
        return (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, height: 40, padding: "0 14px 0 8px", borderRadius: 20, width: "fit-content",
            background: now ? `rgba(255,255,255,${0.12 + 0.78 * on})` : "rgba(0,0,0,0.28)", border: `1.5px solid rgba(255,255,255,${now ? 0.9 : 0.22})` }}>
            <div style={{ width: 26, height: 26, borderRadius: 13, display: "grid", placeItems: "center", background: done ? "rgba(255,255,255,0.25)" : now ? C.ink : "rgba(255,255,255,0.12)",
              fontFamily: F.num, fontWeight: 800, fontSize: 15, color: now ? C.yellow : C.text }}>
              {done ? <Icon name="check" size={16} color={C.text} stroke={3} /> : String(i + 1).padStart(2, "0")}
            </div>
            <span style={{ fontFamily: F.cn, fontWeight: 600, fontSize: 22, color: now && on > 0.5 ? C.ink : done ? C.faint : C.sub }}>{c.label}</span>
            {c.en && now ? <span style={{ fontFamily: F.mono, fontSize: 13, letterSpacing: 2, color: on > 0.5 ? "rgba(0,0,0,0.5)" : C.faint }}>{c.en}</span> : null}
          </div>
        );
      })}
    </div>
  );
};

/** 左上主题胶囊：中文（sub）+ 极小英文（text），毛玻璃，左边发光色点。没有中文时英文当主字。 */
export const Tag: React.FC<{ text: string; sub?: string; color: string; p: number }> = ({ text, sub, color, p }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 22px 12px 16px", borderRadius: 20, width: "fit-content",
    background: "linear-gradient(180deg, rgba(28,32,42,0.46), rgba(14,16,22,0.52))", backdropFilter: "blur(22px) saturate(1.4)", border: "1px solid rgba(255,255,255,0.20)",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.18), 0 18px 40px -12px rgba(0,0,0,0.45)", opacity: p, transform: `translateX(${(1 - p) * -20}px)` }}>
    <div style={{ width: 12, height: 12, borderRadius: 6, background: color, boxShadow: `0 0 0 5px ${color}33, 0 0 14px ${color}` }} />
    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <span style={{ fontFamily: F.cn, fontWeight: 600, fontSize: sub ? 30 : 26, color: C.text }}>{sub ?? text}</span>
      {sub ? <span style={{ fontFamily: F.mono, fontSize: 13, letterSpacing: 3, color, textTransform: "uppercase" }}>{text}</span> : null}
    </div>
  </div>
);

export const Source: React.FC<{ text: string; p?: number }> = ({ text, p = 1 }) => (
  <div style={{ position: "absolute", right: SAFE.side, bottom: H - SAFE.captionY + 24, fontFamily: F.mono, fontSize: 15, letterSpacing: 2, color: C.cardFaint, textTransform: "uppercase", opacity: p }}>
    {text}
  </div>
);

export { life };
