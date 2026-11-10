import React from "react";
import { interpolate } from "remotion";
import { F, W } from "../theme";
import { clamp, easeInOut, easeOut, popScale, prog } from "../anim";
import type { Overlay } from "../plan";
import { TablerIcon } from "../scenes/props";

// 两种真人段叠层：
//   InfoBox：左上弹出的信息框——一条英文渐变大写 + 中文副标题的玻璃头，下面一条条带圆形图标的玻璃胶囊（中文 + 红色英文小字）
//   TopWord：身后大字的顶边版——两三个字顶着上边框、左右贴边，人像压在上面，只被头挡一点
type O<K extends Overlay["type"]> = Extract<Overlay, { type: K }>;
const endOf = (o: { until?: number }, segEnd: number) => o.until ?? segEnd;

const GLASS: React.CSSProperties = {
  background: "linear-gradient(180deg, rgba(58,46,40,0.50), rgba(30,24,22,0.58))", backdropFilter: "blur(18px) saturate(1.3)", WebkitBackdropFilter: "blur(18px) saturate(1.3)",
  border: "1.5px solid rgba(255,255,255,0.34)", boxShadow: "inset 0 1.5px 0 rgba(255,255,255,0.28), inset 0 -6px 14px rgba(0,0,0,0.18), 0 18px 40px -10px rgba(40,25,15,0.45)",
};
const EN: React.CSSProperties = { fontFamily: F.num, fontWeight: 800, textTransform: "uppercase", whiteSpace: "nowrap" };

