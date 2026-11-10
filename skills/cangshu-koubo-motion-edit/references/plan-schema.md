# plan.json 写法

plan.json 放在工程 `src/plan.json`，类型定义在 `src/plan.ts`（以它为准）。所有时间都是**基座剪完的时间线**上的秒（`from_base.py` 写的 `public/words.json`，和 `基座/cut.mp4` 一致），从 words.json 里取（plan 写好后再剪口误也不改这些时间，见下面 `cuts`）。完整例子：`assets/example-plan.json`（某条样片的 v14，图形段对应模板里的 `custom/stock1.tsx`、`stock2.tsx`）。

目录
1. 顶层结构
2. 怎么从台词排出 segments
3. 真人段叠层 overlays
4. 图形段 scene

## 1. 顶层结构

```json
{
  "meta": { "duration": 51.39, "fps": 30, "footage": "footage34.mp4", "person": "person.webm",
            "brand": "品牌名 BRAND", "brandTag": "ORIGINAL", "theme": "light", "ambient": { "period": 4.5, "opacity": 0.15 },
            "captionsEn": false, "sfxVolume": 0.7 },
  "captions": [ { "start": 0.08, "end": 2.28, "text": "互联网增量时代" } ],
  "chapters": [ { "start": 0, "label": "存量", "en": "STOCK", "icon": "database" },
                { "start": 15.71, "label": "需求", "en": "NEEDS", "icon": "list-check" } ],
  "segments": [ ... ]
}
```

- `chapters`：进度导航，默认都写，短视频 3 段。每章 `start`、`label`（两三个字）、`en`（英文小字）、`icon`（Tabler 图标名，查 `src/icons.json`）。换章时自动配一下轻的点击声。
- `person`：抠像文件。抠不好就删掉这个字段（不要写空字符串），模板自动降级：身后大字画到前景。
- `theme`：单卡版式和 board 画布的明暗（lux.tsx 的色板是固定的，不读它），默认 `light`，不要改。它不是画风；换画风用下面的 `style`。
- `sfxVolume`：音效总音量，默认 1.0；按 `render_final.py` 的逐个响度结果调（样片 v14 是 0.7）。`sfxMinGap`：两个音效的最小间隔，默认 0.5 秒。`autoSfx`：默认 true，按画面事件和手写场景的 cues 自动配音效；设成 false 整片不出任何音效（连 `sfx` 数组也不出）。
- `footageVolume`：口播原声音量，默认 1。不要为了测音效设成 0（`render_final.py` 自己渲纯音效音轨）；`plan_check.py` 看到 0 会报错。
- `bgm`：`{ src, from, volume, introVolume, dropAt }`，只用用户提供的或本机有授权曲库里的音乐（SKILL 第 1 步试听选定），没有就不填；`volume` 按"比人声低约 12.5dB"换算（默认 0.135，见 style-bible 第 10 节）。
- `cuts`：`[{ from, to }]`，plan 写好以后才发现的口误：用 `scripts/cut_slips.py` 剪素材，它打印要写的 `cuts`、`footage`/`person`（剪好的 `_cut` 文件）、`footageSrc`/`personSrc`（原文件，`split_plates.py` 从它取帧）。其余时间（字幕、段落、叠层、手写场景里的秒）全按原时间线不动，`duration` 也不动；渲染时自动换算，落在剪掉那段里的音效不出。剪掉的段最好落在停顿里，跨段的叠层要看一眼（如身后大字的 `at` 挪到剪点之后）。
- `qkid`：true 时 toon 场景里的 `Kid` 自动换成角色精灵图（`scenes/custom/qkid.tsx`）。精灵图是可选的，开源版不附带：使用者自备透明 PNG 放进 `public/ipq/`，并登记尺寸到 `scenes/custom/ipq.json`。主角 `look: "creator"`，配角按 look 映射（celeb/tutor 甲方、kidA 打工人、kidB 设计师、kidC 程序员、friend/viewer 摊主）。没配精灵图就不开，用 `toon.tsx` 里代码画的小人 `Kid`。
- `style`：toon 场景的画风主题（toon white chalk dark news blue neon water wall，默认 toon；`wall` = 取自你实拍背景墙颜色的主题（颜色在 toon.tsx 的主题表里改），图形段和实拍接得上，推荐配 `wall: true` 字墙），见 style-bible 第 7 节；用 lux.tsx 写的白卡场景不受它影响。`wall`：品牌字墙开关，只对 toon 场景（`Stage`）生效，不写就按主题默认（dark 开）；lux 场景的字墙是场景里自己放的 `WordWall`。
- `series`：`{ name, en?, ep, topic }`，系列固定片头 `custom/intro.tsx` 读它（栏目名前一半白字、后一半黄字；期数签；题目条）。
- `cover`：`{ src, y0?, line1, hl1?, line2 }`，3:4 封面合成 `Cover` 读它：`public/` 下的截图按宽铺满、从 `y0`（默认 280）起裁；第一行 `hl1` 标黄，第二行整行黄。
- `captionStyle`：不写 = `"box"`（半透明黑底框，不显示重点词）；推荐 `"pop"`（白粗字 + 重点词放大 1.32 倍亮黄，字幕中心 y≈1190）；`"burn"`（仿剪映原字幕，中心 y≈1083，图形内容别压到 1030 以下）。captions 每条的 `hl` 是重点词，字符串或数组。`captionMode`：`"B"` 时真人段不叠字幕（素材自带烧进的字幕时用）；`captionMask`：`{ top, bottom, blur? }` 屏幕像素，烧进的字幕要盖掉时用（素材自带字幕时优先直接用原字幕，不盖）。
- `sfx`：`[{ at, type: "boom" | "pop", volume }]`，额外补一个强调音（boom 走 impact 角色）。一般不用：图形段的音效写在手写场景的 cues 里，真人段的叠层会自动配。
- `segments` 必须首尾相接覆盖 0 到 duration。

