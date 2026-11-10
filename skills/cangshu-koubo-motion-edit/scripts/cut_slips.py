#!/usr/bin/env python3
"""plan 写好以后才发现的口误：不改 plan 里任何时间，只剪素材 + 写 meta.cuts，渲染时自动换算时间。

用法: python3 cut_slips.py <工程> 174.93-176.02 [起-止 ...]   （秒，基座剪完的时间线 = public/words.json 的时间）
做的事：
  1. public/footage34.mp4 → footage34_cut.mp4（音频剪点前后各 20ms 淡入淡出，防爆音；crf 10 不降清晰度）
     public/person.webm  → person_cut.webm（保留透明通道）
  2. 打印要写进 build_plan / plan.json meta 的字段：footage、person 换成剪好的文件，footageSrc、personSrc 留原文件
     （split_plates.py 从原文件取帧），cuts 列出剪掉的段。
之后 Film.tsx 用 warp（成片时间 → 原时间）取画面和字幕，sfx.tsx 用 unwarp 把音效挪到成片时间、落在剪掉那段里的音效不出，
Root.tsx 的总时长自动减掉。剪点选在停顿里（看 words.json 的字间空隙或波形），别切在字中间。
还没写 plan 时发现的 NG，回基座重剪（cangshu-koubo-wudongxiao 的 edl.py rebuild --remove，再 from_base.py），不用这个。
"""
import json, subprocess, sys
from pathlib import Path

P = Path(sys.argv[1]); pub = P / "public"
cuts = sorted((float(a), float(b)) for a, b in (x.split("-") for x in sys.argv[2:]))
if not cuts: sys.exit("要给至少一段 起-止")
keep, t = [], 0.0
for a, b in cuts:
    keep.append((t, a)); t = b
keep.append((t, None))

def trim(kind, s, e):
    return f"{kind}trim={s}" + (f":{e}" if e is not None else "")

def run(src, dst, audio, alpha):
    fc, maps = [], []
    for i, (s, e) in enumerate(keep):
        fc.append(f"[0:v]{trim('', s, e)},setpts=PTS-STARTPTS[v{i}]")
        if audio:
            fades = []
            if i > 0: fades.append("afade=t=in:st=0:d=0.02")
            if e is not None: fades.append(f"afade=t=out:st={e - s - 0.02:.3f}:d=0.02")
            fc.append(f"[0:a]{trim('a', s, e)},asetpts=PTS-STARTPTS" + "".join("," + f for f in fades) + f"[a{i}]")
        maps.append(f"[v{i}]" + (f"[a{i}]" if audio else ""))
    fc.append("".join(maps) + f"concat=n={len(keep)}:v=1:a={1 if audio else 0}" + ("[v][a]" if audio else "[v]"))
    cmd = ["ffmpeg", "-v", "error", "-y"] + (["-c:v", "libvpx-vp9"] if alpha else []) + ["-i", str(src), "-filter_complex", ";".join(fc), "-map", "[v]"]
    if audio: cmd += ["-map", "[a]", "-c:v", "libx264", "-crf", "10", "-preset", "slow", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "256k", "-ar", "48000"]
    else: cmd += ["-c:v", "libvpx-vp9", "-pix_fmt", "yuva420p", "-crf", "18", "-b:v", "0", "-row-mt", "1"]
    subprocess.run(cmd + [str(dst)], check=True)
    d = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(dst)], capture_output=True, text=True).stdout.strip()
    print(f"{dst.name}  {d}s")

run(pub / "footage34.mp4", pub / "footage34_cut.mp4", True, False)
if (pub / "person.webm").exists(): run(pub / "person.webm", pub / "person_cut.webm", False, True)
meta = {"footage": "footage34_cut.mp4", "footageSrc": "footage34.mp4", "cuts": [{"from": a, "to": b} for a, b in cuts]}
if (pub / "person.webm").exists(): meta |= {"person": "person_cut.webm", "personSrc": "person.webm"}
print("写进 plan.meta：", json.dumps(meta, ensure_ascii=False))
print(f"共剪掉 {sum(b - a for a, b in cuts):.2f} 秒；meta.duration 不用改（仍是原时间线总长）")
