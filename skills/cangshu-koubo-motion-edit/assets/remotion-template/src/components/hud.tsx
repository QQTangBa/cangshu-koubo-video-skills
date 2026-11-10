import { TH } from "../scenes/custom/toon";
import React from "react";
import { F, SAFE, W } from "../theme";
import type { Chapter, Plan } from "../plan";
import { TablerIcon } from "../scenes/props";

// 贯穿全片的进度感（观众有进度感）
// 两层：① 顶部分段进度条，全片一直在，当前这段随时间填满；② 每讲到新的一段，左上角弹出章节导航卡（照对标样式：圆形图标 + 序号中文 + 英文小字，当前项点亮），
// 停两秒多后每一行缩小飞进顶部进度条里对应的那一格（导航和进度条是同一个东西的两种形态）。

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const sm = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
const STRIP = { top: 30, h: 44, left: SAFE.side, right: SAFE.side };
const CARD = { top: SAFE.top, rowH: 66 };

type Ch = Chapter & { end: number; i: number };
export const chaptersOf = (plan: Plan): Ch[] => {
  const cs = plan.chapters ?? [];
  return cs.map((c, i) => ({ ...c, i, end: cs[i + 1]?.start ?? plan.meta.duration }));
};

/** 导航卡在这一章开头停多久：默认 2.6 秒；这一段里左上角要出数据卡/信息卡的，收起动画（0.4 秒）要在它出来前 0.15 秒做完，两层不叠（两层字叠在一起） */
export const navWindow = (plan: Plan, c: Ch): [number, number] => {
  let end = c.start + 2.6;
  for (const s of plan.segments) {
    if (s.world === "B" || s.end <= c.start || s.start > end) continue;
    for (const o of s.overlays ?? []) {
      const topLeft = o.type === "metric" || (o.type === "dataCard" && (o.pos ?? "top") === "top") || o.type === "sideWords" || (o.type === "bigText" && !o.behind) || o.type === "infoBox" || o.type === "topWord";
      if (topLeft && o.at - 0.55 < end && (o.until ?? s.end) > c.start) end = Math.max(c.start, o.at - 0.55); // 一开场就有左上叠层：这章不弹导航卡
    }
  }
  return [c.start, end];
};

const segX = (n: number, k: number) => {
  const inner = W - STRIP.left - STRIP.right - 32, gap = 14, w = (inner - gap * (n - 1)) / n;
  return { x: STRIP.left + 16 + k * (w + gap), w };
};

