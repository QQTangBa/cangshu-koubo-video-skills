// 剪辑方案（plan.json）的数据结构。所有时间都是成片时间线上的秒。
import type { PropSpec } from "./scenes/props";
export type Tone = "yellow" | "blue" | "red" | "green" | "purple" | "cyan"; // 语义：cyan 我的/对的，red AI味/错/被绑，yellow 重点/成果，blue 数据/知识

export type Meta = {
  duration: number;
  fps?: number;
  footage: string; // public/ 下 3:4 口播素材
  person?: string; // public/ 下带透明通道的抠像（person.webm），没有就自动降级
  brand: string; // 水印画布和品牌字墙上的品牌字，写你自己的品牌名
  brandTag?: string; // 水印第二个词，默认 ORIGINAL
  ambient?: { period?: number; opacity?: number } | false; // 模拟 RGB 氛围灯循环
  bgm?: { src: string; from?: number; volume?: number; introVolume?: number; dropAt?: number };
  captionsEn?: boolean;
  sfxVolume?: number; // 音效总音量，按 sfx_levels.py 校准（目标：每个音效峰值比人声中位低 1–6dB，压在人声底下）
  sfxMinGap?: number; // 任意两个音效的最小间隔（秒），默认 0.5；挤在一起的只留优先级高的
  footageVolume?: number; // 口播原声音量，默认 1。不要设成 0 来测音效：render_final.py 用 --props sfxOnly 自己渲纯音效音轨
  autoSfx?: boolean; // 默认 true：按画面事件自动配音效（需先跑 build_sfx.py）
  theme?: "light" | "dark"; // 图形画布和卡片主题，默认 light
  captionMask?: { top: number; bottom: number; blur?: number }; // 素材里已烧进字幕时：真人画面这一条带柔化盖掉（屏幕 y 像素），新字幕压在上面
  captionMode?: "all" | "B"; // B：素材自带字幕，真人段不叠字幕，只在图形段（盖住了原字幕）出字幕
  captionStyle?: "box" | "burn" | "pop"; // 不写 = box（半透明黑底框，不显示重点词）；推荐 pop：白粗字 + 重点词（hl）放大 1.32 倍亮黄；burn：仿原片剪映字幕（白粗字 + 金黄关键词 + 深色柔阴影，中心 y≈1083）
  style?: "toon" | "white" | "chalk" | "dark" | "news" | "blue" | "neon" | "water" | "wall"; // wall：取自实拍背景墙颜色的主题（颜色在 toon.tsx 主题表里改） // 动画片工具（scenes/custom/toon.tsx）的画风主题，见 style-bible 第 7 节；默认 toon
  footageSrc?: string; personSrc?: string; // 剪口误前的原素材（拆景素材从它取帧）
  cuts?: { from: number; to: number }[]; // 剪掉的原时间段（口误等）；plan 里其余时间都按原时间线写，渲染时自动换算
  qkid?: boolean; // toon 场景里的 Kid 换成你自备的角色精灵图（public/ipq/ + scenes/custom/ipq.json；不附带，没配就别开）
  wall?: boolean; // 图形段背后的品牌字墙（一行行 brand，相邻行反向滚动）；不写就按主题默认（dark 开，其余关）
  series?: { name: string; en?: string; ep: string; topic: string }; // 系列固定片头 custom/intro.tsx 读这里：栏目名、英文小字、期数、本期题目
  cover?: { src: string; y0?: number; line1: string; hl1?: string; line2: string }; // 3:4 封面（Cover 合成）：public/ 下的截图、裁切起点、两行大字、第一行标黄的词
};

export type Caption = { start: number; end: number; text: string; en?: string; hl?: string | string[] }; // hl：这条里标黄的词（照原片剪映字幕的高亮）
export type Chapter = { start: number; label: string; en?: string; icon?: string }; // icon：Tabler 图标名（src/icons.json）

