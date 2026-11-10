import React from "react";
import { Audio, Sequence, staticFile } from "remotion";
import type { BoardStep, Overlay, Plan, Scene, Segment } from "./plan";
import paletteJson from "./sfx-palette.json";
import { withRegions } from "./scenes/board";
import { CUSTOM } from "./scenes/custom";
import { contentStart, unwarp } from "./timing";

// 自动配音效：从 plan 里的每个画面事件推出音效，同类轮换变体，限制密度。
// 峰值对齐：每个音效提前 peak 秒起播，让最响的那一下落在画面动作上。
type Role = "swoosh" | "whoosh" | "pop" | "click" | "tick" | "check" | "ding" | "impact" | "type" | "splash";
type Ev = { at: number; role: Role; vol: number; v?: number }; // v：指定用清单里第几个变体，不写就按出现顺序轮换
type Pal = Record<string, { file: string; peak: number; gain: number }[]>;
const PAL = paletteJson as unknown as Pal;
const PRIORITY: Role[] = ["impact", "splash", "whoosh", "ding", "check", "pop", "swoosh", "click", "type", "tick"];

/** 数字滚动的滴答：先密后疏，跟着先快后慢的数字走 */
const roll = (at: number, dur: number, n = 10): Ev[] =>
  Array.from({ length: n }, (_, i) => {
    const p = (i + 1) / n;
    const x = 1 - Math.pow(1 - p, 1 / 3); // easeOut 的反函数近似：值走到 p 的时间
    return { at: at + x * dur * 0.9, role: "tick" as Role, vol: 0.5 - 0.25 * p };
  });

const overlayEvents = (o: Overlay): Ev[] => {
  switch (o.type) {
    case "tag": return [];   // 音效太密就是污染。真人段的小标签、胶囊不配音，人声本身就是主角
    case "pill": return [];
    case "sideWords": return o.right ? [{ at: o.rightAt ?? o.at + 0.5, role: "pop" as Role, vol: 0.5 }] : [{ at: o.at, role: "swoosh", vol: 0.5 }];
    case "dataCard": return [{ at: o.at, role: "swoosh", vol: 0.5 }];
    case "bigText": return [{ at: o.at, role: o.behind ? "impact" : "swoosh", vol: o.behind ? 0.4 : 0.45 }, ...(o.fly ? [{ at: o.fly.at, role: "swoosh" as Role, vol: 0.7 }] : [])];
    // 数字滚动、逐字扫光、逐个弹出的小件不配（style-bible 第 10 节）：一个叠层最多一声
    case "title": return [{ at: o.at, role: "whoosh", vol: 0.5 }];
    case "sticker": return [{ at: o.at, role: "pop", vol: 0.5 }];
    case "bubbles": return o.items.length ? [{ at: o.items[0].at, role: "pop" as Role, vol: 0.5 }] : [];
    case "counter": return [{ at: o.at, role: "swoosh", vol: 0.5 }];
    case "battery": return [{ at: o.at, role: "pop", vol: 0.5 }, ...(o.dropAt !== undefined ? [{ at: o.dropAt, role: "swoosh" as Role, vol: 0.5 }] : [])];
    case "cta": return [{ at: o.at, role: "click", vol: 0.5 }];
    case "metric": return [{ at: o.at, role: "swoosh", vol: 0.5 }];  // 数字滚动不配滴答：对标音效少而轻
    case "doodle": return []; // 漫画小符号不配音
    // 左上信息框：不是每次弹出都配音效，按 plan 里 sfx 字段来（默认不配）
    case "infoBox": return o.sfx === "all" ? [{ at: o.at, role: "swoosh" as Role, vol: 0.45 }, ...o.items.map((it) => ({ at: it.at + 0.12, role: "pop" as Role, vol: 0.4 }))] : o.sfx === "head" ? [{ at: o.at, role: "swoosh" as Role, vol: 0.45 }] : [];
    case "topWord": return [{ at: o.at + 0.15, role: "impact", vol: 0.4 }];
  }
};

