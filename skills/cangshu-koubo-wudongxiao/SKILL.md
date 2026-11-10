---
name: cangshu-koubo-wudongxiao
description: 口播无动效剪辑，也是口播剪辑的基座。把已经录好的中文口播视频（常见 3:4 竖拍）剪掉口误、重复和长停顿，出 9:16 竖屏成片：原画面不拉伸嵌在中间，上黑边放系列名、期数、分节进度条和本节一句摘要；画面只有贴着剪完时间线的呼吸推拉、按情绪换景别、剪点光流融合三种"动"；可选的系列片头响指硬切对接；字幕白粗字重点词标黄、出现轻弹、消失一帧消失，敏感词按表替换。用户说「口播无动效剪辑」「无动效剪辑」「口播精剪」「剪掉口误和停顿」「出竖屏口播成片」，或给出录好的口播素材、要求不加 B-roll 和图形动效时使用。变速、片头防抖、人声消音不主动做，先问用户。不加 B-roll、图形段、贴纸、信息卡、BGM、音效；要图形段、B-roll、BGM 的 3:4 动效成片用 cangshu-koubo-motion-edit（它建在本 skill 之上）。不用于写稿、改稿、选题、封面、排版。只在 macOS（Apple 芯片）上跑。
---

# 口播无动效剪辑

做减法加三种克制的"动"：剪干净口误和长停顿，原画面嵌进 9:16，上黑边一条安静的进度栏，画面靠呼吸推拉和按情绪换景别保持活人感。每条规则的来由写在各 reference 里。

**这是口播剪辑的基座**：剪口误、停顿、剪点、字幕样式和敏感词这几块以本 skill 为准。动效版（cangshu-koubo-motion-edit）的第 2 步直接调本 skill 的脚本剪口误、对字幕，再往上加 3:4 裁切、图形段、B-roll、BGM、音效。改这几块规则只改本 skill。

## 环境

```bash
uv venv -p 3.12 <临时目录>/venv && VIRTUAL_ENV=<临时目录>/venv uv pip install mlx-whisper numpy scipy pillow opencv-python
```
`$PY` = 这个 venv 的 python，`$SK` = 本 skill 目录，`$P` = 工程目录（问用户放哪；没说就在素材旁边建 `<稿名>_剪辑/`）。
- 只在 macOS（Apple 芯片）上跑：转写用 mlx-whisper（模型优先读本机缓存，没有就自动下载 `mlx-community/whisper-large-v3-turbo`，约 1.6GB）。
- 要 ffmpeg（不需要 libass/drawtext）。
- 字体默认用 macOS 自带的冬青黑体（`/System/Library/Fonts/Hiragino Sans GB.ttc`）和 DIN Condensed Bold；换字体在 `剪辑配置.json` 里写 `font` / `font_num`（见 config-example.json）。
- zsh 里 `$变量:a` 会被当成修饰符，ffmpeg 滤镜里的变量一律写 `${变量}`；zsh 也不会按空格拆分变量。

## 流程

改了哪一步，就从那一步往下全部重跑；旧版文件加 `_vN` 后缀留着，不覆盖。

### 0. 整理素材成 source.mov
```bash
$PY $SK/scripts/prepare_source.py <原视频> $P/source.mov
```
画面原样拷贝，声音转 48k PCM，音画起点对齐（保留原片真实的音画关系）。后面所有步骤都用 `$P/source.mov`，不再碰原视频。

可选：用户自己先在任意软件（剪映、CapCut、Premiere、DaVinci 等）给原片做了美颜、降噪、人声增强，导出了**同时长、恒定帧率**的片子，就用三参数版，拿原片当基准量出导出片的音频偏差再扣掉：
```bash
$PY $SK/scripts/prepare_source.py <原视频> <预处理导出.mp4> $P/source.mov
```
本 skill 不替用户操作这些软件；没有预处理就直接用原片。

### 1. 转写、看片头
```bash
$PY $SK/scripts/transcribe.py $P/source.mov $P/raw_transcript.json
python3 $SK/scripts/timeline.py $P/source.mov $P/raw_transcript.json
$PY $SK/scripts/find_snaps.py $P/source.mov $P/snaps --range 0 20     # 只在有系列片头（响指转场）时需要
```
按 [references/cut-rules.md](references/cut-rules.md) 写 `$P/edl.json`（`source` 写 `$P/source.mov`，时间都是它的时间线：留哪几段、片头出点和正片入点；**没有系列片头就在顶层写 `"intro": false`**，大多数素材是这种）。

### 2. 剪、找口误、收停顿
```bash
$PY $SK/scripts/cut_takes.py $P
$PY $SK/scripts/find_ng.py $P                         # 按短停顿切短语逐段听写：疑似重复、拖长的字、慢句
$PY $SK/scripts/energy.py $P/cut.mp4 <起> <止>         # 20ms 音量条，定精确剪点
$PY $SK/scripts/edl.py rebuild $P --remove 18.53-20.10 27.40-28.43   # 剪辑后时间：删口误；同时剪掉 >0.4 秒的停顿、收剪点两侧、删碎片
$PY $SK/scripts/cut_takes.py $P
$PY $SK/scripts/find_ng.py $P                         # 再查一遍，直到没有重复
```
`find_ng` 必须跑：整段转写会把「所以我们所以我们」合成一遍，读整段转写找不到重复。`edl.py map $P <秒>...` 把剪辑后时间换回原片时间。

