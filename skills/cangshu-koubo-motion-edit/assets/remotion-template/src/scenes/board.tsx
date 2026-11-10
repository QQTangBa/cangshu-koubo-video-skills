import React from "react";
import { Easing, Img, interpolate, staticFile } from "remotion";
import { C, F, H, SAFE, W, accent, accentInk, shadow } from "../theme";
import { clamp, easeInOut, fmt, prog } from "../anim";
import { Icon } from "../components/base";
import type { BoardCard, BoardStep, LinkSpec } from "../plan";
import { PropView, propSize } from "./props";
import type { Area } from "./scenes";

// 画板 v2（按一条同类口播全片 15fps 逐张拆解重写）：
// 世界坐标 + 镜头：每拍内容排在某块区域，镜头缓移或甩过去，水印铺在世界里 1:1 跟着走。
// 卡片跨拍保留：离开的卡留在原地（镜头一走自然出画），再出现时从原地飞回来；可以被"吸进"别的卡。
// 小件快（4 帧，过冲 1.2 倍）、大件稳（6 帧淡入小位移）；新卡进来时旧卡压暗；数字四次方缓出。
const FPS = 30;
const MOVE = 0.35; // 卡片重排 10 帧
const ENTER = 0.2; // 大卡进场 6 帧
const POP = 0.13; // 小件弹出 4 帧
const EXIT = 0.22;
const STAGGER = 0.08;
const YIELD = 0.12; // 有旧卡在让位时新卡稍等
const easeOutCubic = Easing.out(Easing.cubic);
const quart = (p: number) => 1 - Math.pow(1 - Math.max(0, Math.min(1, p)), 4);
/** 小件过冲：0 → 1.2 → 1.0 */
const overshoot = (q: number) => (q < 0.6 ? interpolate(q, [0, 0.6], [0.4, 1.2]) : interpolate(q, [0.6, 1], [1.2, 1]));
const SMALL = new Set(["chip", "question", "mark", "timer"]);

type Geo = { cx: number; cy: number; s: number };
type St = { geo: Geo; mode: "active" | "parked" };
const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
const lerpG = (a: Geo, b: Geo, p: number): Geo => ({ cx: lerp(a.cx, b.cx, p), cy: lerp(a.cy, b.cy, p), s: lerp(a.s, b.s, p) });

export const natural = (c: BoardCard): { w: number; h: number } => {
  const extra = (c.meta ? 30 : 0) + (c.tags?.length ? 60 : 0);
  switch (c.kind) {
    case "text": return { w: 860, h: (c.sub ? 230 : 170) + extra };
    case "chip": return { w: 580, h: 130 };
    case "question": return { w: 680, h: 120 };
    case "stat": return { w: 640, h: (c.sub ? 380 : 320) + extra };
    case "data": return { w: 860, h: 250 + (c.rows?.length ?? 0) * 56 + (c.bar ? 74 : 0) + (c.foot ? 36 : 0) + extra };
    case "list": return { w: 860, h: 150 + 88 * c.items.length + extra };
    case "bars": return { w: 880, h: (c.title ? 110 : 40) + 112 * c.items.length + extra };
    case "progress": return { w: 860, h: 220 + extra };
    case "keyword": return { w: 900, h: c.sub ? 300 : 230 };
    case "stamp": return { w: 600, h: 170 };
    case "mark": return { w: 140, h: 140 };
    case "terminal": return { w: 880, h: 100 + 50 * c.lines.length };
    case "timer": return { w: 470, h: 130 };
    case "photo": return { w: 860, h: 640 };
    case "phone": return { w: 440, h: 880 };
    case "doc": return { w: 720, h: 150 + 62 * c.lines.length + extra };
    case "prop": return propSize(c.prop);
  }
};

