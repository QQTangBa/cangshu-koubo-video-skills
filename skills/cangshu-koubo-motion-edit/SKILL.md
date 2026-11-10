---
name: cangshu-koubo-motion-edit
description: 口播动效剪辑管线。把已经录好的中文口播素材剪成 3:4（1080×1440）动效成片，走知识类口播常见的"真人段 ↔ 图形段"交替剪法：剪口误、剪停顿、对字幕走基座 cangshu-koubo-wudongxiao，再找脸裁 3:4、macOS Vision 抠像，按逐词时间戳写 plan.json，由 Remotion 模板渲染真人段的毛玻璃数据卡、逐字升起的大字、顶部进度导航，以及逐镜头手写的图形段（一个主角演一条链、元素状态联动、停稳再推拉的 3D 镜头；白卡或 9 套动画片主题可选，图形段背后可加品牌字墙），只在关键联动处配偏亮的实录音效；渲完一条命令质检（每秒 5 帧分镜查穿模越界、纯音效音轨逐个测响度）。也管这条片子配套的 BGM 试听连播、用户给的字幕（重点词放大标黄）、风格样片、系列固定片头、3:4 封面，也回答"3:4 口播怎么拍"。用户说「走口播剪辑管线」「口播动效剪辑」「把这条素材剪成 3:4 动效版」「口播加动效 / 加 B-roll / 做图形段」「出一版 3:4 成片 / 预览」「给这条配几个 BGM 试试」「换几个动效风格看看」「给这条做个 3:4 封面」「3:4 口播怎么拍」时使用。除拍摄建议外，输入必须是已录好的视频；不用于写稿、改稿、选题、录制前的提词稿和演示页；只剪口误和长停顿、不要 B-roll 和 BGM 出 9:16 竖屏的用 cangshu-koubo-wudongxiao。只在 macOS（Apple 芯片）上跑。
---

# 口播动效剪辑管线（3:4 动效成片）

讲者说一句，画面对这句做出反应；图形段是"一个主角演一条链"，不是一页页翻卡片。

本 skill 建在基座 **cangshu-koubo-wudongxiao** 上：剪口误、停顿、剪点、字幕源和敏感词用它的脚本和规则，本 skill 只在上面加 3:4 裁切、图形段、B-roll、BGM、音效。两个 skill 要装在同一个 skills 目录下。

## 文件地图

| 文件 | 什么时候读 |
|---|---|
| `references/style-bible.md` | 写 plan 前必读：节奏、真人段叠层、进出图形、联动、镜头、画风、音效 |
| `references/scene-guide.md` | 写图形段（手写场景）时对照：坐标和镜头、kit / lux / toon 工具、画风主题、穿模清单、音效提示、样例拆解 |
| `references/plan-schema.md` | 写 plan.json 时查字段 |
| `references/metaphor-bank.md` | 每个图形段论点先过一遍发散流程 |
| `references/demo-patterns.md` | 挑演示套路：第 2 节（套路库）、第 4 节（抓注意力） |
| `references/layout-34.md` | 第 2 节安全区（写 plan 前读）；第 1 节拍摄建议（用户问怎么拍时照着答） |
| `references/sfx-palette.json` | 音效清单：角色 → 素材、裁剪、增益 |
| `references/board-draft.md` | 只在出草稿、对时间轴时看 |
| `assets/example-plan.json` | 完整样例，图形段是模板里的 `custom/stock1.tsx`、`stock2.tsx`（白卡画风）；动画片画风样例是 `custom/toon_panel_example.tsx`。样例里的 `tag` / `pill` 胶囊和"标签飞进图形段"是旧做法，别照抄 |

## 环境

