import type { SegB } from "./plan";
// 进图形段的时间表（秒，相对段首）。Film.tsx 和 sfx.tsx 共用，单独放一个文件免得互相 import
export const SPLIT = { slide0: 0.04, slide: 0.55, plate0: 0.32, plate: 0.3, person0: 0.62, person: 0.5, content: 1.0 }; // 拆景：两侧物件滑出 → 空墙淡掉 → 人动 → 场景内容
export const FADE = { bg: 0.35, person0: 0.45, person: 0.3, bub0: 0.75, bub: 0.3, out: 1.0, content: 0.75 }; // 背景淡出 → 人原地淡出 → 圆球淡入；退场倒过来
export const MORPH = { bg: 0.35, move0: 0.3, move: 0.7, swap0: 0.68, swap: 0.32, content: 1.0, out: 0.95, outMove: 0.55 }; // 变身：背景淡出 → 人缩到小人头上并淡掉、小人淡入；退场倒过来
export const SWAP = { scene: 0.3, person0: 0.3, person: 0.45, content: 0.6 };
/** 手写场景第一个元素最早什么时候出（给场景作者和音效用） */
export const contentStart = (s: SegB) => s.start + (s.host === "morph" ? 1.2 : s.enter === "split" ? SPLIT.content : s.enter === "fade" ? FADE.content : s.enter === "swap" ? SWAP.content : 0.12);

// 剪口误：plan 里所有时间都按「原时间线」写（字幕、段落、叠层、手写场景里的秒数都不用改），
// meta.cuts 列出被剪掉的原时间段；渲染时成片时间 → 原时间（warp），音效起点 原时间 → 成片时间（unwarp）。实拍和抠像用剪好的文件（meta.footage / meta.person）。
export type Cut = { from: number; to: number };
export const cutTotal = (cuts?: Cut[]) => (cuts ?? []).reduce((a, c) => a + (c.to - c.from), 0);
export const warp = (cuts: Cut[] | undefined, tOut: number) => {
  let t = tOut;
  for (const c of [...(cuts ?? [])].sort((a, b) => a.from - b.from)) if (t >= c.from) t += c.to - c.from;
  return t;
};
export const unwarp = (cuts: Cut[] | undefined, tSrc: number): number | null => {
  let shift = 0;
  for (const c of cuts ?? []) {
    if (tSrc >= c.from && tSrc < c.to) return null; // 落在剪掉的那段里
    if (tSrc >= c.to) shift += c.to - c.from;
  }
  return tSrc - shift;
};
