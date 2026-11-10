// 设计参数：数值来自对标视频实测（1920x1080 原片取样后换算到 1080x1440）。
// 主题：视频上的叠层永远白字（C.text/sub/faint）；图形画布和卡片跟随 meta.theme（默认 light）。
import planJson from "./plan.json";

export const W = 1080;
export const H = 1440;
export const SAFE = { side: 60, top: 80, captionY: 1150 };

const BASE = {
  // 视频上（A 世界、字幕）用的字色，不随主题变
  text: "#FFFFFF",
  sub: "rgba(255,255,255,0.62)",
  faint: "rgba(255,255,255,0.38)",
  ink: "#111114",
  yellow: "#F8DB51",
  blue: "#3D9BFF",
  red: "#FF5A5F",
  green: "#38D39F",
  purple: "#A57BFF",
  gold1: "#E9D8A6",
  gold2: "#B89A55",
  glass: "rgba(18,18,20,0.55)",
  glassLine: "rgba(255,255,255,0.32)",
  cardLight: "#F4F4F6",
};

const DARK = {
  canvas: "#1C1C1F",
  canvasAlt: "#0B0B0C",
  dot: "rgba(255,255,255,0.10)",
  watermark: "rgba(255,255,255,0.065)",
  watermarkStroke: "rgba(255,255,255,0.09)",
  cardBg: "#2A292E",
  cardText: "#FFFFFF",
  cardSub: "rgba(255,255,255,0.62)",
  cardFaint: "rgba(255,255,255,0.38)",
  cardLine: "rgba(255,255,255,0.07)",
  slot: "#38373D",
  shadow: "0 24px 60px rgba(0,0,0,0.45)",
  inkYellow: "#F8DB51",
  // 道具画风：深色主体 + 白描边（对标原版）
  propBody: "#2B2B30",
  propBody2: "#3A3A41",
  propLine: "#F2F3F5",
  propScreen: "#33506B",
  thick: "#151517",
  cyan: "#5AD2F4",
};

const LIGHT = {
  canvas: "#F2F4F7",
  canvasAlt: "#EEF1F5",
  dot: "rgba(20,24,32,0.12)",
  watermark: "rgba(20,24,32,0.07)",
  watermarkStroke: "rgba(20,24,32,0.11)",
  cardBg: "#FFFFFF",
  cardText: "#14161A",
  cardSub: "#5B6270",
  cardFaint: "#9AA1AD",
  cardLine: "#E4E7EC",
  slot: "#E9ECF1",
  shadow: "0 18px 44px rgba(22,34,64,0.12)",
  inkYellow: "#D99100",
  // 道具画风：白/浅灰主体 + 深色描边线稿
  propBody: "#FFFFFF",
  propBody2: "#E8ECF2",
  propLine: "#1F2633",
  propScreen: "#DCE8FF",
  thick: "#C9D0DB",
  cyan: "#12A8D8",
  // 浅色下蓝、红、绿稍微压深，白底上更清楚
  blue: "#2F6BFF",
  red: "#F04444",
  green: "#12B76A",
  purple: "#7B5CFF",
  yellow: "#FFC93C",
};

export const THEME = ((planJson as { meta?: { theme?: string } }).meta?.theme === "dark" ? "dark" : "light") as "dark" | "light";
export const C = { ...BASE, ...(THEME === "dark" ? DARK : LIGHT) };

export const F = {
  cn: '"PingFang SC", "Hiragino Sans GB", "Noto Sans CJK SC", sans-serif',
  num: '"Avenir Next", "SF Pro Display", "Helvetica Neue", sans-serif',
  mono: '"SF Mono", Menlo, monospace',
};

export const shadow = C.shadow;
/** 填充用强调色（图标底、勾选框、条） */
export const accent = (k?: string) =>
  ({ yellow: C.yellow, blue: C.blue, red: C.red, green: C.green, purple: C.purple, cyan: C.cyan } as Record<string, string>)[k ?? "yellow"] ?? C.yellow;
/** 文字用强调色：浅色主题下黄色换成琥珀色，白底上看得清 */
export const accentInk = (k?: string) => ((k ?? "yellow") === "yellow" ? C.inkYellow : accent(k));