const boardEvents = (rawSteps: BoardStep[], cards: Extract<Scene, { layout: "board" }>["cards"], t0: number): Ev[] => {
  const ev: Ev[] = [];
  const steps = withRegions(rawSteps);
  const kindOf = new Map(cards.map((c) => [c.id, c.kind]));
  steps.forEach((st, k) => {
    const at = k === 0 ? Math.min(st.at, t0) : st.at;
    const prev = k > 0 ? steps[k - 1] : undefined;
    const fresh = st.show.filter((id) => !prev?.show.includes(id));
    const kept = st.show.filter((id) => prev?.show.includes(id));
    const region = JSON.stringify(st.region ?? [0, 0]) !== JSON.stringify(prev?.region ?? [0, 0]);
    const camChanged = JSON.stringify(st.camera ?? {}) !== JSON.stringify(prev?.camera ?? {});
    if (k > 0 && (region || camChanged)) ev.push({ at, role: "whoosh", vol: region ? 0.75 : 0.45 });
    else if (prev && kept.length && (prev.layout !== st.layout || fresh.length || prev.show.length !== st.show.length)) ev.push({ at, role: "swoosh", vol: 0.6 });
    fresh.forEach((id, i) => {
      const a2 = at + (kept.length ? 0.12 : 0) + i * 0.08;
      const e = st.enter?.[id]?.type;
      const kd = kindOf.get(id);
      if (kd === "stamp" || e === "stamp") ev.push({ at: a2, role: "impact", vol: 0.7 }, { at: a2, role: "pop", vol: 0.6 });
      else if (e === "slide") ev.push({ at: a2, role: "swoosh", vol: 0.75 });
      else if (e === "grow" || e === "fly") ev.push({ at: a2, role: "swoosh", vol: 0.5 }, { at: a2 + 0.2, role: "pop", vol: 0.5 });
      else if (kd === "mark") { const m = cards.find((c) => c.id === id); ev.push({ at: a2, role: m && m.kind === "mark" && m.mark === "check" ? "check" : "click", vol: 0.9 }); }
      else ev.push({ at: a2, role: "pop", vol: 0.7 });
    });
    for (const [id, x] of Object.entries(st.exit ?? {})) if (x.type === "into" && prev?.show.includes(id)) ev.push({ at, role: "swoosh", vol: 0.55 });
  });
  for (const c of cards) {
    const born = steps.find((s) => s.show.includes(c.id))?.at ?? 0;
    if (c.kind === "text") {
      if (c.subAt !== undefined) ev.push({ at: c.subAt, role: "click", vol: 0.5 });
      if (c.pulseAt !== undefined) ev.push({ at: c.pulseAt, role: "ding", vol: 0.55 });
      (c.tags ?? []).forEach((_, i) => ev.push({ at: born + 0.25 + i * 0.12, role: "click", vol: 0.45 }));
    }
    if (c.kind === "list") c.items.forEach((it) => ev.push({ at: it.at, role: "check", vol: 0.8 }));
    if (c.kind === "stat") { const a = c.at ?? born + 0.1; ev.push(...roll(a, 1.0), { at: a + 1.0, role: "ding", vol: 0.55 }); }
    if (c.kind === "data") { const a = c.at ?? born + 0.1, d = c.dur ?? 1.0; ev.push(...roll(a, d)); if (c.badge) ev.push({ at: a + d * 0.85, role: "pop", vol: 0.8 }); else ev.push({ at: a + d, role: "ding", vol: 0.5 }); }
    if (c.kind === "progress") { const a = c.at ?? born + 0.15; ev.push(...roll(a, c.dur ?? 1.4, 12)); }
    if (c.kind === "bars") { c.items.forEach((it, i) => ev.push(...roll(it.at ?? born + 0.2 + i * 0.25, 0.6, 5))); if (c.badge) ev.push({ at: (c.items.at(-1)?.at ?? born + 0.2 + (c.items.length - 1) * 0.25) + 0.55, role: "pop", vol: 0.8 }); }
    if (c.kind === "timer") { const a = c.at ?? born + 0.1; ev.push(...roll(a, c.dur ?? 1.8, 12)); }
    if (c.kind === "terminal") c.lines.forEach((ln) => { const n = Math.min(12, Math.ceil([...ln.text].length / 2)); for (let i = 0; i < n; i++) ev.push({ at: ln.at + i * 0.13, role: "type", vol: 0.35 }); });
    if (c.kind === "phone") c.items.forEach((it) => ev.push({ at: it.at, role: "pop", vol: 0.7 }));
    if (c.kind === "doc") c.lines.forEach((ln) => { if (ln.at !== undefined) ev.push({ at: ln.at, role: ln.mark ? "click" : "type", vol: 0.5 }); });
    if (c.kind === "prop") ev.push(...propEvents(c.prop));
  }
  return ev;
};

