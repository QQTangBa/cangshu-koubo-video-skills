#!/usr/bin/env python3
"""下载本 skill 用的音效库到指定目录，目录结构和 references/sfx-palette.json 里的路径一致：
  <目录>/音效库/mixkit_常用30/<编号>_<原名>.mp3        Mixkit 30 个
  <目录>/音效库/kenney_ui_audio/Audio/*.ogg           Kenney UI Audio（CC0）
  <目录>/音效库/kenney_impact_sounds/Audio/*.ogg      Kenney Impact Sounds（CC0）
合计约 3.3MB。授权：Mixkit 免费商用、不用署名，但素材文件不能单独转发（所以不随 skill 打包，用到时自己下）；Kenney 是 CC0。
下载前要先征得用户同意（列出来源和大小）。只用 curl 下载、Python 标准库解压，不执行下载来的任何东西。
用法: python3 fetch_sfx_library.py <目录>            下载（已存在的文件跳过）
      python3 fetch_sfx_library.py <目录> --check    只检查缺哪些，不下载
下载完用 build_sfx.py <工程>/public --library <目录> 构建，或 export KOUBO_SFX_LIB=<目录>。"""
import argparse, json, os, re, subprocess, sys, zipfile
from pathlib import Path

MIXKIT = [(1489, "Air woosh"), (1490, "Fast whoosh transition"), (1461, "Short wind swoosh"), (166, "Fast small sweep transition"),
          (168, "Fast air sweep transition"), (1168, "Woosh wind"), (175, "Short transition sweep"),
          (2358, "Long pop"), (2364, "Hard pop click"), (2357, "Bubble pop up alert notification"), (2356, "Dry pop up notification alert"),
          (2925, "Soap bubble sound"), (729, "Cartoon bubbles pop"),
          (1113, "Mouse click close"), (2997, "Clear mouse clicks"), (1117, "Classic click"), (2585, "On or off light switch tap"),
          (933, "Bell notification"), (931, "Service bell"), (586, "Attention bell ding"), (2870, "Correct answer tone"),
          (1133, "Camera shutter click"), (1530, "Paper slide"), (1104, "Page turn single"), (1386, "Keyboard typing"), (1125, "Typewriter soft click"),
          (2894, "Boing hit sound"), (2151, "Soft quick punch"), (1311, "Water splash"), (1317, "Water bubble")]
KENNEY = {"kenney_ui_audio": "https://kenney.nl/media/pages/assets/ui-audio/490d233f68-1677590494/kenney_ui-audio.zip",
          "kenney_impact_sounds": "https://kenney.nl/media/pages/assets/impact-sounds/87b4ddecda-1677589768/kenney_impact-sounds.zip"}

ap = argparse.ArgumentParser(); ap.add_argument("dir"); ap.add_argument("--check", action="store_true")
a = ap.parse_args()
root = Path(a.dir).expanduser().resolve() / "音效库"
palette = json.loads((Path(__file__).resolve().parent.parent / "references/sfx-palette.json").read_text())
need = sorted({it["src"] for items in palette["roles"].values() for it in items})
mk = lambda i, n: root / "mixkit_常用30" / f"{i}_{re.sub(r'[^a-z0-9]+', '_', n.lower()).strip('_')}.mp3"


def missing():
    return [s for s in need if not (root.parent / s).exists()]


if a.check:
    m = missing()
    print(f"清单用到 {len(need)} 个素材，缺 {len(m)} 个" + ("" if m else "：齐了")); [print("  " + x) for x in m]
    sys.exit(1 if m else 0)

(root / "mixkit_常用30").mkdir(parents=True, exist_ok=True)
for i, n in MIXKIT:
    f = mk(i, n)
    if f.exists(): continue
    r = subprocess.run(["curl", "-sfL", "-A", "Mozilla/5.0", "-e", "https://mixkit.co/", "-o", str(f), f"https://assets.mixkit.co/active_storage/sfx/{i}/{i}-preview.mp3"])
    print(("ok  " if r.returncode == 0 else "失败 ") + f.name)
for name, url in KENNEY.items():
    d = root / name
    if (d / "Audio").is_dir(): continue
    d.mkdir(parents=True, exist_ok=True); z = d / url.rsplit("/", 1)[1]
    if subprocess.run(["curl", "-sfL", "-A", "Mozilla/5.0", "-o", str(z), url]).returncode != 0:
        print("失败 " + z.name); continue
    with zipfile.ZipFile(z) as zf:
        for m in zf.namelist():  # 只解 Audio/ 和授权文件，拒绝绝对路径和 ..
            if m.startswith("/") or ".." in Path(m).parts or not (m.startswith("Audio/") or m == "License.txt"): continue
            zf.extract(m, d)
    print("ok  " + name)
m = missing()
print(f"完成：{root}；清单用到的 {len(need)} 个素材" + ("全齐" if not m else f"还缺 {len(m)} 个：" + "、".join(m)))
sys.exit(1 if m else 0)
