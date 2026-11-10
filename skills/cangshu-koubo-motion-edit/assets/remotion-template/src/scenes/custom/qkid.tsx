import React from "react";
import { Img, staticFile } from "remotion";
import SIZES from "./ipq.json";
import { MS } from "../../morphState";

// 可选：把 toon 场景里代码画的 Kid 换成你自备的角色精灵图（比如照讲者本人画的 Q 版 IP），场景的构图和动效不动。开源版不附带任何精灵图。
// 小人不是主体：可以只露头（crop "head"）或半身（crop "bust"），偶尔全身。精灵图在 public/ipq/，尺寸表 ipq.json（split_sheet.py 切完后生成）。
type Mood = "calm" | "smile" | "happy" | "smug" | "angry" | "sad" | "shock" | "sleepy" | "tired";
type Pose = "down" | "hips" | "point" | "up" | "wave" | "hold" | "fist" | "shrug" | "cross" | "scroll";
const SZ = SIZES as unknown as Record<string, [number, number]>;
const has = (n: string) => !!SZ[n];

/** 主角：按原来 Kid 的姿势 / 表情挑一张最接近的精灵图 */
const heroPose = (pose: Pose, mood: Mood, walk?: number): string => {
  if (walk !== undefined && has("walk")) return "walk";
  if (pose === "cross" && has("sleep")) return "sleep";
  if ((mood === "tired" || mood === "sad") && has("tired")) return "tired";
  if (mood === "shock") return "wow";
  if (pose === "up" || pose === "fist") return "cheer";
  if (pose === "point") return "point";
  if (pose === "hold") return "chip";
  if (pose === "shrug") return has("shrug") ? "shrug" : "wow";
  if (pose === "hips" || mood === "smug") return has("hips") ? "hips" : "talk";
  if (mood === "happy") return "cheer";
  return "talk";
};
const HEAD: Record<Mood, string> = { calm: "h_talk", smile: "h_smirk", happy: "h_laugh", smug: "h_smirk", angry: "h_eyeroll", sad: "h_cry", shock: "h_wow", sleepy: "h_sleepy", tired: "h_cry" };
/** 配角：原来的 look → 这一套里的人 */
const CAST: Record<string, string> = { celeb: "c_boss", tutor: "c_boss", kidA: "c_worker", kidB: "c_designer", kidC: "c_coder", friend: "c_vendor", viewer: "c_vendor" };

export const QKid: React.FC<{
  x: number; feet: number; s?: number; t: number; seed?: number; look?: string; mood?: Mood; pose?: Pose; flip?: boolean; squash?: number; dy?: number; rot?: number; op?: number; z?: number;
  walk?: number; dull?: number; sweat?: boolean; still?: boolean; crop?: "head" | "bust";
}> = ({ x, feet, s = 1, t, seed = 0, look = "viewer", mood = "calm", pose = "down", flip, squash = 0, dy = 0, rot = 0, op = 1, z, walk, dull = 0, sweat, still, crop }) => {
  if (op <= 0.001 || s <= 0.001) return null;
  const hero = look === "creator";
  if (hero && MS.active && (t < MS.inEnd || t >= MS.outStart)) return null; // 变身切镜时由 Film 画替身
  const name = crop === "head" ? (hero ? HEAD[mood] : CAST[look] ?? "c_vendor") : hero ? heroPose(pose, mood, walk) : CAST[look] ?? "c_vendor";
  const [iw, ih] = SZ[name] ?? [240, 560];
  // 原来 Kid 从脚底到头顶是 222·s；精灵图按同样高度摆，头像版按头的大小摆在原来头的位置
  const H = crop === "head" ? 222 * s * 0.62 : 222 * s * 1.04;
  const Wd = (iw / ih) * H;
  const top = crop === "head" ? feet + dy - 222 * s * 1.0 : feet + dy - H;
  const br = still ? 0 : Math.sin(t * 2.3 + seed * 1.3) * 0.007;
  const bob = walk !== undefined ? -Math.abs(Math.sin(walk)) * 8 * s : 0;
  const clipH = crop === "bust" ? H * 0.6 : H;
  return (
    <div style={{ position: "absolute", left: x - Wd / 2, top: top + bob, width: Wd, height: clipH, overflow: "hidden", opacity: op, zIndex: z,
      transform: `${flip ? "scaleX(-1) " : ""}scaleY(${1 - squash + br}) scaleX(${1 + squash * 0.5}) rotate(${rot}deg)`, transformOrigin: `50% ${H}px`,
      filter: `drop-shadow(0 ${6 * s}px ${8 * s}px rgba(70,50,30,0.18))${dull > 0 ? ` grayscale(${0.85 * dull})` : ""}` }}>
      <Img src={staticFile(`ipq/${name}.png`)} style={{ width: Wd, height: H, display: "block" }} />
      {sweat && name !== "tired" ? (
        <svg width={Wd} height={H} viewBox={`0 0 ${Wd} ${H}`} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
          {[0, 1].map((i) => { const k = ((t * 1.3 + i * 0.5) % 1); return <path key={i} d={`M${Wd * (0.82 + i * 0.08)} ${H * (0.1 + 0.08 * k)} q6 10 0 14 q-6 -4 0 -14 Z`} fill="#7CC4F0" opacity={1 - k} transform={`scale(${s * 0.9})`} style={{ transformOrigin: `${Wd * 0.85}px ${H * 0.12}px` }} />; })}
        </svg>
      ) : null}
    </div>
  );
};