/** 道具自带的动作音效 */
const propEvents = (p: Extract<Extract<Scene, { layout: "board" }>["cards"][number], { kind: "prop" }>["prop"]): Ev[] => {
  const ev: Ev[] = [];
  switch (p.kind) {
    case "camera": if (p.recAt !== undefined) ev.push({ at: p.recAt, role: "click", vol: 0.8 }); if (p.scrollAt !== undefined) ev.push({ at: p.scrollAt, role: "swoosh", vol: 0.4 }); break;
    case "brain": (p.fill ?? []).forEach((f) => ev.push({ at: f.at, role: "whoosh", vol: 0.4 }, { at: f.at + 1.1, role: "ding", vol: 0.4 })); if (p.glowAt !== undefined) ev.push({ at: p.glowAt, role: "ding", vol: 0.5 }); break;
    case "player": if (p.playAt !== undefined) ev.push({ at: p.playAt, role: "click", vol: 0.7 }); break;
    case "keyboard": if (p.typeAt !== undefined) for (let i = 0; i < Math.min(16, (p.dur ?? 2) * 6); i++) ev.push({ at: p.typeAt + i / 6, role: "type", vol: 0.4 }); break;
    case "waveform": if (p.cut) ev.push({ at: p.cut.at, role: "click", vol: 0.8 }); if (p.cut?.closeAt !== undefined) ev.push({ at: p.cut.closeAt, role: "swoosh", vol: 0.6 }); break;
    case "scissors": if (p.snipAt !== undefined) ev.push({ at: p.snipAt, role: "click", vol: 0.9 }, { at: p.snipAt + 0.15, role: "click", vol: 0.6 }); break;
    case "crowd": if (p.squeezeAt !== undefined) ev.push({ at: p.squeezeAt, role: "swoosh", vol: 0.7 }); break;
    case "robot": if (p.powerAt !== undefined) ev.push({ at: p.powerAt, role: "whoosh", vol: 0.7 }, { at: p.powerAt + 0.3, role: "impact", vol: 0.5 }); if (p.rideAt !== undefined) ev.push({ at: p.rideAt, role: "pop", vol: 0.6 }); break;
    case "building": if (p.lightsAt !== undefined) ev.push(...roll(p.lightsAt, 0.75, 8)); break;
    case "scale": (p.tilt ?? []).forEach((k) => ev.push({ at: k.at, role: "swoosh", vol: 0.6 }, { at: k.at + 0.55, role: "click", vol: 0.5 })); break;
    case "chart": ev.push({ at: p.drawAt ?? 0, role: "swoosh", vol: 0.6 }); if (p.label) ev.push({ at: (p.drawAt ?? 0) + (p.dur ?? 1.4), role: "ding", vol: 0.5 }); break;
    case "waffle": ev.push(...roll(p.at ?? 0, p.dur ?? 1.2, 12)); break;
    case "battery": (p.level ?? []).forEach((k) => ev.push(...roll(k.at, 0.8, 8))); break;
    case "pool": if (p.inflowAt !== undefined) ev.push({ at: p.inflowAt, role: "whoosh", vol: 0.45 }); if (p.diveAt !== undefined) ev.push({ at: p.diveAt - 0.55, role: "whoosh", vol: 0.6 }, { at: p.diveAt, role: "impact", vol: 0.8 }, { at: p.diveAt + 0.15, role: "ding", vol: 0.5 }); break;
    case "bulb": if (p.onAt !== undefined) ev.push({ at: p.onAt, role: "ding", vol: 0.7 }); break;
    case "gauge": ev.push(...roll(p.at ?? 0, 1.1, 10)); break;
    case "app": if (p.addAt !== undefined) ev.push({ at: p.addAt, role: "pop", vol: 0.8 }); if (p.toggleAt !== undefined) ev.push({ at: p.toggleAt, role: "click", vol: 0.8 }); (p.cursor ?? []).forEach((k) => { if (k.click) ev.push({ at: k.at, role: "click", vol: 0.6 }); }); break;
    case "code": p.lines.forEach((ln) => { for (let i = 0; i < Math.min(8, Math.ceil([...ln.text].length / 3)); i++) ev.push({ at: ln.at + i * 0.13, role: "type", vol: 0.35 }); }); break;
    case "dots": p.rows.forEach((r, i) => ev.push(...roll(r.at ?? i * 0.4, Math.max(0.3, ((r.value / 100) * (r.total ?? 18)) * 0.045), 8))); break;
    case "coins": for (let i = 0; i < (p.count ?? 6); i++) ev.push({ at: (p.at ?? 0) + (i / (p.count ?? 6)) * (p.dur ?? 1), role: "pop", vol: 0.5 }); break;
    case "valve": if (p.closeAt !== undefined) ev.push({ at: p.closeAt, role: "click", vol: 0.9 }, { at: p.closeAt + 0.1, role: "ding", vol: 0.5 }); break;
    case "machine": if (p.feedAt !== undefined) ev.push({ at: p.feedAt, role: "swoosh", vol: 0.7 }); ev.push({ at: p.outAt ?? (p.feedAt ?? 0) + 0.8, role: "pop", vol: 0.8 }); break;
    case "bars3d": p.items.forEach((_, i) => ev.push(...roll((p.at ?? 0) + i * (p.stagger ?? 0.08), 0.6, 4))); break;
    case "network": if (p.growAt !== undefined) ev.push({ at: p.growAt, role: "swoosh", vol: 0.6 }); (p.lights ?? []).forEach((l) => ev.push({ at: l.at, role: "pop", vol: 0.7 })); (p.rings ?? []).forEach((r) => ev.push({ at: r, role: "swoosh", vol: 0.5 })); if (p.collapseAt !== undefined) ev.push({ at: p.collapseAt, role: "whoosh", vol: 0.7 }, { at: p.collapseAt + 0.25, role: "impact", vol: 0.6 }); break;
    case "steps": p.activeAt.forEach((a) => ev.push({ at: a, role: "click", vol: 0.8 })); break;
    case "ring": ev.push(...roll(p.at ?? 0, p.dur ?? 1.6, 12), { at: (p.at ?? 0) + (p.dur ?? 1.6), role: "ding", vol: 0.6 }); break;
    case "icon": break;
    case "wheel": if (p.runAt !== undefined) ev.push({ at: p.runAt, role: "whoosh", vol: 0.5 }); break;
    case "seesaw": (p.tilt ?? []).forEach((k) => ev.push({ at: k.at, role: "swoosh", vol: 0.6 }, { at: k.at + 0.45, role: "click", vol: 0.6 })); if (p.dropAt !== undefined) ev.push({ at: p.dropAt + 0.33, role: "impact", vol: 0.6 }); break;
    case "funnel": if (p.inAt !== undefined) ev.push(...roll(p.inAt, 1.5, 10)); if (p.overflowAt !== undefined) ev.push({ at: p.overflowAt, role: "swoosh", vol: 0.6 }); break;
    case "gears": if (p.spinAt !== undefined) ev.push({ at: p.spinAt, role: "click", vol: 0.7 }); if (p.replaceAt !== undefined) ev.push({ at: p.replaceAt, role: "whoosh", vol: 0.7 }, { at: p.replaceAt + 0.45, role: "impact", vol: 0.5 }); break;
    case "snowball": ev.push({ at: p.rollAt ?? 0, role: "whoosh", vol: 0.5 }, { at: (p.rollAt ?? 0) + (p.dur ?? 2.4), role: "impact", vol: 0.6 }); break;
    case "pyramid": if (p.climbAt !== undefined) ev.push(...roll(p.climbAt, 1.0, 6)); if (p.topAt !== undefined) ev.push({ at: p.topAt, role: "ding", vol: 0.7 }); if (p.slideAt !== undefined) ev.push({ at: p.slideAt, role: "swoosh", vol: 0.7 }); break;
    case "squad": (p.armorAt ?? []).forEach((a) => ev.push({ at: a, role: "pop", vol: 0.8 })); break;
  }
  return ev;
};

