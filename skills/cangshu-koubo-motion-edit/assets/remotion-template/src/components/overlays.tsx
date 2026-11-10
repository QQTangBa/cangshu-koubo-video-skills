import React from "react";
import { interpolate } from "remotion";
import { C, F, H, SAFE, W, accent, shadow } from "../theme";
import { D, clamp, countUp, easeIn, easeInOut, fadeUp, fmt, life, popScale, prog } from "../anim";
import type { Overlay } from "../plan";
import { Icon } from "./base";

type O<K extends Overlay["type"]> = Extract<Overlay, { type: K }>;
const endOf = (o: { until?: number }, segEnd: number) => o.until ?? segEnd;

// ---------- 视频上的字：精致版（大白字糊在头上、贴纸像表情包 = 没有高级感） ----------
// 规则：字分层（大字 / 中文标签 / 极小英文），渐变填充 + 柔和投影，逐字从遮罩里升起；信息放毛玻璃卡；人身后的大字一条片子只用一两次。
export const GLASS: React.CSSProperties = {
  background: "linear-gradient(180deg, rgba(28,32,42,0.46), rgba(14,16,22,0.52))", backdropFilter: "blur(22px) saturate(1.4)", WebkitBackdropFilter: "blur(22px) saturate(1.4)",
  border: "1px solid rgba(255,255,255,0.20)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.18), 0 22px 50px -12px rgba(0,0,0,0.45)",
};
const MICRO: React.CSSProperties = { fontFamily: F.mono, textTransform: "uppercase", whiteSpace: "nowrap" };
const fillOf = (tone?: string) => (tone === "yellow" ? "linear-gradient(180deg,#FFE7A0 0%,#FFC531 55%,#F0A500 100%)" : "linear-gradient(180deg,#FFFFFF 0%,#F1F4F8 55%,#D7DEE8 100%)");
const isNum = (s: string) => /^[\d.,%+x×-]+$/.test(s);

/** 逐字从遮罩里升起 + 去模糊；fill 是渐变填充 */
const Reveal: React.FC<{ text: string; t: number; at: number; size: number; fill: string; weight?: number; font?: string; stagger?: number; out?: number }> = ({ text, t, at, size, fill, weight = 800, font, stagger = 0.045, out = 0 }) => (
  <div style={{ display: "flex", lineHeight: 1.0, filter: "drop-shadow(0 10px 26px rgba(0,0,0,0.38))" }}>
    {[...text].map((ch, i) => {
      const k = prog(t, at + i * stagger, 0.42, easeInOut);
      return (
        <div key={i} style={{ overflow: "hidden", paddingBottom: size * 0.08 }}>
          <div style={{ fontFamily: font ?? (isNum(ch) ? F.num : F.cn), fontWeight: weight, fontSize: size, letterSpacing: -size * 0.03, background: fill, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent",
            transform: `translateY(${(1 - k) * 105 - out * 30}%)`, filter: k < 1 ? `blur(${(1 - k) * 10}px)` : undefined, opacity: 1 - out }}>{ch === " " ? "\u00A0" : ch}</div>
        </div>
      );
    })}
  </div>
);

