import React from "react";
import { Img, staticFile } from "remotion";
import { F } from "../../theme";
import { T } from "./toon";

// 真实素材（图形段里插真图，不全靠代码画）。只用图片，不用网上找的实拍视频（出戏、不符合画风）。
// 图要讲台词里那件事（AI 画的游戏 CG、排完版的幻灯片、小程序截图、中英对照稿、网文页、短剧剧照）；只用用户提供的、有授权的图（截图、自己做的图、自己用任意工具生成的图），
// 放工程 public/real/；AI 生成的图上屏挂「AI 生成」角标。
/** 真图（铺满 w×h，object-fit cover） */
export const RealImg: React.FC<{ src: string; w: number; h: number; style?: React.CSSProperties }> = ({ src, w, h, style }) => (
  <Img src={staticFile(`real/${src}`)} style={{ position: "absolute", left: 0, top: 0, width: w, height: h, objectFit: "cover", display: "block", ...style }} />
);

/** 「AI 生成」角标：AI 画的图上屏都挂一个（平台要求标识 AI 生成内容） */
export const AiTag: React.FC<{ s?: number; style?: React.CSSProperties }> = ({ s = 1, style }) => (
  <div style={{ position: "absolute", right: 8 * s, bottom: 8 * s, padding: `${3 * s}px ${9 * s}px`, borderRadius: 20 * s, background: "rgba(20,20,24,0.62)", color: "#fff", fontFamily: F.cn, fontWeight: 700, fontSize: 15 * s, letterSpacing: 1, whiteSpace: "nowrap", zIndex: 3, ...style }}>AI 生成</div>
);

/** 段内多画布：一段 B-roll 里信息一屏放不下时，把几块内容摆在画布不同位置，镜头在块之间横移 / 竖移。
 *  不为运镜而运镜：一屏装得下就不拆；要拆就挪半屏左右（dx ≈ 500）、每屏都填满、旁边那块露半截，别甩一整屏让每块只剩三成内容。
 *  dx、dy 是这块相对第一块的偏移；块里的元素照常按 0–1080 × 0–1440 的局部坐标写，镜头关键帧写世界坐标（局部 + 偏移） */
export const Block: React.FC<{ dx: number; dy?: number; children: React.ReactNode }> = ({ dx, dy = 0, children }) => (
  <div style={{ position: "absolute", left: dx, top: dy, width: 1080, height: 1440 }}>{children}</div>
);
/** 渐亮的真图：从上往下一行行亮出来（reveal 0→1），没亮的部分是浅灰底 */
export const RevealImg: React.FC<{ src: string; w: number; h: number; reveal: number; ai?: boolean }> = ({ src, w, h, reveal, ai }) => (
  <div style={{ position: "relative", width: w, height: h, borderRadius: 14, overflow: "hidden", background: T.paper, border: `1.5px solid ${T.line}`, boxShadow: T.shadow }}>
    <RealImg src={src} w={w} h={h} style={{ opacity: 0.18, filter: "grayscale(1)" }} />
    <RealImg src={src} w={w} h={h} style={{ WebkitMaskImage: `linear-gradient(180deg, #000 ${reveal * 110 - 10}%, transparent ${reveal * 110}%)`, maskImage: `linear-gradient(180deg, #000 ${reveal * 110 - 10}%, transparent ${reveal * 110}%)` }} />
    {ai ? <AiTag /> : null}
  </div>
);
