import React from "react";
import { F } from "../../theme";
import { type CamKey, popIn, pr, tw } from "../kit";
import { TablerIcon } from "../props";
import { Emote, Finger, Label, Stage, T, TH, Wob } from "./toon";
import { Jar, Knob } from "./lbkit";
import type { CustomScene } from "./types";

// 动画片画风样例（样例 panel，37.54–48.62；只作写法参考，没登记）—— 主角是一块"人生控制面板"，四个旋钮；右边是全片贯穿的"控制感罐"
// 台词：你想想工资涨不涨 你说了不算 今年这个是不是裁员轮到你 你说了也不算吧
//       但是今天是不是要去锻炼 今天是不是要买一桶大水自己喝了 这个东西你说了肯定算
// 链条：面板升起，"工资"旋钮亮（38.34）→ 手去拧，拧不动，铁链锁头弹出、盖"说了不算"（39.66）
//   → "裁员"旋钮自己乱转（41.10），手一碰就锁死、再盖"不算"（42.5）
//   → 镜头下移到下排（42.9）："锻炼"旋钮一拧就转（44.2），金色液体顺管子流进控制感罐
//   → "大水"旋钮也转（45.74），罐子再涨 → 拉远看全貌，罐子亮、盖"说了肯定算"（47.54）
// 联动表：
//   ① 手拧 ↔ 旋钮（锁住的只抖，不锁的跟着转、刻度变绿）
//   ② 下排旋钮转 ↔ 管子里流光 ↔ 罐子液面上涨
//   ③ 罐子满 ↔ 发光 + 标签"控制感"弹出（给下一句"这个东西叫控制感"铺垫）
// 跨段照应：控制感罐在 jars / recap 段继续当主角

const K = [
  { x: 240, y: 500, label: "工资", icon: "cash", lock: true, at: 38.34, try: 38.74, no: 39.66 },
  { x: 560, y: 500, label: "裁员", icon: "user-x", lock: true, at: 41.1, try: 41.6, no: 42.5 },
  { x: 240, y: 800, label: "锻炼", icon: "barbell", lock: false, at: 44.2, try: 44.2, no: 0 },
  { x: 560, y: 800, label: "大水", icon: "droplet", lock: false, at: 45.74, try: 45.74, no: 0 },
];
const JAR = { x: 880, y: 640, w: 220, h: 300 };
const YES = 47.54;
const MOVES = [42.9];
const CAM: CamKey[] = [
  { t: 37.54, x: 400, y: 520, z: 1.35 },
  { t: 42.9, x: 400, y: 520, z: 1.35 },  // 停：上排两个锁死的
  { t: 43.7, x: 545, y: 610, z: 1.05 },  // 拉远：整块面板 + 罐子
  { t: 48.62, x: 545, y: 610, z: 1.05 },
];

