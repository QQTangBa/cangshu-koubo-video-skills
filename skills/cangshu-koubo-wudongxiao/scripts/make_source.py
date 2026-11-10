#!/usr/bin/env python3
"""做成片素材：全程 -1dB 限幅，配置里有 bleep 就在那几处做滴声消音；用户说了倍速才变速（片头到响指那一刀原速，之后整体变速，声音 atempo 不变调）。
字幕、剪点、逐字转写按「响指前不变、响指后 ÷ 倍速」换算到新时间线。
用法: python make_source.py <工程> [--speed 1.1] [--stab]
  --speed 不给就读 剪辑配置.json 的 speed，再没有就是 1（不变速，默认）；--stab 用 stabilize_intro.py 出的 intro_stab.mp4 当片头（用户同意防抖时才加）。
读: cut.mp4、captions.json、cut_pieces.json、cut_transcript.json、剪辑配置.json（bleep 是原片时间，只放用户同意消音的词）
写: <工程>/fast/ 下同名四个文件（cut.mp4 是成片素材）；每处消音打印一行音量条，D/d 是被滴盖住的部分，核对前后的字没被盖到"""
import argparse, json, subprocess
from pathlib import Path
import numpy as np

ap = argparse.ArgumentParser(); ap.add_argument("proj"); ap.add_argument("--speed", type=float); ap.add_argument("--stab", action="store_true")
a = ap.parse_args(); P = Path(a.proj); Q = P / "fast"; Q.mkdir(exist_ok=True)
cfg = json.loads((P / "剪辑配置.json").read_text()) if (P / "剪辑配置.json").exists() else {}
K = a.speed or cfg.get("speed", 1.0)  # 默认不变速，用户说了倍速才变
pcs = json.loads((P / "cut_pieces.json").read_text())
INTRO = json.loads((P / "edl.json").read_text()).get("intro", True) if (P / "edl.json").exists() else True
FPS = 30; SF = round(pcs[1]["at"] * FPS) if INTRO and len(pcs) > 1 else 0; S = SF / FPS   # 响指那一刀的帧号和时间；没有系列片头就从头变速
f = lambda t: t if t < S else S + (t - S) / K

def to_cut(src_t):  # 原片时间 → 剪辑后时间
    p = next((p for p in pcs if p["src_from"] - 1e-3 <= src_t <= p["src_to"] + 1e-3), None)
    if p is None: raise SystemExit(f"消音位置 {src_t} 不在任何保留段里（被剪掉了？），回头核 剪辑配置.json 的 bleep")
    return p["at"] + src_t - p["src_from"]
bl = [(b["word"], f(to_cut(b["src_from"])), f(to_cut(b["src_to"]))) for b in cfg.get("bleep", [])]

intro = P / "intro_stab.mp4" if a.stab else P / "cut.mp4"
NORM = "scale=1440:1920:force_original_aspect_ratio=increase:flags=lanczos,crop=1440:1920,setsar=1"  # 统一成 3:4 1440×1920（原片就是这个尺寸时不变；别的比例居中裁）
fc = ([f"[0:v]trim=end_frame={SF},setpts=PTS-STARTPTS,{NORM}[v0]", f"[1:a]atrim=end={S:.6f},asetpts=PTS-STARTPTS[a0]"] if SF else []) + \
     [f"[1:v]trim=start_frame={SF},setpts=(PTS-STARTPTS)/{K},fps={FPS},{NORM}[v1]", f"[1:a]atrim=start={S:.6f},asetpts=PTS-STARTPTS,atempo={K}[a1]",
      ("[v0][a0][v1][a1]concat=n=2:v=1:a=1[v][ac]" if SF else "[v1][a1]concat=n=1:v=1:a=1[v][ac]")]
chain = "[ac]alimiter=limit=0.891:attack=5:release=50:level=false"
if bl:
    chain += ",volume=0:enable='" + "+".join(f"between(t,{x:.3f},{y:.3f})" for _, x, y in bl) + "'"
