import { Composition } from "remotion";
import { Film } from "./Film";
import { Cover } from "./Cover";
import planJson from "./plan.json";
import type { Plan } from "./plan";
import { TH, applyTheme, type ThemeName } from "./scenes/custom/toon";
import { cutTotal } from "./timing";

const plan = planJson as unknown as Plan;
const fps = plan.meta.fps ?? 30;
const dur = Math.round((plan.meta.duration - cutTotal(plan.meta.cuts)) * fps); // 减掉 meta.cuts 剪掉的口误
// 渲之前先切画风主题（scenes/custom/toon.tsx）；plan.meta.wall 显式写了就覆盖主题默认的字墙开关
const Themed: React.FC<{ plan: Plan; theme: ThemeName; sfxOnly?: boolean }> = ({ plan, theme, sfxOnly }) => {
  applyTheme(theme);
  if (plan.meta.wall !== undefined) TH.wall = plan.meta.wall;
  TH.q = !!plan.meta.qkid; // toon 场景里的 Kid 换成自备角色精灵图（scenes/custom/qkid.tsx）
  return <Film plan={plan} sfxOnly={sfxOnly} />;
};
const THEMES: ThemeName[] = ["toon", "white", "chalk", "dark", "news", "blue", "neon", "water", "wall"];
// 变身样片：所有 host: "morph" 的段换成同一种变身做法（morph.tsx），给用户挑
const MORPHS = ["dissolve", "iris", "flip", "poof"] as const;
const withMorph = (m: (typeof MORPHS)[number]): Plan => ({ ...plan, segments: plan.segments.map((s) => (s.world === "B" && s.host === "morph" ? { ...s, morphStyle: m } : s)) });
// 身后大字样片：所有 topWord 换成同一种 look
const TOPLOOKS = ["flat", "extrude", "steel", "tilt", "chrome", "candy"] as const;
const withTopLook = (l: (typeof TOPLOOKS)[number]): Plan => ({ ...plan, segments: plan.segments.map((s) => (s.world === "A" ? { ...s, overlays: (s.overlays ?? []).map((o) => (o.type === "topWord" ? { ...o, look: l } : o)) } : s)) });

export const RemotionRoot: React.FC = () => (
  <>
    {/* 成片：画风按 plan.meta.style（默认 toon） */}
    <Composition id="Koubo34" component={Themed} durationInFrames={dur} fps={fps} width={1080} height={1440} defaultProps={{ plan, theme: (plan.meta.style ?? "toon") as ThemeName }} />
    {/* 风格样片：同一段换画风，给用户挑（scripts/style_reel.py 用） */}
    {THEMES.map((th) => <Composition key={th} id={`Style-${th}`} component={Themed} durationInFrames={dur} fps={fps} width={1080} height={1440} defaultProps={{ plan, theme: th }} />)}
    {MORPHS.map((m) => <Composition key={m} id={`Morph-${m}`} component={Themed} durationInFrames={dur} fps={fps} width={1080} height={1440} defaultProps={{ plan: withMorph(m), theme: (plan.meta.style ?? "toon") as ThemeName }} />)}
    {TOPLOOKS.map((l) => <Composition key={l} id={`Top-${l}`} component={Themed} durationInFrames={dur} fps={fps} width={1080} height={1440} defaultProps={{ plan: withTopLook(l), theme: (plan.meta.style ?? "toon") as ThemeName }} />)}
    {/* 3:4 封面：数据在 plan.meta.cover */}
    {plan.meta.cover ? <Composition id="Cover" component={Cover} durationInFrames={1} fps={30} width={1080} height={1440} defaultProps={plan.meta.cover} /> : null}
  </>
);
