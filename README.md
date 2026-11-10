# 苍述口播剪辑 Skill（cangshu-koubo-video-skills）

> **English summary** — Two [Claude Code](https://claude.com/claude-code) skills that edit Chinese talking-head (口播) videos on a Mac, end to end, with a single agent and local tools only:
> - **`cangshu-koubo-wudongxiao`** — the "no-motion-graphics" base: cuts flubs, repeated takes and long pauses, then renders a 9:16 vertical video with optical-flow cut smoothing, subtle "breathing" zoom, emotion-driven shot-size changes, a chapter progress bar and auto-aligned captions with highlighted keywords.
> - **`cangshu-koubo-motion-edit`** — builds on the base and renders a 3:4 video that alternates between the speaker and hand-written Remotion motion-graphics scenes, with person matting (macOS Vision), data cards, kinetic text, sound effects and a one-command QA pass.
>
> Requires macOS on Apple silicon (mlx-whisper, Vision), ffmpeg and uv; the motion skill also needs Node.js and Remotion. Docs are in Chinese. Licensed under Apache-2.0 (Remotion has its own license — see below).

两个给 Claude Code 用的口播剪辑 skill：把录好的中文口播视频交给 agent，一句话出成片。只需要一个 agent 加本机工具，不需要别的 AI agent、不调付费接口，转写和抠像都在本机跑。

| skill | 一句话 | 产出 |
|---|---|---|
| `cangshu-koubo-wudongxiao` | 口播无动效剪辑，也是基座 | 9:16 竖屏成片（1080×1920） |
| `cangshu-koubo-motion-edit` | 口播动效剪辑，建在基座上 | 3:4 动效成片（1080×1440） |

## 它会做什么

**无动效版（基座）**
- **自动挑最好的那遍**：同一句说几遍留最后一遍，半句、重起、口误剪掉。整段转写会把「所以我们所以我们」合成一遍，所以它会把音频按短停顿切成短语、逐段重新听写，专门抓重复。
- **停顿剪得有分寸**：0.4 秒以内的自然停顿保留，超过才剪；每个剪点两侧留约 0.14 秒气口；开口前的空白一帧不留；剪剩不到 0.3 秒的碎片删掉。
- **剪点几乎看不出来**：每个剪点做 8 帧光流融合（思路同 Premiere 的 Morph Cut），人的动作接不上也不跳；渲染前先按真实画面把剪点校正到帧。
- **画面有活人感**：贴着剪完时间线的轻微呼吸推拉（跨剪点连续）；讲到转折和重点句自动推近景，平均 8–9 秒换一次景别，不机械等间隔。
- **自动字幕、智能标重点**：按逐字时间戳对齐；重点按意思挑（结论、数字、反差词）；出现轻弹、消失一帧消失。
- **敏感词替换**：钱 → `$`、100 万 → 100w、政策 → Z策，只改字幕不动声音（表可改、可关）。
- **9:16 顶部进度栏**：系列名、期数、分节进度条、每节一句钩子摘要。
- **口型不会对不上**：音画按同一批剪点一起切，渲完自动量口型，偏差超过 20ms 不交付。
- **自带质检**：剪点背景跳动、缩放连续、字幕对齐、响度（-16 LUFS 左右）都给数字。

**动效版**（在基座上再加）
- 真人段 ↔ 图形段交替：讲机制、举例、给数据时进图形，表态、结论回真人。
- 真人段叠层：毛玻璃数据卡、逐字升起的大字、贴头字、便签、顶边身后大字、顶部进度导航。
- 图形段用 Remotion 逐镜头手写：一个主角演一条链、元素状态联动、停稳再推拉的 3D 镜头；白卡精致或 9 套动画片主题，可加品牌字墙。
- macOS Vision 抠像（不下载模型），拆景 / 淡出两种进场。
- 音效少而轻，只配关键联动；BGM 试听连播、风格样片、系列片头、3:4 封面。
- 渲完一条命令质检：每秒 5 帧分镜查穿模越界，纯音效音轨逐个测响度，量口型。

## 环境要求

- **macOS + Apple 芯片**（M 系列）。转写用 [mlx-whisper](https://github.com/ml-explore/mlx-examples)，第一次会下载 `whisper-large-v3-turbo` 模型（约 1.6GB）；抠像用系统自带的 Vision 框架。Windows / Linux 目前跑不了。
- [Claude Code](https://claude.com/claude-code)
- [ffmpeg](https://ffmpeg.org/)（`brew install ffmpeg`）
- [uv](https://docs.astral.sh/uv/)（`brew install uv`），用来建 Python 3.12 虚拟环境
- 只有动效版需要：Node.js 18+、Xcode 命令行工具（`xcode-select --install`，抠像要 `swiftc`）。Remotion 4.0.520 在建工程时自动 `npm install`。
- 字体：默认用 macOS 自带的冬青黑体、苹方、DIN Condensed、Avenir，仓库里不附带任何字体文件。

## 安装

把两个 skill 放进 Claude Code 的 skills 目录（两个要放在同一个目录下，动效版会去旁边找基座）：

```bash
git clone https://github.com/QQTangBa/cangshu-koubo-video-skills.git
```

```bash
mkdir -p ~/.claude/skills && cp -R cangshu-koubo-video-skills/skills/* ~/.claude/skills/
```

只给某个项目用，就复制到那个项目的 `.claude/skills/` 下。重开 Claude Code 后就能用。

## 用法

在 Claude Code 里直接说：

```
用 cangshu-koubo-wudongxiao 剪一下这条口播：/路径/口播.mp4
```

```
用 cangshu-koubo-motion-edit 把 /路径/口播.mp4 剪成 3:4 动效版
```

agent 会按 skill 的流程一步步做：建虚拟环境 → 整理素材 → 转写 → 剪口误和停顿 → 对字幕 → 渲染 → 质检 → 交付。中间会停下来问你的事：工程放哪、分节摘要和版式静帧满不满意、要不要变速 / 片头防抖 / 人声消音（默认都不做）、动效版的画风和 BGM。

### 素材建议

- **3:4 竖拍最好**（手机竖拍 4K 或 1080p 裁成 3:4 都行）；9:16 会被居中裁掉上下各约 12%，16:9 横拍只剩中间一条。
- 机位固定，人居中，头顶留白 15%–20%，背景简单、光线稳定（抠像才干净）。
- 想要美颜、降噪、人声增强，先在任意软件（剪映、CapCut、Premiere、DaVinci 等）处理好，导出**同时长、恒定帧率**的片子，告诉 agent "这是预处理过的版本，原片在 xxx"。skill 会拿原片校准口型。不处理也完全可以。

### 你需要自己准备的（仓库里不带）

| 东西 | 什么时候要 | 怎么准备 |
|---|---|---|
| 音效库 | 动效版配音效 | agent 征得你同意后用 `fetch_sfx_library.py` 从 [Mixkit](https://mixkit.co/free-sound-effects/)（30 个）和 [Kenney](https://kenney.nl/assets)（CC0）下载，约 3.3MB。不想要音效就说"不要音效" |
| BGM | 动效版要配乐时 | 你自己有授权的曲子，给路径就行 |
| 图片 | 图形段插真图时 | 你自己有授权的截图、图片；不给就用代码画 |
| 角色精灵图 | 动效版想用自己的卡通形象、真人 ↔ 小人变身时 | 透明 PNG 放进工程 `public/ipq/`，尺寸登记到 `src/scenes/custom/ipq.json`；不配就用代码画的小人 |
| 品牌名 | 动效版水印和品牌字墙 | 告诉 agent 你的账号名 |

## 目录

```
skills/
├── cangshu-koubo-wudongxiao/     # 无动效 9:16（基座）
│   ├── SKILL.md
│   ├── references/               # 剪辑规则、字幕、画面动效、版式、配置样例
│   └── scripts/                  # 转写、剪辑、字幕、渲染、质检（Python）
└── cangshu-koubo-motion-edit/    # 动效 3:4
    ├── SKILL.md
    ├── references/               # 风格总纲、场景指南、plan 字段、演示套路库……
    ├── scripts/                  # 3:4 素材、抠像、音效、质检
    └── assets/remotion-template/ # Remotion 模板
```

## 许可

- 本仓库代码和文档：[Apache License 2.0](LICENSE)。
- **Remotion**：动效版的渲染依赖 [Remotion](https://www.remotion.dev/)，它有自己的许可：个人、非营利和小团队免费；达到一定规模的公司商用需要购买 Remotion 的公司许可，详见 [remotion.dev/license](https://www.remotion.dev/license)。用不用得起免费档请自行确认。
- **Tabler Icons**：模板里的线稿图标数据来自 [Tabler Icons](https://tabler.io/icons)，MIT 许可，原文在 `skills/cangshu-koubo-motion-edit/assets/vendor/TABLER_ICONS_LICENSE.txt`。
- **音效**：仓库里不附带任何音效。Mixkit 音效免费商用但不能单独转发，所以只提供下载脚本；Kenney 素材是 CC0。使用前以各站当前的许可条款为准。
- **字体**：仓库里不附带字体文件，默认调用 macOS 系统字体。系统字体能否用于商业视频请自行确认，商用前可以换成有商用授权的字体（无动效版在 `剪辑配置.json` 里写 `font`，动效版改模板 `theme.ts` 的 `F`）。
- **模型**：mlx-whisper 和 Whisper 模型（MIT）在首次运行时从 Hugging Face 下载，不随仓库分发。