const Panel: CustomScene["Comp"] = ({ t, brand }) => {
  const up = pr(t, 37.54, 0.5, "outBack");
  const lvl = tw(t, [[44.3, 0.08], [45.3, 0.42, "inOutCubic"], [45.8, 0.42], [46.9, 0.88, "inOutCubic"]]);
  const glow = pr(t, YES - 0.2, 0.4);
  const jarIn = popIn(t, 43.75, 0.4);

  return (
    <Stage t={t} brand={brand} cam={CAM} moves={MOVES}>
      <Wob t={t}>
        {/* 面板 */}
        <div style={{ position: "absolute", left: 70, top: 300 + 120 * (1 - up), width: 660, height: 700, borderRadius: TH.name === "news" ? 12 : 44, background: T.panel, border: `${TH.sw * 1.5}px solid ${T.ink}`, boxShadow: "0 14px 0 rgba(59,42,32,0.2)", opacity: Math.min(1, up * 2) }}>
          <div style={{ position: "absolute", left: 24, right: 24, top: 18, height: 48, borderRadius: 16, background: T.panelHead, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: F.cn, fontWeight: 700, fontSize: 30, color: T.panelHeadText, letterSpacing: 6 }}>能掌控的事</div>
          {[0, 1, 2, 3].map((i) => <div key={i} style={{ position: "absolute", left: 14 + (i % 2) * 610, top: 14 + Math.floor(i / 2) * 650, width: 22, height: 22, borderRadius: 11, background: T.woodDark, border: `3px solid ${T.ink}` }} />)}
        </div>
        {/* 罐子 */}
        {jarIn > 0 ? <div style={{ position: "absolute", left: JAR.x - JAR.w / 2, top: JAR.y - JAR.h / 2, transform: `scale(${jarIn})`, transformOrigin: "50% 100%" }}>
          <Jar w={JAR.w} h={JAR.h} level={lvl} t={t} glow={glow} label={t > 46.82 ? "控制感" : undefined} />
        </div> : null}
      </Wob>

      {/* 下排旋钮 → 罐子的管子（只画到罐壁） */}
      {jarIn > 0 ? (
        <svg style={{ position: "absolute", left: 0, top: 0, overflow: "visible", zIndex: 5 }} width={1} height={1}>
          {[{ x: 340, y: 880, on: 44.3 }, { x: 660, y: 880, on: 45.8 }].map((p, i) => {
            const d = i === 0 ? `M${p.x} ${p.y} C${p.x} 960 700 960 ${JAR.x - JAR.w / 2 + 16} ${JAR.y + 100}` : `M${p.x} ${p.y} C${p.x} 920 740 900 ${JAR.x - JAR.w / 2 + 16} ${JAR.y + 60}`;
            const flow = t > p.on && t < p.on + 1.1;
            return <g key={i}>
              <path d={d} stroke={T.ink} strokeWidth="18" fill="none" strokeLinecap="round" />
              <path d={d} stroke={T.paper} strokeWidth="11" fill="none" strokeLinecap="round" />
              {flow ? <path d={d} stroke={T.gold} strokeWidth="9" fill="none" strokeLinecap="round" strokeDasharray="22 18" strokeDashoffset={-t * 220} /> : null}
            </g>;
          })}
        </svg>
      ) : null}

      {/* 四个旋钮 */}
      {K.map((k, i) => {
        const on = popIn(t, k.at - 0.45, 0.35);
        if (on <= 0) return null;
        const locked = k.lock ? pr(t, k.try + 0.35, 0.25) : 0;
        const shake = k.lock && t > k.try && t < k.try + 1.0 ? Math.sin((t - k.try) * 40) * 6 * (1 - (t - k.try)) : 0;
        const spin = k.label === "裁员" && t > k.at - 0.4 && t < k.try ? 0.5 + 0.45 * Math.sin((t - k.at) * 9) : null;
        const v = k.lock ? (spin ?? 0.15) : tw(t, [[k.at, 0.12], [k.at + 0.8, 0.92, "inOutCubic"]]);
        const handK = k.lock ? pr(t, k.try - 0.35, 0.3) * (1 - pr(t, k.no + 0.3, 0.3)) : pr(t, k.at - 0.35, 0.3) * (1 - pr(t, k.at + 1.1, 0.3));
        const handRot = k.lock ? shake * 1.5 : -30 + 60 * (v - 0.12);
        return (
          <React.Fragment key={i}>
            <Wob t={t}>
              <div style={{ position: "absolute", left: k.x - 120, top: k.y - 120, width: 240, height: 240, transform: `scale(${on})` }}>
                <Knob size={240} v={v} locked={locked} tone={k.lock ? T.red : T.teal} shake={shake} />
              </div>
              <div style={{ position: "absolute", left: k.x, top: k.y + 148, transform: `translate(-50%,-50%) scale(${on})`, display: "flex", alignItems: "center", gap: 8, padding: "4px 16px", borderRadius: 14, background: T.paper, border: `3px solid ${T.ink}`, fontFamily: F.cn, fontWeight: 700, fontSize: 34, color: T.ink }}>
                <TablerIcon name={k.icon} size={34} color={k.lock ? T.red : T.teal} width={2.4} />{k.label}
              </div>
            </Wob>
            {handK > 0 ? <div style={{ position: "absolute", left: k.x + 40 + 200 * (1 - handK), top: k.y + 10 + 120 * (1 - handK), transform: `rotate(${-35 + handRot}deg)`, transformOrigin: "0 0", zIndex: 15, opacity: Math.min(1, handK * 2) }}><Finger s={0.9} /></div> : null}
            {k.lock && t > k.no ? <div style={{ position: "absolute", left: k.x, top: k.y + 10, transform: `translate(-50%,-50%) scale(${popIn(t, k.no, 0.3)}) rotate(-12deg)`, zIndex: 20 }}><Label text={i === 0 ? "说了不算" : "也不算"} color={T.red} fg="#fff" size={46} rot={0} /></div> : null}
          </React.Fragment>
        );
      })}
      {t > 41.6 && t < 42.8 ? <Emote kind="sweat" x={K[1].x + 90} y={K[1].y - 110} t={t} at={41.6} s={1.2} z={21} /> : null}

      {/* 说了肯定算 */}
      {t > YES ? <div style={{ position: "absolute", left: 400, top: 1062, transform: `translate(-50%,-50%) scale(${popIn(t, YES, 0.35)}) rotate(-4deg)`, zIndex: 22 }}><Label text="✓ 说了肯定算" color={T.teal} fg="#fff" size={52} rot={0} /></div> : null}
      {t > YES + 0.1 ? <Emote kind="sparkle" x={JAR.x + 100} y={JAR.y - 190} t={t} at={YES + 0.1} s={1.3} /> : null}
    </Stage>
  );
};

export const scene: CustomScene = {
  Comp: Panel,
  cues: [
    { at: 39.55, role: "impact", vol: 0.4 },  // 工资锁死
    { at: 41.95, role: "impact", vol: 0.4 },  // 裁员锁死
    { at: 44.3, role: "click", vol: 0.45, v: 1 }, // 锻炼拧开
    { at: 45.8, role: "splash", vol: 0.4 },   // 大水流进罐子
    { at: YES, role: "ding", vol: 0.45 },     // 肯定算
  ],
};