/** 一拍的布局（世界坐标，已加上区域偏移） */
const layoutStep = (step: BoardStep, cards: Map<string, BoardCard>, area: Area): Map<string, Geo> => {
  const placed = step.place ?? {};
  const ids = step.show.filter((id) => cards.has(id) && !placed[id]);
  const nat = (id: string) => natural(cards.get(id)!);
  const out = new Map<string, Geo>();
  const [rx, ry] = step.region ?? [0, 0];
  const ox = rx * W, oy = ry * H;
  const AW = W - 2 * SAFE.side, HH = area.bottom - area.top, cx0 = W / 2 + ox, cy0 = (area.top + area.bottom) / 2 + oy, top0 = area.top + oy;
  const fit = (id: string, w: number, h: number, max = 1.1) => Math.min(w / nat(id).w, h / nat(id).h, max);
  const stack = (list: string[], top: number, h: number, gap: number) => {
    const sumH = list.reduce((a, id) => a + nat(id).h, 0);
    const s = Math.min(1.05, AW / Math.max(...list.map((id) => nat(id).w)), (h - gap * (list.length - 1)) / sumH);
    let y = top + (h - (sumH * s + gap * (list.length - 1))) / 2;
    for (const id of list) { const hh = nat(id).h * s; out.set(id, { cx: cx0, cy: y + hh / 2, s }); y += hh + gap; }
  };
  const row = (list: string[], cy: number, h: number, gap = 26) => {
    const sumW = list.reduce((a, id) => a + nat(id).w, 0);
    const s = Math.min(1.05, (AW - gap * (list.length - 1)) / sumW, h / Math.max(...list.map((id) => nat(id).h)));
    let x = cx0 - (sumW * s + gap * (list.length - 1)) / 2;
    for (const id of list) { const ww = nat(id).w * s; out.set(id, { cx: x + ww / 2, cy, s }); x += ww + gap; }
  };
  const grid = (list: string[], top: number, h: number) => {
    const cols = list.length <= 1 ? 1 : 2, rows = Math.ceil(list.length / cols), gap = 26;
    const cw = (AW - gap * (cols - 1)) / cols, ch = (h - gap * (rows - 1)) / rows;
    list.forEach((id, i) => {
      const r = Math.floor(i / cols), c = i % cols, n = Math.min(cols, list.length - r * cols);
      const xL = cx0 - (n * cw + (n - 1) * gap) / 2;
      out.set(id, { cx: xL + c * (cw + gap) + cw / 2, cy: top + r * (ch + gap) + ch / 2, s: fit(id, cw, ch, 1) });
    });
  };
  for (const [id, v] of Object.entries(placed)) if (cards.has(id) && step.show.includes(id)) out.set(id, { cx: ox + v[0] * W, cy: oy + v[1] * H, s: v[2] ?? 1 });
  if (!ids.length) return out;
  const focus = step.focus && ids.includes(step.focus) ? step.focus : ids[ids.length - 1];
  switch (step.layout) {
    case "hero": {
      out.set(focus, { cx: cx0, cy: cy0, s: fit(focus, AW, HH, SMALL.has(cards.get(focus)!.kind) ? 1.6 : 1.15) });
      ids.filter((x) => x !== focus).forEach((id) => out.set(id, { cx: cx0, cy: cy0, s: fit(id, AW, HH, 1) }));
      break;
    }
    case "column": stack(ids, top0, HH, 28); break;
    case "chain": stack(ids, top0, HH, 70); break;
    case "row": row(ids, cy0, HH * 0.7); break;
    case "grid": grid(ids, top0, HH); break;
    case "focus": {
      const rest = ids.filter((x) => x !== focus);
      const topH = rest.length ? HH * 0.24 : 0;
      if (rest.length) row(rest, top0 + topH / 2, topH, 22);
      out.set(focus, { cx: cx0, cy: top0 + topH + (HH - topH) / 2 + 10, s: fit(focus, AW, HH - topH - 30, 1.1) });
      break;
    }
    case "tree": {
      // 3:4 竖屏的树：根在顶部，子节点竖排、整体右移，左侧一根主干挂到每个子节点
      const [root, ...kids] = ids;
      const rootH = Math.min(HH * 0.22, nat(root).h * 1.05);
      out.set(root, { cx: cx0, cy: top0 + rootH / 2, s: fit(root, AW, rootH, 1) });
      if (kids.length) {
        const indent = 90, top = top0 + rootH + 60, h = HH - rootH - 60, gap = 30;
        const sumH = kids.reduce((acc, id) => acc + nat(id).h, 0);
        const sc = Math.min(1, (AW - indent) / Math.max(...kids.map((id) => nat(id).w)), (h - gap * (kids.length - 1)) / sumH);
        let y = top + (h - (sumH * sc + gap * (kids.length - 1))) / 2;
        for (const id of kids) { const hh = nat(id).h * sc; out.set(id, { cx: cx0 + indent / 2, cy: y + hh / 2, s: sc }); y += hh + gap; }
      }
      break;
    }
    case "orbit": {
      const rest = ids.filter((x) => x !== focus);
      out.set(focus, { cx: cx0, cy: cy0, s: fit(focus, 460, 460, 1) });
      const R = Math.min(AW, HH) / 2 - 100;
      rest.forEach((id, i) => {
        const a = -Math.PI / 2 + (i / rest.length) * Math.PI * 2;
        out.set(id, { cx: cx0 + Math.cos(a) * R, cy: cy0 + Math.sin(a) * R, s: fit(id, 320, 150, 1) });
      });
      break;
    }
  }
  return out;
};

/** region 不写就沿用上一拍 */
export const withRegions = (steps: BoardStep[]): BoardStep[] => {
  let r: [number, number] = [0, 0];
  return steps.map((st) => { r = st.region ?? r; return { ...st, region: r }; });
};

const stepIndex = (steps: BoardStep[], t: number) => { let k = -1; steps.forEach((s, i) => { if (t >= s.at) k = i; }); return k; };

/** 预计算：每拍的布局和每张卡的状态（active 在场 / parked 留在原地） */
const simulate = (steps: BoardStep[], cards: Map<string, BoardCard>, area: Area) => {
  const L = steps.map((st) => layoutStep(st, cards, area));
  const S: Map<string, St>[] = [];
  let cur = new Map<string, St>();
  steps.forEach((st, k) => {
    const next = new Map<string, St>();
    const prev = steps[k - 1];
    const moved = !!prev && JSON.stringify(prev.region ?? [0, 0]) !== JSON.stringify(st.region ?? [0, 0]);
    for (const [id, s] of cur) {
      if (L[k].has(id)) continue;
      const ex = st.exit?.[id];
      if (ex?.type === "fade" || ex?.type === "into") continue;
      if (s.mode === "parked" || ex?.type === "stay" || moved) next.set(id, { geo: s.geo, mode: "parked" });
    }
    for (const [id, g] of L[k]) next.set(id, { geo: g, mode: "active" });
    S.push(next); cur = next;
  });
  return { L, S };
};

/** 镜头：对准区域中心或某张卡；ease 缓移、whip 甩镜（先快后落定）、cut 直接切 */
const camAt = (steps: BoardStep[], S: Map<string, St>[], area: Area, k: number) => {
  const st = steps[Math.max(0, k)];
  const z = st.camera?.zoom ?? 1;
  const [rx, ry] = st.region ?? [0, 0];
  let tx = W / 2 + rx * W, ty = (area.top + area.bottom) / 2 + ry * H;
  const tg = st.camera?.target ? S[Math.max(0, k)].get(st.camera.target) : undefined;
  if (tg) { tx = lerp(tx, tg.geo.cx, 0.7); ty = lerp(ty, tg.geo.cy, 0.7); }
  return { z, tx, ty };
};
/** 停稳后的慢推：每秒约 1%，上限 4%，让两个事件之间画面也在呼吸 */
const CREEP = 0.01, CREEP_MAX = 0.04, SETTLE = 0.45;
const creep = (u: number) => 1 + Math.min(CREEP_MAX, CREEP * Math.max(0, u - SETTLE));
const camera = (steps: BoardStep[], S: Map<string, St>[], area: Area, t: number) => {
  const k = stepIndex(steps, t);
  const b0 = camAt(steps, S, area, k);
  const cb = creep(t - (steps[Math.max(0, k)]?.at ?? 0));
  if (k <= 0) return { ...b0, z: b0.z * cb };
  const a0 = camAt(steps, S, area, k - 1);
  const a = { ...a0, z: a0.z * creep(steps[k].at - steps[k - 1].at) };
  const b = { ...b0, z: b0.z * cb };
  const dist = Math.hypot(a.tx - b.tx, a.ty - b.ty);
  const move = steps[k].camera?.move ?? (dist > W * 0.8 ? "whip" : "ease");
  const u = t - steps[k].at;
  let p = 1;
  if (move === "ease") p = interpolate(u, [0, 0.4], [0, 1], { ...clamp, easing: easeInOut });
  if (move === "whip") p = u < 0.2 ? interpolate(u, [0, 0.2], [0, 0.82], clamp) : interpolate(u, [0.2, 0.34], [0.82, 1], { ...clamp, easing: easeOutCubic });
  return { z: lerp(a.z, b.z, p), tx: lerp(a.tx, b.tx, p), ty: lerp(a.ty, b.ty, p) };
};

