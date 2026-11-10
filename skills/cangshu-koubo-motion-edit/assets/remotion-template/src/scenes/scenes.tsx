import React from "react";
import { Img, interpolate, staticFile } from "remotion";
import { C, F, SAFE, W, accent, accentInk, shadow } from "../theme";
import { D, clamp, countUp, easeOut, fadeUp, fmt, popScale, prog } from "../anim";
import type { Scene } from "../plan";
import { Icon } from "../components/base";
import { Board } from "./board";
import { CUSTOM } from "./custom";

export type Area = { top: number; bottom: number; t0: number }; // t0：这段 B 世界的外壳最晚出现时间
type P<K extends Scene["layout"]> = { s: Extract<Scene, { layout: K }>; t: number; area: Area };

const Card: React.FC<{ children: React.ReactNode; style?: React.CSSProperties; light?: boolean }> = ({ children, style, light }) => (
  <div style={{ background: light ? C.cardLight : C.cardBg, borderRadius: 30, border: `1px solid ${light ? "rgba(0,0,0,0.06)" : C.cardLine}`, boxShadow: shadow, ...style }}>{children}</div>
);
const Center: React.FC<{ area: Area; children: React.ReactNode; gap?: number }> = ({ area, children, gap = 26 }) => (
  <div style={{ position: "absolute", left: SAFE.side, right: SAFE.side, top: area.top, height: area.bottom - area.top, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", gap }}>
    {children}
  </div>
);
const firstAt = (xs: { at: number }[], t0: number) => Math.min(t0, xs.length ? Math.min(...xs.map((x) => x.at)) - 0.35 : t0);

/** 清单卡：图标脉冲 + 逐项打勾 + 右侧计量条逐格填满 */
export const Checklist: React.FC<P<"checklist">> = ({ s, t, area }) => {
  const at0 = firstAt(s.items, area.t0);
  const p = prog(t, at0, D.in);
  const pulse = s.iconPulseAt !== undefined ? prog(t, s.iconPulseAt, 0.45) : 0;
  const done = s.items.filter((i) => t >= i.at).length;
  return (
    <Center area={area}>
      <div style={{ display: "flex", gap: 22, alignItems: "stretch", ...fadeUp(p, 30, 10) }}>
        <Card style={{ width: s.meter ? 760 : 900, padding: "34px 38px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 18, paddingBottom: 22, borderBottom: `2px solid ${C.cardLine}` }}>
            <div style={{ position: "relative", width: 76, height: 76, borderRadius: 18, background: C.yellow, display: "grid", placeItems: "center" }}>
              <Icon name={s.icon ?? "bulb"} size={44} />
              {pulse > 0 && pulse < 1 ? <div style={{ position: "absolute", inset: -6, borderRadius: 24, border: `4px solid ${C.yellow}`, transform: `scale(${1 + pulse * 0.7})`, opacity: 1 - pulse }} /> : null}
            </div>
            <span style={{ fontFamily: F.cn, fontWeight: 800, fontSize: 54, color: C.cardText }}>{s.title}</span>
          </div>
          {s.items.map((it, i) => {
            const q = prog(t, it.at, 0.25);
            return (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 18, marginTop: 24 }}>
                <div style={{ width: 46, height: 46, borderRadius: 12, border: `3px solid ${q > 0 ? C.yellow : C.slot}`, background: q > 0 ? C.yellow : "transparent", display: "grid", placeItems: "center", transform: `scale(${q > 0 ? popScale(t, it.at, 0.2) : 1})` }}>
                  {q > 0 ? <Icon name="check" size={30} stroke={3.2} /> : null}
                </div>
                {q > 0 ? <span style={{ fontFamily: F.cn, fontWeight: 700, fontSize: 46, color: C.cardText, ...fadeUp(q, 0, 6), transform: `translateX(${(1 - q) * 14}px)` }}>{it.text}</span>
                  : <div style={{ width: 280, height: 18, borderRadius: 9, background: C.slot }} />}
              </div>
            );
          })}
        </Card>
        {s.meter ? (
          <Card style={{ width: 130, padding: "24px 18px", display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
            <span style={{ fontFamily: F.cn, fontWeight: 800, fontSize: 30, color: C.cardSub }}>{s.meter}</span>
            <div style={{ flex: 1, display: "flex", flexDirection: "column-reverse", gap: 12, width: "100%" }}>
              {s.items.map((_, i) => <div key={i} style={{ flex: 1, borderRadius: 14, background: i < done ? C.yellow : C.slot, transform: `scale(${i < done ? popScale(t, s.items[i].at, 0.2) : 1})` }} />)}
            </div>
          </Card>
        ) : null}
      </div>
    </Center>
  );
};

/** 横条对比（3:4 里竖排读起来更清楚）：条从 0 长到值，数字同步滚 */
export const Bars: React.FC<P<"bars">> = ({ s, t, area }) => {
  const max = Math.max(...s.items.map((i) => i.value));
  const p = prog(t, firstAt(s.items, area.t0), D.in);
  return (
    <Center area={area}>
      <Card style={{ width: W - 2 * SAFE.side, padding: "34px 36px", ...fadeUp(p, 30, 10) }}>
        {s.title ? <div style={{ fontFamily: F.cn, fontWeight: 800, fontSize: 42, color: C.cardText, marginBottom: 10 }}>{s.title}</div> : null}
        {s.items.map((it, i) => {
          const q = prog(t, it.at, 0.55);
          const col = accent(it.tone ?? (i === s.items.length - 1 ? "yellow" : "blue"));
          return (
            <div key={i} style={{ marginTop: 26, opacity: Math.min(1, q * 3) }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontFamily: F.cn, fontSize: 32, color: C.cardSub, marginBottom: 10 }}>
                <span style={{ fontWeight: 700, color: C.cardText }}>{it.label}</span>
                <span style={{ fontFamily: F.num, fontWeight: 800, color: accentInk(it.tone ?? (i === s.items.length - 1 ? "yellow" : "blue")), fontSize: 40 }}>{it.display ?? fmt(it.value * q, it.value % 1 ? 1 : 0)}{s.unit ?? ""}</span>
              </div>
              <div style={{ height: 30, borderRadius: 15, background: C.slot, overflow: "hidden" }}>
                <div style={{ width: `${(it.value / max) * 100 * q}%`, height: "100%", borderRadius: 15, background: col }} />
              </div>
            </div>
          );
        })}
      </Card>
    </Center>
  );
};

/** 大数字计数 */
export const Stat: React.FC<P<"stat">> = ({ s, t, area }) => {
  const p = prog(t, s.at - 0.2, D.in);
  const v = countUp(t, s.at, s.from ?? 0, s.value, D.count + 0.3);
  return (
    <Center area={area} gap={10}>
      <div style={{ fontFamily: F.cn, fontWeight: 700, fontSize: 40, color: C.cardSub, ...fadeUp(p, 16, 6) }}>{s.label}</div>
      <div style={{ fontFamily: F.num, fontWeight: 900, fontSize: 210, lineHeight: 1, color: accentInk("yellow"), letterSpacing: -8, transform: `scale(${popScale(t, s.at - 0.2, 0.25)})` }}>
        {s.prefix ?? ""}{fmt(v, s.decimals ?? 0)}<span style={{ fontSize: 80, letterSpacing: 0 }}>{s.suffix ?? ""}</span>
      </div>
      {s.delta ? <div style={{ fontFamily: F.num, fontWeight: 800, fontSize: 44, color: C.green, opacity: prog(t, s.at + D.count, 0.25) }}>{s.delta}</div> : null}
      {s.sub ? <div style={{ fontFamily: F.cn, fontSize: 32, color: C.cardText, opacity: prog(t, s.at + 0.5, 0.3) }}>{s.sub}</div> : null}
    </Center>
  );
};

/** 竖向流程：节点逐个点亮，连线向下描出 */
export const Flow: React.FC<P<"flow">> = ({ s, t, area }) => {
  const p = prog(t, firstAt(s.steps, area.t0), D.in);
  return (
    <Center area={area} gap={0}>
      {s.title ? <div style={{ fontFamily: F.cn, fontWeight: 800, fontSize: 42, color: C.cardText, marginBottom: 24, ...fadeUp(p) }}>{s.title}</div> : null}
      {s.steps.map((st, i) => {
        const q = prog(t, st.at, 0.3);
        const line = i > 0 ? prog(t, st.at - 0.25, 0.25) : 0;
        return (
          <React.Fragment key={i}>
            {i > 0 ? <div style={{ width: 6, height: 46, background: C.slot, position: "relative" }}><div style={{ position: "absolute", inset: 0, background: C.yellow, transformOrigin: "top", transform: `scaleY(${line})` }} /></div> : null}
            <Card style={{ width: 760, padding: "22px 28px", display: "flex", alignItems: "center", gap: 22, opacity: 0.35 + 0.65 * q, border: `2px solid ${q > 0.5 ? C.yellow : C.cardLine}`, transform: `scale(${0.96 + 0.04 * q})` }}>
              <div style={{ width: 58, height: 58, borderRadius: 29, background: q > 0.5 ? C.yellow : C.slot, display: "grid", placeItems: "center", fontFamily: F.num, fontWeight: 900, fontSize: 28, color: C.ink }}>{i + 1}</div>
              <div>
                <div style={{ fontFamily: F.cn, fontWeight: 800, fontSize: 40, color: C.cardText }}>{st.label}</div>
                {st.sub ? <div style={{ fontFamily: F.cn, fontSize: 26, color: C.cardSub, marginTop: 4 }}>{st.sub}</div> : null}
              </div>
            </Card>
          </React.Fragment>
        );
      })}
    </Center>
  );
};

/** 手机：消息逐条进来，角标数字往上跳 */
export const Phone: React.FC<P<"phone">> = ({ s, t, area }) => {
  const p = prog(t, Math.min(s.at, area.t0), 0.35);
  const n = s.items.filter((i) => t >= i.at).length;
  const badge = Math.round(countUp(t, s.at + 0.2, 0, s.badgeTo ?? n, Math.max(0.6, (s.items.at(-1)?.at ?? s.at + 1) - s.at)));
  const h = Math.min(860, area.bottom - area.top - 20);
  return (
    <Center area={area}>
      <div style={{ position: "relative", width: h * 0.49, height: h, borderRadius: 64, background: "#0E0E10", border: "10px solid #E9E9EC", boxShadow: shadow, padding: "70px 22px 22px", ...fadeUp(p, 40, 12) }}>
        <div style={{ position: "absolute", top: 18, left: "50%", width: 120, height: 32, borderRadius: 16, background: "#000", transform: "translateX(-50%)" }} />
        {s.badgeTo !== undefined ? (
          <div style={{ position: "absolute", top: -20, right: -20, minWidth: 74, height: 54, borderRadius: 27, background: C.red, border: "4px solid #fff", display: "grid", placeItems: "center", padding: "0 12px",
            fontFamily: F.num, fontWeight: 900, fontSize: 28, color: "#fff", transform: `scale(${popScale(t, s.at + 0.2)})` }}>{badge >= 99 ? "99+" : badge}</div>
        ) : null}
        {s.title ? <div style={{ fontFamily: F.cn, fontWeight: 800, fontSize: 30, color: "#fff", marginBottom: 16 }}>{s.title}</div> : null}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {s.items.map((it, i) => {
            const q = prog(t, it.at, 0.25);
            return q > 0 ? (
              <div key={i} style={{ display: "flex", gap: 12, alignItems: "center", background: "#1E1E22", borderRadius: 18, padding: "12px 14px", ...fadeUp(q, 20, 6) }}>
                <div style={{ width: 44, height: 44, borderRadius: 22, background: ["#A57BFF", "#3D9BFF", "#FFB547", "#38D39F"][i % 4], flexShrink: 0 }} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontFamily: F.cn, fontWeight: 700, fontSize: 22, color: "#fff" }}>{it.name}</div>
                  <div style={{ fontFamily: F.cn, fontSize: 21, color: C.cardSub, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{it.text}</div>
                </div>
              </div>
            ) : null;
          })}
        </div>
      </div>
    </Center>
  );
};

/** 文档卡：骨架行 + 关键句高亮标记 */
export const Doc: React.FC<P<"doc">> = ({ s, t, area }) => {
  const p = prog(t, Math.min(s.at, area.t0), D.in);
  return (
    <Center area={area}>
      <Card light style={{ width: 760, padding: "34px 40px", ...fadeUp(p, 36, 10) }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 26 }}>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}><Icon name="doc" size={38} /><span style={{ fontFamily: F.cn, fontWeight: 800, fontSize: 38, color: C.ink }}>{s.title}</span></div>
          {s.tag ? <span style={{ fontFamily: F.cn, fontWeight: 800, fontSize: 22, color: "#fff", background: C.blue, padding: "6px 14px", borderRadius: 12 }}>{s.tag}</span> : null}
        </div>
        {s.lines.map((ln, i) => {
          const q = ln.at !== undefined ? prog(t, ln.at, 0.25) : 1;
          const mk = ln.mark ? { red: "rgba(255,90,95,0.28)", yellow: "rgba(248,219,81,0.6)", blue: "rgba(61,155,255,0.25)" }[ln.mark] : undefined;
          return ln.text ? (
            <div key={i} style={{ fontFamily: F.cn, fontWeight: 700, fontSize: 32, color: C.ink, margin: "14px 0", opacity: Math.max(0.15, q) }}>
              <span style={{ backgroundImage: mk ? `linear-gradient(${mk},${mk})` : undefined, backgroundRepeat: "no-repeat", backgroundSize: `${q * 100}% 100%`, padding: "2px 4px", borderRadius: 6 }}>{ln.text}</span>
            </div>
          ) : <div key={i} style={{ height: 18, width: `${60 + ((i * 37) % 35)}%`, borderRadius: 9, background: "#DADADF", margin: "18px 0" }} />;
        })}
      </Card>
    </Center>
  );
};

/** 上下对比卡 + 结论条 */
export const Compare: React.FC<P<"compare">> = ({ s, t, area }) => {
  const side = (c: (typeof s)["left"], at: number, i: number) => {
    const q = prog(t, at, D.in);
    const col = accent(c.tone ?? (i ? "yellow" : "blue"));
    return (
      <Card style={{ width: W - 2 * SAFE.side, padding: "26px 34px", display: "flex", justifyContent: "space-between", alignItems: "center", border: `2px solid ${q > 0.5 ? col : C.cardLine}`, ...fadeUp(q, 26, 8) }}>
        <div>
          <div style={{ fontFamily: F.cn, fontWeight: 800, fontSize: 40, color: C.cardText }}>{c.label}</div>
          {c.sub ? <div style={{ fontFamily: F.cn, fontSize: 26, color: C.cardSub, marginTop: 6 }}>{c.sub}</div> : null}
        </div>
        <div style={{ fontFamily: F.num, fontWeight: 900, fontSize: 92, color: accentInk(c.tone ?? (i ? "yellow" : "blue")), letterSpacing: -3 }}>{c.value}<span style={{ fontFamily: F.cn, fontSize: 34, marginLeft: 6 }}>{c.unit ?? ""}</span></div>
      </Card>
    );
  };
  return (
    <Center area={area} gap={22}>
      {side(s.left, s.at, 0)}
      <div style={{ fontFamily: F.num, fontWeight: 900, fontSize: 40, color: C.cardFaint, opacity: prog(t, s.right.at - 0.1, 0.2) }}>VS</div>
      {side(s.right, s.right.at, 1)}
      {s.verdict ? <div style={{ marginTop: 10, fontFamily: F.cn, fontWeight: 900, fontSize: 48, color: C.ink, background: C.yellow, padding: "12px 28px", borderRadius: 16, transform: `scale(${popScale(t, s.verdict.at, 0.25)})` }}>{s.verdict.text}</div> : null}
    </Center>
  );
};

/** 居中大关键词 + 图标光圈脉冲 */
export const Keyword: React.FC<P<"keyword">> = ({ s, t, area }) => {
  const p = prog(t, s.at, D.in);
  const pulse = prog(t, s.at + 0.1, 0.5);
  return (
    <Center area={area} gap={22}>
      {s.icon ? (
        <div style={{ position: "relative", width: 150, height: 150, borderRadius: 40, background: C.yellow, display: "grid", placeItems: "center", transform: `scale(${popScale(t, s.at)})` }}>
          <Icon name={s.icon} size={88} />
          {pulse < 1 ? <div style={{ position: "absolute", inset: -8, borderRadius: 48, border: `5px solid ${C.yellow}`, transform: `scale(${1 + pulse * 0.6})`, opacity: 1 - pulse }} /> : null}
        </div>
      ) : null}
      <div style={{ fontFamily: F.cn, fontWeight: 900, fontSize: [...s.text].length > 6 ? 96 : 130, color: C.cardText, textAlign: "center", lineHeight: 1.1, ...fadeUp(p, 30, 14) }}>{s.text}</div>
      {s.sub ? <div style={{ fontFamily: F.cn, fontWeight: 600, fontSize: 36, color: C.cardSub, opacity: prog(t, s.at + 0.3, 0.3) }}>{s.sub}</div> : null}
    </Center>
  );
};

/** 竖向时间轴：播放头往下走，到点亮起 */
export const Timeline: React.FC<P<"timeline">> = ({ s, t, area }) => {
  const p = prog(t, firstAt(s.items, area.t0), D.in);
  const first = s.items[0]?.at ?? 0, last = s.items.at(-1)?.at ?? first + 1;
  const head = interpolate(t, [first, last], [0, 1], { ...clamp, easing: easeOut });
  const rowH = Math.min(150, (area.bottom - area.top - 100) / s.items.length);
  return (
    <div style={{ position: "absolute", left: SAFE.side + 40, right: SAFE.side, top: area.top + 40, ...fadeUp(p) }}>
      {s.title ? <div style={{ fontFamily: F.cn, fontWeight: 800, fontSize: 42, color: C.cardText, marginBottom: 20 }}>{s.title}</div> : null}
      <div style={{ position: "relative" }}>
        <div style={{ position: "absolute", left: 20, top: 20, width: 6, height: rowH * (s.items.length - 1), background: C.slot }} />
        <div style={{ position: "absolute", left: 20, top: 20, width: 6, height: rowH * (s.items.length - 1) * head, background: C.yellow }} />
        {s.items.map((it, i) => {
          const q = prog(t, it.at, 0.3);
          return (
            <div key={i} style={{ position: "absolute", top: i * rowH, left: 0, display: "flex", alignItems: "center", gap: 28 }}>
              <div style={{ width: 46, height: 46, borderRadius: 23, background: q > 0.5 ? C.yellow : C.cardBg, border: `4px solid ${q > 0.5 ? C.yellow : C.slot}`, transform: `scale(${q > 0 ? popScale(t, it.at) : 1})` }} />
              <span style={{ fontFamily: F.num, fontWeight: 800, fontSize: 40, color: q > 0.5 ? accentInk("yellow") : C.cardFaint, width: 150 }}>{it.time}</span>
              <span style={{ fontFamily: F.cn, fontWeight: 700, fontSize: 40, color: C.cardText, ...fadeUp(q, 0, 6), transform: `translateX(${(1 - q) * 18}px)` }}>{it.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/** 实拍照片卡：弹出 → 四角取景框收紧锁定 → 可选结论贴纸砸入 */
export const Photo: React.FC<P<"photo">> = ({ s, t, area }) => {
  const sc = popScale(t, s.at, 0.28);
  const lock = s.lockAt !== undefined ? prog(t, s.lockAt, 0.3) : 0;
  const w = W - 2 * SAFE.side - 40, h = Math.min(w * 0.75, area.bottom - area.top - 80);
  const gap = interpolate(lock, [0, 1], [46, 12]);
  const corner = (r: number): React.CSSProperties => ({ position: "absolute", width: 70, height: 70, borderColor: C.yellow, borderStyle: "solid", borderWidth: 0,
    ...(r === 0 ? { left: -gap, top: -gap, borderLeftWidth: 7, borderTopWidth: 7 } : r === 1 ? { right: -gap, top: -gap, borderRightWidth: 7, borderTopWidth: 7 } : r === 2 ? { left: -gap, bottom: -gap, borderLeftWidth: 7, borderBottomWidth: 7 } : { right: -gap, bottom: -gap, borderRightWidth: 7, borderBottomWidth: 7 }) });
  const stk = s.sticker ? interpolate(t, [s.sticker.at, s.sticker.at + 0.09, s.sticker.at + 0.18], [1.35, 0.96, 1], clamp) : 0;
  return (
    <Center area={area}>
      <div style={{ position: "relative", width: w, height: h, transform: `scale(${sc})` }}>
        <Img src={staticFile(s.src)} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 26, boxShadow: shadow }} />
        {s.lockAt !== undefined && lock > 0 ? [0, 1, 2, 3].map((r) => <div key={r} style={{ ...corner(r), opacity: lock }} />) : null}
        {s.label ? <div style={{ position: "absolute", left: 20, top: 20, fontFamily: F.cn, fontWeight: 700, fontSize: 26, color: "#fff", background: "rgba(0,0,0,0.55)", padding: "6px 14px", borderRadius: 12 }}>{s.label}</div> : null}
        {s.sticker && t >= s.sticker.at ? (
          <div style={{ position: "absolute", left: "50%", bottom: -40, background: "#fff", color: C.ink, fontFamily: F.cn, fontWeight: 900, fontSize: 56, padding: "14px 30px", borderRadius: 14,
            boxShadow: "0 18px 40px rgba(0,0,0,0.45)", transform: `translateX(-50%) rotate(-5deg) scale(${stk})`, whiteSpace: "nowrap" }}>{s.sticker.text}</div>
        ) : null}
      </div>
    </Center>
  );
};

/** 左右对比滑块：分割线从右滑到中线，之后轻微摆动 */
export const Slider: React.FC<P<"slider">> = ({ s, t, area }) => {
  const p = prog(t, s.at, 0.5);
  const x = interpolate(p, [0, 1], [96, 50]) + (p >= 1 ? Math.sin((t - s.at - 0.5) * 2.2) * 3 : 0);
  const w = W - 2 * SAFE.side, h = Math.min(w * 1.0, area.bottom - area.top - 40);
  return (
    <Center area={area}>
      <div style={{ position: "relative", width: w, height: h, borderRadius: 26, overflow: "hidden", boxShadow: shadow, opacity: prog(t, s.at - 0.2, 0.2) }}>
        <Img src={staticFile(s.right.src)} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
        <div style={{ position: "absolute", inset: 0, clipPath: `inset(0 ${100 - x}% 0 0)` }}>
          <Img src={staticFile(s.left.src)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        </div>
        <div style={{ position: "absolute", top: 0, bottom: 0, left: `${x}%`, width: 6, marginLeft: -3, background: "#fff" }} />
        <div style={{ position: "absolute", top: "50%", left: `${x}%`, width: 64, height: 64, marginLeft: -32, marginTop: -32, borderRadius: 32, background: "#fff", boxShadow: shadow }} />
        <div style={{ position: "absolute", left: 18, top: 18, fontFamily: F.cn, fontWeight: 800, fontSize: 28, color: "#fff", background: "rgba(0,0,0,0.55)", padding: "6px 14px", borderRadius: 12 }}>{s.left.label}</div>
        <div style={{ position: "absolute", right: 18, top: 18, fontFamily: F.cn, fontWeight: 800, fontSize: 28, color: C.ink, background: C.yellow, padding: "6px 14px", borderRadius: 12 }}>{s.right.label}</div>
      </div>
    </Center>
  );
};

export const SceneView: React.FC<{ s: Scene; t: number; area: Area; brand?: string; brandTag?: string; segStart?: number }> = ({ s, t, area, brand, brandTag, segStart }) => {
  switch (s.layout) {
    case "checklist": return <Checklist s={s} t={t} area={area} />;
    case "bars": return <Bars s={s} t={t} area={area} />;
    case "stat": return <Stat s={s} t={t} area={area} />;
    case "flow": return <Flow s={s} t={t} area={area} />;
    case "phone": return <Phone s={s} t={t} area={area} />;
    case "doc": return <Doc s={s} t={t} area={area} />;
    case "compare": return <Compare s={s} t={t} area={area} />;
    case "keyword": return <Keyword s={s} t={t} area={area} />;
    case "timeline": return <Timeline s={s} t={t} area={area} />;
    case "photo": return <Photo s={s} t={t} area={area} />;
    case "slider": return <Slider s={s} t={t} area={area} />;
    case "board": return <Board s={s} t={t} area={area} brand={brand} brandTag={brandTag} segStart={segStart} />;
    case "custom": { const Comp = CUSTOM[s.name]?.Comp; return Comp ? <Comp t={t} segStart={segStart ?? 0} brand={brand ?? "BRAND"} /> : null; }
  }
};
