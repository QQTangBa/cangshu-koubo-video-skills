#!/usr/bin/env python3
"""第 0 步：把素材整理成剪辑用的源 source.mov：画面一帧不动（直接拷贝），声音转 48k PCM，音画起点都对齐到 0。
之后所有脚本都用这份源：剪辑表、转写、切片一条时间线，音画按同一批剪点一起切。

两种用法：
  python prepare_source.py <原片> <工程>/source.mov
      直接用原片（默认）。原片容器里音频可能比视频晚开始几十毫秒，这是录制时真实的音画关系，补静音保留下来。
  python prepare_source.py <原片> <预处理导出.mp4> <工程>/source.mov
      可选：先在任意软件（剪映 / CapCut / Premiere / DaVinci 等）给原片做过美颜、降噪、人声增强，导出了同时长的片子。
      导出后音频常整体晚几十毫秒，这里拿原片当基准量出偏差、扣掉，画面用导出片。
写: source.mov（H.264 拷贝 + PCM）、source_sync.json（量到的偏差）"""
import json, subprocess, sys
from pathlib import Path
import numpy as np


def starts(p):
    st = json.loads(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "stream=codec_type,start_time", "-of", "json", str(p)]))["streams"]
    return {x["codec_type"]: float(x.get("start_time") or 0) for x in st}


def check(out):
    s = starts(out)
    if abs(s.get("audio", 0) - s.get("video", 0)) > 0.01:
        sys.exit(f"整理后音画起点仍差 {s.get('audio', 0) - s.get('video', 0):.3f} 秒，人工看一下素材")


if len(sys.argv) == 3:
    raw, out = sys.argv[1], Path(sys.argv[2])
    s = starts(raw); off = s.get("audio", 0) - s.get("video", 0)
    if abs(s.get("video", 0)) < 0.005:
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", raw, "-map", "0:v:0", "-map", "0:a:0", "-c:v", "copy",
                        "-af", "aresample=async=1:first_pts=0", "-ar", "48000", "-c:a", "pcm_s16le", str(out)], check=True)
    else:  # 视频不从 0 开始：画面重编码到 0 起点，声音按原来的音画差挪
        fix = f"adelay={int(round(off * 1000))}:all=1" if off >= 0 else f"atrim=start={-off:.4f}"
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", raw, "-map", "0:v:0", "-map", "0:a:0", "-vf", "setpts=PTS-STARTPTS",
                        "-c:v", "libx264", "-crf", "8", "-preset", "slow", "-pix_fmt", "yuv420p",
                        "-af", f"asetpts=PTS-STARTPTS,{fix},asetpts=PTS-STARTPTS", "-ar", "48000", "-c:a", "pcm_s16le", str(out)], check=True)
    check(out)
    json.dump({"original": raw, "export": None, "audio_start_offset_ms": round(off * 1000, 1)}, open(out.parent / "source_sync.json", "w"), ensure_ascii=False, indent=1)
    print(f"已写 {out}：画面原样，声音转 PCM（原片音频比视频晚 {off * 1000:.0f}ms 开始，已保留）")
    sys.exit(0)

if len(sys.argv) != 4: sys.exit(__doc__)
sys.path.insert(0, str(Path(__file__).resolve().parent))
from sync_check import asig, measure, vsig

raw, exp, out = sys.argv[1], sys.argv[2], Path(sys.argv[3])
st = json.loads(subprocess.check_output(["ffprobe", "-v", "error", "-select_streams", "v:0", "-count_packets", "-show_entries", "stream=r_frame_rate,avg_frame_rate,nb_read_packets:format=duration", "-of", "json", exp]))
s = st["streams"][0]; dur = float(st["format"]["duration"])
if s["r_frame_rate"] != s["avg_frame_rate"]: print(f"注意：导出片不是恒定帧率（{s['r_frame_rate']} / {s['avg_frame_rate']}），剪点可能差一帧；导出时选恒定帧率")
rv, ra, fv, fa = vsig(raw), asig(raw), vsig(exp), asig(exp)
win = [(float(t), 15.0, float(t)) for t in np.linspace(5, max(5, dur - 20), 12)]
rows = measure(fv, fa, rv, ra, win)
good = [r for r in rows if r[4]]
if len(good) < 3: sys.exit("可信的测量窗太少，量不出偏差：先确认导出片和原片是同一条、时长一致（素材短于 30 秒时也可能量不准）")
d = float(np.median([r[3] for r in good]))  # 声-画，负数 = 导出片声音比原片的音画关系晚
spread = max(r[3] for r in good) - min(r[3] for r in good)
print(f"导出片相对原片：声-画 {d:+.0f}ms（{len(good)} 窗，散布 {spread:.0f}ms）")
if spread > 80: print("注意：各段偏差差得多，可能有漂移，人工看一眼")
sec = abs(d) / 1000
fix = f"atrim=start={sec:.4f},asetpts=PTS-STARTPTS" if d < 0 else f"adelay={int(round(sec * 1000))}:all=1,asetpts=PTS-STARTPTS"
subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", exp, "-map", "0:v", "-map", "0:a", "-c:v", "copy", "-af", f"aresample=async=1:first_pts=0,{fix}", "-ar", "48000", "-c:a", "pcm_s16le", str(out)], check=True)
check(out)
json.dump({"original": raw, "export": exp, "audio_picture_ms": round(d, 1), "spread_ms": round(spread, 1)}, open(out.parent / "source_sync.json", "w"), ensure_ascii=False, indent=1)
print(f"已写 {out}：画面原样拷贝，声音{'提前' if d < 0 else '延后'} {sec * 1000:.0f}ms")