type Life = { at: number; until?: number };
export type Overlay =
  | (Life & { type: "tag"; text: string; sub?: string; tone?: Tone })
  | (Life & { type: "dataCard"; title: string; sub?: string; meta?: string; stats: { v: string; l: string }[]; pos?: "top" | "chest" })
  | (Life & { type: "bigText"; text: string; unit?: string; side?: string; en?: string; tone?: "yellow" | "white"; behind?: boolean; y?: number; x?: "left" | "center" | "right"; s?: number; fly?: { at: number; label?: string } })
  | (Life & { type: "sideWords"; left: string; right?: string; joiner?: string; rightAt?: number; y?: number })
  | (Life & { type: "pill"; text: string; sub?: string; tone?: "gold" | "red" | "blue" })
  | (Life & { type: "title"; text: string; sweepAt?: number; kicker?: string })
  | (Life & { type: "sticker"; text: string; en?: string; y?: number })
  | (Life & { type: "metric"; title: string; en?: string; value: number; unit?: string; dur?: number; note?: string; tone?: "yellow" | "blue" })
  | (Life & { type: "bubbles"; header?: string; items: { text: string; at: number }[] })
  | (Life & { type: "counter"; label: string; from: number; to: number; decimals?: number; suffix?: string; dur?: number })
  | (Life & { type: "battery"; label: string; drainAt: number; drainDur?: number; dropAt?: number })
  | (Life & { type: "cta"; items?: string[] })
  | (Life & { type: "infoBox"; en: string; title: string; items: { cn: string; en?: string; icon?: string; at: number }[]; sfx?: "all" | "head" | "none"; tone?: "warm" | "cool"; badge?: string }) // 左上信息框（英文渐变大写 + 中文副标题，下面一条条带图标的玻璃胶囊）；sfx 默认 none
  | (Life & { type: "topWord"; text: string; size?: number; color?: string; look?: "flat" | "extrude" | "steel" | "tilt" | "chrome" | "candy"; fly?: { at: number; x: number; y: number; s: number } }) // 身后大字·顶边版：两三个字（字母）顶着上边框、左右贴边，只被头挡一点
  | (Life & { type: "doodle"; kind: "anger" | "sweat" | "sparkle" | "question" | "exclaim" | "zzz" | "heart" | "note" | "dizzy"; x: number; y: number; s?: number; rot?: number }); // 漫画小符号，贴在人头边

export type Scene =
  | { layout: "checklist"; title: string; icon?: Icon; iconPulseAt?: number; items: { text: string; at: number }[]; meter?: string }
  | { layout: "bars"; title?: string; unit?: string; items: { label: string; value: number; at: number; tone?: Tone; display?: string }[] }
  | { layout: "stat"; label: string; value: number; from?: number; decimals?: number; prefix?: string; suffix?: string; at: number; sub?: string; delta?: string }
  | { layout: "flow"; title?: string; steps: { label: string; sub?: string; at: number }[] }
  | { layout: "phone"; title?: string; badgeTo?: number; items: { name: string; text: string; at: number }[]; at: number }
  | { layout: "doc"; title: string; tag?: string; at: number; lines: { text?: string; at?: number; mark?: "red" | "yellow" | "blue" }[] }
  | { layout: "compare"; at: number; left: CompareSide; right: CompareSide & { at: number }; verdict?: { text: string; at: number } }
  | { layout: "keyword"; text: string; sub?: string; at: number; icon?: Icon }
  | { layout: "timeline"; title?: string; items: { time: string; label: string; at: number }[] }
  | { layout: "photo"; src: string; at: number; label?: string; lockAt?: number; sticker?: { text: string; at: number } }
  | { layout: "slider"; left: { src: string; label: string }; right: { src: string; label: string }; at: number }
  | { layout: "board"; cards: BoardCard[]; steps: BoardStep[] }
  | { layout: "custom"; name: string }; // 手写场景：src/scenes/custom/<name>.tsx，在 custom/index.ts 里登记

// 画板：卡片跨拍持续存在，每拍只声明显示哪些卡、用什么布局、在哪块区域，引擎负责飞过去、镜头跟过去。
type CardBase = { id: string; tone?: Tone; meta?: string; tags?: string[] };
export type BoardCard =
  | (CardBase & { kind: "text"; title: string; sub?: string; subAt?: number; icon?: Icon; pulseAt?: number })
  | (CardBase & { kind: "chip"; title: string; icon?: Icon })
  | (CardBase & { kind: "question"; text: string })
  | (CardBase & { kind: "stat"; label: string; value: number; from?: number; decimals?: number; prefix?: string; suffix?: string; at?: number; sub?: string })
  | (CardBase & { kind: "data"; title: string; value: number; from?: number; decimals?: number; prefix?: string; unit?: string; at?: number; dur?: number;
      rows?: { label: string; value: string }[]; bar?: { value: number; max: number; label?: string }; badge?: string; foot?: string })
  | (CardBase & { kind: "list"; title: string; icon?: Icon; items: { text: string; at: number }[] })
  | (CardBase & { kind: "bars"; title?: string; unit?: string; items: { label: string; value: number; at?: number; tone?: Tone; display?: string }[]; badge?: string })
  | (CardBase & { kind: "progress"; label: string; to: number; at?: number; dur?: number })
  | (CardBase & { kind: "keyword"; text: string; sub?: string })
  | (CardBase & { kind: "stamp"; text: string })
  | (CardBase & { kind: "mark"; mark: "check" | "cross" })
  | (CardBase & { kind: "terminal"; title?: string; lines: { text: string; at: number }[] })
  | (CardBase & { kind: "timer"; label?: string; to: number; at?: number; dur?: number })
  | (CardBase & { kind: "photo"; src: string; label?: string })
  | (CardBase & { kind: "phone"; title?: string; badgeTo?: number; items: { name: string; text: string; at: number }[] })
  | (CardBase & { kind: "doc"; title: string; tag?: string; lines: { text?: string; at?: number; mark?: "red" | "yellow" | "blue" }[] })
  | (CardBase & { kind: "prop"; prop: PropSpec }); // 道具：摄像机、大脑、天平、人群…，见 scenes/props.tsx
