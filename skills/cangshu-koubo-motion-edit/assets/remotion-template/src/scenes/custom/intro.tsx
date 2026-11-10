import React from "react";
import { F } from "../../theme";
import { type CamKey, popIn, pr, tw, wobble } from "../kit";
import { TablerIcon } from "../props";
import { Emote, Label, Stage, T, Wob } from "./toon";
import type { CustomScene } from "./types";
import planJson from "../../plan.json";

// 系列固定片头（约 3.2 秒，时间全部相对段落开头写）。栏目名、期数、题目都读 plan.meta.series，换一期只改 plan，不改代码。
// 登记：custom/index.ts 里 intro: { ...introScene, cues: introCues(<片头段开头秒>) }；plan 里放一段 B（约 3.2 秒，落在"欢迎来到 XX 第 N 期"那句上）
// 链条：一屏社交卡片往上刷（流量）→ 放大镜从右边滑进来压住画面，镜片里露出背后转着的齿轮和大脑（背后的原理）
//   → 栏目名大字砸下来盖章 → 「第 01 期」小签和本期题目弹出
// 联动表：
//   ① 放大镜扫过 ↔ 镜片里的卡片变成齿轮（同一块画面的两层）
//   ② 大字落下 ↔ 放大镜被震一下、卡片流停住
//   ③ 期数签弹出 ↔ 题目条从签下面滑出来

const SERIES = ((planJson as { meta?: { series?: { name: string; en?: string; ep: string; topic: string } } }).meta?.series) ?? { name: "栏目名", en: "SERIES NAME", ep: "01", topic: "" };
export const EP = SERIES.ep;
export const TOPIC = SERIES.topic;
const NAME = [...SERIES.name];

const CARDS = Array.from({ length: 14 }, (_, i) => ({
  col: i % 3, row: Math.floor(i / 3), hueK: i % 5,
  n: ["10w+", "3.2w", "99+", "1.8w", "5w+"][i % 5], icon: ["heart", "flame", "eye", "thumb-up", "share"][i % 5],
}));

const Gear: React.FC<{ r: number; teeth: number; rot: number; color: string }> = ({ r, teeth, rot, color }) => {
  const pts: string[] = [];
  for (let i = 0; i < teeth * 2; i++) {
    const a = (i / (teeth * 2)) * Math.PI * 2;
    const rr = i % 2 ? r : r + r * 0.22;
    const a0 = a - Math.PI / (teeth * 2) * 0.55, a1 = a + Math.PI / (teeth * 2) * 0.55;
    pts.push(`${Math.cos(a0) * rr} ${Math.sin(a0) * rr}`, `${Math.cos(a1) * rr} ${Math.sin(a1) * rr}`);
  }
  return (
    <g transform={`rotate(${rot})`}>
      <path d={`M${pts.join(" L")} Z`} fill={color} stroke={T.ink} strokeWidth="4" strokeLinejoin="round" />
      <circle r={r * 0.35} fill={T.paper} stroke={T.ink} strokeWidth="4" />
    </g>
  );
};

const CAM: CamKey[] = [{ t: 0, x: 540, y: 600, z: 1 }, { t: 100, x: 540, y: 600, z: 1 }];