const sceneEvents = (s: Scene, t0: number): Ev[] => {
  switch (s.layout) {
    case "board": return boardEvents(s.steps, s.cards, t0);
    // 单卡版式：逐项打勾、数字滚动、逐行打字、逐个弹出都不配，只在完成或关键揭示时一声
    case "checklist": { const last = s.items[s.items.length - 1]; return last ? [{ at: last.at, role: "check" as Role, vol: 0.5 }] : []; }
    case "bars": return s.items.length ? [{ at: s.items[0].at, role: "swoosh" as Role, vol: 0.45 }] : [];
    case "stat": return [{ at: s.at + 1.2, role: "ding", vol: 0.45 }];
    case "flow": return s.steps.length ? [{ at: s.steps[0].at, role: "pop" as Role, vol: 0.5 }] : [];
    case "phone": return s.items.length ? [{ at: s.items[0].at, role: "pop" as Role, vol: 0.5 }] : [];
    case "doc": return s.lines.filter((l) => l.at !== undefined && l.mark).map((l) => ({ at: l.at!, role: "click" as Role, vol: 0.5 }));
    case "compare": return [{ at: s.at, role: "swoosh", vol: 0.5 }, { at: s.right.at, role: "swoosh", vol: 0.5 }, ...(s.verdict ? [{ at: s.verdict.at, role: "impact" as Role, vol: 0.5 }] : [])];
    case "keyword": return [{ at: s.at, role: "impact", vol: 0.5 }];
    case "timeline": return s.items.length ? [{ at: s.items[0].at, role: "click" as Role, vol: 0.5 }] : [];
    case "photo": return [{ at: s.at, role: "swoosh", vol: 0.5 }, ...(s.lockAt !== undefined ? [{ at: s.lockAt, role: "click" as Role, vol: 0.5 }] : []), ...(s.sticker ? [{ at: s.sticker.at, role: "impact" as Role, vol: 0.5 }] : [])];
    case "slider": return [{ at: s.at, role: "whoosh", vol: 0.5 }];
    case "custom": return (CUSTOM[s.name]?.cues ?? []).flatMap((c) => ("prop" in c ? propEvents(c.prop) : [{ at: c.at, role: c.role, vol: c.vol ?? 0.5, v: c.v }]));
  }
};