```bash
uv venv -p 3.12 <临时目录>/venv && VIRTUAL_ENV=<临时目录>/venv uv pip install mlx-whisper "opencv-python-headless<5" numpy scipy pillow
```
opencv 要 5 以下（5.x 没有人脸检测器）。下文 `$SK` = 本 skill 目录，`$B` = 基座的 `scripts/` 目录（和本 skill 同级的 `cangshu-koubo-wudongxiao/scripts`），`$PY` = 上面 venv 的 python。
- 只能在 macOS（Apple 芯片）上跑：转写用 mlx-whisper（模型优先读本机缓存，没有就自动下载 `mlx-community/whisper-large-v3-turbo`），抠像用系统自带 Vision（要 Xcode 命令行工具里的 swiftc）。另外要 ffmpeg、Node 18+。
- 渲染用 Remotion 4.0.520：`new_project.sh` 会 `npm install`（设了 `KOUBO_REMOTION_CACHE` 时先找那个目录下同版本的依赖复用）。Remotion 有自己的许可：个人和小团队免费，规模以上的公司商用要买 Remotion 的公司许可，开工前提醒用户一次。
- 音效库不随 skill 分发。第一次用先征得用户同意（来源：mixkit.co 30 个 + kenney.nl 两包，约 3.3MB），再 `python3 $SK/scripts/fetch_sfx_library.py <目录>` 下载，之后 `build_sfx.py` 加 `--library <目录>`，或设环境变量 `KOUBO_SFX_LIB`。用户不想下载就在 plan 里写 `meta.autoSfx: false`、不写 cue，出无音效版。
- BGM、图库、产品图、角色精灵图都由用户提供，不去网上找。

## 流程

### 1. 收输入、建工程
- 原始视频（必须）；口播稿定稿或剪映 / 其他软件导出的字幕 SRT（有就要）；品牌字（`meta.brand`，用户的账号名或品牌名，没有就不开品牌字墙）；背景资料（数据卡的来源）；有授权的 BGM、图片、产品图。
- 问一句这条片子有没有所属系列的固定做法（画风、片头、BGM）：有就照办，后面不再问。
- `bash $SK/scripts/new_project.sh <工程>`，工程放哪问用户。

### 2. 剪口误、对字幕（走基座），出 3:4 素材、抠像、音效
剪口误和重复、剪停顿、剪点校正、字幕源和敏感词、对字幕时间，都用基座的脚本和规则（它的 `references/cut-rules.md`、`captions.md`），在 `<工程>/基座/` 里做，这里不另立一套。
```bash
$PY $B/prepare_source.py <原视频> <工程>/基座/source.mov    # 第 0 步：整理成 source.mov；用户自己做过美颜 / 降噪导出时用三参数版（见基座第 0 步）
$PY $B/transcribe.py <工程>/基座/source.mov <工程>/基座/raw_transcript.json
#   按基座 cut-rules.md 写 <工程>/基座/edl.json（source 写 source.mov；没有系列固定片头就在顶层写 "intro": false）
$PY $B/cut_takes.py <工程>/基座
$PY $B/find_ng.py <工程>/基座                        # 短语级听写找重复，必跑
$PY $B/edl.py rebuild <工程>/基座 --remove <起-止>...  # 删口误、剪 >0.4 秒的停顿、收剪点两侧、删碎片
$PY $B/cut_takes.py <工程>/基座 && $PY $B/find_ng.py <工程>/基座
$PY $B/transcribe.py <工程>/基座/cut.mp4 <工程>/基座/cut_transcript.json --prompt "以下是普通话口播，我是<讲者名>，内容关于<领域>。"
python3 $SK/scripts/srt_captions.py <字幕.srt> <工程>/基座/字幕源.txt      # 用户给了 SRT：用里面的字出初稿
python3 $SK/scripts/captions.py <工程>/基座/cut_transcript.json <工程>/基座/字幕源.txt   # 没给字幕：按转写出初稿
#   按基座 captions.md 改字幕源：错字专名、[重点词]、敏感词
$PY $B/captions.py <工程>/基座
$PY $SK/scripts/from_base.py <工程>/基座 <工程>/public  # 剪点校正 + 裁 3:4 + 烤进 8 帧光流融合，写 words.json、cuts.json，拷 captions.json
bash $SK/scripts/matte.sh <工程>/public/footage34.mp4 <工程>/public/person.webm
python3 $SK/scripts/build_sfx.py <工程>/public --library <音效库目录>
```
- 之后所有时间都用 `public/words.json` 的时间线（不变速时和 `基座/cut.mp4` 一致）。**默认不变速**；用户说了倍速才给 `from_base.py --speed 1.1`（用基座同一套做法：系列片头原速、之后整体变速、声音不变调，字幕和逐字时间跟着换算）。片头防抖、人声消音照基座的规矩：不主动做，先问。
- `from_base.py` 打印的"脸中心 y"偏离 0.3–0.55 就检查裁切，用 `--face-y` 指定；原片已经是 3:4 时整幅缩放不裁。
- 抠像抽一帧叠到深灰底上看头发和肩膀；抠不好就记下来，写 plan 时删掉 `meta.person` 字段（不要写空字符串），模板自动降级。
- `build_sfx.py` 按 `references/sfx-palette.json` 从音效库构建音效，不另找素材（选音原则见 style-bible 第 10 节）。
- 字幕：`captions.json` 放进 plan 的 `captions`，`meta.captionStyle: "pop"`（重点词放大 1.32 倍亮黄，出字弹一下，消失一帧消失）。
- 素材（crf 10 + 轻锐化）、抠像（crf 18）、渲染（PNG 帧 + crf 12）的清晰度默认值已经写进脚本和模板，不要调低（看得出糊）。
- **BGM 没定时先给试听**（用户要推荐、或系列约定里没有）：从用户提供的有授权曲库挑 6–9 首风格不同的（需要署名的交付时提醒写署名），每首挑已经进拍的位置，配到剪好的素材开头 8 秒上出连播，等用户选：
  ```bash
  $PY $SK/scripts/bgm_audition.py <工程>/public/footage34.mp4 <工程>/bgm试听 --track "名字=路径@起点秒" --track "名字=路径@起点秒"
  ```
  试听比人声低约 11dB（低 20dB 几乎听不见）。选定后把曲子硬链接或复制进 `<工程>/public/`（`meta.bgm.src` 只认 public 下的文件名）；成片比人声低约 12.5dB：用 `--rel -12.5` 只放这一首再跑一次，`meta.bgm.volume = 10^(打印的增益/20)`，`meta.bgm.from` = 起点秒。曲子比片子短会循环，交付时说一句。用户没有 BGM 就不加。