### 3. 字幕
写 `$P/字幕源.txt`（规则见 [references/captions.md](references/captions.md)），然后：
```bash
$PY $SK/scripts/transcribe.py $P/cut.mp4 $P/cut_transcript.json --prompt "以下是普通话口播，我是<讲者名>，内容关于<领域>。"
$PY $SK/scripts/captions.py $P
```
`--prompt` 写上讲者名字、常提的专名和领域，专名转写会准很多。需要消音的词不直接消：按 captions.md「消音」先列出来问用户，同意了才写进配置。

### 4. 做成片素材：限幅（用户要的变速、消音；片头要防抖时先问）
```bash
$PY $SK/scripts/stabilize_intro.py $P --probe        # 只量片头抖动，不出片（有系列片头时才需要）
$PY $SK/scripts/make_source.py $P                     # 出 $P/fast/：-1dB 限幅（+ 用户同意过的消音）；默认不变速
$PY $SK/scripts/make_source.py $P --speed 1.1         # 只有用户说了倍速才这样：片头原速、之后整体变速，字幕/剪点/转写换算到新时间线
```
片头抖得明显时（见 [references/motion.md](references/motion.md)「片头防抖」），告诉用户抖多少、要裁多少，问要不要防抖；同意了再 `stabilize_intro.py $P`，`make_source.py` 加 `--stab`。

### 5. 渲 9:16
配置 `$P/剪辑配置.json`（样例 [references/config-example.json](references/config-example.json)）：系列名、期数（都可留空）、点缀色、倍速（不写就是 1）、每节从哪句字幕开始和一句摘要。摘要怎么写、版式和配色见 [references/layout.md](references/layout.md)；呼吸、换景别、融合的参数和来由见 [references/motion.md](references/motion.md)。
```bash
$PY $SK/scripts/fix_edits.py $P                       # 剪点按真实画面校正（剪辑表算的剪点会和拼出来的视频差 1–8 帧）
$PY $SK/scripts/render.py $P --still 60               # 先出一张静帧给用户看版式
$PY $SK/scripts/render.py $P --out $P/成片_vN_竖屏.mp4
```
改版式、配色、摘要只改配置重渲，不动剪辑。

### 6. 自查
```bash
$PY $SK/scripts/qa.py $P $P/成片_vN_竖屏.mp4
$PY $SK/scripts/sync_check.py $P/成片_vN_竖屏.mp4 $P/fast/cut.mp4     # 量口型，声-画中位超过 20ms 不交付
```
`qa.py` 查剪点前后背景跳动（>6px 报出来）、剪点处缩放连续、三段字幕和声音对齐、消音处听不到被消的词、片头响指处逐帧硬切、响度峰值。再自己抽剪点处字幕切换逐帧、转场中间帧原尺寸各看一眼。判法见 motion.md「自查」。

### 7. 屏幕文字自查
`qa.py` 顺手写出 `$P/屏幕文字_成片vN.md`（上黑边文字 + 全部字幕）。项目里装了合规 / 敏感词检查的 skill 就交给它只读检测；没有就自己逐句过一遍敏感词表（captions.md）和目标平台的常见违规词，并把文件交给用户核。字幕是讲者原话，口头禅、连词多这类不改；摘要是你写的，有问题就改。检查没做完不说已通过。

### 8. 交付
给成片路径（清晰版，不另压手机版）、时长、这一版改了什么、剪了哪些口误、自查数字、屏幕文字自查结论和是否需要人工复核。

## 硬规则

0. 音画不分离：同一份源、同一张剪辑表、同一批剪点一起切；不单独处理音轨再合回去，不凭推算平移声音，声音要挪就用 `prepare_source.py` / `sync_check.py` 量出来再挪。
1. 画面不加 B-roll、图形段、贴纸、信息卡、BGM、音效；原画面不拉伸、不调色。
2. 口误和重复剪（重复留最后一遍）；≤0.4 秒的纯停顿不剪，>0.4 秒的剪掉；每个剪点两侧空白合计 0.1–0.2 秒（约 0.14）；剪剩不到 0.3 秒的碎片删掉。
3. 全片一个缩放中心；呼吸算在剪完的时间线上、跨剪点连续；换景别 0.5 秒缓推，不和剪点叠在一起；剪点用 8 帧光流融合，字幕不进融合；渲之前剪点按真实画面校正（`fix_edits.py`）。
4. 字幕出现可以轻弹，消失一帧直接消失；字幕和声音说的一致（剪掉的字字幕也删）；敏感词按 captions.md 替换。
5. 上黑边只放系列名、期数、分节进度条、本节编号和摘要，淡色点缀，不放时间和跟台词走的信息；内容放在顶部约 110px 以下。
6. 有系列片头时：片头原速、不推拉不呼吸；响指那一刀硬切，不融合不叠化。
7. 片头防抖、人声消音都不主动做：先说明是什么、为什么，问用户，同意了才做。变速是可选项：用户没说倍速就不变速。
8. 每次改剪辑都从第 2 步往下全部重跑，并重做自查。