/** 大字。behind=true 时 Film 会在上面盖一层抠像（偶尔用）；前景时是一组有层级的字：大字 + 细线 + 小标签。 */
export const BigText: React.FC<{ o: O<"bigText">; t: number; segEnd: number }> = ({ o, t, segEnd }) => {
  const until = endOf(o, segEnd);
  if (t < o.at || t > until) return null;
  const out = prog(t, until - 0.3, 0.3);
  const len = [...o.text].length;
  const behind = !!o.behind;
  const size = (behind ? (len <= 2 ? 300 : len <= 4 ? 230 : 170) : len <= 2 ? 210 : len <= 4 ? 180 : 140) * (o.s ?? 1);
  const y = (o.y ?? (behind ? 0.05 : 0.11)) * H;
  const align = o.x === "left" ? "flex-start" : o.x === "right" ? "flex-end" : "center";
  const scale = 1 + 0.04 * (1 - prog(t, o.at, 0.8)); // 落定后还在极慢地收
  return (
    <div style={{ position: "absolute", left: SAFE.side, right: SAFE.side, top: y, display: "flex", flexDirection: "column", alignItems: align, transform: `scale(${scale})`, transformOrigin: "50% 0%", filter: "drop-shadow(0 0 1.6px rgba(0,0,0,0.95)) drop-shadow(0 0 1.6px rgba(0,0,0,0.9)) drop-shadow(0 5px 14px rgba(0,0,0,0.55))", }}>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 12 }}>
        <Reveal text={o.text} t={t} at={o.at} size={size} fill={fillOf(o.tone)} out={out} />
        {o.unit ? <div style={{ fontFamily: F.cn, fontWeight: 700, fontSize: size * 0.3, color: "#fff", marginBottom: size * 0.16, opacity: prog(t, o.at + 0.2, 0.3) * (1 - out) }}>{o.unit}</div> : null}
      </div>
      {!behind && (o.side || o.en) ? <LockupSub t={t} at={o.at + 0.25} side={o.side} en={o.en} out={out} tone={o.tone} /> : null}
    </div>
  );
};

/** 大字下面那一行：细线从中间拉开 + 中文标签 + 极小英文 */
const LockupSub: React.FC<{ t: number; at: number; side?: string; en?: string; out: number; tone?: string }> = ({ t, at, side, en, out, tone }) => {
  const k = prog(t, at, 0.45, easeInOut);
  const acc = tone === "yellow" ? "#FFC531" : "#7FB2FF";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 6, opacity: 1 - out }}>
      <div style={{ width: 70 * k, height: 2, background: acc, borderRadius: 1 }} />
      {side ? <div style={{ fontFamily: F.cn, fontWeight: 600, fontSize: 46, color: "#fff", opacity: k, transform: `translateX(${(1 - k) * -14}px)`, textShadow: "0 4px 18px rgba(0,0,0,0.45)" }}>{side}</div> : null}
      {en ? <div style={{ ...MICRO, fontSize: 16, letterSpacing: 3, color: acc, opacity: prog(t, at + 0.2, 0.3) }}>{en}</div> : null}
    </div>
  );
};

/** 身后大字的贴边小字：做成毛玻璃小卡（前景大字的小字已经在 Lockup 里） */
export const BigTextSide: React.FC<{ o: O<"bigText">; t: number; segEnd: number }> = ({ o, t, segEnd }) => {
  if (!o.side || !o.behind) return null;
  const until = endOf(o, segEnd);
  const p = life(t, o.at + 0.25, until, 0.3, 0.25);
  if (p <= 0) return null;
  const y = (o.y ?? 0.05) * H;
  return (
    <div style={{ position: "absolute", right: SAFE.side, top: y + 250, ...GLASS, borderRadius: 18, padding: "12px 20px", display: "flex", flexDirection: "column", gap: 2, ...fadeUp(p, 16, 8) }}>
      <span style={{ fontFamily: F.cn, fontWeight: 600, fontSize: 38, color: "#fff" }}>{o.side}</span>
      {o.en ? <span style={{ ...MICRO, fontSize: 13, letterSpacing: 2.5, color: "#7FB2FF" }}>{o.en}</span> : null}
    </div>
  );
};