### 3. 排段、补资料
- 按 style-bible 第 2、4 节分段：讲机制、举例、给数据、做对比进图形；表态、结论、转折回真人；图形段 ≤16 秒；写 `chapters`（短视频 3 段）。
- 信息量靠查证过的数据：台词里的关键论点，能联网就找能追到原始出处的数字做数据卡，拿不准的不用；屏幕上的出处写泛称，真实链接记进交付说明；口播里的个人估计标"个人判断"。补充的数据先列给用户确认。

### 3.5 画风、片头（先定方向）
- 画风两条路：`lux.tsx` 白卡精致（色板固定，不参与主题），或 `toon.tsx` 写场景、用 `meta.style` 在 9 套主题里换（style-bible 第 7 节）。系列约定里有就照用；没有就先用 toon 写，第 5 步写完第一个图形段再出风格样片让用户挑。用户要换风格时只换元素和动画，底色和字墙不动。
- `wall` 主题取的是实拍背景墙的颜色：用它之前，从 `public/footage34.mp4` 抽一帧量背景墙的颜色，改 `toon.tsx` 主题表里 `wall` 的底色，拆景时空墙淡成图形底才不跳色。
- 图形段背后要品牌字墙（一行行品牌字左右交替滚动）写 `meta.wall: true`（dark 主题默认开；只对 toon 场景生效），字取 `meta.brand`。
- 角色小人：默认用 `toon.tsx` 里代码画的 `Kid`。用户有自己的角色精灵图（透明 PNG）才开 `meta.qkid: true`：图放 `public/ipq/`，尺寸登记进 `src/scenes/custom/ipq.json`（格式见 `scripts/split_sheet.py` 说明）。真人 ↔ 小人的变身（`host: "morph"`）也要精灵图；没有就不用，`plan_check.py` 会拦。
- 栏目化的系列（"欢迎来到 XX 第 N 期"）用 `custom/intro.tsx` 固定片头：`meta.series` 写栏目名、期数、题目，plan 里在那句上放约 3.2 秒的 B 段，登记方法见 `custom/index.ts` 注释。

### 4. 每个图形段先想清楚演什么
- 按 metaphor-bank 第 1 节，每个论点在"直白 / 比喻 / 夸张 / 荒诞"四档各写一个候选，打分选一个；一条视频至少一半选到夸张或荒诞（1 秒看懂为前提）。表格存成工程里的 `创意发散.md`。
- 定"主角 + 链条 + 联动表"（style-bible 第 5 节）：同一个主角一路变形；至少 3 条状态联动链；跨段或跨世界至少照应 1 处；数据卡从主角边上长出来做旁注，讲完缩回去。