const Intro: CustomScene["Comp"] = ({ t: tt, segStart, brand }) => {
  const t = tt - segStart; // 相对时间
  const scroll = tw(t, [[0, 0], [1.0, 980, "out5"]]);
  const lensK = pr(t, 0.3, 0.6, "inOutCubic");
  const LX = 540 + 620 * (1 - lensK), LY = 560, LR = 250;
  const STAMP = 1.0;
  const titleK = t < STAMP ? 0 : Math.min(1, (t - STAMP) / 0.18);
  const titleS = t < STAMP ? 0 : titleK < 1 ? 1.32 - 0.32 * titleK : 1 + wobble(t, STAMP + 0.18, 0.06, 26, 7);
  const shake = wobble(t, STAMP + 0.18, 10, 32, 8);
  const epK = popIn(t, 1.45, 0.35);
  const topicK = pr(t, 1.7, 0.4, "out5");
  const gearRot = t * 90;

  // 卡片流（画两遍：镜片外是卡片，镜片里换成齿轮层）
  const feed = (
    <>
      {CARDS.map((c, i) => {
        const x = 200 + c.col * 340, y = 1500 + c.row * 300 - scroll + (c.col === 1 ? 140 : 0);
        return (
          <div key={i} style={{ position: "absolute", left: x - 140, top: y - 120, width: 280, height: 240, borderRadius: 28, background: T.paper, border: `4px solid ${T.ink}`, boxShadow: "0 8px 0 rgba(59,42,32,0.16)", overflow: "hidden" }}>
            <div style={{ height: 140, background: [T.pink, T.sky, T.gold, T.teal, T.lilac][c.hueK], borderBottom: `4px solid ${T.ink}` }} />
            <div style={{ position: "absolute", left: 18, bottom: 22, display: "flex", alignItems: "center", gap: 8, fontFamily: F.num, fontWeight: 800, fontSize: 34, color: T.ink }}>
              <TablerIcon name={c.icon} size={38} color={T.red} width={2.4} />{c.n}
            </div>
          </div>
        );
      })}
    </>
  );

  return (
    <Stage t={tt} brand={brand} cam={CAM} moves={[]} shake={{ y: shake }}>
      <Wob t={tt}>
        <div style={{ position: "absolute", inset: 0, opacity: 1 - 0.55 * pr(t, STAMP, 0.3) }}>{feed}</div>
      </Wob>
      {/* 放大镜：镜片里是"背后"——齿轮和大脑 */}
      {lensK > 0 ? (
        <div style={{ position: "absolute", left: LX - LR, top: LY - LR, width: LR * 2, height: LR * 2, zIndex: 10, transform: `rotate(${-8 * (1 - lensK)}deg)` }}>
          <div style={{ position: "absolute", inset: 0, borderRadius: "50%", overflow: "hidden", background: "#2F3A4E", border: `10px solid ${T.ink}` }}>
            <svg width={LR * 2} height={LR * 2} viewBox={`${-LR} ${-LR} ${LR * 2} ${LR * 2}`} style={{ position: "absolute" }}>
              <g opacity="0.25" stroke="#8FB3E0" strokeWidth="2">{Array.from({ length: 12 }, (_, i) => <line key={i} x1={-LR} x2={LR} y1={-LR + i * 44} y2={-LR + i * 44} />)}</g>
              <g transform="translate(-80 40)"><Gear r={86} teeth={10} rot={gearRot} color={T.gold} /></g>
              <g transform="translate(112 -40)"><Gear r={58} teeth={8} rot={-gearRot * 1.45 + 11} color={T.teal} /></g>
              <g transform="translate(96 96)"><Gear r={44} teeth={7} rot={-gearRot * 1.9} color={T.pink} /></g>
            </svg>
            <div style={{ position: "absolute", left: LR - 175, top: LR - 200, opacity: pr(t, 0.75, 0.3) }}><TablerIcon name="brain" size={120} color="#FFE9B0" width={1.8} /></div>
          </div>
          {/* 镜框高光 + 手柄 */}
          <svg width={LR * 2 + 300} height={LR * 2 + 300} viewBox={`${-LR} ${-LR} ${LR * 2 + 300} ${LR * 2 + 300}`} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
            <path d={`M${-LR * 0.62} ${-LR * 0.4} A${LR * 0.75} ${LR * 0.75} 0 0 1 ${-LR * 0.2} ${-LR * 0.7}`} stroke="rgba(255,255,255,0.55)" strokeWidth="14" fill="none" strokeLinecap="round" />
            <g transform={`translate(${LR * 0.72} ${LR * 0.72}) rotate(45)`}>
              <rect x="-6" y="-20" width="40" height="40" rx="8" fill="#7C8590" stroke={T.ink} strokeWidth="5" />
              <rect x="30" y="-28" width="190" height="56" rx="26" fill={T.woodDark} stroke={T.ink} strokeWidth="5" />
              <rect x="44" y="-18" width="150" height="10" rx="5" fill="rgba(255,255,255,0.3)" />
            </g>
          </svg>
        </div>
      ) : null}
      {t > 0.85 ? <Emote kind="sparkle" x={LX - LR + 20} y={LY - LR + 30} t={t} at={0.85} s={1.2} z={12} /> : null}

      {/* 大字盖章 */}
      {titleK > 0 ? (
        <div style={{ position: "absolute", left: 540, top: 880, zIndex: 20, transform: `translate(-50%, -50%) scale(${titleS}) rotate(-3deg)`, opacity: Math.min(1, titleK * 1.6) }}>
          <div style={{ position: "relative", padding: "18px 44px 22px", borderRadius: 34, background: T.ink, border: `6px solid ${T.ink}`, boxShadow: "0 14px 0 rgba(59,42,32,0.25)" }}>
            <div style={{ fontFamily: F.cn, fontWeight: 900, fontSize: 150, lineHeight: 1, color: "#FFF6E3", letterSpacing: 10, whiteSpace: "nowrap" }}>
              {NAME.slice(0, Math.ceil(NAME.length / 2)).join("")}<span style={{ color: "#FFD23F" }}>{NAME.slice(Math.ceil(NAME.length / 2)).join("")}</span>
            </div>
            <div style={{ marginTop: 10, textAlign: "center", fontFamily: F.num, fontWeight: 800, fontSize: 24, letterSpacing: 12, color: "rgba(255,246,227,0.55)" }}>{SERIES.en ?? ""}</div>
          </div>
        </div>
      ) : null}
      {epK > 0 ? (
        <div style={{ position: "absolute", left: 840, top: 745, zIndex: 22, transform: `translate(-50%, -50%) scale(${epK}) rotate(8deg)` }}>
          <Label text={`第 ${EP} 期`} color={T.red} fg="#fff" size={44} rot={0} />
        </div>
      ) : null}
      {topicK > 0 && TOPIC ? (
        <div style={{ position: "absolute", left: 540, top: 1050, zIndex: 21, transform: `translate(-50%, -50%) translateY(${30 * (1 - topicK)}px)`, opacity: topicK }}>
          <Label text={TOPIC} color={T.gold} size={46} rot={-1} />
        </div>
      ) : null}
    </Stage>
  );
};

export const scene: CustomScene = {
  Comp: Intro,
  cues: [], // 片头的音效按段落开头算，见下面 cuesAt
};

/** 片头音效：传入段落开头时间 */
export const cuesAt = (s: number): CustomScene["cues"] => [
  { at: s + 0.75, role: "whoosh", vol: 0.5 },  // 放大镜压住画面
  { at: s + 1.18, role: "impact", vol: 0.55 }, // 大字砸下
  { at: s + 1.8, role: "pop", vol: 0.4 },      // 期数 + 题目
];