/** 两个关键词："能力 ≠ 结果"。头顶上方一行，中间符号放在玻璃圆里。 */
export const SideWords: React.FC<{ o: O<"sideWords">; t: number; segEnd: number }> = ({ o, t, segEnd }) => {
  const until = endOf(o, segEnd);
  if (t < o.at || t > until) return null;
  const out = prog(t, until - 0.3, 0.3);
  const ra = o.rightAt ?? o.at + 0.5;
  const size = Math.max([...o.left].length, [...(o.right ?? "")].length) > 3 ? 92 : 112;
  const y = (o.y ?? 0.13) * H;
  const j = popScale(t, ra - 0.15);
  return (
    <div style={{ position: "absolute", top: y, left: 0, width: W, display: "flex", justifyContent: "center", alignItems: "center", gap: 22, filter: "drop-shadow(0 0 1.6px rgba(0,0,0,0.95)) drop-shadow(0 0 1.6px rgba(0,0,0,0.9)) drop-shadow(0 5px 14px rgba(0,0,0,0.55))", }}>
      <Reveal text={o.left} t={t} at={o.at} size={size} fill={fillOf()} out={out} />
      {o.right ? (
        <>
          <div style={{ width: size * 0.8, height: size * 0.8, borderRadius: 999, ...GLASS, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: F.num, fontWeight: 700, fontSize: size * 0.5, color: "#7FB2FF",
            transform: `scale(${t >= ra - 0.15 ? j : 0})`, opacity: 1 - out }}>{o.joiner ?? "+"}</div>
          <Reveal text={o.right} t={t} at={ra} size={size} fill={fillOf("yellow")} out={out} />
        </>
      ) : null}
    </div>
  );
};

/** 毛玻璃数据卡：标题 + 副题 + 出处小字 + 白色数字面板。 */
export const DataCard: React.FC<{ o: O<"dataCard">; t: number; segEnd: number }> = ({ o, t, segEnd }) => {
  const p = life(t, o.at, endOf(o, segEnd));
  if (p <= 0) return null;
  const top = o.pos === "chest" ? 0.6 * H : SAFE.top + 10;
  return (
    <div style={{ position: "absolute", left: SAFE.side, right: SAFE.side, top, borderRadius: 28, padding: "22px 26px 22px", background: C.glass, backdropFilter: "blur(18px)",
      border: `1.5px solid ${C.glassLine}`, boxShadow: shadow, ...fadeUp(p, 22, 12) }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 12, height: 12, borderRadius: 6, background: C.yellow }} />
        <span style={{ fontFamily: F.cn, fontWeight: 800, fontSize: 34, color: C.text }}>{o.title}</span>
      </div>
      {o.sub ? <div style={{ fontFamily: F.cn, fontWeight: 600, fontSize: 26, color: C.sub, marginTop: 8, marginLeft: 24 }}>{o.sub}</div> : null}
      {o.meta ? <div style={{ fontFamily: F.mono, fontSize: 15, letterSpacing: 3, color: C.faint, marginTop: 6, marginLeft: 24, textTransform: "uppercase" }}>{o.meta}</div> : null}
      {o.stats.length ? <div style={{ display: "flex", justifyContent: "space-around", marginTop: 18, background: C.cardLight, borderRadius: 18, padding: "16px 10px" }}>
        {o.stats.map((s, i) => {
          const q = prog(t, o.at + 0.15 + i * 0.08, 0.25);
          return (
            <div key={i} style={{ textAlign: "center", opacity: q }}>
              <div style={{ fontFamily: F.num, fontWeight: 800, fontSize: 46, color: C.ink, letterSpacing: -1 }}>{s.v}</div>
              <div style={{ fontFamily: F.cn, fontSize: 24, color: "#777" }}>{s.l}</div>
            </div>
          );
        })}
      </div> : null}
    </div>
  );
};

/** 右上玻璃胶囊：英文大写 + 中文副题，左边一个发光色点。 */
export const Pill: React.FC<{ o: O<"pill">; t: number; segEnd: number }> = ({ o, t, segEnd }) => {
  const p = life(t, o.at, endOf(o, segEnd), 0.3, 0.25);
  if (p <= 0) return null;
  const col = o.tone === "red" ? "#FF6B70" : o.tone === "blue" ? "#7FB2FF" : "#FFC531";
  return (
    <div style={{ position: "absolute", right: SAFE.side, top: SAFE.top + 4, ...GLASS, borderRadius: 22, padding: "14px 22px 14px 18px", display: "flex", alignItems: "center", gap: 14,
      opacity: p, transform: `translateX(${(1 - p) * 24}px)` }}>
      <div style={{ width: 14, height: 14, borderRadius: 7, background: col, boxShadow: `0 0 0 6px ${col}33, 0 0 16px ${col}` }} />
      <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
        {o.sub ? <span style={{ fontFamily: F.cn, fontWeight: 600, fontSize: 32, color: "#fff" }}>{o.sub}</span> : null}
        <span style={{ ...MICRO, fontSize: 15, letterSpacing: 3, color: col }}>{o.text}</span>
      </div>
    </div>
  );
};

