import React from "react";
import { AbsoluteFill, Img, OffthreadVideo, interpolate, staticFile } from "remotion";
import { H, W } from "./theme";
import { clamp, easeIn, easeInOut, easeOut } from "./anim";
import SIZES from "./scenes/custom/ipq.json";

// 真人 ↔ 角色精灵图的变身切镜（要自备精灵图并登记 ipq.json），四种做法（plan 段落里 morphStyle 选）：
//   dissolve 缩放溶解：人缩到小人头上，以头为中心从外往里化开，小人从稍大一点落到原尺寸
//   iris     圆形光圈：画面收成一个圆框住脸，圆缩到小人头的位置，白光一闪，小人从头开始弹出来
//   flip     贴纸翻面：人变成带白边的贴纸，缩过去时侧翻成一条线，翻回来就是小人
//   poof     一阵烟：人快速缩没，原地一团白烟，小人从烟里蹦出来（挤压回弹）
// 退场用同一套函数，时间倒着走。entry 的时间轴 u 从段首算起；背景（实拍）在 0–0.35 秒淡出。
export type MorphStyle = "dissolve" | "iris" | "flip" | "poof";
export const MORPH_LEN: Record<MorphStyle, number> = { dissolve: 1.15, iris: 1.2, flip: 1.15, poof: 1.05 };
const HEAD = { x: 520, y: 470, w: 490 }; // 实拍里头的中心和宽
const SZ = SIZES as unknown as Record<string, [number, number, number, number, number]>;
type Key = { x: number; y: number; d?: number; sprite?: string; crop?: "bust" };
type PT = { s: number; tx: number; ty: number };
const p01 = (u: number, a: number, d: number, e = easeInOut) => interpolate(u, [a, a + d], [0, 1], { ...clamp, easing: e });
const fullPT = (z: number): PT => ({ s: z, tx: (W / 2) * (1 - z), ty: H * 0.38 * (1 - z) });
const headPT = (k: Key): PT => { const s = (k.d ?? 200) / HEAD.w; return { s, tx: k.x - HEAD.x * s, ty: k.y - HEAD.y * s }; };
const lerpPT = (a: PT, b: PT, k: number): PT => ({ s: a.s * Math.pow(b.s / a.s, k), tx: a.tx + (b.tx - a.tx) * k, ty: a.ty + (b.ty - a.ty) * k });
const Video: React.FC<{ src: string; transparent?: boolean }> = ({ src, transparent }) => <OffthreadVideo src={staticFile(src)} muted transparent={transparent} style={{ width: W, height: H }} />;

/** 小人替身：让精灵图的头对准 key 的头位置；pivot 用头中心做缩放 / 翻转 */
const Kid: React.FC<{ k: Key; op: number; sx?: number; sy?: number; rotY?: number; scale?: number }> = ({ k, op, sx = 1, sy = 1, rotY = 0, scale = 1 }) => {
  const name = k.sprite ?? "talk";
  const [w, h, hx, hy, hw] = SZ[name] ?? [240, 560, 120, 110, 230];
  const sc = (k.d ?? 200) / hw;
  if (op <= 0) return null;
  return (
    <div style={{ position: "absolute", left: k.x - hx * sc, top: k.y - hy * sc, width: w * sc, height: h * sc * (k.crop === "bust" ? 0.6 : 1), overflow: "hidden", opacity: op,
      transform: `perspective(900px) rotateY(${rotY}deg) scale(${scale * sx}, ${scale * sy})`, transformOrigin: `${hx * sc}px ${hy * sc}px`, filter: "drop-shadow(0 10px 14px rgba(70,50,30,0.2))" }}>
      <Img src={staticFile(`ipq/${name}.png`)} style={{ width: w * sc, height: h * sc, display: "block" }} />
    </div>
  );
};