// ---------------- 卡片 ----------------
const base = (): React.CSSProperties => ({ background: C.cardBg, borderRadius: 30, border: `1px solid ${C.cardLine}`, boxShadow: `0 10px 0 ${C.thick}, ${shadow}`, position: "relative" }); // 底部厚度 = 2.5D 质感
const IconBox: React.FC<{ name: Parameters<typeof Icon>[0]["name"]; size: number; color: string; pulseAt?: number; t: number }> = ({ name, size, color, pulseAt, t }) => {
  const pu = pulseAt !== undefined ? prog(t, pulseAt, 0.5) : 1;
  return (
    <div style={{ position: "relative", width: size, height: size, borderRadius: size * 0.24, background: color, display: "grid", placeItems: "center", flexShrink: 0 }}>
      <Icon name={name} size={size * 0.58} color="#fff" />
      {pu > 0 && pu < 1 ? <div style={{ position: "absolute", inset: -6, borderRadius: size * 0.3, border: `4px solid ${color}`, transform: `scale(${1 + pu * 0.7})`, opacity: 1 - pu }} /> : null}
    </div>
  );
};
const Meta: React.FC<{ text?: string; right?: boolean }> = ({ text, right }) => (text ? <div style={{ fontFamily: F.mono, fontSize: 16, letterSpacing: 2.5, color: C.cardFaint, textTransform: "uppercase", textAlign: right ? "right" : "left", whiteSpace: "nowrap" }}>{text}</div> : null);
const Tags: React.FC<{ tags?: string[]; t: number; born: number }> = ({ tags, t, born }) => (tags?.length ? (
  <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
    {tags.map((g, i) => { const q = prog(t, born + 0.25 + i * 0.12, POP); return q > 0 ? (
      <span key={i} style={{ fontFamily: F.cn, fontWeight: 700, fontSize: 24, color: C.cardSub, background: C.slot, borderRadius: 14, padding: "6px 14px", opacity: Math.min(1, q * 2), transform: `scale(${overshoot(q)})`, display: "inline-block" }}>{g}</span>
    ) : null; })}
  </div>) : null);
const Badge: React.FC<{ text?: string; at: number; t: number; tone?: string }> = ({ text, at, t, tone }) => {
  if (!text) return null;
  const q = prog(t, at, POP);
  if (q <= 0) return null;
  return <span style={{ fontFamily: F.num, fontWeight: 900, fontSize: 32, color: "#fff", background: accent(tone ?? "red"), borderRadius: 18, padding: "4px 14px", marginLeft: 14, opacity: Math.min(1, q * 2), transform: `scale(${overshoot(q)})`, display: "inline-block" }}>{text}</span>;
};