/** 片名：超粗白字放大落定，讲到时黄色逐字扫过，结束淡出。 */
export const Title: React.FC<{ o: O<"title">; t: number; segEnd: number }> = ({ o, t, segEnd }) => {
  const until = endOf(o, segEnd);
  const pIn = prog(t, o.at, D.settle);
  const p = Math.min(pIn, 1 - prog(t, until - 0.3, 0.3));
  if (p <= 0) return null;
  const chars = [...o.text];
  const perLine = chars.length > 7 ? Math.ceil(chars.length / 2) : chars.length;
  const size = perLine <= 4 ? 150 : perLine <= 6 ? 128 : 104;
  return (
    <div style={{ position: "absolute", top: SAFE.top + 20, left: SAFE.side, right: SAFE.side, textAlign: "center", opacity: p, transform: `scale(${interpolate(pIn, [0, 1], [1.08, 1])})` }}>
      {o.kicker ? <div style={{ fontFamily: F.cn, fontWeight: 700, fontSize: 40, color: C.text, marginBottom: 6, textShadow: "0 4px 14px rgba(0,0,0,0.5)" }}>{o.kicker}</div> : null}
      <div style={{ fontFamily: F.cn, fontWeight: 900, fontSize: size, lineHeight: 1.08, letterSpacing: -2, textShadow: "0 8px 30px rgba(0,0,0,0.45)" }}>
        {chars.map((ch, i) => {
          const lit = o.sweepAt !== undefined ? prog(t, o.sweepAt + i * D.sweepPerChar, 0.12) : 0;
          return (
            <React.Fragment key={i}>
              {i === perLine && chars.length > 7 ? <br /> : null}
              <span style={{ color: lit > 0.5 ? C.yellow : `rgba(255,255,255,${0.75 + 0.25 * pIn})` }}>{ch}</span>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

/** 结论便签：玻璃卡 + 左侧色条，从下往上翻起来立住，轻微倾斜。 */
export const Sticker: React.FC<{ o: O<"sticker">; t: number; segEnd: number }> = ({ o, t, segEnd }) => {
  const until = endOf(o, segEnd);
  if (t < o.at || t > until) return null;
  const k = prog(t, o.at, 0.5);
  const flip = interpolate(t, [o.at, o.at + 0.42], [75, 0], { ...clamp, easing: (x) => 1 + 2.4 * Math.pow(x - 1, 3) + 1.4 * Math.pow(x - 1, 2) });
  const out = prog(t, until - 0.25, 0.25);
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: (o.y ?? 0.62) * H, display: "flex", justifyContent: "center", perspective: 900, opacity: Math.min(1, k * 3) * (1 - out) }}>
      <div style={{ ...GLASS, borderRadius: 20, padding: "18px 28px 18px 22px", display: "flex", alignItems: "center", gap: 18, transform: `rotateX(${flip}deg) rotate(-2.5deg)`, transformOrigin: "50% 100%" }}>
        <div style={{ width: 6, height: 52, borderRadius: 3, background: "linear-gradient(180deg,#FFE7A0,#F0A500)" }} />
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontFamily: F.cn, fontWeight: 600, fontSize: 52, color: "#fff" }}>{o.text}</span>
          {o.en ? <span style={{ ...MICRO, fontSize: 14, letterSpacing: 3, color: "#FFC531" }}>{o.en}</span> : null}
        </div>
      </div>
    </div>
  );
};

/** 左上数据卡：中文标题 + 极小英文 + 大数字滚动 + 分段条 + 注释小字。 */
export const Metric: React.FC<{ o: O<"metric">; t: number; segEnd: number }> = ({ o, t, segEnd }) => {
  const until = endOf(o, segEnd);
  const p = life(t, o.at, until, 0.35, 0.3);
  if (p <= 0) return null;
  const run = prog(t, o.at + 0.2, o.dur ?? 1.0);
  const v = o.value * (1 - Math.pow(1 - run, 4));
  const segs = 20, lit = Math.round((v / 100) * segs);
  const col = o.tone === "blue" ? "#7FB2FF" : "#FFC531";
  return (
    <div style={{ position: "absolute", left: SAFE.side, top: SAFE.top + 10, width: 540, ...GLASS, borderRadius: 28, padding: "26px 30px 24px", opacity: p, transform: `translateY(${(1 - p) * -18}px)` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 10, height: 10, borderRadius: 5, background: col, boxShadow: `0 0 12px ${col}` }} />
        <span style={{ fontFamily: F.cn, fontWeight: 600, fontSize: 38, color: "#fff" }}>{o.title}</span>
      </div>
      {o.en ? <div style={{ ...MICRO, fontSize: 13, letterSpacing: 3, color: "rgba(255,255,255,0.55)", marginTop: 6, marginLeft: 22 }}>{o.en}</div> : null}
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 8 }}>
        <span style={{ fontFamily: F.num, fontWeight: 700, fontSize: 140, lineHeight: 1, letterSpacing: -5, background: o.tone === "blue" ? "linear-gradient(180deg,#CFE2FF,#7FB2FF)" : fillOf("yellow"), WebkitBackgroundClip: "text", color: "transparent", fontVariantNumeric: "tabular-nums" }}>{Math.round(v)}</span>
        <span style={{ fontFamily: F.num, fontWeight: 700, fontSize: 48, color: col }}>{o.unit ?? "%"}</span>
      </div>
      <div style={{ display: "flex", gap: 5, marginTop: 14 }}>
        {Array.from({ length: segs }, (_, i) => <div key={i} style={{ flex: 1, height: 16, borderRadius: 4, background: i < lit ? col : "rgba(255,255,255,0.14)", boxShadow: i < lit ? `0 0 10px ${col}66` : "none" }} />)}
      </div>
      {o.note ? <div style={{ ...MICRO, fontSize: 13, letterSpacing: 2.5, color: "rgba(255,255,255,0.55)", marginTop: 14, opacity: prog(t, o.at + 0.9, 0.3) }}>{o.note}</div> : null}
    </div>
  );
};

