import React from "react";
import { AbsoluteFill, Audio, Img, OffthreadVideo, Sequence, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { C, F, H, SAFE, W } from "./theme";
import { D, clamp, easeIn, easeInOut, easeOut, prog } from "./anim";
import type { Overlay, Plan, SegA, SegB, Segment } from "./plan";
import { Ambient, Canvas, Captions, Source, Tag } from "./components/base";
import { Battery, BigText, BigTextSide, Bubbles, Counter, CtaRow, DataCard, Metric, Pill, SideWords, Sticker, Title, tone } from "./components/overlays";
import { InfoBox, TopWord } from "./components/extra";
import { SceneView } from "./scenes/scenes";
import { SfxTrack } from "./sfx";
import { NavCard, TopProgress } from "./components/hud";
import { Emote } from "./scenes/custom/toon";
import { FADE, SPLIT, SWAP, contentStart, warp } from "./timing";
import { MORPH_LEN, MorphFrame, type MorphStyle } from "./morph";
import { MS } from "./morphState";

// 进出图形段——两种进场不混用：
//   拆景 split：背景左侧物件往左、右侧物件往右滑出画 → 空墙淡成图形底 → 人最后动，抠出来的半身缩到右下角（host corner）或移出画（none）
//   淡出 fade：实拍整个淡出 → 人原地晚一点淡出（不动）→ 某处淡入圆形小镜头（host bubble）
//   变身 morph：真人缩到小人头上变成角色精灵图（要自备精灵图）（可和 split 叠用）；退场是实拍柔和叠化上来，不放大脸
//   出：默认硬切回实拍（exitOf）；FACE / BUB / CORNER 是按用户这套机位实测的，换机位要重量
const FACE = { x: 530, y: 600 }; // 抠像里头肩的中心（实测：头顶 y≈185、下巴 ≈860、头宽 274–764）
const BUB = { d: 230, x: W - 150, y: 990, crop: 900 }; // 小圆球默认：圆心、直径；crop = 圆里装下原画面多大一块
const CORNER = { s: 0.36, x: W - 150, y: 1150 }; // 头中心 y 要让身体底边落到画面外（≥ 1440 − 840 × s） // 右下抠像：缩放、头中心
const EXIT = { center: 0.55, split: 1.05 };
const REVEAL = 0.8; // 变身退场：段尾最后 0.8 秒实拍柔和叠化上来（放大的脸会像突然跳出一个大头；圆窗打开也试过，像偷窥、脸还是一下冲出来）

type PT = { s: number; tx: number; ty: number }; // 人像层：screen = 原画面坐标 × s + (tx, ty)
const fullPT = (z: number): PT => ({ s: z, tx: (W / 2) * (1 - z), ty: H * 0.38 * (1 - z) });
const facePT = (x: number, y: number, s: number): PT => ({ s, tx: x - FACE.x * s, ty: y - FACE.y * s });
const lerpPT = (a: PT, b: PT, k: number): PT => {
  const fx = FACE.x * a.s + a.tx + (FACE.x * b.s + b.tx - FACE.x * a.s - a.tx) * k;
  const fy = FACE.y * a.s + a.ty + (FACE.y * b.s + b.ty - FACE.y * a.s - a.ty) * k;
  const s = a.s * Math.pow(b.s / a.s, k);
  return facePT(fx, fy, s);
};
const pathAt = (s: SegB, t: number, def: { x: number; y: number; d?: number }) => {
  // 关键帧的 at = 这一步开始动的时刻，0.7 秒到位
  const ks = s.hostPath ?? [];
  const d0 = (k: { d?: number }) => k.d ?? def.d ?? BUB.d;
  if (!ks.length) return { x: def.x, y: def.y, d: d0(def) };
  let cur = { x: ks[0].x, y: ks[0].y, d: d0(ks[0]) };
  for (let i = 1; i < ks.length; i++) {
    const b = ks[i];
    if (t <= b.at) break;
    const k = interpolate(t, [b.at, b.at + 0.7], [0, 1], { ...clamp, easing: easeInOut });
    cur = { x: cur.x + (b.x - cur.x) * k, y: cur.y + (b.y - cur.y) * k, d: cur.d + (d0(b) - cur.d) * k };
  }
  return cur;
};

const Footage: React.FC<{ src: string; transparent?: boolean }> = ({ src, transparent }) => (
  <OffthreadVideo src={staticFile(src)} muted transparent={transparent} style={{ width: W, height: H, objectFit: "cover" }} />
);

// 真人段的数码推近：推拉跳切 + 落版回弹 + 慢推慢拉 + 重音推近
const zoomOf = (segs: Segment[], i: number, t: number, settle: boolean) => {
  const seg = segs[i] as SegA, prev = segs[i - 1];
  // 实拍的缩放太瞬间会显得急：相邻两段实拍的推近倍数不跳切，0.7 秒缓过去；重音推近 0.6 秒（实拍段一直在慢推慢拉）
  const base = seg.zoom ?? 1;
  let zoom = prev?.world === "A" ? interpolate(t, [seg.start, seg.start + 0.7], [(prev as SegA).zoom ?? 1, base], { ...clamp, easing: easeInOut }) : base;
  if (settle && prev && prev.world !== "A" && seg.settle !== false) zoom *= interpolate(t, [seg.start, seg.start + 0.6], [1.08, 1], { ...clamp, easing: easeInOut });
  zoom *= driftOf(segs, i, t);
  for (const pu of seg.punch ?? []) zoom *= interpolate(t, [pu.at - 0.1, pu.at + 0.5], [1, pu.to], { ...clamp, easing: easeInOut });
  return zoom;
};
/** 慢推慢拉：相邻实拍段首尾相接（上一段推到哪，这一段从哪开始拉），不跳 */
const driftOf = (segs: Segment[], i: number, t: number) => {
  let j = i; while (j > 0 && segs[j - 1].world === "A") j--;
  let cur = 1;
  for (let k = j; k <= i; k++) {
    const sg = segs[k] as SegA;
    const aIdx = segs.slice(0, k).filter((x) => x.world === "A").length;
    const dir = sg.drift ?? (aIdx % 2 === 0 ? "in" : "out");
    const span = Math.min(0.08, (sg.driftRate ?? 0.015) * (sg.end - sg.start));
    const start = k === j && dir === "out" ? 1 + span : cur;
    const end = dir === "in" ? start + span : dir === "out" ? Math.max(1, start - span) : start;
    if (k === i) { const u = Math.min(1, Math.max(0, (t - sg.start) / Math.max(0.01, sg.end - sg.start))); return start + (end - start) * u; }
    cur = end;
  }
  return 1;
};
const exitOf = (s: SegB, hasPerson: boolean) => {
  if (!hasPerson) return "dissolve";
  if (s.host === "morph") return "morph";
  if (s.exit) return s.exit;
  // 动效为内容服务——退场动画（人回中间、两侧物件滑回、实拍淡回）会盖住最后一句的内容，默认硬切回实拍；
  // 只有变身（host morph）默认变回真人。center / split / fade / dissolve 要用就在段里显式写 exit。
  return "cut";
};
const enterOf = (s: SegB, fromA: boolean, hasPerson: boolean) => {
  let e = s.enter ?? "dissolve";
  if (!fromA) return "cut";
  if ((e === "swap" || e === "split" || e === "fade") && !hasPerson) e = "dissolve";
  if (e === "dissolve" && hasPerson && (s.host ?? "none") !== "none") e = "swap";
  return e;
};

// sfxOnly：只出音效（口播原声和 BGM 静音），给 render_final.py 渲纯音效音轨、逐个测音效响度用；命令行 --props '{"sfxOnly":true}'
export const Film: React.FC<{ plan: Plan; sfxOnly?: boolean }> = ({ plan, sfxOnly }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = warp(plan.meta.cuts, frame / fps); // 原时间线（剪口误后成片时间 → 原时间）
  const { meta, segments: segs } = plan;
  let i = segs.findIndex((s) => t >= s.start && t < s.end);
  if (i < 0) i = segs.length - 1;
  const seg = segs[i], prev: Segment | undefined = segs[i - 1];
  const hasPerson = !!meta.person;
  const amb = meta.ambient ? <Ambient t={t} period={meta.ambient.period} opacity={meta.ambient.opacity} /> : null;

  // ---------- 真人层 ----------
  const prevExit = prev?.world === "B" ? exitOf(prev, hasPerson) : "dissolve";
  const zoom = seg.world === "A" ? zoomOf(segs, i, t, prevExit === "dissolve") : 1;
  const zoomStyle: React.CSSProperties = { transform: `scale(${zoom})`, transformOrigin: "50% 38%" };

  // ---------- B 世界：进场 / 讲者 / 退场 ----------
  let footOp = seg.world === "A" ? 1 : 0, sceneOp = 0, sceneScale = 1;
  let person: { pt: PT; op: number; clip?: { l: number; t: number; w: number; h: number; r: number }; fill: number; ring: number; shadow: number; fade: number; mask?: string } | null = null;
  let split: { f: number; slide: number; plate: number; z: number } | null = null;
  let bubble: { x: number; y: number; d: number; op: number } | null = null;
  let footOver = 0, footOverZ = 1;
  let reveal: { u: number; z: number } | null = null;
  let morph: { u: number; k: { x: number; y: number; d?: number; sprite?: string; crop?: "bust" }; z: number; st: MorphStyle; noBg?: boolean } | null = null;
  MS.active = false; // fade 切镜：实拍画面盖在图形底上面淡出 / 淡回来（人像在它上面）
  let bSeg: SegB | null = seg.world === "B" ? seg : null;
  let bFade = 1; // 回 A 时上一段 B 的叠化（只有 exit = dissolve 才有）
  if (seg.world === "A" && prev?.world === "B" && prevExit === "dissolve" && t < seg.start + D.dissolve) {
    bSeg = prev; bFade = 1 - prog(t, seg.start, D.dissolve);
  }
  let captionShift = 0;
  if (bSeg) {
    const s = bSeg, si = segs.indexOf(s), local = t - s.start;
    const before = segs[si - 1], after = segs[si + 1];
    const fromA = before?.world === "A" || si === 0;
    const enter = enterOf(s, fromA, hasPerson);
    const host = hasPerson ? s.host ?? "none" : "none";
    const exit = after?.world === "A" ? exitOf(s, hasPerson) : "none";
    const zIn = before?.world === "A" ? zoomOf(segs, si - 1, s.start, false) : 1;
    const zOut = after?.world === "A" ? zoomOf(segs, si + 1, s.end, false) : 1;
    const carried = before?.world === "B" && (before.host ?? "none") === host; // 上一段图形的讲者形态直接接过来
    const keepNext = after?.world === "B" && (after.host ?? "none") === host;
    sceneOp = seg === s ? 1 : bFade;
    if (seg === s) {
      if (enter === "dissolve") { sceneOp = prog(local, 0, D.dissolve); footOp = 1; sceneScale = 1.1 - 0.1 * prog(local, 0, 0.3); }
      if (enter === "swallow") sceneOp = prog(local, 0, 0.25);
      if (enter === "swap") { sceneOp = prog(local, 0, SWAP.scene); footOp = local < SWAP.scene ? 1 : 0; }
      if (enter === "fade" || host === "morph") sceneOp = 1;
      if (enter === "split" && local < SPLIT.plate0 + SPLIT.plate) {
        split = { f: Math.round(s.start * fps), slide: prog(local, SPLIT.slide0, SPLIT.slide, easeIn), plate: 1 - prog(local, SPLIT.plate0, SPLIT.plate, easeInOut), z: zIn };
      }
      if (exit === "split" && t > s.end - EXIT.split) {
        const u = t - (s.end - EXIT.split);
        split = { f: Math.round(s.end * fps) - 1, slide: 1 - prog(u, 0.5, 0.5, easeOut), plate: prog(u, 0.4, 0.25, easeInOut), z: zOut };
      }
    }
    if (hasPerson && host === "morph") {
      // 变身：真人 ↔ 角色精灵图（四种做法见 morph.tsx）。变身期间场景里的主角小人藏起来，由 MorphFrame 画替身
      // 和拆景叠用（enter: "split"）：先两侧物件滑走（拆景时间表照旧），变身往后挪 0.25 秒
      // 退场：实拍从略虚、略大（1.05 倍）慢慢浮上来落到原位，图形段和小人在底下一起淡掉。不要「先变回真人再让两侧物件滑回来」
      // （变身得提前近 2 秒开始，盖住最后一句的内容），也不要把脸从小人头那么大放大到满屏（像突然跳出一个大头）
      const ks = s.hostPath ?? [], st = s.morphStyle ?? "dissolve", len = MORPH_LEN[st];
      const sp = enter === "split", off = sp ? 0.25 : 0;
      MS.active = true; MS.inEnd = s.start + off + len; MS.outStart = 1e9;
      if (seg === s && ks.length) {
        if (enter !== "cut" && local < off + len) morph = { u: local - off, k: ks[0], z: zIn, st, noBg: sp };
        else if (exit === "morph" && t > s.end - REVEAL) { const u = easeInOut(Math.min(1, (t - (s.end - REVEAL)) / REVEAL)); reveal = { u, z: zOut }; }
      }
    } else if (hasPerson && (enter === "fade" || exit === "fade")) {
      // fade：背景淡出、人原地晚一点淡出；圆形小镜头直接淡入，不缩不飞
      let pOp = 0, pz = zIn;
      if (seg === s) {
        if (enter === "fade" && !carried) { footOver = 1 - prog(local, 0, FADE.bg, easeInOut); footOverZ = zIn; pOp = 1 - prog(local, FADE.person0, FADE.person, easeInOut); }
        if (exit === "fade" && !keepNext) {
          const u = t - (s.end - FADE.out);
          if (u > 0) { const f = prog(u, 0.62, 0.36, easeInOut); if (f > 0) { footOver = f; footOverZ = zOut; } const po = prog(u, 0.3, 0.3, easeInOut); if (po > 0) { pOp = po; pz = zOut; } }
        }
      }
      if (pOp > 0) person = { pt: fullPT(pz), op: pOp, fill: 0, ring: 0, shadow: 0, fade: 0 };
      if (host === "bubble") {
        const p = pathAt(s, t, BUB);
        let op = seg === s ? 1 : bFade;
        if (seg === s && enter === "fade" && !carried) op = prog(local, FADE.bub0, FADE.bub, easeInOut);
        if (seg === s && exit === "fade" && !keepNext) op *= 1 - prog(t, s.end - FADE.out, 0.25, easeInOut);
        if (op > 0) bubble = { ...p, op };
      }
    } else if (hasPerson && (enter === "split" || enter === "swap" || host !== "none" || exit === "center" || exit === "split")) {
      // split / swap：k = 0 在画面中间和实拍对齐，k = 1 在目标形态（右下角抠像，或移出画）
      let kIn = 1;
      if (seg === s && !carried) {
        if (enter === "split") kIn = prog(local, SPLIT.person0, SPLIT.person, easeInOut);
        else if (enter === "swap") kIn = prog(local, SWAP.person0, SWAP.person, host === "none" ? easeIn : easeInOut);
        else if (host === "none") kIn = 1;
        else kIn = prog(local, 0.15, 0.45, easeInOut);
      }
      let kOut = 0;
      if (seg === s && !keepNext) {
        if (exit === "center") kOut = prog(t, s.end - EXIT.center, EXIT.center - 0.05, easeInOut);
        if (exit === "split") kOut = prog(t, s.end - EXIT.split, 0.42, easeOut);
      }
      const k = kIn * (1 - kOut);
      const z = kOut > 0 ? zOut : zIn;
      if (host === "corner" || host === "bubble") {
        // 拆景以后只能是抠出来的半身（bubble 在这里也按 corner 处理）
        const p = pathAt(s, t, CORNER);
        person = { pt: lerpPT(fullPT(z), facePT(p.x, p.y, CORNER.s), k), op: 1, fill: 0, ring: 0, shadow: k, fade: Math.min(1, k * 3) };
        captionShift = -90 * k;
      } else if (k < 1) {
        // 人原地淡出，不往下走（往下沉太突兀）
        person = { pt: fullPT(z), op: 1 - k, fill: 0, ring: 0, shadow: 0, fade: 0 };
      }
      if (seg !== s && person) person.op = bFade;
    }
    if (after?.world === "B" && seg === s && !(after.scene.layout === "custom" && s.scene.layout === "custom" && after.scene.name === s.scene.name)) {
      const k = prog(t, s.end - 0.3, 0.3); sceneOp *= 1 - k; sceneScale = 1 - 0.08 * k;
    }
  }

  // ---------- 叠层 ----------
  const ovs: Overlay[] = seg.world === "B" ? [] : seg.overlays ?? [];
  const isBehind = (o: Overlay) => hasPerson && ((o.type === "bigText" && o.behind) || o.type === "topWord");
  const behind = ovs.filter(isBehind);
  const behindActive = behind.some((o) => t >= o.at && t < (o.until ?? seg.end));
  const L = ({ o }: { o: Overlay }) => {
    const e = seg.end;
    switch (o.type) {
      case "bigText": return <BigText o={o} t={t} segEnd={e} />;
      case "sideWords": return <SideWords o={o} t={t} segEnd={e} />;
      case "dataCard": return <DataCard o={o} t={t} segEnd={e} />;
      case "pill": return <Pill o={o} t={t} segEnd={e} />;
      case "title": return <Title o={o} t={t} segEnd={e} />;
      case "sticker": return <Sticker o={o} t={t} segEnd={e} />;
      case "bubbles": return <Bubbles o={o} t={t} segEnd={e} />;
      case "counter": return <Counter o={o} t={t} segEnd={e} />;
      case "battery": return <Battery o={o} t={t} segEnd={e} />;
      case "metric": return <Metric o={o} t={t} segEnd={e} />;
      case "infoBox": return <InfoBox o={o} t={t} segEnd={e} />;
      case "topWord": return <TopWord o={o} t={t} segEnd={e} zoom={zoom} />;
      case "doodle": return t >= o.at && t < (o.until ?? e) ? <Emote kind={o.kind} x={o.x} y={o.y} s={(o.s ?? 1.6) * (1 - prog(t, (o.until ?? e) - 0.2, 0.2))} rot={(o.rot ?? 0) + Math.sin(t * 5) * 6} t={t} at={o.at} z={60} /> : null;
      default: return null;
    }
  };
  const stack = ovs.filter((o) => o.type === "tag" || o.type === "cta");
  const showNav = (seg.world === "A" || seg.world === "S") && plan.chapters?.length;

  const sceneLayer = bSeg && sceneOp > 0 ? (
    <AbsoluteFill style={{ opacity: sceneOp, transform: `scale(${sceneScale})` }}>
      {bSeg.scene.layout !== "custom" ? <Canvas brand={meta.brand} tag={meta.brandTag} variant={bSeg.bg} drift={t - bSeg.start} plain={bSeg.scene.layout === "board"} /> : null}
      <SceneView s={bSeg.scene} t={t} area={{ top: 170, bottom: SAFE.captionY - 50, t0: contentStart(bSeg) }} brand={meta.brand} brandTag={meta.brandTag} segStart={bSeg.start} />
      {bSeg.source ? <Source text={bSeg.source} p={prog(t, contentStart(bSeg) + 0.3, 0.3)} /> : null}
    </AbsoluteFill>
  ) : null;

  return (
    <AbsoluteFill style={{ background: "#000", fontFamily: F.cn, textRendering: "geometricPrecision", WebkitFontSmoothing: "antialiased" }}>{/* 几何精确文字：镜头慢推时字不在像素间跳 */}
      {/* 真人素材 */}
      {footOp > 0 ? (
        <AbsoluteFill style={{ opacity: footOp }}>
          <AbsoluteFill style={seg.world === "A" ? zoomStyle : { transform: `scale(${bSeg && segs[segs.indexOf(bSeg) - 1]?.world === "A" ? zoomOf(segs, segs.indexOf(bSeg) - 1, bSeg.start, false) : 1})`, transformOrigin: "50% 38%" }}><Footage src={meta.footage} />{amb}</AbsoluteFill>
          <AbsoluteFill style={{ background: "radial-gradient(120% 85% at 50% 42%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.32) 100%)" }} />
        </AbsoluteFill>
      ) : null}
      {/* 图库实拍世界 */}
      {seg.world === "S" ? seg.clips.map((c, k) => {
        const end = seg.clips[k + 1]?.at ?? seg.end;
        return t >= c.at && t < end ? (
          <AbsoluteFill key={k} style={{ opacity: k === 0 ? prog(t, seg.start, 0.25) : 1 }}>
            <Sequence from={Math.round(c.at * fps)} layout="none">
              <OffthreadVideo src={staticFile(c.src)} muted startFrom={Math.round((c.from ?? 0) * fps)} style={{ width: W, height: H, objectFit: "cover" }} />
            </Sequence>
          </AbsoluteFill>
        ) : null;
      }) : null}
      {/* 身后大字 + 抠像压在上面 */}
      {behind.map((o, k) => <L key={`b${k}`} o={o} />)}
      {behindActive && seg.world === "A" ? <AbsoluteFill style={zoomStyle}><Footage src={meta.person!} transparent /></AbsoluteFill> : null}
      {/* B 世界：图形底和场景 */}
      {sceneLayer}
      {/* 拆景：空墙 + 左侧物件 + 右侧物件，盖在图形底上面、人像下面 */}
      {split ? (
        <AbsoluteFill style={{ transform: `scale(${split.z})`, transformOrigin: "50% 38%" }}>
          {split.plate > 0 ? <Img src={staticFile(`split/f${split.f}_wall.jpg`)} style={{ position: "absolute", width: W, height: H, opacity: split.plate }} /> : null}
          {split.slide < 1 ? (<>
            <Img src={staticFile(`split/f${split.f}_left.png`)} style={{ position: "absolute", width: W, height: H, transform: `translateX(${-split.slide * 760}px) rotate(${-split.slide * 4}deg)`, transformOrigin: "0% 50%", filter: split.slide > 0.05 ? `blur(${split.slide * 7}px)` : undefined }} />
            <Img src={staticFile(`split/f${split.f}_right.png`)} style={{ position: "absolute", width: W, height: H, transform: `translateX(${split.slide * 760}px) rotate(${split.slide * 4}deg)`, transformOrigin: "100% 50%", filter: split.slide > 0.05 ? `blur(${split.slide * 7}px)` : undefined }} />
          </>) : null}
        </AbsoluteFill>
      ) : null}
      {/* 变身切镜：真人 ↔ 角色精灵图 */}
      {morph ? <MorphFrame u={morph.u} style={morph.st} k={morph.k} z={morph.z} footage={meta.footage} person={meta.person!} noBg={morph.noBg} /> : null}
      {/* 变身退场：实拍柔和叠化上来（略虚略大 → 清晰原位） */}
      {reveal ? (
        <AbsoluteFill style={{ opacity: reveal.u, filter: reveal.u < 0.98 ? `blur(${(1 - reveal.u) * 7}px)` : undefined }}><AbsoluteFill style={{ transform: `scale(${reveal.z * (1.05 - 0.05 * reveal.u)})`, transformOrigin: "50% 38%" }}><Footage src={meta.footage} /></AbsoluteFill></AbsoluteFill>
      ) : null}
      {/* fade 切镜：实拍画面盖在图形底上淡出 / 淡回来 */}
      {footOver > 0 ? <AbsoluteFill style={{ opacity: footOver }}><AbsoluteFill style={{ transform: `scale(${footOverZ})`, transformOrigin: "50% 38%" }}><Footage src={meta.footage} /></AbsoluteFill></AbsoluteFill> : null}
      {/* 讲者：抠像（全身原位 / 右下角半身） */}
      {person ? (() => {
        const c = person.clip;
        const clipPath = c ? `inset(${c.t}px ${W - c.l - c.w}px ${H - c.t - c.h}px ${c.l}px round ${c.r}px)` : undefined;
        // 缩到角落的抠像：身体底边往下渐隐（缩小途中底边会离开画框，别露一条硬直线）
        const mask = person.mask ?? (person.fade > 0 ? `linear-gradient(180deg, #000 0%, #000 ${100 - 22 * person.fade}%, rgba(0,0,0,0) 100%)` : undefined);
        const tf = { transform: `translate(${person.pt.tx}px, ${person.pt.ty}px) scale(${person.pt.s})`, transformOrigin: "0 0" };
        return (<>
          {c && person.ring > 0 ? <div style={{ position: "absolute", left: c.l, top: c.t, width: c.w, height: c.h, borderRadius: c.r, boxShadow: `0 14px 34px rgba(60,40,20,${0.32 * person.ring})`, opacity: person.op }} /> : null}
          <AbsoluteFill style={{ opacity: person.op, clipPath, filter: !c && person.shadow > 0 ? `drop-shadow(0 12px 22px rgba(60,40,20,${0.28 * person.shadow}))` : undefined, WebkitMaskImage: person.mask, maskImage: person.mask }}>
            {person.fill > 0 ? <AbsoluteFill style={{ opacity: person.fill, ...tf }}><Footage src={meta.footage} /></AbsoluteFill> : null}
            <AbsoluteFill style={{ ...tf, WebkitMaskImage: person.mask ? undefined : mask, maskImage: person.mask ? undefined : mask }}><Footage src={meta.person!} transparent /></AbsoluteFill>
          </AbsoluteFill>
          {c && person.ring > 0 ? <div style={{ position: "absolute", left: c.l, top: c.t, width: c.w, height: c.h, borderRadius: c.r, border: `6px solid rgba(255,252,246,${person.ring})`, boxSizing: "border-box", opacity: person.op }} /> : null}
        </>);
      })() : null}
      {/* 圆形小镜头：圆里是带房间的原画面，直接淡入淡出 */}
      {bubble ? (() => {
        const pt = facePT(bubble.x, bubble.y, bubble.d / BUB.crop), r = bubble.d / 2;
        return (
          <div style={{ position: "absolute", left: bubble.x - r, top: bubble.y - r, width: bubble.d, height: bubble.d, borderRadius: "50%", overflow: "hidden", opacity: bubble.op,
            transform: `scale(${0.92 + 0.08 * bubble.op})`, border: "6px solid rgba(255,252,246,0.95)", boxShadow: "0 14px 34px rgba(60,40,20,0.32)", boxSizing: "border-box" }}>
            <div style={{ position: "absolute", left: -(bubble.x - r) - 6, top: -(bubble.y - r) - 6, width: W, height: H, transform: `translate(${pt.tx}px, ${pt.ty}px) scale(${pt.s})`, transformOrigin: "0 0" }}><Footage src={meta.footage} /></div>
          </div>
        );
      })() : null}
      {/* 前景叠层 */}
      {ovs.filter((o) => !isBehind(o) && o.type !== "tag" && o.type !== "cta").map((o, k) => <L key={`f${k}`} o={o} />)}
      {ovs.filter((o) => o.type === "bigText").map((o, k) => <BigTextSide key={`s${k}`} o={o as Extract<Overlay, { type: "bigText" }>} t={t} segEnd={seg.end} />)}
      {showNav || stack.length ? (
        <div style={{ position: "absolute", left: SAFE.side, top: SAFE.top, display: "flex", flexDirection: "column", gap: 10 }}>
          {showNav ? <NavCard t={t} plan={plan} world={seg.world} /> : null}
          {stack.map((o, k) => o.type === "tag" ? (
            t >= o.at && t < (o.until ?? seg.end) ? <Tag key={k} text={o.text} sub={o.sub} color={tone(o.tone)} p={Math.min(prog(t, o.at, D.in), 1 - prog(t, (o.until ?? seg.end) - D.out, D.out))} /> : null
          ) : o.type === "cta" ? <CtaRow key={k} o={o} t={t} /> : null)}
        </div>
      ) : null}
      {plan.chapters?.length ? <TopProgress t={t} plan={plan} onLight={seg.world === "B" && sceneOp > 0.5} /> : null}
      {(meta.captionMode ?? "all") === "all" || (bSeg && sceneOp > 0.5) ? (
        <div style={{ position: "absolute", inset: 0, transform: `translateX(${captionShift}px)` }}><Captions t={t} captions={plan.captions} en={meta.captionsEn} style={meta.captionStyle} /></div>
      ) : null}
      {/* 声音 */}
      {sfxOnly ? null : <Audio src={staticFile(meta.footage)} volume={meta.footageVolume ?? 1} />}
      {meta.bgm && !sfxOnly ? (
        <Audio src={staticFile(meta.bgm.src)} startFrom={Math.round((meta.bgm.from ?? 0) * fps)} loop
          volume={(f) => (meta.bgm!.dropAt !== undefined && f / fps < meta.bgm!.dropAt ? meta.bgm!.introVolume ?? 0.05 : meta.bgm!.volume ?? 0.12)} />
      ) : null}
      <SfxTrack plan={plan} fps={fps} />
    </AbsoluteFill>
  );
};
