import React from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";
import { F } from "./theme";

// 3:4 封面（合成 Cover，1 帧）：用户给的竖屏截图按宽铺满、从 y0 起裁成 3:4（头在中上），底部两行大字
// （字样式跟片子一致：苹方特粗、深色描边、第一行关键词和整个第二行亮黄），底部压一层深蓝渐变。数据在 plan.meta.cover。
// 渲：npx remotion still src/index.ts Cover out/cover/封面_3比4.png --frame=0
export const Cover: React.FC<{ src: string; y0?: number; line1: string; hl1?: string; line2: string }> = ({ src, y0 = 280, line1, hl1 = "", line2 }) => {
  const stroke = (w: number): React.CSSProperties => ({ WebkitTextStroke: `${w}px #0B1230`, paintOrder: "stroke fill" });
  const i = hl1 ? line1.indexOf(hl1) : -1;
  return (
    <AbsoluteFill style={{ background: "#0B1230", overflow: "hidden" }}>
      <Img src={staticFile(src)} style={{ position: "absolute", left: 0, top: -y0, width: 1080 }} />
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 760, background: "linear-gradient(180deg, rgba(11,18,48,0) 0%, rgba(11,18,48,0.55) 45%, rgba(11,18,48,0.9) 100%)" }} />
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 120, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, fontFamily: F.cn, fontWeight: 900, lineHeight: 1.12,
        filter: "drop-shadow(0 10px 24px rgba(0,0,0,0.45))" }}>
        <div style={{ fontSize: 112, color: "#FFFFFF", letterSpacing: 2, ...stroke(16) }}>
          {i >= 0 ? <>{line1.slice(0, i)}<span style={{ color: "#FFD23F" }}>{hl1}</span>{line1.slice(i + hl1.length)}</> : line1}
        </div>
        <div style={{ fontSize: 172, color: "#FFD23F", letterSpacing: 6, ...stroke(20) }}>{line2}</div>
      </div>
    </AbsoluteFill>
  );
};