/** 评论气泡：右上标题 + 逐条淡入上移，向下堆叠。 */
export const Bubbles: React.FC<{ o: O<"bubbles">; t: number; segEnd: number }> = ({ o, t, segEnd }) => {
  const until = endOf(o, segEnd);
  const p = life(t, o.at, until, 0.2, 0.2);
  if (p <= 0) return null;
  return (
    <div style={{ position: "absolute", right: SAFE.side, top: SAFE.top + 10, width: 560, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 12, opacity: p }}>
      {o.header ? <div style={{ fontFamily: F.mono, fontSize: 15, letterSpacing: 3, color: C.sub }}>{o.header}</div> : null}
      {o.items.map((b, i) => {
        const q = life(t, b.at, until, 0.2, 0.2);
        return q > 0 ? (
          <div key={i} style={{ display: "flex", gap: 12, alignItems: "center", background: "rgba(255,255,255,0.95)", borderRadius: "22px 22px 6px 22px", padding: "12px 18px", boxShadow: shadow, ...fadeUp(q, 18, 6) }}>
            <div style={{ width: 34, height: 34, borderRadius: 17, background: ["#FFB547", "#6CB6FF", "#A57BFF", "#38D39F"][i % 4], flexShrink: 0 }} />
            <span style={{ fontFamily: F.cn, fontWeight: 600, fontSize: 28, color: C.ink }}>{b.text}</span>
          </div>
        ) : null;
      })}
    </div>
  );
};