### 5. 写手写场景
按 scene-guide 写 `src/scenes/custom/<名字>.tsx` 并登记。要点：
- 镜头只在句子交界处动，停留中位 ≥2 秒（个别不短于 1.4 秒）且完全静止，一次运动 0.6–0.9 秒、多数是推拉；`Camera3D` + `orbitAt` 给整块画布 3D 透视。
- **画风没定时**：先写完第一个图形段（toon），把 plan 里这一段排好，跑 `$PY $SK/scripts/style_reel.py <工程> <起秒> <止秒> --themes dark,white,chalk,news` 出风格连播给用户挑；要"再来几个"就换别的主题（blue、neon、water、toon、wall）再出。只换画风，不改动作和字。选定写进 `meta.style` 再写其余段。
- 画风按 3.5 定的来：白卡精致用 `lux.tsx`，其余用 `toon.tsx`（`Stage` 包场景，颜色只取 `T.*`，直接写在底上的字和线用 `T.onBg` / `T.onBgSoft`）；平的画面才加 `Tilt`。
- 物件用代码画（`custom/objs.tsx` 的扁平矢量，缺的照样往里加），不用写实图标。
- 卡点：动词误差 ≤0.1 秒，名词提前 0.3–1 秒，数字提前 0.4 秒起跑。
- 第一个元素从 `contentStart(seg)` 以后出（切镜动画期间不出东西）；任何元素停 5–7 秒内要有新元素或变化（style-bible 第 5 节信息量）。
- 一段 B-roll 信息一屏放不下时才拆成几块、镜头在块之间走（挪半屏、每屏填满，style-bible 第 6 节「段内多画布」）；一屏装得下就不拆。
- 台词讲到具体的东西（一张画、一页 PPT、一个小程序、一份稿子）可以插真图：只用用户提供的有授权图片，放 `public/real/`；AI 生成的挂「AI 生成」角标；只用图不用网上找的实拍视频（style-bible 第 7 节）。用户没给图就用代码画。
- 摆位时就按 scene-guide 第 5 节防穿模、越界；`cues` 只给关键联动配音效。

### 6. 写 plan.json
按 plan-schema 写 segments、captions、chapters、真人段叠层。真人段的数字进左上数据卡（`metric`），结论用前景大字、并列关键词用贴头字（`sideWords`）、一段论证的收尾用便签（`sticker`）；两三个字的重点词偶尔用顶边身后大字（`topWord`，`look: "steel"`），要点清单偶尔用左上信息框（`infoBox`），开头两者同时出时大字先飞成信息框角标。进出图形按 style-bible 第 9 节写 `enter` / `host` / `exit`：拆景配角落半身、淡出配圆球，不混用；**拆景只在背景左右两侧各有明显物件时用**，否则用淡出；B-roll 开头或结尾是小人、且配了精灵图时可以加变身（`host: "morph"` + `hostPath`）；`exit` 不写 = 硬切。实拍段不短于约 2.2 秒。**不用左上 / 右上的小字胶囊（`tag`、`pill`）**，AI 味重；批注、便利贴、新闻条、花字、不写字的动效提示也默认不用。
```bash
$PY $SK/scripts/fit_bigtext.py <工程>
python3 $SK/scripts/plan_check.py <工程>/src/plan.json
```
有拆景段就生成拆景素材（从切镜那一帧拆空墙 / 左侧物件 / 右侧物件三层）：`$PY $SK/scripts/split_plates.py <工程>`，改了段落边界要重跑；拆出来的分界不对就按自己的背景调脚本里的阈值，调不好就改用淡出。
`fit_bigtext.py` 给身后大字逐字算遮挡（≤35%）、不顶进度条，放不下就挪到人前面；`plan_check.py` 的"必须改"清零，"建议改"逐条处理或说明理由。

### 7. 画面文字自查
```bash
python3 $SK/scripts/screen_text.py <工程>/src/plan.json --with-captions
```
手写场景里的字也会抽出来；插进去的真图里画着的字抽不出来，人工逐张看。项目里装了合规 / 敏感词检查的 skill 就交给它只读检测（注明目标平台和是否商业推广，字卡和字幕单独一行报告）；没有就自己逐句过一遍基座 captions.md 的敏感词表和目标平台常见违规词，并把抽出的文字交给用户核。有风险先改再重抽重查。后面只挪位置、没改字时，重抽一遍和上一轮逐行比对，完全相同就沿用结论。