fc.append(chain + ("[m]" if bl else "[a]"))
for i, (_, x, y) in enumerate(bl):
    d = y - x
    fc.append(f"aevalsrc='0.2*sin(2*PI*1000*t)|0.2*sin(2*PI*1000*t)':s=48000:d={d:.3f},afade=t=in:d=0.005,afade=t=out:st={d - 0.005:.3f}:d=0.005,adelay=delays={round(x * 1000)}:all=1[b{i}]")
if bl: fc.append("[m]" + "".join(f"[b{i}]" for i in range(len(bl))) + f"amix=inputs={len(bl) + 1}:normalize=0:duration=first[a]")
subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(intro), "-i", str(P / "cut.mp4"), "-filter_complex", ";".join(fc), "-map", "[v]", "-map", "[a]",
                "-c:v", "libx264", "-crf", "10", "-preset", "slow", "-pix_fmt", "yuv420p", "-r", str(FPS), "-c:a", "aac", "-b:a", "256k", "-ar", "48000",
                str(Q / "cut.mp4")], check=True)

# atempo 让声音晚约 15ms（实测）：量出来扣掉，只重编声音，画面不动
if K != 1:
    from sync_check import retime_lag
    late = retime_lag(Q / "cut.mp4", P / "cut.mp4", K, S)
    if late > 0.003:
        tmp = Q / "_cut_tmp.mp4"
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(Q / "cut.mp4"), "-map", "0:v", "-map", "0:a", "-c:v", "copy", "-af", f"atrim=start={late:.4f},asetpts=PTS-STARTPTS",
                        "-c:a", "aac", "-b:a", "256k", "-ar", "48000", str(tmp)], check=True)
        tmp.replace(Q / "cut.mp4")
    print(f"变速后声音晚 {late * 1000:.0f}ms，" + ("已扣掉" if late > 0.003 else "不用扣"))

caps = json.loads((P / "captions.json").read_text())
for c in caps: c["start"], c["end"] = round(f(c["start"]), 3), round(f(c["end"]), 3)
(Q / "captions.json").write_text(json.dumps(caps, ensure_ascii=False, indent=1))
for p in pcs: p["at"] = round(f(p["at"]), 4)
(Q / "cut_pieces.json").write_text(json.dumps(pcs, indent=1))
(Q / "cut_pieces_校正前.json").unlink(missing_ok=True)  # 新素材的剪点要重新校正（fix_edits.py）
tr = json.loads((P / "cut_transcript.json").read_text())
for s in tr["segments"]:
    s["start"], s["end"] = f(s["start"]), f(s["end"])
    for w in s.get("words", []): w["start"], w["end"] = f(w["start"]), f(w["end"])
(Q / "cut_transcript.json").write_text(json.dumps(tr, ensure_ascii=False))
dur = float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(Q / "cut.mp4")]))
print(f"成片素材 {dur:.2f}s（" + (f"片头 {S:.2f}s 原速，之后 {K} 倍" if K != 1 else "不变速") + ("、片头已防抖" if a.stab else "") + f"）→ {Q / 'cut.mp4'}")

# 消音核对：没消音的声音（同样变速）上标出被滴盖住的部分
for word, x, y in bl:
    s0 = x - 0.4; pre = lambda t: t if t < S else S + (t - S) * K
    raw = subprocess.run(["ffmpeg", "-v", "error", "-ss", f"{pre(s0):.3f}", "-t", f"{(y - x + 0.8) * K:.3f}", "-i", str(P / "cut.mp4"),
                          "-af", f"atempo={K}", "-ac", "1", "-ar", "16000", "-f", "s16le", "-"], capture_output=True).stdout
    pcm = np.frombuffer(raw, np.int16).astype(np.float32) / 32768; line = ""
    for k in range(int((y - x + 0.8) / 0.02)):
        t = s0 + k * 0.02; seg = pcm[int(k * 320):int(k * 320) + 320]; v = 20 * np.log10(np.sqrt(np.mean(seg ** 2)) + 1e-9) if len(seg) else -90
        line += ("D" if v > -30 else "d") if x <= t < y else ("█" if v > -24 else "▆" if v > -30 else "▃" if v > -36 else "·")
    print(f"消音「{word}」{x:.2f}-{y:.2f}s：{s0:.2f} |{line}|  D/d 两边应该是 · 或很弱，说明前后的字没被盖到")
