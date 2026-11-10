import type React from "react";
import type { PropSpec } from "../props";

// 手写场景的类型。sync_template.sh 会同步这个文件；登记表 index.ts 和各场景文件归工程自己，不同步。
export type SfxRole = "swoosh" | "whoosh" | "pop" | "click" | "tick" | "check" | "ding" | "impact" | "type" | "splash";
/** 音效提示：直接给角色，或给一个道具让音效模块按道具自动推（和 board 一样）。vol 默认 0.5；v 指定用这个角色清单里的第几个变体（如 click 的 0=鼠标、1=开关），不写就轮换 */
export type Cue = { at: number; role: SfxRole; vol?: number; v?: number } | { prop: PropSpec };
export type CustomProps = { t: number; segStart: number; brand: string };
export type CustomScene = { Comp: React.FC<CustomProps>; cues: Cue[] };
