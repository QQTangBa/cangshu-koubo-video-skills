# 手写场景写法（图形段超过 6 秒都用它）

每个图形段一个 React 组件，把每个元素"什么时候、从哪到哪、什么曲线"写死。照着模板里的两个样例改最快：`src/scenes/custom/stock1.tsx`（水箱）和 `stock2.tsx`（需求单）。

目录
1. 文件和登记
2. 文件头：主角 + 联动表
3. 坐标、镜头和 3D
4. 画元素：kit、lux 和 toon
5. 不穿模、不越界
6. 音效提示 cues
7. 样例拆解
8. 写完自查

## 1. 文件和登记

- plan 里只写名字：`{ "world": "B", "start": 5.95, "end": 15.71, "scene": { "layout": "custom", "name": "stock1" } }`。
- 组件写在 `src/scenes/custom/<name>.tsx`，导出 `export const scene: CustomScene = { Comp, cues }`，再到 `custom/index.ts` 里 import 并加进 `CUSTOM`。
- `Comp` 拿到 `{ t, segStart, brand }`，`t` 是成片时间线上的绝对秒数，所有关键帧直接写绝对时间（取自 words.json）。
- 场景文件写在工程里；觉得能复用的再拷回 `$SK/assets/remotion-template/src/scenes/custom/`。

## 2. 文件头：主角 + 联动表

先写注释再写代码：

```
// <稿件> · B<n>（起–止）—— 主角是___，所有东西都从它身上来、回到它身上去
// 台词：……
// 链条：状态 1 →（触发词 秒）状态 2 → …
// 联动表：
//   ① ___ 变 → ___ 跟着变（秒）
//   ② …
//   ③ …
// 跨段照应：上一段 / 真人段的___在这里变成___
```

要求：至少 3 条状态联动链；主元素写清"从谁身上来 / 被谁引起 / 到哪去"；小件可以原地出现，但要挂在某个元素上；跨段或跨世界至少照应 1 处。原理见 style-bible 第 5 节。

## 3. 坐标、镜头和 3D

- 世界坐标就是 1080×1440 的画布坐标，可以超出画面（镜头推拉过去看）。镜头把世界点 (cam.x, cam.y) 放到屏幕 (540, 600)：屏幕 x = 540 + (世界 x − cam.x) × z，屏幕 y = 600 + (世界 y − cam.y) × z。
- `MOVES` 列每次镜头运动的开始时刻；`CAM` 是关键帧 `{ t, x, y, z }`。停留段前后两个关键帧写成一样（完全静止，中位 ≥2 秒、最短 1.4 秒）；运动段 0.6–0.9 秒，多数是推拉（z 变 10–35%），也可以是平移；默认 smootherstep 缓动，推拉自动走对数插值。
- 骨架：

```tsx
const MOVES = [9.0, 12.0];
const CAM: CamKey[] = [
  { t: 5.95, x: 540, y: 690, z: 1.0 },
  { t: 9.0, x: 540, y: 690, z: 1.0 },   // 停：……
  { t: 9.8, x: 540, y: 690, z: 1.3 },   // 推近：……
  { t: 12.0, x: 540, y: 690, z: 1.3 },  // 停：……
];
const Scene: CustomScene["Comp"] = ({ t, brand }) => {
  const cam = camAt(t, CAM), mb = camVel(t, CAM), orb = orbitAt(t, MOVES);
  const c2 = { ...cam, y: cam.y + wobble(t, 11.05, 6, 40, 9) }; // 重音轻震，可选
  return (
    <>
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(120% 70% at 50% 28%, #FFFFFF 0%, #F1F4F8 55%, #E3E8EF 100%)" }} />
      <Camera3D t={t} cam={c2} mb={mb} yaw={orb.yaw} pitch={orb.pitch}>
        <div style={{ position: "absolute", inset: 0, filter: "blur(1.4px)", opacity: 0.75 }}><WordWall t={t} brand={brand} kicks={MOVES} /></div>
        {/* 元素，按世界坐标摆 */}
      </Camera3D>
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", background: "radial-gradient(140% 90% at 50% 40%, rgba(255,255,255,0) 60%, rgba(15,26,42,0.06) 100%)" }} />
    </>
  );
};
```

- `orbitAt` 的默认角度已按对标实测标定，不要改符号；`camVel` 给甩镜头加定向运动模糊。

## 4. 画元素：kit、lux 和 toon

