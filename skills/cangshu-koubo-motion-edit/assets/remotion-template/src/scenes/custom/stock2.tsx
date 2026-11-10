import React from "react";
import { F } from "../../theme";
import { Camera3D, type CamKey, WordWall, camAt, camVel, orbitAt, popIn, pr, tw, wobble } from "../kit";
import { Chip, Dotted, Figure, L, LuxCard, Micro } from "../lux";
import type { CustomScene } from "./types";

// 样例 · B2（19.05–35.59）—— 主角是同一张"需求单"，所有东西都从它身上来、回到它身上去
// 台词：说白了那就是增删改查 / 加个按钮改个逻辑的事 / 需求本身就这么浅 / 只要驾驶上顶尖的大模型
//       你让一个北大毕业的来写这个代码 和一个中专毕业学了半年Java的程序员来写 / 最后的结果它真能差多少吗
// 链条：数据卡变形成需求单（19.05）→ 增删改查依次点亮 → 鼠标点"增"，按钮飞进表单；点开关改逻辑（21.85–22.45）
//   → 需求单倒成浅盘，水管倒水（22.95–23.9）→ 一人扎下去磕到底，"需求就这么浅"弹出（23.95）
//   → 需求单让到左边，AI 芯片飞来长成机器人，需求单被吸进胸口（25.05–26.35）→ 机器人左边长出对照实验数据卡，讲完缩回（26.35–27.75）
//   → 复制成两份代码飞给北大和中专，逐行同步发亮（28.25 / 30.75）→ 等号冒出（32.55）→ 等号展开成天平，两份代码上秤，晃一下平了（33.2–35.1）；问题牌从支点升起（33.65）
// 联动表：
//   ① 鼠标点"增" → 按钮从工具栏飞进表单；点开关 → 开关拨过去，逻辑改掉
//   ② 人头磕到托盘底 → 星星冒出，"需求就这么浅"从磕底处弹出
//   ③ 胸口的牵引虚线 → 需求单缩小飞进胸口屏幕 → 屏幕里接着显示这张需求单
//   ④ 两份代码逐行同步高亮 → 两份互相靠一下、等号从中间冒出 → 等号变成天平支点，横梁展开
// 跨段照应：真人段的 95% 数据卡变成需求单；第一段的水管来倒水；第一段落水的 AI 芯片飞来长成机器人

const WX = 540, WY = 620, WW = 720, WH = 500; // 需求单中心和尺寸（世界坐标）
const WL = WX - WW / 2, WT = WY - WH / 2;
const TOOLS = [{ cn: "增", en: "ADD", at: 19.75 }, { cn: "删", en: "DEL", at: 19.97 }, { cn: "改", en: "EDIT", at: 20.19 }, { cn: "查", en: "READ", at: 20.41 }];
const chipPos = (i: number) => ({ x: WL + 36 + i * 150 + 65, y: WT + 86 + 27 });
const TOGGLE = { x: WL + WW - 80, y: WT + 300 };
const BTN = { x: WX, y: WT + 410 };
const ADD_AT = 21.85, TOGGLE_AT = 22.45;
const FLAT_AT = 22.95, DIVE_AT = 23.95, UP_AT = 24.95, DOCK_AT = 25.9;
const CARD = { x: 357, y: 400, s: 0.65 }; // 起点往下挪，不压顶部进度条 // 真人段左上角数据卡在 B 段开头对应的世界位置和缩放
const EQ_AT = 32.55;
const ROBOT = { x: 760, y: 600 }; // 机器人在右边长出来、一直待在右边；需求单先让到左边，两者中间留空（穿模修正）
const CHIP_AT = 25.3, GROW_AT = 25.55; // 需求单让开一半以后芯片才飞，芯片落位才长机器人：三件事错开，不在同一处叠
const DIVE_X = 620, POUR_X = 430; // 人跳在托盘右边，水倒在左边，不从水柱里穿过
const LINES = ["btn = Button(\"提交\")", "btn.on_click(save)", "page.add(btn)"];
const CODE = [{ x: 280, y: 790, at: 28.25, title: "北大毕业", en: "TOP UNIVERSITY" }, { x: 800, y: 790, at: 30.75, title: "中专 · 半年 Java", en: "VOCATIONAL · 6 MO" }];
const SCALE_AT = 33.2;