export const autoSfx = (plan: Plan): { at: number; file: string; vol: number }[] => {
  const ev: Ev[] = [];
  const segs = plan.segments;
  segs.forEach((s: Segment, i) => {
    const prev = segs[i - 1];
    if (prev && prev.world !== s.world && s.world === "B") ev.push({ at: s.start + (s.enter === "split" ? 0.22 : 0), role: "whoosh", vol: s.enter === "split" ? 0.5 : 0.4 }); // 只在进图形段时轻轻一声（拆景时落在两侧物件滑出那一下），切回真人不配
    // 手写场景按绝对时间写 cues；一个场景拆成几段写时，只收落在本段里的，段外（被真人段盖住的那几秒）不出声
    if (s.world === "B") ev.push(...sceneEvents(s.scene, contentStart(s)).filter((e) => s.scene.layout !== "custom" || (e.at >= s.start - 0.05 && e.at < s.end)));
    else (s.overlays ?? []).forEach((o) => ev.push(...overlayEvents(o)));
  });
  (plan.chapters ?? []).forEach((c, i) => { if (i > 0) ev.push({ at: c.start + 0.08, role: "click", vol: 0.5 }); }); // 换章：导航卡弹出
  for (const x of plan.sfx ?? []) ev.push({ at: x.at, role: x.type === "boom" ? "impact" : "pop", vol: x.volume ?? 1 });
  // 密度控制：同角色 0.07s 内只留一个；任意 0.12s 内最多 3 个，按优先级留
  ev.sort((a, b) => a.at - b.at);
  const kept: Ev[] = [];
  for (const e of ev) {
    if (kept.some((k) => k.role === e.role && Math.abs(k.at - e.at) < 0.07)) continue;
    const near = kept.filter((k) => Math.abs(k.at - e.at) < 0.12);
    if (near.length >= 3) {
      const worst = near.sort((a, b) => PRIORITY.indexOf(b.role) - PRIORITY.indexOf(a.role))[0];
      if (PRIORITY.indexOf(worst.role) > PRIORITY.indexOf(e.role)) kept.splice(kept.indexOf(worst), 1);
      else continue;
    }
    kept.push(e);
  }
  // 音效太密也是污染。任意两个音效至少隔 MIN_GAP 秒，挤在一起的只留优先级高的
  const MIN_GAP = plan.meta.sfxMinGap ?? 0.5;
  const spaced: Ev[] = [];
  for (const e of kept) {
    const last = spaced[spaced.length - 1];
    if (last && e.at - last.at < MIN_GAP) {
      if (PRIORITY.indexOf(e.role) < PRIORITY.indexOf(last.role)) spaced[spaced.length - 1] = e;
      continue;
    }
    spaced.push(e);
  }
  const counter: Record<string, number> = {};
  return spaced.flatMap((e) => {
    const list = PAL[e.role];
    if (!list?.length) return [];
    const n = counter[e.role] = (counter[e.role] ?? -1) + 1;
    const s = list[(e.v ?? n) % list.length];
    return [{ at: Math.max(0, e.at - s.peak), file: s.file, vol: e.vol * s.gain }];
  });
};

