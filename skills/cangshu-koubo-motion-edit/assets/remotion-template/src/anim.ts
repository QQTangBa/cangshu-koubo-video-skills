import { Easing, interpolate } from "remotion";

// 动效曲线：对标视频连续帧里量出来的手感。
export const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
export const easeOut = Easing.bezier(0.16, 1, 0.3, 1); // 先快后慢，绝大多数进场
export const easeInOut = Easing.bezier(0.65, 0, 0.35, 1); // 飞角标、归位
export const easeIn = Easing.bezier(0.55, 0, 0.9, 0.4); // 掉落出画

// 时长（秒）
export const D = {
  in: 0.22, // 卡片/标签淡入（对标 4–8 帧）
  out: 0.25,
  pop: 0.22, // 过冲弹出
  stagger: 0.22, // 列表错峰
  fly: 0.35, // 大数字飞角标
  settle: 0.5, // 片名放大落定
  sweepPerChar: 0.1,
  swallow: 0.45, // A→B
  dissolve: 0.2, // B→A
  count: 0.9, // 数字滚动
};

/** 0→1 进度。t、start、dur 都是秒。 */
export const prog = (t: number, start: number, dur: number, ease = easeOut) =>
  interpolate(t, [start, start + dur], [0, 1], { ...clamp, easing: ease });

/** 带过冲的弹出缩放 0→~1.08→1 */
export const popScale = (t: number, start: number, dur = D.pop) => {
  const p = interpolate(t, [start, start + dur], [0, 1], clamp);
  if (p <= 0) return 0;
  const c1 = 1.9, c3 = c1 + 1;
  return 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2);
};

/** 可见度：at 时淡入，until 时淡出 */
export const life = (t: number, at: number, until: number | undefined, dIn = D.in, dOut = D.out) => {
  const a = prog(t, at, dIn);
  const b = until === undefined ? 1 : 1 - prog(t, until - dOut, dOut, Easing.linear);
  return Math.min(a, b);
};

/** 标准进场样式：淡入 + 上移 + 去模糊 */
export const fadeUp = (p: number, dy = 24, blur = 10) => ({
  opacity: p,
  transform: `translateY(${(1 - p) * dy}px)`,
  filter: p < 1 ? `blur(${(1 - p) * blur}px)` : undefined,
});

export const countUp = (t: number, at: number, from: number, to: number, dur = D.count) =>
  from + (to - from) * prog(t, at, dur);

export const fmt = (v: number, decimals = 0, sep = true) => {
  const s = v.toFixed(decimals);
  if (!sep) return s;
  const [i, d] = s.split(".");
  return i.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + (d ? "." + d : "");
};