// 镜头：只在句子交界处动，停住时完全静止（对标停留中位 2.1 秒、一次运动 0.6–0.9 秒、以推拉为主）
const MOVES = [22.9, 25.0, 27.8, 33.1];
const CAM: CamKey[] = [
  { t: 19.05, x: 540, y: 640, z: 1.15 },
  { t: 22.9, x: 540, y: 640, z: 1.15 },           // 停：需求单、增删改查、加按钮、改开关
  { t: 23.6, x: 540, y: 700, z: 1.26 },           // 推近：需求单倒下变浅盘
  { t: 25.0, x: 540, y: 700, z: 1.26 },           // 停：扎猛子、磕底、盖章
  { t: 25.8, x: 540, y: 620, z: 0.98 },           // 拉远：机器人来收走需求单
  { t: 27.8, x: 540, y: 620, z: 0.98 },           // 停：数据卡长出、数字跑完、收回
  { t: 28.6, x: 540, y: 690, z: 1.0 },            // 下移：两个人、两份代码
  { t: 33.1, x: 540, y: 690, z: 1.0 },            // 停：两边各写一份，一模一样，等号
  { t: 33.9, x: 540, y: 610, z: 1.0 },            // 上移：把升起的问题牌和天平一起框进来（不推近，两边代码窗贴着安全区）
  { t: 35.59, x: 540, y: 610, z: 1.0 },           // 停：晃一下，平了
];

/** 需求单：工具栏 + 两行 + 加出来的按钮 + 开关 + 倒下后的薄水层 */
const AppWin: React.FC<{ t: number; mini?: boolean; contentOp?: number }> = ({ t, mini, contentOp = 1 }) => {
  const added = pr(t, ADD_AT + 0.3, 0.3, "outBack");
  const tog = pr(t, TOGGLE_AT, 0.25, "outCubic");
  const water = pr(t, 23.45, 0.45); // 水管伸进来以后才有水
  return (
    <div style={{ position: "relative", width: WW, height: WH, borderRadius: 28, background: L.card, border: `1px solid ${L.hair}`, boxShadow: L.shadow, overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, opacity: contentOp }}>
      <div style={{ height: 66, display: "flex", alignItems: "center", gap: 10, padding: "0 26px", borderBottom: `1px solid ${L.hair}` }}>
        {["#FF5F57", "#FEBC2E", "#28C840"].map((c) => <div key={c} style={{ width: 14, height: 14, borderRadius: 7, background: c }} />)}
        <div style={{ marginLeft: 14, fontFamily: F.cn, fontWeight: 600, fontSize: 28, color: L.ink }}>需求单</div>
        <Micro style={{ marginLeft: 12 }}>REQUIREMENTS</Micro>
      </div>
      {/* 工具栏：增删改查 */}
      <div style={{ position: "absolute", left: 36, top: 86, display: "flex", gap: 20 }}>
        {TOOLS.map((k) => {
          const on = pr(t, k.at, 0.18), pulse = t >= k.at ? Math.exp(-(t - k.at) * 6) : 0;
          const clicked = k.cn === "增" && t >= ADD_AT && t < ADD_AT + 0.25;
          return (
            <div key={k.cn} style={{ width: 130, height: 54, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
              background: on > 0.5 ? L.blue : "#F3F5F9", color: on > 0.5 ? "#fff" : L.sub, border: `1px solid ${on > 0.5 ? L.blue : L.hair}`,
              transform: `scale(${1 + pulse * 0.12 - (clicked ? 0.06 : 0)})`, boxShadow: on > 0.5 ? `0 8px 18px -6px ${L.blue}88` : "none" }}>
              <span style={{ fontFamily: F.cn, fontWeight: 700, fontSize: 30 }}>{k.cn}</span>
              <span style={{ fontFamily: L.mono, fontSize: 13, letterSpacing: 2, opacity: 0.75 }}>{k.en}</span>
            </div>
          );
        })}
      </div>
      {/* 表单行 */}
      {[{ y: 170, label: "登录页", en: "LOGIN" }, { y: 260, label: "个人中心", en: "PROFILE" }].map((r, i) => {
        const sweep = TOOLS[3].at + 0.05;
        const hl = t > sweep + i * 0.12 && t < sweep + 0.45 + i * 0.12;
        return (
          <div key={r.label} style={{ position: "absolute", left: 36, right: 36, top: r.y, height: 76, borderRadius: 16, background: hl ? L.blueSoft : "#F7F9FC", border: `1px solid ${L.hair}`, display: "flex", alignItems: "center", padding: "0 24px", gap: 16 }}>
            <div style={{ fontFamily: F.cn, fontWeight: 600, fontSize: 30, color: L.ink }}>{r.label}</div>
            <Micro>{r.en}</Micro>
          </div>
        );
      })}
      {/* 开关：改个逻辑 */}
      <div style={{ position: "absolute", left: WW - 80 - 44, top: 300 - 22, width: 88, height: 44, borderRadius: 22, background: tog > 0.5 ? L.cyan : L.grey2 }}>
        <div style={{ position: "absolute", top: 4, left: 4 + tog * 44, width: 36, height: 36, borderRadius: 18, background: "#fff", boxShadow: "0 2px 6px rgba(15,26,42,0.2)" }} />
      </div>
      {/* 加出来的按钮 */}
      {added > 0 ? (
        <div style={{ position: "absolute", left: WW / 2 - 110, top: 410 - 32, width: 220, height: 64, borderRadius: 18, background: L.blue, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
          fontFamily: F.cn, fontWeight: 600, fontSize: 30, transform: `scale(${added})`, boxShadow: `0 12px 24px -8px ${L.blue}AA` }}>提交<span style={{ fontFamily: L.mono, fontSize: 13, letterSpacing: 2, opacity: 0.8 }}>NEW</span></div>
      ) : null}
      {/* 倒下后：只有薄薄一层水 */}
      {water > 0 && !mini ? (
        <div style={{ position: "absolute", inset: 0, background: `linear-gradient(180deg, rgba(125,182,255,${0.5 * water}), rgba(47,107,255,${0.55 * water}))` }}>
          {[0, 1, 2, 3].map((k) => <div key={k} style={{ position: "absolute", left: 60 + k * 30, right: 60 + (3 - k) * 30, top: 80 + k * 100 + 8 * Math.sin(t * 3 + k), height: 6, borderRadius: 3, background: "rgba(255,255,255,0.35)" }} />)}
        </div>
      ) : null}
      </div>
    </div>
  );
};