### 8. 预览
```bash
cd <工程> && npx tsc --noEmit -p . && npm run preview
bash $SK/scripts/stills.sh <工程> <名字> <秒> <秒>
```
`stills.sh` 出半分辨率静帧横拼，写场景时每个镜头落位、元素交接处都看一眼。
半分辨率给用户看，按反馈改场景和 plan 再出。用户要比几种做法时：变身用 `Morph-<dissolve|iris|flip|poof>`、身后大字用 `Top-<steel|extrude|…>` 合成渲同一段。
- 信息量自查：逐段量画面变化（去掉字幕带和进度条），超过 4 秒没新事件的空档补东西。
- plan 写好以后才发现口误（同一句说了两遍）：不改 plan 的时间，`python3 $SK/scripts/cut_slips.py <工程> <起-止>…` 剪素材、按它打印的写 `meta.cuts` 等字段（plan-schema 第 1 节），再转写剪点前后几秒确认只剩一遍。换了深色主题，整片逐段查一遍"深字落在深底""白字落在白卡"。

### 9. 成片 + 质检
```bash
python3 $SK/scripts/render_final.py <工程> --ver v1 --py $PY
```
一条命令跑完：渲染 → 量渲染带来的声音延迟并在限幅时扣掉 → 量口型（`qa/口型.txt`，声-画中位超过 20ms 算要处理）→ 成片音频总检 → 渲纯音效音轨逐个测响度 → 出分镜拼图（图形段和换章处每秒 5 帧，真人段每秒 2 帧），汇总写进 `out/<ver>/qa/质检.txt`。然后：
- 逐张看 `qa/sb_*.jpg`，找四种错：元素顶进红线以上（进度条区）、被画框裁切、两个元素互相穿过、两层字叠在一起。可疑处抽大图：`$PY $SK/scripts/storyboard.py <成片> --at 25.1,25.25,25.4 --w 405 --hud --out <图>.jpg`。
- "要处理"清零：音效整体偏响或偏轻调 `meta.sfxVolume`，个别偏调那条 cue 的 `vol`，挤在一起的删一个。剩下只差 0.3dB 以内的是测量误差，说明后可以不再调。
- 改完换新版本号重跑。**只改了声音**（sfxVolume、cue 的 vol、BGM 音量）就不重渲画面：`bash $SK/scripts/remix_audio.sh <工程> v1 v2 --py $PY`（只渲音轨、合回原画面、再质检）；动了任何画面就整片重渲。

### 10. 交付
给成片路径和时长、各世界占比、音效个数和逐个响度范围、整片响度（都在 `质检.txt`），加画面文字自查结论和是否需要人工复核。直接给清晰版路径，不另压手机版。
要 3:4 封面时：截图放 `public/`，`meta.cover` 写两行字，`npx remotion still src/index.ts Cover out/cover/封面_3比4.png --frame=0`；封面字也过第 7 步的自查。用户要换音效时，直接列出候选素材让用户自己听，按选择改源清单 `$SK/references/sfx-palette.json`（以后所有工程都用它）再跑 `build_sfx.py`；只改这一条片子，就把源清单复制进工程改，用 `build_sfx.py <工程>/public --palette <那份>` 重建。工程里的 `src/sfx-palette.json` 是生成物，不要手改。

## 硬规则（每条都踩过坑）