## 2. 怎么从台词排出 segments

1. 按意思把字幕分成"拍"（一个论点 / 一个例子 / 一个数字）。
2. 选世界：说自己、表态、情绪、钩子、转折、结论 → 真人 A；解释机制、列步骤、给数据、做对比 → 图形 B；生活画面且有授权素材 → 实拍 S（`{ "world": "S", "clips": [{ "src", "at", "from" }] }`）。
3. 图形段 ≤16 秒，超过就在转折词那句插一段真人拆开；超过 6 秒的图形段写手写场景（`layout: "custom"`）。
4. 真人段每 3–6 秒安排一个叠层或推拉：相邻两段真人用 `zoom`（1.0 / 1.06 交替）做推拉跳切，重音用 `punch`，切点放在句首。总推近倍数（zoom × 慢推 × punch 连乘）别超过约 1.2：粗剪后的素材就是 1080×1440，推多了会糊。
5. 写完跑 `plan_check.py`："必须改"清零，"建议改"逐条处理或说明为什么不改。

## 3. 真人段叠层 overlays

真人段字段：`zoom`（这段的数码推近倍数；和上一段实拍不同时 0.7 秒缓过去，不跳切）、`drift`（in / out / none，默认相邻段交替慢推慢拉，前后段首尾相接）、`driftRate`（默认每秒 0.015）、`punch: [{ at, to }]`（重音处 0.6 秒缓推到 to）、`overlays`。瞬间推近太突兀，所以都是缓的。

叠层通用字段：`at` 出现，`until` 消失（不填 = 段落结束）。用法和取舍见 style-bible 第 3 节。

| type | 字段 | 说明 |
|---|---|---|
| metric | title, en?, value, unit?, dur?, note?, tone? | 左上毛玻璃数据卡（数字按整数显示，分段条按百分比点亮：小数、非百分比的数用 dataCard）：数字滚动 + 分段条 + 注释（个人估计写"个人判断"） |
| tag | text, sub?, tone? | 左上毛玻璃胶囊（**默认不用**，显得 AI 味；点名要才用）：text 是英文小字，sub 是中文主字 |
| pill | text, sub?, tone? | 右上胶囊（**默认不用**，同上）；tone: gold（默认）/red/blue |
| bigText | text, side?, en?, tone?, behind?, y?, x?, s?, unit?, fly? | 大字。前景时逐字升起 + 细线 + side/en 小标签（y 默认 0.11）；behind 要抠像（y 默认 0.05），位置交给 fit_bigtext.py，它会把 y/x/s 写回 |
| sideWords | left, right?, joiner?, rightAt?, y? | 贴头关键词，joiner 默认 "+"，可用 "→" "≠" |
| sticker | text, en?, y? | 结论玻璃便签，默认 y=0.62 |
| dataCard | title, sub?, meta?, stats[{v,l}], pos? | 通栏毛玻璃数据卡；pos: top/chest |
| title | text, sweepAt?, kicker? | 顶部片名，sweepAt 开始逐字扫光 |
| bubbles | header?, items[{text,at}] | 评论气泡，只写真实存在或用户提供的话 |
| counter | label, from, to, decimals?, suffix?, dur? | 计数卡 |
| battery | label, drainAt, drainDur?, dropAt? | 开场掉电符号 |
| cta | items? | 左上"点赞/收藏/关注" |
| infoBox | en, title, items[{cn, en?, icon?, at}], badge?, sfx?, tone? | 左上信息框（参考片式）：英文渐变大写 + 中文标题的玻璃头，下面一条条带图标的玻璃胶囊，`at` 跟着口播一条条出；`badge` 是标题前的小方块字（开头大字飞进来落在这里）；`sfx` all（头 + 每条一声）/ head（只头一声）/ none（默认），有时配有时不配 |
| topWord | text, look?, fly?{at,x,y,s}, size?, color? | 身后大字·顶边版：两三个字（或 AI 这种字母）顶着进度条下沿、第一个字贴左边、最后一个字贴右边，字高约画面四成，被头挡一点。`look` 默认用 `steel`（立体厚度 + 钨钢亮面），另有 flat extrude tilt chrome candy；`fly`：到 `at` 时缩小飞到 (x,y)、缩到 s 倍（开头 AI 大字飞成信息框的角标）。一条片子三四次，每次停 1.5–3 秒 |
| doodle | kind, x, y, s?, rot? | 漫画小符号贴在人头边（x、y 是屏幕像素，不是 0–1 比例）（anger sweat sparkle question exclaim zzz heart note dizzy），动画片画风的真人段用；不配音效 |