export type LinkSpec = { from: string; to: string; style?: "line" | "pipe" | "sight" | "particles"; at?: number };
export type BoardLayout = "hero" | "column" | "row" | "grid" | "focus" | "chain" | "tree" | "orbit";
export type EnterSpec = { type: "pop" | "slide" | "grow" | "fly" | "stamp"; from?: string; dir?: "left" | "right" | "up" | "down" };
export type ExitSpec = { type: "fade" | "into" | "stay"; to?: string };
export type BoardStep = {
  at: number; layout: BoardLayout; show: string[]; focus?: string; links?: ([string, string] | LinkSpec)[];
  place?: Record<string, [number, number, number?]>; // 自由摆位：[x, y, 缩放]，x/y 是这块区域里的画面比例（0–1）
  region?: [number, number]; // 这一拍的内容排在哪块区域（屏幕为单位，[1,0]=右边一屏）；区域变了镜头就移过去
  camera?: { zoom?: number; target?: string; move?: "ease" | "whip" | "cut" };
  enter?: Record<string, EnterSpec>; exit?: Record<string, ExitSpec>;
  dim?: boolean; // 默认 true：有新卡时旧卡压暗
  ghost?: string[]; // 下一拍才出现的卡，先画虚线占位
};

export type CompareSide = { label: string; value: string; unit?: string; sub?: string; tone?: Tone };
export type Icon = "bulb" | "check" | "doc" | "chart" | "phone" | "brain" | "clock" | "bolt" | "user" | "star" | "warn" | "eye" | "coin" | "scissors";

export type SegA = {
  world: "A"; start: number; end: number; zoom?: number; settle?: boolean; overlays?: Overlay[];
  drift?: "in" | "out" | "none"; // 持续慢推慢拉，默认相邻真人段交替（对标 77% 的真人帧都在缓推缓拉）
  driftRate?: number; // 每秒缩放比例，默认 0.015
  punch?: { at: number; to: number }[]; // 重音处 0.25s 快速推近到 to（相对当前）
};
export type SegB = {
  world: "B"; start: number; end: number;
  enter?: "swap" | "swallow" | "dissolve" | "cut" | "split" | "fade"; // fade：背景淡出 → 人原地晚一点淡出 → 圆形小镜头淡入（配 host bubble） // split：背景两侧物件滑出画 → 空墙换成图形底（字墙）→ 人最后动（需 split_plates.py 生成素材）
  host?: "corner" | "bubble" | "none" | "morph"; // morph：人缩到小人头上变成小人（hostPath 第一个 = 进场时小人头的屏幕位置和头宽，最后一个 = 退场时的） // 进图形后人像去哪：corner 抠像缩到右下角；bubble 缩进小圆球；none 移出画面
  hostPath?: { at: number; x: number; y: number; d?: number; sprite?: string; crop?: "bust" }[];
  morphStyle?: "dissolve" | "iris" | "flip" | "poof"; // host morph 的变身做法（morph.tsx） // bubble / corner 的位置关键帧（屏幕坐标，bubble 是圆心和直径，corner 是头中心），可以跟着动效走
  exit?: "center" | "split" | "dissolve" | "fade" | "cut"; // cut：直接硬切回实拍（退场动画会挡住最后的内容时用） // 回真人：center 人像先回到中间再切实拍（有 host 时默认）；split 人回来 + 两侧物件滑回来再切实拍
  bg?: "watermark" | "black";
  kicker?: string; // 顶部小标题胶囊
  source?: string; // 右下角出处小字
  scene: Scene;
};
export type SegS = { world: "S"; start: number; end: number; clips: { src: string; at: number; from?: number }[]; overlays?: Overlay[] };
export type Segment = SegA | SegB | SegS;

export type Plan = {
  meta: Meta;
  captions: Caption[];
  chapters?: Chapter[];
  segments: Segment[];
  sfx?: { at: number; type: "boom" | "pop"; volume?: number }[];
};