- `scenes/kit.tsx`：`tw(t, [[t0, v0], [t1, v1, "out5"], …])` 关键帧插值；`pr(t, at, dur, ease)` 0→1 进度；`popIn` 带过冲的弹出；`land` 落地回弹；`wobble` 衰减摆动（跟随动作）；`Tilt` 立体倾斜（只救平画面）；`Put` 按中心点摆东西；`SAFE_Y` 安全区；缓动名见 `ease`（smooth、out5、outBack、outCubic、inOutCubic、inQuad…）。
- `scenes/lux.tsx`：色板 `L`（ink、sub、faint、hair、card、blue、cyan、gold、red、grey1–3、shadow、shadowSm、mono、num）；`Chip`（中文 + 极小英文的标签，可 dark、可 strike 划掉）；`Micro`（等宽大写小字）；`LuxCard`（白卡）；`Figure`（胶囊小人，可套机甲 mech、戴皇冠 crown、挣扎 flail）；`Dotted`（会流动的虚线，牵引、视线、连线都用它）。
- 道具自己画：HTML + SVG，渐变和高光，1px 细边，柔和投影；文字用 HTML（Chip、Micro、div），不要画在 SVG 里。
- 图标：`TablerIcon`（`scenes/props.tsx` 导出，5184 个，名字查 `src/icons.json`）。
- **动画片画风和其余 8 套主题**用 `scenes/custom/toon.tsx`（样例 `custom/toon_panel_example.tsx`）：
  - 场景外面包 `<Stage t brand cam moves shake?>`：纸底 / 主题背景、手抖滤镜、3D 镜头、品牌字墙（`meta.wall`）、主题质感都在里面，场景只管摆元素；要手抖的元素包 `<Wob t>`。
  - 人物 `Kid`（look 换装、mood 表情、pose 手势、`talk={talkAt(t, 起, 止)}` 嘴型跟口播的字、`walk` 走路、`squash` 压扁）；`Emote` 漫画小符号、`Say` 气泡、`Label` 纸片标签、`Dust` 落地扬尘、`Stamp` 勾叉章、`Finger` 手指、`Lectern` `Phone` `Vid` `Gem` `Bulb` `Crown` `Block` `Sofa` `BatteryBuddy` `Weight` `Dial` `Thermo`、`arc` / `hop` 轨迹。
  - `lbkit.tsx` 是更多现成道具：控制感罐 `Jar`（液面、裂缝、漏液、发光）、大水桶 `Jug`、`Dumbbell`、饮料瓶 `Drink`、旋钮 `Knob`（可上锁）、小狗 `Dog`、`Bolt`、彩票 `Ticket`、噪点图 `Noise`（可描出形状）、`Coin` `Record` `Calendar` `Piano` `Note` `Grid10`。
  - **颜色只用 `T.*`**（主题会改它们）：`T.ink` 描边和卡片上的字，`T.paper` 卡片底，`T.onBg` / `T.onBgSoft` 直接写在背景上的字和线（深色主题里是浅色），`T.ground` 地面，`T.panel` `T.knob` 等是面板类道具的底色。写死的米黄、深棕在深色主题里会出事。
  - **推荐默认（`style: "wall"`，可选 `meta.qkid`）**：卡片边框用 `T.line`、投影用 `T.shadow`（wall 主题里是产品界面式的细边框和柔和长投影，别的主题仍是卡通描边），`Label` 在 wall 主题自动变成胶囊。配了角色精灵图（使用者自备透明 PNG 放进 `public/ipq/`、尺寸登记到 `scenes/custom/ipq.json`）并开 `meta.qkid` 时，`Kid` 自动换成精灵图（`qkid.tsx`），加 `crop="head"` 只露头、`crop="bust"` 只露半身——小人是配角，多用头和半身；没配就用代码画的 `Kid`。产品界面式道具在 `scenes/custom/ep.tsx`：`Doc`（带标题栏三个小圆点的窗口）、`PriceTag`（定价卡）、`Ledger`（数据卡）、`Order`（任务卡）、`Chip`、`YearDial`、`Stall`（摊位）、`Desk`、`Clock`，常量 `CARD` / `MONO`。
  - 第一个元素从 `contentStart(seg)`（`src/timing.ts`）以后出：拆景 1.0 秒、淡出 0.75 秒、变身 1.2 秒，前面是切镜动画；右下角有抠像（host corner）时右下约 400×500 留空，有圆球时圆球那块留空。
  - 段内多画布和真图：`scenes/custom/real.tsx` 的 `Block`（一块内容的局部坐标容器，dx / dy 偏移）、`RealImg`（铺满的真图）、`RevealImg`（从上往下一行行亮的真图，跟着干活进度走）、`AiTag`（「AI 生成」角标）；块之间推镜的场景 `Stage` 加 `blurK={0.3}`，块离得远、超出字墙范围时加 `wallArea`。什么时候拆块见 style-bible 第 6 节。
  - 变身段（host morph，只在配了角色精灵图时可用）里主角小人在进场变身那几帧会被自动藏起来（`morphState.ts`），由 Film 画替身；`hostPath` 的坐标要等于场景里小人头在屏幕上的位置（含镜头推拉），对不准就会跳一下，渲静帧核。
  - 一个场景拆成两段 B（中间插一句真人）时，两段写同一个名字、同一个组件，时间都按绝对秒写；音效只出本段里的 cue。
- 物件（食物、家具、文具这类）用 `custom/objs.tsx` 的 `Obj`（代码画的扁平矢量，`<Obj name="burger" s={120} />`），缺的直接加；不用生图物件。
- `props.tsx` 的卡通道具和 board 的 `CardView` 只用于草稿，成片按定好的画风重画（白卡用 lux，其余用 toon + 主题）。