/** 大模型机器人：白色圆角机身、深色玻璃面罩、胸口一块屏 */
const Robot: React.FC<{ t: number; screen?: React.ReactNode }> = ({ t, screen }) => {
  const blink = (t % 3.2) < 0.12 ? 0.15 : 1;
  const glow = 0.6 + 0.4 * Math.sin(t * 4);
  return (
    <div style={{ position: "relative", width: 360, height: 480 }}>
      <svg width={360} height={480} viewBox="0 0 360 480" style={{ position: "absolute", overflow: "visible" }}>
        <defs>
          <linearGradient id="rb1" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#FFFFFF" /><stop offset="1" stopColor="#D5DCE7" /></linearGradient>
          <linearGradient id="rb2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#1B2638" /><stop offset="1" stopColor="#0B1220" /></linearGradient>
          <radialGradient id="rb3" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stopColor="#0F1A2A" stopOpacity="0.18" /><stop offset="1" stopColor="#0F1A2A" stopOpacity="0" /></radialGradient>
        </defs>
        <ellipse cx="180" cy="468" rx="150" ry="16" fill="url(#rb3)" />
        <line x1="180" y1="28" x2="180" y2="58" stroke={L.grey3} strokeWidth="5" strokeLinecap="round" />
        <circle cx="180" cy="22" r="10" fill={L.cyan} opacity={glow} />
        <rect x="70" y="56" width="220" height="150" rx="56" fill="url(#rb1)" stroke="rgba(15,26,42,0.10)" />
        <rect x="96" y="92" width="168" height="76" rx="38" fill="url(#rb2)" />
        <rect x="130" y="122" width="34" height={12 * blink} rx="6" fill="#5DF2FF" />
        <rect x="196" y="122" width="34" height={12 * blink} rx="6" fill="#5DF2FF" />
        <path d="M110 100 Q180 86 250 100" fill="none" stroke="#fff" strokeOpacity="0.18" strokeWidth="6" strokeLinecap="round" />
        <rect x="150" y="204" width="60" height="18" rx="6" fill="#E3E8EF" />
        <rect x="40" y="218" width="280" height="230" rx="70" fill="url(#rb1)" stroke="rgba(15,26,42,0.10)" />
        <rect x="14" y="250" width="34" height="120" rx="17" fill="url(#rb1)" stroke="rgba(15,26,42,0.10)" />
        <rect x="312" y="250" width="34" height="120" rx="17" fill="url(#rb1)" stroke="rgba(15,26,42,0.10)" />
        <rect x="90" y="262" width="180" height="128" rx="22" fill="url(#rb2)" />
      </svg>
      {/* 胸口屏幕：HTML，放缩小的需求单 */}
      <div style={{ position: "absolute", left: 90, top: 262, width: 180, height: 128, borderRadius: 22, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>{screen}</div>
    </div>
  );
};

/** 代码小窗：标题写是谁写的 */
const CodeWin: React.FC<{ t: number; at: number; title: string; en: string }> = ({ t, at, title, en }) => (
  // 两份代码在 32.05 起逐行同时发亮：用同步变化说明"写出来的一模一样"
  <div style={{ width: 470, borderRadius: 22, background: L.card, border: `1px solid ${L.hair}`, boxShadow: L.shadow, overflow: "hidden" }}>
    <div style={{ height: 58, display: "flex", alignItems: "center", gap: 10, padding: "0 20px", borderBottom: `1px solid ${L.hair}` }}>
      <div style={{ fontFamily: F.cn, fontWeight: 600, fontSize: 26, color: L.ink }}>{title}</div>
      <Micro size={12}>{en}</Micro>
    </div>
    <div style={{ padding: "14px 20px 18px", fontFamily: L.mono, fontSize: 27 }}>
      {LINES.map((ln, i) => {
        const a = at + 0.25 + i * 0.5, n = t < a ? 0 : Math.floor((t - a) * 26);
        return (
          <div key={i} style={{ height: 40, display: "flex", alignItems: "center", whiteSpace: "pre", color: i === 0 ? "#7B5CFF" : i === 1 ? L.blue : L.ink, borderRadius: 8,
            background: t >= 32.05 + i * 0.15 && t < EQ_AT + 0.6 ? "rgba(18,179,201,0.16)" : "transparent" }}>
            <span style={{ color: L.faint, width: 30, fontSize: 18 }}>{i + 1}</span>{[...ln].slice(0, n).join("")}
            {t >= a && n < [...ln].length ? <span style={{ width: 3, height: 28, background: L.blue, marginLeft: 2 }} /> : null}
          </div>
        );
      })}
    </div>
  </div>
);

const Star: React.FC<{ x: number; y: number; s: number; r: number }> = ({ x, y, s, r }) => (
  <svg style={{ position: "absolute", left: x - 16, top: y - 16, overflow: "visible", transform: `scale(${s}) rotate(${r}deg)` }} width={32} height={32} viewBox="-16 -16 32 32">
    <path d="M0 -14 L4 -4 L14 -4 L6 3 L9 13 L0 7 L-9 13 L-6 3 L-14 -4 L-4 -4 Z" fill={L.gold} stroke="#fff" strokeWidth="2" strokeLinejoin="round" />
  </svg>
);

/** 第一段的那根水管伸进来，往倒下的需求单里倒一层薄水（跨段照应） */
const Pour: React.FC<{ t: number }> = ({ t }) => {
  const inP = pr(t, 23.25, 0.25, "out5"), outP = pr(t, 23.95, 0.3, "inQuad"); // 需求单 23.4 倒平以后才伸进来
  if (inP <= 0 || outP >= 1) return null;
  const dx = -760 * (1 - inP) - 760 * outP;
  const py = 430, mouth = 520;
  const flow = t > 23.45 && t < 23.9;
  const d = `M${-300 + dx} ${py} L${POUR_X - 40 + dx} ${py} Q${POUR_X + dx} ${py} ${POUR_X + dx} ${py + 40} L${POUR_X + dx} ${mouth}`;
  return (
    <svg style={{ position: "absolute", left: 0, top: 0, overflow: "visible", zIndex: 13 }} width={1} height={1}>
      <defs><linearGradient id="p2" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#E9EEF5" /><stop offset="0.45" stopColor="#FFFFFF" /><stop offset="1" stopColor="#C9D2DF" /></linearGradient></defs>
      {flow ? <rect x={POUR_X + dx - 9} y={mouth} width="18" height={130} rx="9" fill="#5AA2FF" opacity="0.9" /> : null}
      <path d={d} fill="none" stroke="rgba(15,26,42,0.10)" strokeWidth="45" strokeLinecap="round" />
      <path d={d} fill="none" stroke="url(#p2)" strokeWidth="42" strokeLinecap="round" />
    </svg>
  );
};

const Stock2: CustomScene["Comp"] = ({ t, brand }) => {
  const cam = camAt(t, CAM);
  const mb = camVel(t, CAM);
  const orb = orbitAt(t, MOVES);
  const sh = wobble(t, DIVE_AT, 9, 36, 8);
  const c2 = { ...cam, y: cam.y + sh };

  // ---- 需求单的状态：长出 → 倒下 → 立回 → 收进机器人 ----
  const morph = pr(t, 19.05, 0.55, "inOutCubic"); // 数据卡 → 需求单
  const born = 1;
  const flat = pr(t, FLAT_AT, 0.45, "inOutCubic") * (1 - pr(t, UP_AT, 0.35, "inOutCubic"));
  const dock = pr(t, DOCK_AT, 0.45, "inOutCubic");
  const grow = pr(t, GROW_AT, 0.35, "outBack"); // AI 芯片落位后长成机器人
  const robotIn = t >= GROW_AT ? 1 : 0;
  const robotPos = {
    x: tw(t, [[27.6, ROBOT.x], [28.0, 540, "inOutCubic"]]),
    y: tw(t, [[27.6, ROBOT.y], [28.0, 390, "inOutCubic"]]), // 不再顶到顶部进度条
    s: tw(t, [[27.6, 1], [28.0, 0.62, "inOutCubic"]]),
  };
  const robotOut = pr(t, SCALE_AT - 0.1, 0.35, "inQuad");
  const chest = { x: robotPos.x, y: robotPos.y + (326 - 240) * robotPos.s }; // 胸口屏中心
  // 立起来时让到左边、缩小，给机器人腾位置；和镜头拉远同步走，镜头还推着的时候不往左挪，否则左边会出画
  const shiftL = pr(t, 25.05, 0.6, "inOutCubic");
  const baseX = CARD.x + (WX - CARD.x) * morph + (330 - WX) * shiftL, baseY = CARD.y + (WY - CARD.y) * morph;
  const winX = baseX + (chest.x - baseX) * dock, winY = baseY + 70 * flat + (chest.y - baseY) * dock;
  const winS = (CARD.s + (1 - CARD.s) * morph) * (1 - 0.4 * shiftL) * (1 - dock * 0.78);
  const showWin = dock < 1;

  // ---- 鼠标 ----
  const cur = {
    x: tw(t, [[21.0, 820], [21.7, chipPos(0).x + 10, "inOutCubic"], [22.0, chipPos(0).x + 10], [22.35, TOGGLE.x + 8, "inOutCubic"], [22.9, TOGGLE.x + 40]]),
    y: tw(t, [[21.0, 960], [21.7, chipPos(0).y + 12, "inOutCubic"], [22.0, chipPos(0).y + 12], [22.35, TOGGLE.y + 10, "inOutCubic"], [22.9, TOGGLE.y + 60]]),
  };
  const curOp = pr(t, 21.0, 0.2) * (1 - pr(t, 22.85, 0.15));
  const press = (t > ADD_AT - 0.05 && t < ADD_AT + 0.12) || (t > TOGGLE_AT - 0.05 && t < TOGGLE_AT + 0.12) ? 0.85 : 1;
  // 按钮从"增"飞进表单
  const fly = pr(t, ADD_AT, 0.32, "inOutCubic");

  // ---- 扎猛子的人 ----
  const fall = pr(t, DIVE_AT - 0.4, 0.4, "inQuad");
  // 起跳点在画面里：镜头这时推到 1.26 倍，倒过来的小人视觉顶端 = diverY − 200，diverY ≥ 500 才不碰顶部进度条
  const diverY = 500 + (620 - 500) * fall;
  const diverOp = pr(t, DIVE_AT - 0.4, 0.1) * (1 - pr(t, 24.75, 0.2));
  const bonk = t >= DIVE_AT ? Math.exp(-(t - DIVE_AT) * 7) : 0;

  // ---- 数据卡：从机器人右边长出来，讲完缩回 ----
  const card = pr(t, 26.35, 0.4, "out5") * (1 - pr(t, 27.45, 0.3, "inOutCubic")); // 需求单收进胸口后，从机器人左边往左长出来，讲完缩回去
  const val = Math.round(55 * pr(t, 26.55, 0.9, "outCubic"));

  // ---- 两份代码：从机器人胸口复制出来 ----
  const toScale = pr(t, SCALE_AT + 0.35, 0.45, "inOutCubic"); // 横梁展开后两份代码才落上去
  const beamG = pr(t, SCALE_AT + 0.2, 0.35, "out5"), standG = pr(t, SCALE_AT + 0.25, 0.35, "out5");
  const tilt = tw(t, [[33.85, 0], [34.2, 9, "outBack"], [34.6, 9], [35.1, 0, "outBack"]]);
  const pivot = { x: 540, y: 660 }, arm = 230; // 缩短横梁：代码窗落上去后不出画
  const pan = (sd: -1 | 1) => ({ x: pivot.x + sd * arm * beamG * Math.cos((tilt * Math.PI) / 180), y: pivot.y - sd * arm * Math.sin((tilt * Math.PI) / 180) + 190 });
  const scaleIn = t >= SCALE_AT + 0.2 ? 1 : 0;

  return (
    <>
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(120% 70% at 50% 28%, #FFFFFF 0%, #F1F4F8 55%, #E3E8EF 100%)" }} />
      <Camera3D t={t} cam={c2} mb={mb} yaw={orb.yaw} pitch={orb.pitch}>
        <div style={{ position: "absolute", inset: 0, filter: "blur(1.4px)", opacity: 0.75 }}><WordWall t={t} brand={brand} kicks={MOVES} /></div>

        {/* 机器人（在需求单后面，等它飞进胸口） */}
        {robotIn > 0 ? (
          <div style={{ position: "absolute", left: robotPos.x - 180, top: robotPos.y - 240, width: 360, height: 480, transform: `scale(${robotPos.s * (0.12 + 0.88 * grow) * (1 - 0.3 * robotOut)})`, opacity: 1 - robotOut, zIndex: 5 }}>
            <Robot t={t} screen={dock >= 1 ? <div style={{ transform: "scale(0.22)", transformOrigin: "50% 50%" }}><AppWin t={t} mini /></div> : null} />
          </div>
        ) : null}

        {/* 需求单 */}
        {showWin && born > 0 ? (
          <div style={{ position: "absolute", left: winX - WW / 2, top: winY - WH / 2, width: WW, height: WH, zIndex: 10, perspective: 1600 }}>
            <div style={{ position: "relative", transform: `scale(${winS}) rotateX(${flat * 68}deg)`, transformOrigin: "50% 50%" }}>
              <AppWin t={t} contentOp={pr(t, 19.3, 0.2)} />
              {t < 19.45 ? (
                <div style={{ position: "absolute", inset: 0, borderRadius: 28, background: "linear-gradient(180deg, rgba(28,32,42,0.97), rgba(14,16,22,0.97))", opacity: 1 - pr(t, 19.2, 0.14), padding: "40px 46px", boxSizing: "border-box" }}>
                  <div style={{ fontFamily: F.cn, fontWeight: 600, fontSize: 52, color: "#fff" }}>互联网业务需求</div>
                  <div style={{ fontFamily: L.num, fontWeight: 700, fontSize: 210, lineHeight: 1, color: "#FFC531", marginTop: 20 }}>95<span style={{ fontSize: 90 }}>%</span></div>
                  <div style={{ fontFamily: L.mono, fontSize: 26, letterSpacing: 5, color: "rgba(255,255,255,0.6)", marginTop: 18 }}>个人判断 · PERSONAL ESTIMATE</div>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        {/* 第一段那根水管伸进来，往倒下的需求单里倒水 */}
        <Pour t={t} />
        {/* AI 芯片飞来，落位后长成机器人 */}
        {t >= CHIP_AT && t < GROW_AT + 0.1 ? (() => {
          const k = pr(t, CHIP_AT, 0.3, "inOutCubic"); // 从右上方飞来，一路都在需求单右边，不从它身上掠过
          return (
            <div style={{ position: "absolute", left: 900 + (ROBOT.x - 900) * k, top: 330 + (ROBOT.y - 40 - 330) * k - 80 * Math.sin(k * Math.PI), transform: "translate(-50%, -50%)", opacity: pr(t, CHIP_AT, 0.06) * (1 - pr(t, GROW_AT + 0.02, 0.08)), zIndex: 16 }}>
              <div style={{ padding: "10px 18px", borderRadius: 14, background: L.cyan, color: "#fff", fontFamily: F.num, fontWeight: 700, fontSize: 34, boxShadow: "0 10px 24px -8px rgba(18,179,201,0.7)" }}>AI</div>
            </div>
          );
        })() : null}
        {/* 胸口射出牵引虚线，把需求单吸进屏幕 */}
        {t >= DOCK_AT - 0.1 && dock < 1 ? <Dotted x1={chest.x} y1={chest.y} x2={winX} y2={winY} t={t} color={L.cyan} /> : null}

        {/* 按钮从工具栏飞进表单（飞行中的那一份） */}
        {fly > 0 && fly < 1 ? (
          <div style={{ position: "absolute", left: chipPos(0).x + (BTN.x - chipPos(0).x) * fly - 65, top: chipPos(0).y + (BTN.y - chipPos(0).y) * fly - 27 - 120 * Math.sin(fly * Math.PI), width: 130, height: 54, borderRadius: 14, background: L.blue, zIndex: 12, opacity: 0.9 }} />
        ) : null}

        {/* 鼠标 */}
        {curOp > 0 ? (
          <svg style={{ position: "absolute", left: cur.x, top: cur.y, overflow: "visible", zIndex: 20, transform: `scale(${press})`, opacity: curOp }} width={1} height={1}>
            <path d="M0 0 L0 38 L10 29 L17 44 L24 41 L17 26 L30 26 Z" fill={L.ink} stroke="#fff" strokeWidth="2.5" strokeLinejoin="round" />
          </svg>
        ) : null}

        {/* 扎猛子 */}
        {diverOp > 0 ? (
          <div style={{ position: "absolute", left: DIVE_X - 63 * 1.3, top: diverY - 110 * 1.3, transform: `rotate(180deg) scaleY(${1 - bonk * 0.25})`, transformOrigin: "50% 30%", opacity: diverOp, zIndex: 14 }}>
            <Figure s={1.3} tone="grey" t={t} seed={9} flail={t > DIVE_AT ? 1 : 0} />
          </div>
        ) : null}
        {t > DIVE_AT && t < 24.9 ? [0, 1, 2].map((k) => {
          const a = t * 5 + (k * Math.PI * 2) / 3;
          return <Star key={k} x={DIVE_X + Math.cos(a) * 70} y={WY + 40 + Math.sin(a) * 20} s={0.9 + 0.3 * bonk} r={t * 200} />;
        }) : null}
        {t >= DIVE_AT + 0.35 ? (
          <div style={{ position: "absolute", left: DIVE_X + (WX - DIVE_X) * pr(t, DIVE_AT + 0.35, 0.3, "out5"), top: 690 + (365 - 690) * pr(t, DIVE_AT + 0.35, 0.3, "out5"), transform: `translate(-50%, -50%) perspective(700px) rotateX(${tw(t, [[DIVE_AT + 0.35, 70], [DIVE_AT + 0.7, 6, "outBack"]])}deg) scale(${(0.3 + 0.7 * pr(t, DIVE_AT + 0.35, 0.3, "out5")) * (1 - pr(t, 24.85, 0.2))})`, zIndex: 30 }}>
            <Chip cn="需求就这么浅" en="SHALLOW BY DESIGN" tone={L.red} size={48} dark />
          </div>
        ) : null}

        {/* 对照实验数据卡 */}
        {card > 0 ? (
          <div style={{ position: "absolute", left: ROBOT.x - 150 - 470, top: 430, transform: `scaleX(${card})`, transformOrigin: "100% 50%", opacity: Math.min(1, card * 2), zIndex: 8 }}>
            <LuxCard w={470} pad={30}>
              <Micro color={L.faint}>CONTROLLED STUDY · 2022</Micro>
              <div style={{ fontFamily: F.cn, fontWeight: 600, fontSize: 30, color: L.ink, marginTop: 10 }}>同一个编程任务</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginTop: 6 }}>
                <span style={{ fontFamily: L.num, fontWeight: 700, fontSize: 96, color: L.blue, letterSpacing: -3, fontVariantNumeric: "tabular-nums" }}>{val}%</span>
                <span style={{ fontFamily: F.cn, fontWeight: 600, fontSize: 30, color: L.blue }}>更快</span>
              </div>
              {[{ l: "用 AI 编程助手", v: "1小时11分", w: 0.44, c: L.blue }, { l: "不用 AI", v: "2小时41分", w: 1, c: L.grey2 }].map((r, i) => (
                <div key={i} style={{ marginTop: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontFamily: F.cn, fontSize: 22, color: L.sub }}><span>{r.l}</span><span style={{ fontFamily: L.num, fontWeight: 600, color: L.ink }}>{r.v}</span></div>
                  <div style={{ height: 10, borderRadius: 5, background: "#EEF1F6", marginTop: 6 }}><div style={{ height: 10, borderRadius: 5, width: `${r.w * 100 * pr(t, 26.55 + i * 0.1, 0.7, "out5")}%`, background: r.c }} /></div>
                </div>
              ))}
              <Micro size={16} style={{ marginTop: 16 }}>海外代码平台对照实验 · 95 名开发者</Micro>
            </LuxCard>
          </div>
        ) : null}

        {/* 两个人 */}
        {[{ x: 280, at: 27.95, tone: "blue" as const }, { x: 800, at: 29.95, tone: "grey" as const }].map((p, i) => {
          const k = popIn(t, p.at, 0.4), out = pr(t, SCALE_AT, 0.35, "inQuad");
          return k > 0 && out < 1 ? (
            <div key={i} style={{ position: "absolute", left: p.x - 63 * 1.9, top: 1010 - 70 * 1.9 + 260 * (1 - k) + 300 * out, opacity: 1 - out, zIndex: 9 }}>
              <Figure s={1.9} tone={p.tone} t={t} seed={20 + i} />
            </div>
          ) : null;
        })}
        {/* 代码窗：从机器人胸口飞出来，最后落到天平上 */}
        {CODE.map((c, i) => {
          const k = pr(t, c.at, 0.45, "out5");
          if (k <= 0) return null;
          const pp = pan(i === 0 ? -1 : 1);
          const tx = c.x + (pp.x - c.x) * toScale, ty = c.y + (pp.y - 85 - c.y) * toScale;
          const nudge = (i === 0 ? 1 : -1) * 22 * (pr(t, EQ_AT - 0.1, 0.12) - pr(t, EQ_AT + 0.15, 0.25)); // 两份代码互相靠一下，等号从中间冒出来
          const x = chest.x + (tx - chest.x) * k + nudge, y = chest.y + (ty - chest.y) * k;
          const s = (0.2 + 0.8 * k) * (1 - 0.42 * toScale);
          return (
            <React.Fragment key={i}>
              {toScale === 0 && k >= 1 ? <Dotted x1={chest.x} y1={chest.y} x2={c.x} y2={c.y - 125} t={t} /> : null}
              <div style={{ position: "absolute", left: x - 235, top: y - 110, transform: `scale(${s})`, zIndex: 11 }}><CodeWin t={t} at={c.at} title={c.title} en={c.en} /></div>
            </React.Fragment>
          );
        })}
        {t >= EQ_AT && t < SCALE_AT + 0.35 ? (() => {
          const m = pr(t, SCALE_AT, 0.3, "inOutCubic"); // 等号移到支点，变成天平的轴
          return (
            <div style={{ position: "absolute", left: 540 - 44, top: 790 + (pivot.y - 790) * m - 44, width: 88, height: 88, borderRadius: 44, background: m > 0.6 ? L.gold : L.cyan, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
              fontFamily: L.num, fontWeight: 700, fontSize: 60, transform: `scale(${popIn(t, EQ_AT, 0.4) * (1 - 0.5 * m)})`, boxShadow: `0 12px 26px -8px ${L.cyan}`, zIndex: 12 }}>=</div>
          );
        })() : null}

        {/* 天平 */}
        {scaleIn > 0 ? (
          <svg style={{ position: "absolute", left: 0, top: 0, overflow: "visible", zIndex: 7, opacity: scaleIn }} width={1} height={1}>
            <defs><linearGradient id="sc1" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#F4F7FB" /><stop offset="0.5" stopColor="#FFFFFF" /><stop offset="1" stopColor="#C9D2DF" /></linearGradient></defs>
            <g>
              <ellipse cx={540} cy={1010} rx={170} ry={18} fill="rgba(15,26,42,0.08)" opacity={standG} />
              <rect x={505} y={985} width={70} height={22} rx={8} fill="url(#sc1)" stroke="rgba(15,26,42,0.12)" opacity={standG} />
              <rect x={524} y={pivot.y} width={32} height={330 * standG} rx={14} fill="url(#sc1)" stroke="rgba(15,26,42,0.12)" />
              <g transform={`rotate(${-tilt} ${pivot.x} ${pivot.y}) translate(${pivot.x} ${pivot.y}) scale(${Math.max(0.001, beamG)} 1) translate(${-pivot.x} ${-pivot.y})`}>
                <rect x={pivot.x - arm - 14} y={pivot.y - 12} width={2 * arm + 28} height={24} rx={12} fill="url(#sc1)" stroke="rgba(15,26,42,0.12)" />
              </g>
              <circle cx={pivot.x} cy={pivot.y} r={22} fill={L.gold} stroke="#fff" strokeWidth="3" />
              {([-1, 1] as const).map((sd) => {
                const ex = pivot.x + sd * arm * beamG * Math.cos((tilt * Math.PI) / 180), ey = pivot.y + sd * -arm * Math.sin((tilt * Math.PI) / 180);
                return (
                  <g key={sd} opacity={pr(t, SCALE_AT + 0.4, 0.2)}>
                    <line x1={ex} y1={ey} x2={ex - 110} y2={ey + 190} stroke={L.grey3} strokeWidth="3" />
                    <line x1={ex} y1={ey} x2={ex + 110} y2={ey + 190} stroke={L.grey3} strokeWidth="2" />
                    <path d={`M${ex - 130} ${ey + 190} Q${ex} ${ey + 236} ${ex + 130} ${ey + 190} Z`} fill="url(#sc1)" stroke="rgba(15,26,42,0.14)" />
                  </g>
                );
              })}
            </g>
          </svg>
        ) : null}
        {t >= 33.65 ? (
          <div style={{ position: "absolute", left: 540, top: pivot.y - 40 + (330 - pivot.y + 40) * pr(t, 33.65, 0.4, "out5"), transform: `translate(-50%, -50%) scale(${0.3 + 0.7 * pr(t, 33.65, 0.4, "outBack")})`, zIndex: 30 }}>
            <div style={{ transformOrigin: "50% -80px", transform: `perspective(900px) rotateX(${tw(t, [[33.3, -80], [33.75, 0, "outBack"]])}deg) rotateZ(${wobble(t, 33.6, 6, 9, 2.5)}deg)` }}>
              <Chip cn="结果真能差多少？" en="SAME TASK · SAME OUTPUT?" tone={L.red} size={48} dark />
            </div>
          </div>
        ) : null}
      </Camera3D>
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", background: "radial-gradient(140% 90% at 50% 40%, rgba(255,255,255,0) 60%, rgba(15,26,42,0.06) 100%)" }} />
    </>
  );
};

// 音效：只放在关键的联动时刻（太密就是污染）。全段 7 个；"需求就这么浅"弹出离磕底只有 0.4 秒，不再单独配音（两个音至少隔 0.5 秒）
export const scene: CustomScene = {
  Comp: Stock2,
  cues: [
    { at: ADD_AT, role: "click", vol: 0.5, v: 0 },    // 点"增"：鼠标声
    { at: DIVE_AT, role: "impact", vol: 0.5 },        // 头磕到底
    { at: CHIP_AT, role: "whoosh", vol: 0.5 },        // AI 芯片飞来（镜头同时在拉远）
    { at: 28.3, role: "swoosh", vol: 0.5 },           // 代码飞出
    { at: EQ_AT, role: "ding", vol: 0.45 },           // 等号
    { at: SCALE_AT + 0.3, role: "whoosh", vol: 0.45 }, // 等号展开成天平
    { at: 34.2, role: "click", vol: 0.5, v: 1 },      // 天平晃：开关声
  ],
};