/** 一帧变身画面。u：从变身开始算的秒数；k：小人那一头的关键帧；z：实拍那一头的推近倍数 */
export const MorphFrame: React.FC<{ u: number; style: MorphStyle; k: Key; z: number; footage: string; person: string; noBg?: boolean }> = ({ u, style, k, z, footage, person, noBg }) => {
  // noBg：和拆景叠用时，背景交给拆景（两侧物件滑走），这里只画人；圆框和照片卡里也只装抠像、不装房间
  const bg = noBg ? 0 : 1 - p01(u, 0, 0.35); // 实拍背景
  const inner = noBg ? person : footage, innerT = !!noBg;
  const full = fullPT(z), tgt = headPT(k);
  const pt = (s: PT) => ({ transform: `translate(${s.tx}px, ${s.ty}px) scale(${s.s})`, transformOrigin: "0 0" });
  const bgLayer = bg > 0 ? <AbsoluteFill style={{ opacity: bg }}><AbsoluteFill style={{ transform: `scale(${z})`, transformOrigin: "50% 38%" }}><Video src={footage} /></AbsoluteFill></AbsoluteFill> : null;
  const headAt = (s: PT) => ({ x: HEAD.x * s.s + s.tx, y: HEAD.y * s.s + s.ty, w: HEAD.w * s.s });

  if (style === "dissolve") {
    const m = p01(u, 0.3, 0.75), cur = lerpPT(full, tgt, m), h = headAt(cur);
    const r1 = h.w * (0.55 + 0.9 * (1 - m)) + Math.pow(1 - m, 6) * 3000, r2 = r1 + h.w * (0.4 + 0.6 * (1 - m));
    const mask = `radial-gradient(circle at ${h.x}px ${h.y}px, #000 ${r1}px, rgba(0,0,0,0) ${r2}px)`;
    const pOp = 1 - p01(u, 0.78, 0.32), kOp = p01(u, 0.72, 0.36), kS = 1.12 - 0.12 * p01(u, 0.72, 0.45, easeOut);
    return (<>
      {bgLayer}
      {pOp > 0 ? <AbsoluteFill style={{ opacity: pOp, WebkitMaskImage: mask, maskImage: mask }}><AbsoluteFill style={pt(cur)}><Video src={person} transparent /></AbsoluteFill></AbsoluteFill> : null}
      <Kid k={k} op={kOp} scale={kS} />
    </>);
  }
  if (style === "iris") {
    // 圆：先在原地收紧到框住脸（0.3–0.6），再连人带圆缩到小人头上（0.55–0.95），白光一闪，小人从头弹出
    const close = p01(u, 0.3, 0.32), m = p01(u, 0.55, 0.4), cur = lerpPT(full, tgt, m), h = headAt(cur);
    const r = h.w * (0.62 + 2.2 * (1 - close));
    const pOp = 1 - p01(u, 0.95, 0.12), flash = p01(u, 0.9, 0.08) * (1 - p01(u, 0.98, 0.22));
    const pop = p01(u, 0.95, 0.35, easeOut), kS = pop < 1 ? 0.2 + 0.8 * pop + 0.12 * Math.sin(pop * Math.PI) : 1;
    return (<>
      {bgLayer}
      {pOp > 0 ? (<>
        <AbsoluteFill style={{ opacity: pOp, clipPath: `circle(${r}px at ${h.x}px ${h.y}px)` }}>{innerT ? <div style={{ position: "absolute", inset: 0, background: `rgba(232,224,216,${close})` }} /> : null}<AbsoluteFill style={pt(cur)}><Video src={inner} transparent={innerT} /></AbsoluteFill></AbsoluteFill>
        <div style={{ position: "absolute", left: h.x - r, top: h.y - r, width: r * 2, height: r * 2, borderRadius: "50%", border: `${4 + 4 * close}px solid rgba(255,252,246,${0.9 * close})`, boxSizing: "border-box", opacity: pOp, boxShadow: `0 16px 30px rgba(60,40,20,${0.25 * close})` }} />
      </>) : null}
      {flash > 0 ? <div style={{ position: "absolute", left: k.x - 160, top: k.y - 160, width: 320, height: 320, borderRadius: "50%", background: `radial-gradient(closest-side, rgba(255,255,255,${0.95 * flash}), rgba(255,255,255,0))` }} /> : null}
      <Kid k={k} op={pop > 0 ? 1 : 0} scale={kS} />
    </>);
  }
  if (style === "flip") {
    // 照片贴纸：画面收成一张白边圆角照片卡（框住头和肩），缩过去时侧翻成一条线，翻回来是小人
    const card = p01(u, 0.3, 0.3), m = p01(u, 0.4, 0.45), cur = lerpPT(full, tgt, m), h = headAt(cur);
    const turn = p01(u, 0.7, 0.18, easeIn), back = p01(u, 0.88, 0.3, easeOut);
    const bounce = back < 1 ? 1 + 0.08 * Math.sin(back * Math.PI) : 1;
    // 卡片框：从整幅画面收到头肩那一块（宽 1.5 个头、高 1.9 个头）
    const cw = W + (h.w * 1.5 - W) * card, chh = H + (h.w * 1.9 - H) * card;
    const cx = W / 2 + (h.x - W / 2) * card, cy = H / 2 + (h.y + h.w * 0.25 - H / 2) * card;
    const rad = 60 * card + 0.08 * h.w, bw = 10 * card * Math.max(0.35, cur.s);
    return (<>
      {bgLayer}
      {turn < 1 ? (
        <AbsoluteFill style={{ transform: `perspective(1200px) rotateY(${90 * turn}deg)`, transformOrigin: `${cx}px ${cy}px` }}>
          <AbsoluteFill style={{ clipPath: `inset(${cy - chh / 2}px ${W - cx - cw / 2}px ${H - cy - chh / 2}px ${cx - cw / 2}px round ${rad}px)` }}>{innerT ? <div style={{ position: "absolute", inset: 0, background: `rgba(232,224,216,${card})` }} /> : null}<AbsoluteFill style={pt(cur)}><Video src={inner} transparent={innerT} /></AbsoluteFill></AbsoluteFill>
          <div style={{ position: "absolute", left: cx - cw / 2, top: cy - chh / 2, width: cw, height: chh, borderRadius: rad, border: `${bw}px solid #FFFFFF`, boxSizing: "border-box", boxShadow: `0 18px 34px rgba(60,40,20,${0.3 * card})` }} />
        </AbsoluteFill>
      ) : null}
      {turn >= 1 ? <Kid k={k} op={1} rotY={-90 * (1 - back)} scale={bounce} /> : null}
    </>);
  }
  // poof：快速缩没 → 一团白烟 → 小人挤压回弹蹦出来
  const m = p01(u, 0.3, 0.32, easeIn), small: PT = { ...tgt, s: tgt.s * 0.5, tx: tgt.tx + HEAD.x * tgt.s * 0.5, ty: tgt.ty + HEAD.y * tgt.s * 0.5 };
  const cur = lerpPT(full, small, m), pOp = 1 - p01(u, 0.5, 0.14);
  const hh = headAt(cur), pm = `radial-gradient(circle at ${hh.x}px ${hh.y}px, #000 ${hh.w * (0.7 + 0.8 * (1 - m)) + Math.pow(1 - m, 6) * 3000}px, rgba(0,0,0,0) ${hh.w * (1.3 + 1.2 * (1 - m)) + Math.pow(1 - m, 6) * 3000}px)`;
  const puff = p01(u, 0.55, 0.5, easeOut), puffOp = p01(u, 0.55, 0.06) * (1 - p01(u, 0.8, 0.3));
  const pop = p01(u, 0.66, 0.36, easeOut);
  const sy = pop < 1 ? 0.55 + 0.6 * pop + 0.18 * Math.sin(pop * Math.PI * 1.5) : 1, sx = pop < 1 ? 1 / Math.max(0.6, sy) : 1;
  return (<>
    {bgLayer}
    {pOp > 0 ? <AbsoluteFill style={{ opacity: pOp, WebkitMaskImage: pm, maskImage: pm }}><AbsoluteFill style={pt(cur)}><Video src={person} transparent /></AbsoluteFill></AbsoluteFill> : null}
    {puffOp > 0 ? Array.from({ length: 9 }, (_, i) => {
      const a = (i / 9) * Math.PI * 2, dist = 40 + 120 * puff, r = 34 + 46 * puff * (0.7 + 0.3 * Math.sin(i * 2.1));
      return <div key={i} style={{ position: "absolute", left: k.x + Math.cos(a) * dist - r, top: k.y + 60 + Math.sin(a) * dist * 0.7 - r, width: r * 2, height: r * 2, borderRadius: "50%", background: "radial-gradient(circle at 40% 35%, #FFFFFF, #EEE7DF)", opacity: puffOp, boxShadow: "0 6px 14px rgba(60,40,20,0.12)" }} />;
    }) : null}
    {pop > 0 ? <Kid k={k} op={1} sx={sx} sy={sy} /> : null}
  </>);
};
export { easeInOut };