## 4. 图形段 scene

段落字段：`scene`（下面三选一）、`enter`、`host`、`hostPath`、`morphStyle`、`exit`（下表）、`bg`（单卡版式的画布变体）、`source`（屏幕出处小字，写泛称）。`kicker` 已不渲染。

进出图形段（用法和取舍见 style-bible 第 9 节）：

| 字段 | 取值 | 说明 |
|---|---|---|
| enter | split | 拆景：把切镜那一帧拆成背景墙 + 左右两侧物件三层，两侧物件往外滑出画 → 空墙淡成图形底 → 人最后动。要先跑 `split_plates.py <工程>` 生成 `public/split/` 素材。配 host corner / none / morph。背景两侧没有明显物件时不要用，改 fade |
|  | fade | 淡出：实拍整个淡出 → 人原地晚一点淡出（不动）→ 圆形小镜头淡入。配 host bubble |
|  | dissolve（默认）/ cut / swap / swallow | 老做法；没有抠像时 split / fade 自动降级成 dissolve |
| host | corner | 抠出来的半身缩到右下角（只配 split），字幕往左让 90px |
|  | bubble | 圆形小镜头（圆里是带背景的原画面，只配 fade） |
|  | morph | 真人变身成角色精灵图小人（B-roll 开头 / 结尾是小人时），可和 split 叠用；要 `meta.qkid`，只在配了精灵图时可用 |
|  | none（默认） | 人原地淡出（拆景时） |
| hostPath | [{at, x, y, d?, sprite?, crop?}] | bubble / corner：位置关键帧（屏幕坐标；bubble 是圆心和直径，corner 是头中心），`at` 起 0.7 秒到位。morph：第一个 = 进场时场景里小人头的屏幕中心和头宽 `d`、精灵图名 `sprite`，最后一个 = 退场时的；小人在柜台后只露半身加 `crop: "bust"` |
| morphStyle | dissolve（默认）/ iris / flip / poof | 进场的变身做法（`morph.tsx`）：缩放溶解最稳、圆形光圈最顺、照片贴纸和一阵烟俏皮。Root 里有 `Morph-<做法>` 合成，同一片子换做法出样片。退场不分做法，都是实拍叠化 |
| exit | 不写 = cut | 默认硬切回实拍（退场动画会盖住最后的内容）；host morph 默认段尾最后 0.8 秒实拍柔和叠化上来 |
|  | split / center / fade / dissolve | 要退场动画时显式写；`split` 要退场素材，`split_plates.py` 只给显式写了的段生成 |

- **手写场景（成片默认）**：`{ "layout": "custom", "name": "stock1" }`，写法见 `scene-guide.md`。
- **单卡版式（≤6 秒的短插入）**：

| layout | 字段 | 适合 |
|---|---|---|
| checklist | title, icon?, iconPulseAt?, items[{text,at}], meter? | 条件、标准、清单（单卡版式的 `icon` 只认 plan.ts 里内置的那几个名字，不是 Tabler 名） |
| bars | title?, unit?, items[{label,value,at,tone?,display?}] | 数值对比 |
| stat | label, value, from?, decimals?, prefix?, suffix?, at, sub?, delta? | 一个冲击数字 |
| flow | title?, steps[{label,sub?,at}] | 步骤、因果链 |
| phone | title?, badgeTo?, items[{name,text,at}], at | 私信、通知涌入 |
| doc | title, tag?, at, lines[{text?,at?,mark?}] | 稿子、报告、关键句高亮 |
| compare | at, left{label,value,unit?,sub?}, right{...,at}, verdict?{text,at} | 二选一、前后对比 |
| keyword | text, sub?, at, icon? | 一个概念 / 金句 |
| timeline | title?, items[{time,label,at}] | 时间线 |
| photo | src, at, label?, lockAt?, sticker?{text,at} | 实拍 / 产品图 + 取景框 + 贴纸 |
| slider | left{src,label}, right{src,label}, at | 同场景前后对比 |

- **board 画板**：只做草稿，字段见 `board-draft.md`。