## 5. 不穿模、不越界

这几条来自一次逐帧排查"穿模、穿边界"时查出的 15 处问题，写场景时就按它摆：

1. **整条运动路径都在安全区里**，不只看落位那一帧：屏幕 y 在 110–1090，屏幕 x 在 40–1040。镜头推近时同一个世界位置会被推出画；元素往边上挪要和镜头拉远同步走（需求单左移跟着拉远，最左边仍离画框 86px）。旋转、翻转过的元素按转完的外框算（倒立的小人视觉顶端比盒子高出一截）。
2. **不穿顶部进度条**（屏幕 y 30–74）：从上方来的元素在进度条下面淡入再动；退场往左右滑出或原地淡出缩小，不往上飞出画。
3. **两个不透明元素不互相穿过**：路径会交叉就错开时间（一个先让开，另一个再走），或改走两侧，或定好前后层（zIndex，前面的完整画在上面）。同一处的几个动作排队来：先让开 → 再飞来 → 再长出 → 最后吸进去。"被吸进去、装进去"是剧情，接触前要缩到目标大小。
4. **连接物只画到接触面**：管子、水流、光束不伸进玻璃或卡片里，容器里面的那一截单独画在容器层里。
5. **变形时两层字不叠**：一张卡变成另一张卡，旧字 0.15 秒内淡掉，新字等形状变完再出。真人段同理：导航卡收完再出左上的卡。
6. **大件留出余量**：放大、横梁展开、两边对称的卡片，按最大时的尺寸算会不会出画（天平横梁从 300 缩到 230 才装得下两边代码窗）。

渲完用 `render_final.py` 出的分镜拼图逐张查（SKILL 第 9 步）。

## 6. 音效提示 cues

```tsx
export const scene: CustomScene = {
  Comp: Stock1,
  cues: [
    { at: 7.45, role: "click", vol: 0.5, v: 1 },   // 关阀门：开关声
    { at: AI_HIT, role: "splash", vol: 0.5 },      // AI 芯片落水
    { at: 11.05, role: "impact", vol: 0.5 },       // 挤到溢出
  ],
};
```

- 只给关键联动时刻配（元素互相作用、镜头大移动、关键揭示），图形段每秒 0.3–0.7 个，`at` 写动作落位那一刻（音效最响的点会自动对上）。
- 两个音效至少隔 0.5 秒；更近的会被自动丢掉，干脆别写。
- `vol` 默认 0.5（音效已按短时峰值对齐，0.5 约比人声中位低 3dB）；`v` 指定用清单里第几个变体（click 0 = 鼠标、1 = 开关），不写就轮换。角色和素材见 style-bible 第 10 节。
- 不要用 `{ prop: … }` 自动配，它会给道具的每个小动作都配一下，太密。

## 7. 样例拆解

**stock1 · 一个水箱（9.8 秒，镜头 2 次运动）**
- 链条：真人段"增量时代"标签飞到阀门旁 → 注水 → 阀门一关、"增量"划掉翻成"存量" → 人追着打转、漩涡中心冒出"内卷" → AI 芯片落水、波纹扫到谁谁套机甲 → 机甲挤得水溢出 → 塔从芯片沉下的地方长出、塔身伸出"大模型""算法" → 塔顶光束吸上去一人、皇冠从"顶尖人才"标签飞到他头上，另一人爬到一半滑落。
- 联动：阀门 ↔ 水柱和标签；波纹 ↔ 机甲（按到波纹中心的距离依次套上）；芯片落点 ↔ 塔的生长点；标签 ↔ 皇冠。
- 镜头：停（注水到内卷）→ 推近水面 → 停（套机甲、溢出）→ 拉远上摇看塔 → 停。

**stock2 · 一张需求单（16.5 秒，镜头 4 次运动）**
- 链条：真人段的 95% 数据卡直接变形成需求单 → 增删改查依次点亮 → 鼠标点"增"，按钮飞进表单；点开关改逻辑 → 需求单倒成浅盘，第一段的水管伸进来倒水 → 一人扎下去头磕到底，"需求就这么浅"从磕底处弹出 → 需求单让到左边，AI 芯片飞来长成机器人，胸口牵引线把需求单吸进屏幕 → 机器人左边长出对照实验数据卡，讲完缩回 → 机器人把需求单复制成两份代码飞给北大和中专，两份逐行同步发亮 → 等号从中间冒出 → 等号展开成天平横梁，两份代码上秤，晃一下平了 → 问题牌从支点升起。
- 跨段照应：真人段数据卡、第一段的水管和 AI 芯片。

## 8. 写完自查

```bash
cd <工程> && npx tsc --noEmit -p .
bash $SK/scripts/stills.sh <工程> <名字> <秒> <秒>
```

每个镜头落位后、每次元素交接时各取一帧先看；整段的动态在 `render_final.py` 的分镜拼图里查。