/** ① 顶部分段进度条 */
export const TopProgress: React.FC<{ t: number; plan: Plan; onLight: boolean }> = ({ t, plan, onLight: onLight0 }) => {
  const onLight = onLight0 && !(["chalk", "dark", "neon", "blue"].includes(TH.name) && Math.abs(TH.stageT - t) < 1e-3); // 深色主题的 toon 场景上用白字；lux.tsx 白卡场景照旧深字
  const cs = chaptersOf(plan);
  if (!cs.length) return null;
  const ink = onLight ? "#0F1A2A" : "#FFFFFF";
  const dim = onLight ? "rgba(15,26,42,0.38)" : "rgba(255,255,255,0.5)";
  const track = onLight ? "rgba(15,26,42,0.12)" : "rgba(255,255,255,0.22)";
  const appear = sm((t - 0.2) / 0.4);
  return (
    <div style={{ position: "absolute", left: 0, top: 0, width: W, height: STRIP.top + STRIP.h, opacity: appear, pointerEvents: "none" }}>
      {cs.map((c) => {
        const { x, w } = segX(cs.length, c.i);
        const cur = t >= c.start && t < c.end, done = t >= c.end;
        const fill = done ? 1 : cur ? clamp01((t - c.start) / (c.end - c.start)) : 0;
        const [, navEnd] = navWindow(plan, c);
        // 导航卡收起时，这一格"接住"它：亮一下
        const catchP = t >= navEnd && t < navEnd + 0.6 ? Math.sin(((t - navEnd) / 0.6) * Math.PI) : 0;
        return (
          <div key={c.i} style={{ position: "absolute", left: x, top: STRIP.top, width: w }}>
            <div style={{ height: 5, borderRadius: 3, background: track, overflow: "hidden", boxShadow: onLight ? "none" : "0 1px 6px rgba(0,0,0,0.35)" }}>
              <div style={{ width: `${fill * 100}%`, height: "100%", borderRadius: 3, background: cur ? "#2FD3E6" : ink, opacity: cur ? 1 : 0.85 }} />
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 8, transform: `scale(${1 + 0.08 * catchP})`, transformOrigin: "0% 50%" }}>
              <span style={{ fontFamily: F.num, fontWeight: 700, fontSize: 18, color: cur ? "#2FD3E6" : dim, textShadow: onLight ? "none" : "0 0 3px rgba(0,0,0,0.85), 0 1px 6px rgba(0,0,0,0.6)" }}>{String(c.i + 1).padStart(2, "0")}</span>
              <span style={{ fontFamily: F.cn, fontWeight: 600, fontSize: 20, color: cur ? ink : dim, textShadow: onLight ? "none" : "0 0 3px rgba(0,0,0,0.85), 0 1px 6px rgba(0,0,0,0.6)" }}>{c.label}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

/** ② 章节导航卡：只在真人段、每章开头出现，收起时每一行飞进顶部进度条里对应的那一格 */
export const NavCard: React.FC<{ t: number; plan: Plan; world: string }> = ({ t, plan, world }) => {
  const cs = chaptersOf(plan);
  if (!cs.length || world === "B") return null;
  const c = cs.find((x) => t >= x.start && t < x.end);
  if (!c) return null;
  const [a, b] = navWindow(plan, c);
  if (b - a < 0.6) return null; // 让位后只剩不到 0.6 秒就不弹导航卡，顶部进度条照常走
  if (t < a || t > b + 0.4) return null;
  const closing = sm((t - b) / 0.4);
  return (
    <div style={{ position: "relative", width: 380, marginTop: 14 * (1 - closing), height: cs.length * CARD.rowH * (1 - closing) }}>
      {cs.map((r) => {
        const cur = r.i === c.i, done = r.i < c.i;
        const inP = sm((t - a - 0.05 * r.i) / 0.3);
        // 收起：飞到顶部进度条对应格的位置并缩小
        const { x } = segX(cs.length, r.i);
        const fromX = 0, fromY = r.i * CARD.rowH;
        const toX = x - SAFE.side, toY = STRIP.top - CARD.top - 4; // 顶部留的 14px 间距随收起一起归零
        const px = fromX + (toX - fromX) * closing, py = fromY + (toY - fromY) * closing;
        const sc = 1 - 0.55 * closing;
        const col = cur ? "#2FD3E6" : "rgba(255,255,255,0.55)";
        return (
          <div key={r.i} style={{ position: "absolute", left: 0, top: 0, transform: `translate(${px - 20 * (1 - inP)}px, ${py}px) scale(${sc})`, transformOrigin: "0% 50%", opacity: inP * (1 - 0.6 * closing) * (cur ? 1 : 0.62), display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 50, height: 50, borderRadius: 25, display: "flex", alignItems: "center", justifyContent: "center",
              background: "linear-gradient(180deg, rgba(40,44,56,0.55), rgba(14,16,22,0.6))", backdropFilter: "blur(14px)",
              border: cur ? "2px solid rgba(255,255,255,0.85)" : "1px solid rgba(255,255,255,0.25)", boxShadow: cur ? "0 0 0 5px rgba(47,211,230,0.18), 0 8px 20px rgba(0,0,0,0.35)" : "0 6px 16px rgba(0,0,0,0.3)" }}>
              <TablerIcon name={done ? "check" : r.icon ?? "point"} size={26} color={cur ? "#2FD3E6" : "rgba(255,255,255,0.75)"} width={2} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 10, textShadow: "0 2px 10px rgba(0,0,0,0.55)" }}>
                <span style={{ fontFamily: F.num, fontWeight: 700, fontSize: 30, color: "#fff" }}>{String(r.i + 1).padStart(2, "0")}</span>
                <span style={{ fontFamily: F.cn, fontWeight: 700, fontSize: 32, color: "#fff" }}>{r.label}</span>
              </div>
              {r.en ? <span style={{ fontFamily: F.mono, fontSize: 14, letterSpacing: 3, color: col, textTransform: "uppercase", textShadow: "0 1px 6px rgba(0,0,0,0.5)" }}>{r.en}</span> : null}
            </div>
          </div>
        );
      })}
    </div>
  );
};