/** 右侧计数卡：数字先快后慢滚到目标值。 */
export const Counter: React.FC<{ o: O<"counter">; t: number; segEnd: number }> = ({ o, t, segEnd }) => {
  const p = life(t, o.at, endOf(o, segEnd));
  if (p <= 0) return null;
  const v = countUp(t, o.at + 0.1, o.from, o.to, o.dur ?? 1.1);
  return (
    <div style={{ position: "absolute", right: SAFE.side, top: 0.5 * H, padding: "16px 22px", borderRadius: 22, background: C.glass, backdropFilter: "blur(16px)", border: `1.5px solid ${C.glassLine}`, ...fadeUp(p, 18, 8) }}>
      <div style={{ fontFamily: F.cn, fontSize: 22, color: C.sub }}>{o.label}</div>
      <div style={{ fontFamily: F.num, fontWeight: 800, fontSize: 64, color: C.yellow, letterSpacing: -1 }}>{fmt(v, o.decimals ?? 0)}{o.suffix ?? ""}</div>
    </div>
  );
};

/** 开场符号：电池满格→加速掉电→红框闪烁→掉出画面。 */
export const Battery: React.FC<{ o: O<"battery">; t: number; segEnd: number }> = ({ o, t, segEnd }) => {
  const until = endOf(o, segEnd);
  const pIn = prog(t, o.at, 0.25);
  const drain = prog(t, o.drainAt, o.drainDur ?? 0.75, easeIn);
  const pct = Math.round(100 * (1 - drain));
  const empty = drain >= 1;
  const blink = empty ? (Math.floor((t - o.drainAt) * 7) % 2 === 0 ? 1 : 0.25) : 1;
  const drop = o.dropAt !== undefined ? prog(t, o.dropAt, 0.5, easeIn) : 0;
  const vis = Math.min(pIn, o.dropAt !== undefined ? 1 : 1 - prog(t, until - 0.25, 0.25));
  if (vis <= 0 || drop >= 1) return null;
  const col = empty ? C.red : C.yellow;
  return (
    <div style={{ position: "absolute", top: SAFE.top + 30, left: 0, width: W, display: "flex", justifyContent: "center", alignItems: "center", gap: 28, opacity: vis,
      transform: `translateY(${drop * 1300}px) rotate(${drop * 18}deg)`, filter: pIn < 1 ? `blur(${(1 - pIn) * 10}px)` : undefined }}>
      <div style={{ textAlign: "right", opacity: blink }}>
        <div style={{ fontFamily: F.num, fontWeight: 900, fontSize: 150, lineHeight: 0.9, color: col, letterSpacing: -6 }}>{pct}%</div>
        <div style={{ fontFamily: F.cn, fontWeight: 700, fontSize: 30, color: C.text }}>{o.label}</div>
      </div>
      <div style={{ width: 230, height: 116, borderRadius: 22, border: `7px solid ${empty ? C.red : "#fff"}`, padding: 9, position: "relative", opacity: blink }}>
        <div style={{ width: `${100 - drain * 100}%`, height: "100%", borderRadius: 10, background: col }} />
        <div style={{ position: "absolute", right: -22, top: 34, width: 12, height: 34, borderRadius: 4, background: empty ? C.red : "#fff" }} />
      </div>
    </div>
  );
};

export const CtaRow: React.FC<{ o: O<"cta">; t: number }> = ({ o, t }) => (
  <>
    {(o.items ?? ["点赞", "收藏", "关注"]).map((s, i) => {
      const q = prog(t, o.at + i * D.stagger, D.in);
      return q > 0 ? (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, height: 42, padding: "0 16px 0 10px", borderRadius: 21, width: "fit-content", background: "rgba(10,10,12,0.5)",
          border: "1.5px solid rgba(255,255,255,0.6)", opacity: q, transform: `translateX(${(1 - q) * -16}px)` }}>
          <Icon name={i === 0 ? "star" : i === 1 ? "check" : "user"} size={22} color={C.yellow} />
          <span style={{ fontFamily: F.cn, fontWeight: 700, fontSize: 22, color: C.text }}>{s}</span>
        </div>
      ) : null;
    })}
  </>
);

export const tone = accent;