1. 画面上的字只用台词、口播稿或用户给的信息；不编数字、评论、出处；水印用用户品牌。
2. 图形段超过 6 秒一律写手写场景；board 画板只做草稿（自动排版会错乱，像翻 PPT）。
3. 图形段一个主角一条链，至少 3 条状态联动；不在几个孤立道具之间来回切（像 PPT 翻页）。
4. 镜头停得住：停留中位 ≥2 秒、最短 1.4 秒、停的时候完全静止，不要"停留时慢推"（切太快观众看不清）。
5. 立体倾斜只救平的画面，不是每张卡都加。
6. 真人段的字走毛玻璃数据卡、左上信息框、逐字升起的大字、贴头字和便签，不用角落小字胶囊；身后大字只偶尔用（高级感低、字被人挡太多、小字胶囊 AI 味重）。
7. 不穿模、不越界：整条路径在安全区里，不穿顶部进度条，不互相穿过，管子水流光束到接触面为止，变形时两层字不叠。
8. 音效少而轻：只配关键联动，图形段每秒 0.3–0.7 个，两两隔 ≥0.5 秒，每个比人声中位低 1–6dB，用偏亮的实录素材（太密、太响就是污染，AI 味重）。
9. 模板改动同步进工程只用 `bash $SK/scripts/sync_template.sh <工程>`：它不碰工程自己的 `plan.json`、`sfx-palette.json`、手写场景登记表 `scenes/custom/index.ts` 和工程自己的场景文件（整体 rsync 曾把音效清单覆盖成空，两版成片一个音效都没有）；但 `remotion.config.ts` 和 custom/ 下的工具文件 `toon.tsx`、`lbkit.tsx`、`intro.tsx`、`qkid.tsx`、`ep.tsx`、`real.tsx` 每次覆盖，工程专用的道具另写文件。`new_project.sh` 碰到已有工程会拒绝。工程里改好的模板代码用 `sync_back.sh <工程> <文件>…` 点名拷回。
10. 查完问题就动手改，改完重渲给结果，不要只汇报思路。
11. 真人段前景字落在浅色墙上要有深色描边（模板的 BigText、SideWords 已带两层贴字阴影 + 柔投影，别去掉）；深色主题里直接写在底上的字和线用 `T.onBg`，卡片上的灰字用 `T.inkSoft`（白字白底看不清）。
12. 多段音视频拼接（BGM 试听、风格样片、连播）一律重采样到 48k、用 concat 滤镜重新编码，不用 `-c copy`（44.1k/48k 混着会把人声拉高变调）；拼接命令用 Python 写，zsh 里 `$i:a` 会被当成路径修饰符、`set -- $x` 不按空格拆。
13. Remotion 的静态文件服务不认软链接：别的工程的素材放进 `public/` 用硬链接（`ln`）或复制。后台在渲成片时 `remotion still` 会超时，自查用的静帧一律走 `stills.sh`（先删旧图、渲失败就报错），不然会拿上一次的图当新图看。
14. 动效为内容服务：切镜动画不盖内容（回真人默认硬切），元素不被抠像、圆球、字幕挡住；两种进场切镜不混用（拆景后不配圆球）。
15. 信息量：任何元素停 5–7 秒内必须有新元素或变换，除非它本身在给大量信息。小人是配角，不围着小人设计动效。
16. 不为运镜而运镜：一屏装得下就不拆块；拆块只在一段 B-roll 内部、挪半屏、每屏填满（不同 B-roll 之间翻页没意义）。
17. 图形段里插的真实素材只用用户提供的图、不用网上找的实拍视频，图要讲台词里那件事，AI 生成的挂「AI 生成」角标（实拍视频出戏、不符合画风）。用户自己给的授权实拍照旧走实拍段（world S），不受这条限制。
18. 音画不分离：素材、切片都走同一份 `source.mov` 和同一张剪辑表；模板要混 BGM 和音效，声音只能另铺，由 `render_final.py` 量出延迟扣掉，不手动挪（渲染会让声音晚几十毫秒，口型就对不上）。

## 改模板

模板在 `assets/remotion-template/src/`：`Film.tsx`（世界切换、拆景 / 淡出 / 变身切镜、讲者、音频；`sfxOnly` 只出音效）、`timing.ts`（切镜时间表、`contentStart`、剪口误的时间换算）、`morph.tsx` + `morphState.ts`（真人 ↔ 小人变身，要精灵图）、`components/`（`base` 基础件、`overlays` 真人段叠层、`hud` 进度导航、`extra` 左上信息框和顶边身后大字）、`scenes/kit.tsx` 和 `lux.tsx`（手写场景工具和白卡画风）、`scenes/custom/`（`types.ts` 类型、`index.ts` 登记表、样例 stock1 和 stock2；`toon.tsx` 动画片工具 + 9 套主题 + 品牌字墙、`qkid.tsx` 可选的角色精灵图（图在 `public/ipq/`、尺寸 `ipq.json`，默认空）、`ep.tsx` 产品界面式道具、`objs.tsx` 扁平矢量物件、`real.tsx` 真图和段内多画布、`lbkit.tsx` 动画片道具、`intro.tsx` 系列片头、`toon_panel_example.tsx` 样例）、`Root.tsx`（`Koubo34` 按 `meta.style` 出成片，`Style-<主题>` 出风格样片，`Morph-<做法>` / `Top-<样式>` 出变身和身后大字对比，`Cover` 出封面）、`Cover.tsx`、`scenes/scenes.tsx`（单卡版式）、`sfx.tsx`（自动配音效）、`scenes/board.tsx`（草稿用）、`scenes/props.tsx`（卡通道具草稿用，里面的 `TablerIcon` 成片也用）。字体在 `theme.ts` 的 `F`（默认苹方、Avenir 等 macOS 系统字体，商用前换有授权的字体）。加字段先改 `plan.ts`，再在 plan-schema.md 补一行。在工程里改好、要留给以后的，用 `bash $SK/scripts/sync_back.sh <工程> <相对 src 的文件>…` 拷回模板；往已有工程同步用 `sync_template.sh`。
