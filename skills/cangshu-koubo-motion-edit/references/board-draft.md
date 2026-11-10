# 草稿工具：board 画板和卡通道具

只用来快速出草稿、对时间轴。成片里超过 6 秒的图形段一律写手写场景（`scene-guide.md`）：board 自动排版会让位置错乱、画面像翻 PPT，卡通道具的粗描边也不符合 lux 画风。用户只要一版粗剪看节奏时才用这里的东西。

## board 画板

一个 B 段就是一块大画板：卡片跨拍保留，每拍声明"显示哪些卡、什么布局、在哪块区域"，引擎自动让位、重排、连线、镜头跟随。plan 里写 `"scene": { "layout": "board", … }`。

```json
{ "layout": "board",
  "cards": [ { "id": "era", "kind": "text", "title": "存量内卷时代", "sub": "增量 → 存量", "icon": "chart", "tone": "red", "tags": ["工资越开越高"] },
             { "id": "so", "kind": "data", "title": "开发者里用上 AI 工具的", "meta": "已在用 + 打算用", "value": 76, "unit": "%", "at": 9.55,
               "rows": [{ "label": "已经在用", "value": "62%" }], "foot": "海外开发者社区年度调查 2024" } ],
  "steps": [
    { "at": 5.95, "layout": "hero", "show": ["era"] },
    { "at": 9.3, "layout": "column", "show": ["era", "so"], "enter": { "so": { "type": "grow", "from": "era" } } },
    { "at": 11.05, "layout": "column", "show": ["era", "so"], "camera": { "zoom": 1.1, "target": "so" } },
    { "at": 12.0, "layout": "column", "show": ["model"], "region": [1, 0] } ] }
```

**每拍（step）字段**
- `show`：这一拍在场的卡，顺序就是排列顺序。上一拍在、这一拍也在的卡会飞到新位置；新卡进场；不在 show 里的卡，同一区域内淡出，换了区域就留在原地（镜头一走自然出画，之后再出现会从原地飞回来）。
- `layout`：hero 单卡（小卡最大放大 1.6 倍）/ column 竖列 / chain 竖向链（自动连箭头）/ row 横排（≤3）/ grid 2 列 / focus 主卡在下、其余缩成顶部小卡 / tree 根在上、子节点竖排、左侧主干连线 / orbit 环绕。
- `region`：[x, y]，以屏幕为单位（[1,0]=右边一屏）。**不写就沿用上一拍**。区域一变镜头就移过去，距离超过约 0.8 屏自动甩镜（带运动模糊）。
- `camera`：`zoom`（1–1.15）、`target`（卡 id）、`move`（ease / whip / cut）。镜头停稳后会自动慢推（每秒 1%，上限 4%；这是草稿行为，对标停留时镜头不动，成片用手写场景）。
- `enter`：`{ 卡id: { type } }`，type 可选 pop（默认；小件 4 帧弹出过冲 1.2 倍，大卡 6 帧淡入）、slide（带 dir，从画外滑入）、grow（带 from，从母卡边缘长出来）、fly（带 from，从另一张卡里飞出来）、stamp（1.8→1 砸下，stamp 卡默认就是这个）。
- `exit`：`{ 卡id: { type: "into", to: 目标卡 } }` 被吸进别的卡；`fade` 淡出；`stay` 留在原地。
- `dim`：默认 true，有新卡时旧卡压暗到 50% 并去色。
- `ghost`：下一拍才出现的卡，先画虚线框占位。

**卡片（card）kind**（通用字段：id、tone、meta 右上大写小标、tags 小标签行）
- text（title, sub?, subAt?, icon?, pulseAt?）、chip（小胶囊）、question（问句气泡）、keyword（黄底大字）、stamp（盖章）、mark（check / cross 对错圆钮）
- data（title, value, unit?, prefix?, decimals?, at?, dur?, rows[{label,value}]?, bar{value,max,label}?, badge?, foot?）：**信息最密的卡**，依次是标题、性质小标、主数字四次方缓出滚动、对比行、条、倍数胶囊、出处
- stat、bars（badge?）、progress（带流光）、list（逐项打勾）、terminal（lines[{text,at}] 逐字打出、光标闪烁）、timer（REC 计时滚动）、phone、doc、photo

**道具卡** `{ "id": "brain", "kind": "prop", "prop": { "kind": "brain", "fill": [{ "at": 17.4, "to": 0.7 }], "blueAt": 17.3 } }`（道具全集和参数见 `src/scenes/props.tsx` 顶部的 PropSpec）：
camera（提词屏滚字 lines/scrollAt/recAt）、brain（fill 液面 / blueAt 灰变蓝 / through 光点穿过=流走 / glowAt）、valve（closeAt 关阀=留住）、pool（level / inflowAt / inflowStop）、player、keyboard（typeAt）、waveform（cut 剪段补位）、scissors（snipAt）、person（variant: cap/tie/crown/helmet）、crowd（squeezeAt 挤成一团）、robot（rideAt / powerAt，原创造型）、building、scale（tilt 天平）、chart（折线描出）、waffle（百格填充）、bars3d（3D 立柱）、battery、bulb（onAt）、gauge、ring（计时环）、steps（竖向流程点亮）、network（星座网 growAt / lights / rings / collapseAt 坍缩成 coin）、machine（加工机 feedAt / outAt）、app（界面 + 鼠标 cursor 点击 / addAt 加按钮 / toggleAt）、code（逐字打出）、dots（点阵两行对比）、coins、speaker、icon（name 用 Tabler 图标名，anim: bob/spin/shake/pulse，tile 是否带底框）、wheel（跑轮 runAt：内卷）、seesaw（跷跷板 tilt / dropAt：权衡）、funnel（漏斗 pass / overflowAt：筛选）、gears（齿轮 spinAt / replaceAt：替代）、snowball（雪球 rollAt：复利）、pyramid（金字塔 climbAt / topAt / slideAt：塔尖稀缺）、squad（一排小人 armorAt[] 挨个套机甲："人人都"）、pool.diveAt（一头扎进浅水，头戳池底冒星星）。

**自由摆位** `place: { 卡id: [x, y, 缩放] }`：x/y 是本区域画面比例，演示构图一般都用它。主道具缩放 1–1.6（占画面高 45–70%），角落旁注 0.4–0.6。

**连线样式** `links: [{ "from": "doc", "to": "brain", "style": "pipe" }]`：line（默认，描出后光点流）、pipe（粗管道光点流，用于注满/流走）、sight（虚线视线）、particles（小文档沿线飞，用于喂资料/交付）。

**排拍方法**：每句字幕一拍或一个卡内事件（subAt / pulseAt / items.at / data.at / 镜头推近），间隔 ≤1.5s。关键数字和结论比台词早 0.2–0.9s，补充说明晚 0.2–0.8s，动词直接驱动动作（"打开"→弹出，"剪掉"→退场）。同一张卡尽量贯穿多拍、换形态，少换新卡。