export const InfoBox: React.FC<{ o: O<"infoBox">; t: number; segEnd: number }> = ({ o, t, segEnd }) => {
  const until = endOf(o, segEnd);
  if (t < o.at || t > until + 0.1) return null;
  const warm = (o.tone ?? "warm") === "warm";
  const grad = warm ? "linear-gradient(90deg, #7FE3FF 0%, #FFFFFF 45%, #FF9A8A 100%)" : "linear-gradient(90deg, #8FD3FF 0%, #FFFFFF 60%, #C8B6FF 100%)";
  const red = warm ? "#FF6B5E" : "#7FB2FF";
  const n = o.items.length;
  // 退场：从最后一条开始往左收，头最后走
  const outAt = (k: number) => until - 0.32 - (n - k) * 0.06;
  const head = Math.min(prog(t, o.at, 0.42, easeOut), 1 - prog(t, until - 0.3, 0.3, easeInOut));
  return (
    <div style={{ position: "absolute", left: 52, top: 92, display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 18 }}>
      <div style={{ ...GLASS, borderRadius: 48, padding: "16px 34px 16px 30px", display: "flex", alignItems: "center", gap: 16, opacity: head,
        transform: `translateX(${(1 - head) * -60}px) scale(${0.92 + 0.08 * head})`, transformOrigin: "0% 50%", filter: head < 1 ? `blur(${(1 - head) * 8}px)` : undefined }}>
        {o.badge ? (
          // 徽标：开头那两个「AI」大字缩小飞过来落在这里
          <div style={{ width: 58, height: 58, borderRadius: 16, background: "linear-gradient(135deg, #FFFFFF, #E8EEF5)", display: "flex", alignItems: "center", justifyContent: "center", transform: `scale(${popScale(t, o.at, 0.3) || 0})`,
            fontFamily: '"Avenir Next Condensed", "Avenir Next", sans-serif', fontWeight: 800, fontSize: 36, color: "#1A1A1A", boxShadow: "0 4px 10px rgba(0,0,0,0.25)" }}>{o.badge}</div>
        ) : <div style={{ width: 13, height: 13, borderRadius: 7, background: "#7FE3FF", boxShadow: "0 0 12px #7FE3FF" }} />}
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <div style={{ ...EN, fontSize: 34, letterSpacing: 6, background: grad, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>{o.en}</div>
          <div style={{ fontFamily: F.cn, fontWeight: 700, fontSize: 38, color: "#FFFFFF", letterSpacing: 1, textShadow: "0 2px 8px rgba(0,0,0,0.35)" }}>{o.title}</div>
        </div>
      </div>
      {o.items.map((it, k) => {
        const p = Math.min(prog(t, it.at, 0.4, easeOut), 1 - prog(t, outAt(k), 0.26, easeInOut));
        if (p <= 0) return null;
        const w = interpolate(p, [0, 0.55, 1], [0, 0.82, 1], clamp); // 先出圆形图标，胶囊再往右长出去
        return (
          <div key={k} style={{ ...GLASS, borderRadius: 46, height: 92, display: "flex", alignItems: "center", gap: 18, padding: "0 30px 0 12px", overflow: "hidden",
            clipPath: `inset(0 ${(1 - w) * 100}% 0 0 round 46px)`, opacity: Math.min(1, p * 2.2), transform: `translateX(${(1 - p) * -36}px) scale(${0.9 + 0.1 * p})`, transformOrigin: "0% 50%" }}>
            <div style={{ width: 68, height: 68, borderRadius: 34, background: "radial-gradient(circle at 35% 30%, rgba(255,140,120,0.55), rgba(150,40,30,0.45))", border: "1.5px solid rgba(255,255,255,0.35)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <TablerIcon name={it.icon ?? "point"} size={36} color="#FFFFFF" width={2} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              <div style={{ fontFamily: F.cn, fontWeight: 800, fontSize: 44, lineHeight: "52px", color: "#FFFFFF", whiteSpace: "nowrap", textShadow: "0 2px 8px rgba(0,0,0,0.3)" }}>{it.cn}</div>
              {it.en ? <div style={{ ...EN, fontSize: 18, letterSpacing: 4, color: red, marginTop: 2 }}>{it.en}</div> : null}
            </div>
          </div>
        );
      })}
    </div>
  );
};

/** 顶边身后大字：字顶着进度条下沿，第一个字贴左边、最后一个字贴右边，字高约画面的四成，中间那一截让人挡住没关系。
 *  look：flat 白字黑描边；extrude 立体厚度（往右下长出一截侧面）；tilt 透视（两边的字往中间斜着转，带投影）；chrome 金属（银色渐变 + 高光）；candy 亮面（彩色渐变 + 一道光泽）
 *  fly：说完以后整组字缩小飞到某个点（比如信息框标题上的徽标），飞到了就消失 */
export const TopWord: React.FC<{ o: O<"topWord">; t: number; segEnd: number; zoom: number }> = ({ o, t, segEnd }) => {
  const until = endOf(o, segEnd);
  if (t < o.at || t > until) return null;
  const chars = [...o.text];
  const latin = /^[A-Za-z0-9]+$/.test(o.text);
  const size = o.size ?? (latin ? 700 : chars.length <= 2 ? 480 : 340);
  const top = 84; // 进度条下沿
  const look = o.look ?? "flat";
  const fly = o.fly ? prog(t, o.fly.at, 0.45, easeInOut) : 0;
  const cx = 540, cy = top + size * 0.4;
  const flyT = o.fly ? `translate(${(o.fly.x - cx) * fly}px, ${(o.fly.y - cy) * fly}px) scale(${1 - fly * (1 - o.fly.s)})` : undefined;
  const lh = size * (latin ? 0.8 : 1.0);
  const font = latin ? '"Avenir Next Condensed", "Avenir Next", sans-serif' : F.cn;
  const weight = latin ? 800 : 900;
  const glyph = (ch: string, i: number, k: number, out: number) => {
    const base: React.CSSProperties = { fontFamily: font, fontWeight: weight, fontSize: size, lineHeight: `${lh}px`, letterSpacing: 0, whiteSpace: "nowrap" };
    const rise = `translateY(${(1 - k) * 100 - out * 100}%)`;
    if (look === "extrude") {
      const depth = 16;
      return (
        <div style={{ position: "relative", transform: `${rise} scale(${1.04 - 0.04 * k})`, filter: k < 1 ? `blur(${(1 - k) * 12}px)` : undefined }}>
          {Array.from({ length: depth }, (_, d) => <div key={d} style={{ ...base, position: "absolute", left: (d + 1) * 1.6, top: (d + 1) * 1.6, color: d === depth - 1 ? "#5E554C" : `rgb(${150 - d * 4},${140 - d * 4},${130 - d * 4})` }}>{ch}</div>)}
          <div style={{ ...base, position: "relative", color: "#FFFFFF", WebkitTextStroke: `${Math.round(size * 0.006)}px #2A2420`, paintOrder: "stroke fill" }}>{ch}</div>
        </div>
      );
    }
    if (look === "steel") {
      // 立体厚度 + 钨钢亮面。侧面冷灰一层层往右下长出来，正面白到浅银的金属渐变 + 一道镜面高光，再有一道光泽扫过
      const depth = 16, sweep = ((t - o.at) * 0.55) % 1.8 - 0.4;
      return (
        <div style={{ position: "relative", transform: `${rise} scale(${1.04 - 0.04 * k})`, filter: k < 1 ? `blur(${(1 - k) * 12}px)` : undefined }}>
          {Array.from({ length: depth }, (_, d) => { const g = 168 - d * 6; return <div key={d} style={{ ...base, position: "absolute", left: (d + 1) * 1.6, top: (d + 1) * 1.6, color: d === depth - 1 ? "#3E444B" : `rgb(${g - 6},${g},${g + 8})` }}>{ch}</div>; })}
          <div style={{ position: "relative", filter: "drop-shadow(0 0 1px #2A2E33) drop-shadow(0 0 0.5px #2A2E33)" }}>
            <div style={{ ...base, background: "linear-gradient(175deg, #FFFFFF 0%, #F4F6F8 30%, #D3D8DE 46%, #FFFFFF 50%, #ECEFF2 70%, #C2C8CF 100%)", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>{ch}</div>
            <div style={{ ...base, position: "absolute", left: 0, top: 0, background: `linear-gradient(110deg, rgba(255,255,255,0) ${(sweep - 0.12) * 100}%, rgba(255,255,255,0.95) ${sweep * 100}%, rgba(255,255,255,0) ${(sweep + 0.12) * 100}%)`, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent", mixBlendMode: "screen" }}>{ch}</div>
          </div>
        </div>
      );
    }
    if (look === "tilt") {
      const dir = chars.length === 1 ? 0 : i === 0 ? 1 : i === chars.length - 1 ? -1 : 0;
      const ang = 26 * dir * (0.4 + 0.6 * k);
      return (
        <div style={{ position: "relative", transform: `${rise} perspective(${size * 2.2}px) rotateY(${ang}deg)`, transformOrigin: dir > 0 ? "0% 50%" : "100% 50%", filter: k < 1 ? `blur(${(1 - k) * 12}px)` : undefined }}>
          <div style={{ ...base, position: "absolute", left: 18 * -dir, top: 22, color: "rgba(60,40,20,0.22)", filter: "blur(10px)" }}>{ch}</div>
          <div style={{ ...base, position: "relative", background: `linear-gradient(${dir >= 0 ? 90 : 270}deg, #FFFFFF 0%, #F4EFEA 55%, #CFC6BC 100%)`, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>{ch}</div>
        </div>
      );
    }
    if (look === "chrome") {
      return (
        <div style={{ position: "relative", transform: `${rise} scale(${1.04 - 0.04 * k})`, filter: `drop-shadow(0 2px 0 #2A2420) drop-shadow(0 -2px 0 #2A2420) drop-shadow(2px 0 0 #2A2420) drop-shadow(-2px 0 0 #2A2420) drop-shadow(0 16px 22px rgba(40,30,20,0.35))${k < 1 ? ` blur(${(1 - k) * 12}px)` : ""}` }}>
          <div style={{ ...base, background: "linear-gradient(180deg, #FFFFFF 0%, #E9EDF2 30%, #9AA4AF 48%, #F6F8FA 52%, #C3CAD2 75%, #8D96A1 100%)", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>{ch}</div>
        </div>
      );
    }
    if (look === "candy") {
      const sweep = ((t - o.at) * 0.6) % 1.6 - 0.3;
      return (
        <div style={{ position: "relative", transform: `${rise} scale(${1.04 - 0.04 * k})`, filter: `drop-shadow(0 3px 0 rgba(30,24,20,0.9)) drop-shadow(0 18px 26px rgba(242,115,90,0.35))${k < 1 ? ` blur(${(1 - k) * 12}px)` : ""}` }}>
          <div style={{ ...base, background: `linear-gradient(115deg, #FFD23F 0%, #FF8A5B 45%, #FF5D8F 100%)`, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>{ch}</div>
          <div style={{ ...base, position: "absolute", left: 0, top: 0, background: `linear-gradient(115deg, rgba(255,255,255,0) ${(sweep - 0.1) * 100}%, rgba(255,255,255,0.75) ${sweep * 100}%, rgba(255,255,255,0) ${(sweep + 0.1) * 100}%)`, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>{ch}</div>
        </div>
      );
    }
    return (
      <div style={{ ...base, color: o.color ?? "#FFFFFF", WebkitTextStroke: `${Math.round(size * (latin ? 0.011 : 0.016))}px #1A1A1A`, paintOrder: "stroke fill",
        transform: `${rise} scale(${1.04 - 0.04 * k})`, filter: k < 1 ? `blur(${(1 - k) * 12}px)` : undefined }}>{ch}</div>
    );
  };
  const flat = look === "flat";
  return (
    <div style={{ position: "absolute", left: 34, right: 34, top, display: "flex", justifyContent: chars.length === 1 ? "center" : "space-between", alignItems: "flex-start",
      transform: flyT, transformOrigin: `${cx - 34}px ${cy - top}px`, opacity: o.fly ? 1 - prog(t, o.fly.at + 0.3, 0.15) : 1,
      filter: flat ? "drop-shadow(0 3px 0 rgba(20,20,20,0.85)) drop-shadow(0 14px 26px rgba(40,30,20,0.25))" : undefined }}>
      {chars.map((ch, i) => {
        const k = prog(t, o.at + i * 0.07, 0.5, easeOut);
        const out = o.fly ? 0 : prog(t, until - 0.32 + i * 0.04, 0.3, easeInOut);
        return (
          <div key={i} style={{ overflow: o.fly && fly > 0 ? "visible" : "hidden", height: size * (latin ? 0.78 : 1.0) + (look === "extrude" || look === "steel" ? 30 : 0), paddingLeft: 8, paddingRight: look === "extrude" || look === "steel" ? 34 : 8, display: "flex", alignItems: "flex-start", justifyContent: i === 0 ? "flex-start" : "flex-end" }}>
            {glyph(ch, i, k, out)}
          </div>
        );
      })}
    </div>
  );
};