export const SfxTrack: React.FC<{ plan: Plan; fps: number }> = ({ plan, fps }) => {
  // 事故教训：同步模板时把工程里配好的音效清单覆盖成了空的，v9/v10 整片没有一个音效。清单为空直接报错，不让它静默出片。
  if (plan.meta.autoSfx !== false && !Object.keys(PAL).some((k) => PAL[k]?.length)) {
    throw new Error("src/sfx-palette.json 是空的：先跑 build_sfx.py <工程>/public；同步模板请用 scripts/sync_template.sh，它不会覆盖这个文件。");
  }
  // 音效时间按原时间线算，出片时换成成片时间（剪口误），落在剪掉那段里的不出
  const list = React.useMemo(() => (plan.meta.autoSfx === false ? [] : autoSfx(plan)).flatMap((s) => { const at = unwarp(plan.meta.cuts, s.at); return at === null ? [] : [{ ...s, at }]; }), [plan]);
  const master = plan.meta.sfxVolume ?? 1.0;
  return (
    <>
      {list.map((s, k) => (
        <Sequence key={k} from={Math.round(s.at * fps)} durationInFrames={Math.round(2 * fps)} layout="none">
          <Audio src={staticFile(s.file)} volume={s.vol * master} />
        </Sequence>
      ))}
    </>
  );
};