export const CardView: React.FC<{ c: BoardCard; t: number; born: number }> = ({ c, t, born }) => {
  const n = natural(c), col = accent(c.tone), ink = accentInk(c.tone);
  const b: React.CSSProperties = { width: n.w, height: n.h, ...base() };
  switch (c.kind) {
    case "text": {
      const sp = c.subAt !== undefined ? prog(t, c.subAt, ENTER, easeOutCubic) : prog(t, born + 0.15, ENTER, easeOutCubic);
      return (
        <div style={{ ...b, padding: "0 40px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
            {c.icon ? <IconBox name={c.icon} size={104} color={col} pulseAt={c.pulseAt} t={t} /> : null}
            <div>
              <div style={{ fontFamily: F.cn, fontWeight: 800, fontSize: 56, color: C.cardText, lineHeight: 1.15 }}>{c.title}</div>
              {c.sub ? <div style={{ fontFamily: F.cn, fontWeight: 600, fontSize: 34, color: C.cardSub, marginTop: 8, opacity: sp, transform: `translateY(${(1 - sp) * 10}px)` }}>{c.sub}</div> : null}
            </div>
          </div>
          {c.meta ? <div style={{ marginTop: 12 }}><Meta text={c.meta} /></div> : null}
          <Tags tags={c.tags} t={t} born={born} />
        </div>
      );
    }
    case "chip":
      return (
        <div style={{ ...b, borderRadius: 65, display: "flex", alignItems: "center", gap: 18, padding: "0 30px" }}>
          {c.icon ? <IconBox name={c.icon} size={78} color={col} t={t} /> : <div style={{ width: 20, height: 20, borderRadius: 10, background: col }} />}
          <span style={{ fontFamily: F.cn, fontWeight: 800, fontSize: 52, color: C.cardText, whiteSpace: "nowrap" }}>{c.title}</span>
        </div>
      );
    case "question":
      return (
        <div style={{ ...b, borderRadius: "60px 60px 60px 14px", display: "flex", alignItems: "center", gap: 18, padding: "0 30px" }}>
          <div style={{ width: 64, height: 64, borderRadius: 32, background: col, color: "#fff", display: "grid", placeItems: "center", fontFamily: F.num, fontWeight: 900, fontSize: 40, flexShrink: 0 }}>?</div>
          <span style={{ fontFamily: F.cn, fontWeight: 800, fontSize: 44, color: C.cardText, whiteSpace: "nowrap" }}>{c.text}</span>
        </div>
      );
    case "stat": {
      const at = c.at ?? born + 0.1;
      const v = (c.from ?? 0) + (c.value - (c.from ?? 0)) * quart(prog(t, at, 1.0, Easing.linear));
      return (
        <div style={{ ...b, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", gap: 6 }}>
          <div style={{ fontFamily: F.cn, fontWeight: 700, fontSize: 38, color: C.cardSub }}>{c.label}</div>
          <div style={{ fontFamily: F.num, fontWeight: 900, fontSize: 150, lineHeight: 1, color: ink, letterSpacing: -5 }}>{c.prefix ?? ""}{fmt(v, c.decimals ?? 0)}<span style={{ fontSize: 60, letterSpacing: 0 }}>{c.suffix ?? ""}</span></div>
          {c.sub ? <div style={{ fontFamily: F.cn, fontSize: 32, color: C.cardText, opacity: prog(t, at + 0.6, 0.25) }}>{c.sub}</div> : null}
          {c.meta ? <Meta text={c.meta} /> : null}
        </div>
      );
    }
    case "data": {
      const at = c.at ?? born + 0.1, dur = c.dur ?? 1.0;
      const p = quart(prog(t, at, dur, Easing.linear));
      const v = (c.from ?? 0) + (c.value - (c.from ?? 0)) * p;
      return (
        <div style={{ ...b, padding: "28px 36px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 20 }}>
            <span style={{ fontFamily: F.cn, fontWeight: 800, fontSize: 38, color: C.cardText }}>{c.title}</span>
            <Meta text={c.meta} right />
          </div>
          <div style={{ display: "flex", alignItems: "baseline", marginTop: 14, height: 130 }}>
            <span style={{ fontFamily: F.num, fontWeight: 900, fontSize: 116, lineHeight: 1, color: ink, letterSpacing: -4 }}>{c.prefix ?? ""}{fmt(v, c.decimals ?? 0)}</span>
            {c.unit ? <span style={{ fontFamily: F.cn, fontWeight: 800, fontSize: 40, color: ink, marginLeft: 8 }}>{c.unit}</span> : null}
            <Badge text={c.badge} at={at + dur * 0.85} t={t} />
          </div>
          {(c.rows ?? []).map((r, i) => {
            const q = prog(t, at + 0.15 + i * 0.12, ENTER, easeOutCubic);
            return (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", height: 56, borderTop: `1.5px solid ${C.cardLine}`, opacity: q }}>
                <span style={{ fontFamily: F.cn, fontWeight: 600, fontSize: 28, color: C.cardSub }}>{r.label}</span>
                <span style={{ fontFamily: F.num, fontWeight: 800, fontSize: 30, color: C.cardText }}>{r.value}</span>
              </div>
            );
          })}
          {c.bar ? (
            <div style={{ marginTop: 18 }}>
              {c.bar.label ? <div style={{ fontFamily: F.cn, fontSize: 22, color: C.cardFaint, marginBottom: 8 }}>{c.bar.label}</div> : null}
              <div style={{ height: 22, borderRadius: 11, background: C.slot, overflow: "hidden" }}>
                <div style={{ width: `${(c.bar.value / c.bar.max) * 100 * p}%`, height: "100%", borderRadius: 11, background: col }} />
              </div>
            </div>
          ) : null}
          {c.foot ? <div style={{ position: "absolute", right: 30, bottom: 16 }}><Meta text={c.foot} right /></div> : null}
          <Tags tags={c.tags} t={t} born={born} />
        </div>
      );
    }
    case "list":
      return (
        <div style={{ ...b, padding: "30px 38px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 18, paddingBottom: 18, borderBottom: `2px solid ${C.cardLine}` }}>
            <IconBox name={c.icon ?? "check"} size={70} color={col} t={t} />
            <span style={{ fontFamily: F.cn, fontWeight: 800, fontSize: 48, color: C.cardText }}>{c.title}</span>
          </div>
          {c.items.map((it, i) => {
            const q = prog(t, it.at, POP);
            return (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 18, height: 88 }}>
                <div style={{ width: 46, height: 46, borderRadius: 12, border: `3px solid ${q > 0 ? col : C.slot}`, background: q > 0 ? col : "transparent", display: "grid", placeItems: "center", transform: `scale(${q > 0 ? overshoot(q) : 1})` }}>
                  {q > 0 ? <Icon name="check" size={30} stroke={3.2} color="#fff" /> : null}
                </div>
                {q > 0 ? <span style={{ fontFamily: F.cn, fontWeight: 700, fontSize: 44, color: C.cardText, opacity: Math.min(1, q * 2) }}>{it.text}</span>
                  : <div style={{ width: 300, height: 18, borderRadius: 9, background: C.slot }} />}
              </div>
            );
          })}
          {c.meta ? <Meta text={c.meta} /> : null}
        </div>
      );
    case "bars": {
      const max = Math.max(...c.items.map((i) => i.value));
      const lastAt = (c.items.at(-1)?.at ?? born + 0.2 + (c.items.length - 1) * 0.25) + 0.55;
      return (
        <div style={{ ...b, padding: "28px 38px" }}>
          {c.title ? <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", height: 70 }}><span style={{ fontFamily: F.cn, fontWeight: 800, fontSize: 44, color: C.cardText }}>{c.title}<Badge text={c.badge} at={lastAt} t={t} /></span><Meta text={c.meta} right /></div> : null}
          {c.items.map((it, i) => {
            const q = quart(prog(t, it.at ?? born + 0.2 + i * 0.25, 0.6, Easing.linear));
            const tone = it.tone ?? (i === c.items.length - 1 ? "yellow" : "blue");
            return (
              <div key={i} style={{ height: 112, paddingTop: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontFamily: F.cn, fontSize: 34, marginBottom: 10 }}>
                  <span style={{ fontWeight: 700, color: C.cardText }}>{it.label}</span>
                  <span style={{ fontFamily: F.num, fontWeight: 800, color: accentInk(tone), fontSize: 40 }}>{it.display ?? fmt(it.value * q, it.value % 1 ? 1 : 0)}{c.unit ?? ""}</span>
                </div>
                <div style={{ height: 28, borderRadius: 14, background: C.slot, overflow: "hidden" }}>
                  <div style={{ width: `${(it.value / max) * 100 * q}%`, height: "100%", borderRadius: 14, background: accent(tone) }} />
                </div>
              </div>
            );
          })}
        </div>
      );
    }
    case "progress": {
      const at = c.at ?? born + 0.15;
      const v = c.to * quart(prog(t, at, c.dur ?? 1.4, Easing.linear));
      const shimmer = ((t * 0.9) % 1) * 140 - 20;
      return (
        <div style={{ ...b, padding: "34px 40px", display: "flex", flexDirection: "column", justifyContent: "center", gap: 22 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <span style={{ fontFamily: F.cn, fontWeight: 800, fontSize: 46, color: C.cardText }}>{c.label}</span>
            <span style={{ fontFamily: F.num, fontWeight: 900, fontSize: 64, color: ink }}>{Math.round(v)}%</span>
          </div>
          <div style={{ position: "relative", height: 40, borderRadius: 20, background: C.slot, overflow: "hidden" }}>
            <div style={{ position: "absolute", inset: 0, width: `${v}%`, borderRadius: 20, background: col, overflow: "hidden" }}>
              <div style={{ position: "absolute", top: 0, bottom: 0, left: `${shimmer}%`, width: "18%", background: "linear-gradient(90deg,transparent,rgba(255,255,255,0.55),transparent)" }} />
            </div>
          </div>
          {c.meta ? <Meta text={c.meta} /> : null}
        </div>
      );
    }
    case "keyword": {
      const dark = c.tone === "yellow" || !c.tone;
      return (
        <div style={{ ...b, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", gap: 10, background: col, border: "none" }}>
          <div style={{ fontFamily: F.cn, fontWeight: 900, fontSize: [...c.text].length > 6 ? 84 : 110, color: dark ? C.ink : "#fff", lineHeight: 1.05, textAlign: "center" }}>{c.text}</div>
          {c.sub ? <div style={{ fontFamily: F.cn, fontWeight: 700, fontSize: 36, color: dark ? "rgba(17,17,20,0.7)" : "rgba(255,255,255,0.85)", opacity: prog(t, born + 0.25, 0.25) }}>{c.sub}</div> : null}
        </div>
      );
    }
    case "stamp":
      return (
        <div style={{ width: n.w, height: n.h, display: "grid", placeItems: "center" }}>
          <div style={{ background: C.yellow, border: `5px solid ${C.ink}`, borderRadius: 18, padding: "18px 36px", fontFamily: F.cn, fontWeight: 900, fontSize: 70, color: C.ink, transform: "rotate(-6deg)", boxShadow: "0 14px 30px rgba(0,0,0,0.25)", whiteSpace: "nowrap" }}>{c.text}</div>
        </div>
      );
    case "mark":
      return (
        <div style={{ width: n.w, height: n.h, borderRadius: n.w / 2, background: c.mark === "check" ? C.green : C.red, display: "grid", placeItems: "center", boxShadow: shadow }}>
          {c.mark === "check" ? <Icon name="check" size={84} color="#fff" stroke={3.4} />
            : <svg width={76} height={76} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={3.4} strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>}
        </div>
      );
    case "terminal":
      return (
        <div style={{ width: n.w, height: n.h, borderRadius: 24, background: "#15171C", boxShadow: shadow, overflow: "hidden", fontFamily: F.mono }}>
          <div style={{ height: 52, display: "flex", alignItems: "center", gap: 10, padding: "0 20px", background: "#1F2229" }}>
            {["#FF5F57", "#FEBC2E", "#28C840"].map((x) => <div key={x} style={{ width: 16, height: 16, borderRadius: 8, background: x }} />)}
            <span style={{ marginLeft: 12, color: "rgba(255,255,255,0.55)", fontSize: 20 }}>{c.title ?? "agent"}</span>
          </div>
          <div style={{ padding: "18px 26px" }}>
            {c.lines.map((ln, i) => {
              if (t < ln.at) return null;
              const typed = Math.floor((t - ln.at) * 15);
              const nextAt = c.lines[i + 1]?.at ?? Infinity;
              const active = t < nextAt;
              return (
                <div key={i} style={{ height: 50, display: "flex", alignItems: "center", color: "#E8EAED", fontSize: 28, whiteSpace: "pre" }}>
                  <span style={{ color: "#5BE49B", marginRight: 12 }}>›</span>{[...ln.text].slice(0, typed).join("")}
                  {active && Math.floor(t * 2.5) % 2 === 0 ? <span style={{ display: "inline-block", width: 14, height: 30, background: "#E8EAED", marginLeft: 4 }} /> : null}
                </div>
              );
            })}
          </div>
        </div>
      );
    case "timer": {
      const at = c.at ?? born + 0.1;
      const sec = c.to * interpolate(t, [at, at + (c.dur ?? 1.8)], [0, 1], { ...clamp, easing: Easing.inOut(Easing.sin) });
      const mm = String(Math.floor(sec / 60)).padStart(2, "0"), ss = String(Math.floor(sec % 60)).padStart(2, "0");
      return (
        <div style={{ ...b, borderRadius: 65, display: "flex", alignItems: "center", gap: 18, padding: "0 32px" }}>
          <div style={{ width: 24, height: 24, borderRadius: 12, background: C.red, opacity: Math.floor(t * 2) % 2 ? 0.35 : 1 }} />
          <span style={{ fontFamily: F.mono, fontWeight: 700, fontSize: 26, color: C.red, letterSpacing: 2 }}>REC</span>
          <span style={{ fontFamily: F.num, fontWeight: 900, fontSize: 64, color: C.cardText, letterSpacing: 1 }}>{mm}:{ss}</span>
          {c.label ? <span style={{ fontFamily: F.cn, fontWeight: 700, fontSize: 28, color: C.cardSub }}>{c.label}</span> : null}
        </div>
      );
    }
    case "photo":
      return (
        <div style={{ ...b, overflow: "hidden", padding: 0 }}>
          <Img src={staticFile(c.src)} style={{ width: "100%", height: "100%", objectFit: "cover", transform: `scale(${1.06 - 0.06 * prog(t, born, 4, easeInOut)})` }} />
          {c.label ? <div style={{ position: "absolute", left: 20, top: 20, fontFamily: F.cn, fontWeight: 700, fontSize: 28, color: "#fff", background: "rgba(0,0,0,0.55)", padding: "6px 14px", borderRadius: 12 }}>{c.label}</div> : null}
        </div>
      );
    case "phone": {
      const last = c.items.at(-1)?.at ?? born + 1;
      const badge = Math.round((c.badgeTo ?? c.items.length) * quart(prog(t, born + 0.15, Math.max(0.6, last - born), Easing.linear)));
      return (
        <div style={{ width: n.w, height: n.h, position: "relative", borderRadius: 64, background: "#0E0E10", border: "10px solid #D9DCE2", boxShadow: shadow, padding: "70px 22px 22px" }}>
          <div style={{ position: "absolute", top: 18, left: "50%", width: 120, height: 32, borderRadius: 16, background: "#000", transform: "translateX(-50%)" }} />
          {c.badgeTo !== undefined ? <div style={{ position: "absolute", top: -20, right: -20, minWidth: 74, height: 54, borderRadius: 27, background: C.red, border: "4px solid #fff", display: "grid", placeItems: "center", padding: "0 12px", fontFamily: F.num, fontWeight: 900, fontSize: 28, color: "#fff" }}>{badge >= 99 ? "99+" : badge}</div> : null}
          {c.title ? <div style={{ fontFamily: F.cn, fontWeight: 800, fontSize: 30, color: "#fff", marginBottom: 16 }}>{c.title}</div> : null}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {c.items.map((it, i) => {
              const q = prog(t, it.at, ENTER, easeOutCubic);
              return q > 0 ? (
                <div key={i} style={{ display: "flex", gap: 12, alignItems: "center", background: "#1E1E22", borderRadius: 18, padding: "12px 14px", opacity: q, transform: `translateY(${(1 - q) * 14}px)` }}>
                  <div style={{ width: 44, height: 44, borderRadius: 22, background: ["#A57BFF", "#3D9BFF", "#FFB547", "#38D39F"][i % 4], flexShrink: 0 }} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontFamily: F.cn, fontWeight: 700, fontSize: 22, color: "#fff" }}>{it.name}</div>
                    <div style={{ fontFamily: F.cn, fontSize: 21, color: "rgba(255,255,255,0.62)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{it.text}</div>
                  </div>
                </div>
              ) : null;
            })}
          </div>
        </div>
      );
    }
    case "prop":
      return <PropView p={c.prop} t={t} born={born} tone={c.tone} />;
    case "doc":
      return (
        <div style={{ ...b, padding: "30px 38px", background: "#FFFFFF" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}><Icon name="doc" size={38} /><span style={{ fontFamily: F.cn, fontWeight: 800, fontSize: 38, color: C.ink }}>{c.title}</span></div>
            {c.tag ? <span style={{ fontFamily: F.cn, fontWeight: 800, fontSize: 22, color: "#fff", background: C.blue, padding: "6px 14px", borderRadius: 12 }}>{c.tag}</span> : null}
          </div>
          {c.lines.map((ln, i) => {
            const q = ln.at !== undefined ? prog(t, ln.at, 0.3) : 1;
            const mk = ln.mark ? { red: "rgba(255,90,95,0.28)", yellow: "rgba(248,219,81,0.6)", blue: "rgba(61,155,255,0.25)" }[ln.mark] : undefined;
            return ln.text ? (
              <div key={i} style={{ height: 62, display: "flex", alignItems: "center", fontFamily: F.cn, fontWeight: 700, fontSize: 32, color: C.ink, opacity: Math.max(0.2, q) }}>
                <span style={{ backgroundImage: mk ? `linear-gradient(${mk},${mk})` : undefined, backgroundRepeat: "no-repeat", backgroundSize: `${q * 100}% 100%`, padding: "2px 4px", borderRadius: 6 }}>{ln.text}</span>
              </div>
            ) : <div key={i} style={{ height: 62, display: "flex", alignItems: "center" }}><div style={{ height: 18, width: `${60 + ((i * 37) % 35)}%`, borderRadius: 9, background: "#DADADF" }} /></div>;
          })}
          {c.meta ? <Meta text={c.meta} /> : null}
        </div>
      );
  }
};

// ---------------- 水印（铺在世界里，跟镜头 1:1） ----------------
const watermarkUrl = (brand: string, tag: string) => {
  const tx = (x: number, y: number, s: string, outline: boolean) => outline
    ? `<text x='${x}' y='${y}' font-family='Avenir Next,Helvetica,sans-serif' font-style='italic' fill='none' stroke='${C.watermarkStroke}' stroke-width='2.5'>${s}</text>`
    : `<text x='${x}' y='${y}' font-family='PingFang SC,sans-serif' fill='${C.watermark}'>${s}</text>`;
  const bw = [...brand].length * 122 + 60; // 品牌字约 122px/字 + 间距
  const UNIT = bw + 620; // 再加描边 ORIGINAL 约 560px + 间距
  const row = (y: number, x0: number) => tx(x0, y, brand, false) + tx(x0 + bw, y, tag, true) + tx(x0 - UNIT, y, brand, false) + tx(x0 - UNIT + bw, y, tag, true) + tx(x0 + UNIT, y, brand, false);
  const mk = (body: string) => `url("data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='${UNIT}' height='350'><g font-size='118' font-weight='900'>${body}</g></svg>`)}")`;
  return { odd: mk(row(130, 20)), even: mk(row(305, 20 + UNIT / 2)), unit: UNIT };
};

type Look = { geo: Geo; op: number; scale: number; dy: number; dx: number; blur: number; dim: number };

// ---------------- 画板 ----------------
export const Board: React.FC<{ s: { cards: BoardCard[]; steps: BoardStep[] }; t: number; area: Area; brand?: string; brandTag?: string; segStart?: number }> = ({ s, t, area, brand = "BRAND", brandTag = "ORIGINAL", segStart = 0 }) => {
  const cards = new Map(s.cards.map((c) => [c.id, c]));
  const steps = withRegions(s.steps).map((st, i) => (i === 0 ? { ...st, at: Math.min(st.at, area.t0) } : st));
  const { L, S } = simulate(steps, cards, area);
  const k = stepIndex(steps, t);
  const cam = camera(steps, S, area, t);
  const camPrev = camera(steps, S, area, t - 1 / FPS);
  const speed = Math.hypot(cam.tx - camPrev.tx, cam.ty - camPrev.ty) * cam.z + Math.abs(cam.z - camPrev.z) * 900;
  const mblur = speed > 20 ? Math.min(9, (speed - 20) * 0.12) : 0;
  const vx = W / 2, vy = (area.top + area.bottom) / 2;
  const ox = vx - cam.tx * cam.z, oy = vy - cam.ty * cam.z;
  const born = (id: string) => steps.find((st) => st.show.includes(id))?.at ?? 0;
  const activeIn = (kk: number, x: string) => kk >= 0 && S[kk].get(x)?.mode === "active";

  const dimOf = (kk: number, x: string) => {
    const ss = S[kk].get(x);
    if (!ss) return 1;
    if (ss.mode === "parked") return 0.42;
    const stp = steps[kk];
    if (stp.dim === false || stp.layout === "hero") return 1;
    const fr = stp.show.filter((y) => !activeIn(kk - 1, y));
    return fr.length && !fr.includes(x) && x !== stp.focus ? 0.5 : 1;
  };

  /** 卡片在 t 时刻的样子 */
  const look = (id: string): Look | null => {
    if (k < 0) return null;
    const st = steps[k], now = S[k].get(id), before = k > 0 ? S[k - 1].get(id) : undefined;
    const dim = lerp(k > 0 ? dimOf(k - 1, id) : 1, dimOf(k, id), prog(t, st.at, 0.2));
    if (now && before) {
      return { geo: lerpG(before.geo, now.geo, prog(t, st.at, MOVE, easeInOut)), op: 1, scale: 1, dy: 0, dx: 0, blur: 0, dim };
    }
    if (now && !before) {
      const kind = cards.get(id)?.kind ?? "text";
      const spec = st.enter?.[id] ?? { type: kind === "stamp" ? ("stamp" as const) : ("pop" as const) };
      const fresh = st.show.filter((x) => !(k > 0 && S[k - 1].has(x)));
      const someMoving = k > 0 && st.show.some((x) => { const a = S[k - 1].get(x), b2 = S[k].get(x); return a && b2 && Math.hypot(a.geo.cx - b2.geo.cx, a.geo.cy - b2.geo.cy) > 4; });
      const at = st.at + (someMoving ? YIELD : 0) + Math.max(0, fresh.indexOf(id)) * STAGGER;
      if (t < at) return null;
      const src = spec.from ? (S[k].get(spec.from) ?? (k > 0 ? S[k - 1].get(spec.from) : undefined)) : undefined;
      if (spec.type === "stamp") {
        const q = prog(t, at, 0.1, easeOutCubic);
        return { geo: now.geo, op: Math.min(1, q * 3), scale: lerp(1.8, 1, q), dy: 0, dx: 0, blur: 0, dim };
      }
      if ((spec.type === "grow" || spec.type === "fly") && src) {
        const dur = spec.type === "grow" ? 0.25 : 0.36;
        const q = prog(t, at, dur, spec.type === "grow" ? easeOutCubic : easeInOut);
        const start = spec.type === "grow" ? { cx: lerp(src.geo.cx, now.geo.cx, 0.35), cy: lerp(src.geo.cy, now.geo.cy, 0.35), s: now.geo.s * 0.3 } : { ...src.geo, s: now.geo.s * 0.25 };
        return { geo: lerpG(start, now.geo, q), op: Math.min(1, q * 5), scale: 1, dy: 0, dx: 0, blur: 0, dim };
      }
      if (spec.type === "slide") {
        const q = prog(t, at, 0.3, easeOutCubic);
        const d = spec.dir ?? "right", Dd = W * 0.7;
        return { geo: now.geo, op: Math.min(1, q * 2), scale: 1, dx: (d === "right" ? Dd : d === "left" ? -Dd : 0) * (1 - q), dy: (d === "down" ? Dd : d === "up" ? -Dd : 0) * (1 - q), blur: (1 - q) * 12, dim };
      }
      if (SMALL.has(kind)) {
        const q = prog(t, at, POP);
        return { geo: now.geo, op: Math.min(1, q * 2.5), scale: overshoot(q), dy: 0, dx: 0, blur: 0, dim };
      }
      const q = prog(t, at, ENTER, easeOutCubic);
      return { geo: now.geo, op: q, scale: 0.96 + 0.04 * q, dy: (1 - q) * 24, dx: 0, blur: (1 - q) * 6, dim };
    }
    if (!now && before) {
      const ex = st.exit?.[id];
      if (ex?.type === "into" && ex.to) {
        const tg = S[k].get(ex.to)?.geo ?? before.geo;
        const q = prog(t, st.at, 0.36, easeInOut);
        if (q >= 1) return null;
        return { geo: lerpG(before.geo, { ...tg, s: tg.s * 0.2 }, q), op: q > 0.7 ? (1 - q) / 0.3 : 1, scale: 1, dy: 0, dx: 0, blur: 0, dim: 1 };
      }
      const q = prog(t, st.at, EXIT, easeOutCubic);
      if (q >= 1) return null;
      return { geo: before.geo, op: 1 - q, scale: 1 - 0.06 * q, dy: 0, dx: 0, blur: q * 4, dim };
    }
    return null;
  };

  // 连线：链式和树自动连；line 描出后光点流，pipe 粗管道里光点流，sight 虚线视线，particles 小文件沿线飞
  type LK = LinkSpec & { fresh: boolean; tree: boolean };
  const links: LK[] = [];
  if (k >= 0) {
    const auto = (st: BoardStep): LinkSpec[] => {
      const ids = st.show;
      const raw = st.links ?? (st.layout === "chain" ? ids.slice(1).map((id, i) => [ids[i], id] as [string, string]) : st.layout === "tree" ? ids.slice(1).map((id) => [ids[0], id] as [string, string]) : []);
      return raw.map((x) => (Array.isArray(x) ? { from: x[0], to: x[1] } : x));
    };
    const cur = auto(steps[k]), prv = k > 0 ? auto(steps[k - 1]) : [];
    for (const l of cur) links.push({ ...l, fresh: !prv.some((x) => x.from === l.from && x.to === l.to), tree: steps[k].layout === "tree" && !steps[k].links });
  }
  const drift = (t - segStart) * 14; // 背景水印逐行反向走，看得出来在动
  const wm = watermarkUrl(brand, brandTag);
  const looks = new Map(s.cards.map((c) => [c.id, look(c.id)]));

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
      <div style={{ position: "absolute", left: 0, top: 0, width: W, height: H, transformOrigin: "0 0", transform: `translate(${ox}px, ${oy}px) scale(${cam.z})`, filter: mblur > 0.4 ? `blur(${mblur}px)` : undefined, textRendering: "geometricPrecision" }}>
        <div style={{ position: "absolute", left: -4 * W, top: -4 * H, width: 10 * W, height: 10 * H, backgroundImage: wm.odd, backgroundSize: `${wm.unit}px 350px`, backgroundPosition: `${drift}px 0px` }} />
        <div style={{ position: "absolute", left: -4 * W, top: -4 * H, width: 10 * W, height: 10 * H, backgroundImage: wm.even, backgroundSize: `${wm.unit}px 350px`, backgroundPosition: `${-drift}px 0px` }} />
        {k >= 0 ? (steps[k].ghost ?? []).map((id) => {
          const j = steps.findIndex((st, i) => i > k && st.show.includes(id));
          const g = j >= 0 ? L[j].get(id) : undefined;
          const c = cards.get(id);
          if (!g || !c || looks.get(id)) return null;
          const n = natural(c);
          return <div key={`g-${id}`} style={{ position: "absolute", left: g.cx - (n.w * g.s) / 2, top: g.cy - (n.h * g.s) / 2, width: n.w * g.s, height: n.h * g.s, borderRadius: 30 * g.s, border: `3px dashed ${C.cardFaint}`, opacity: 0.8 * prog(t, steps[k].at + 0.1, 0.25) }} />;
        }) : null}
        <svg style={{ position: "absolute", left: -4 * W, top: -4 * H, overflow: "visible" }} width={10 * W} height={10 * H}>
          <g transform={`translate(${4 * W}, ${4 * H})`}>
            {links.map((lk, i) => {
              const A = looks.get(lk.from), B = looks.get(lk.to);
              if (!A || !B) return null;
              const na = natural(cards.get(lk.from)!), nb = natural(cards.get(lk.to)!);
              const aw = (na.w * A.geo.s * A.scale) / 2, ah = (na.h * A.geo.s * A.scale) / 2, bw = (nb.w * B.geo.s * B.scale) / 2, bh = (nb.h * B.geo.s * B.scale) / 2;
              const ax = A.geo.cx + A.dx, ay = A.geo.cy + A.dy, bx = B.geo.cx + B.dx, by = B.geo.cy + B.dy;
              let pts: [number, number][];
              if (lk.tree) { const bl = bx - bw, spine = Math.min(ax, bl - 46); pts = [[ax, ay + ah], [ax, ay + ah + 20], [spine, ay + ah + 20], [spine, by], [bl, by]]; }
              else if (Math.abs(bx - ax) > Math.abs(by - ay)) { const sx = bx > ax ? ax + aw : ax - aw, ex = bx > ax ? bx - bw : bx + bw, mx = (sx + ex) / 2; pts = Math.abs(ay - by) < 4 ? [[sx, ay], [ex, by]] : [[sx, ay], [mx, ay], [mx, by], [ex, by]]; }
              else { const sy = by > ay ? ay + ah : ay - ah, ey = by > ay ? by - bh : by + bh, my = (sy + ey) / 2; pts = Math.abs(ax - bx) < 4 ? [[ax, sy], [bx, ey]] : [[ax, sy], [ax, my], [bx, my], [bx, ey]]; }
              const d = pts.map((p, j) => `${j ? "L" : "M"} ${p[0]} ${p[1]}`).join(" ");
              const segL = pts.slice(1).map((p, j) => Math.hypot(p[0] - pts[j][0], p[1] - pts[j][1]));
              const len = segL.reduce((x, y) => x + y, 0) + 1;
              const at = (f: number) => { let r = f * len; for (let j = 0; j < segL.length; j++) { if (r <= segL[j]) { const u = r / (segL[j] || 1); return [pts[j][0] + (pts[j + 1][0] - pts[j][0]) * u, pts[j][1] + (pts[j + 1][1] - pts[j][1]) * u]; } r -= segL[j]; } return pts[pts.length - 1]; };
              const t0 = lk.at ?? steps[k].at + 0.15;
              const draw = lk.fresh || lk.at !== undefined ? prog(t, t0, lk.style === "pipe" ? 0.4 : 0.23) : 1;
              const op = Math.min(A.op, B.op) * Math.sqrt(Math.min(A.dim, B.dim));
              const style = lk.style ?? "line";
              const end = pts[pts.length - 1];
              return (
                <g key={i} opacity={op}>
                  {style === "pipe" ? (
                    <>
                      <path d={d} fill="none" stroke={C.propLine} strokeWidth={34} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={len} strokeDashoffset={len * (1 - draw)} />
                      <path d={d} fill="none" stroke={C.propBody2} strokeWidth={22} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={len} strokeDashoffset={len * (1 - draw)} />
                      {draw >= 1 ? <path d={d} fill="none" stroke={C.blue} strokeWidth={12} strokeLinecap="round" strokeDasharray="1 34" strokeDashoffset={-t * 140} /> : null}
                    </>
                  ) : style === "sight" ? (
                    <path d={d} fill="none" stroke={C.cardSub} strokeWidth={5} strokeLinecap="round" strokeDasharray="14 14" strokeDashoffset={-t * 60} opacity={draw} />
                  ) : style === "particles" ? (
                    <>
                      <path d={d} fill="none" stroke={C.cardFaint} strokeWidth={3} opacity={0.35 * draw} />
                      {draw >= 1 ? Array.from({ length: 5 }, (_, j) => { const f = ((t - t0) * 1.1 + j / 5) % 1; const [px, py] = at(f); return <g key={j} opacity={Math.min(1, Math.sin(f * Math.PI) * 2)}><rect x={px - 16} y={py - 18} width={32} height={40} rx={6} fill={C.cardBg} stroke={C.propLine} strokeWidth={3.5} /><rect x={px - 16} y={py - 18} width={32} height={9} rx={4} fill={C.cyan} /><rect x={px - 9} y={py - 2} width={18} height={4} rx={2} fill={C.cardFaint} /><rect x={px - 9} y={py + 7} width={12} height={4} rx={2} fill={C.cardFaint} /></g>; }) : null}
                    </>
                  ) : (
                    <>
                      <path d={d} fill="none" stroke={C.cardLine} strokeWidth={6} strokeLinecap="round" strokeDasharray={len} strokeDashoffset={len * (1 - draw)} />
                      {draw >= 1 ? <path d={d} fill="none" stroke={C.blue} strokeWidth={7} strokeLinecap="round" strokeDasharray="1 24" strokeDashoffset={-t * 90} /> : null}
                      {draw > 0.95 ? <circle cx={end[0]} cy={end[1]} r={8} fill={C.blue} /> : null}
                    </>
                  )}
                </g>
              );
            })}
          </g>
        </svg>
        {s.cards.map((c) => {
          const lk = looks.get(c.id);
          if (!lk) return null;
          const n = natural(c);
          const filt = `${lk.blur > 0.3 ? `blur(${lk.blur}px) ` : ""}${lk.dim < 0.99 ? `saturate(${0.4 + 0.6 * lk.dim})` : ""}`.trim();
          return (
            <div key={c.id} style={{ position: "absolute", left: lk.geo.cx - n.w / 2 + lk.dx, top: lk.geo.cy - n.h / 2 + lk.dy, width: n.w, height: n.h, opacity: lk.op * lk.dim,
              transform: `scale(${lk.geo.s * lk.scale})`, filter: filt || undefined }}>
              <CardView c={c} t={t} born={born(c.id)} />
            </div>
          );
        })}
      </div>
    </div>
  );
};
