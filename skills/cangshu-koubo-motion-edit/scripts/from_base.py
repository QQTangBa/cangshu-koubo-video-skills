#!/usr/bin/env python3
"""从基座（cangshu-koubo-wudongxiao）的剪辑结果出动效管线的素材。剪口误、剪停顿、对字幕都在基座里做完，这里只做动效版要的：
  1. 剪点按真实画面校正（基座的 fix_edits.py；已经校正过就跳过）；
  2. 裁 3:4、缩到 1080×1440 30fps，按脸放在画面 --place 高度；轻锐化、crf 10（清晰度要求见 memory：口播出片保清晰度）；
  3. 每个剪点（片头响指那一刀除外）烤进 8 帧光流融合，和基座同一套做法，之后在 Remotion 里推拉也不会露硬跳；
  4. 写 words.json（逐字时间，br 标句尾）、cuts.json（剪点秒数），把基座的 captions.json、字幕源.txt 拷到工程根目录。
用法: python from_base.py <基座目录> <工程>/public [--speed 1.1] [--face-y auto|0.44] [--place 0.38] [--no-morph]
  <基座目录> 里要有：cut.mp4、cut_pieces.json、cut_transcript.json、captions.json（基座第 1–3 步的输出）
  --speed：默认不变速；用户说了倍速才给。给了就先用基座的 make_source.py 出变速版（<基座目录>/fast/，系列片头原速、之后整体变速、
  声音不变调，字幕和剪点跟着换算），再从变速版出 3:4 素材。"""
import argparse, json, shutil, statistics, subprocess, sys
from pathlib import Path
import cv2, numpy as np

ap = argparse.ArgumentParser(); ap.add_argument("base"); ap.add_argument("public")
ap.add_argument("--speed", type=float, default=1.0); ap.add_argument("--face-y", default="auto"); ap.add_argument("--place", type=float, default=0.38); ap.add_argument("--no-morph", action="store_true")
a = ap.parse_args(); B = Path(a.base); OUT = Path(a.public); OUT.mkdir(parents=True, exist_ok=True); PROJ = OUT.parent
BASE_SK = Path(__import__("os").environ.get("KOUBO_BASE_SK") or Path(__file__).resolve().parents[2] / "cangshu-koubo-wudongxiao/scripts")  # 基座和本 skill 装在同一个 skills 目录下
FPS, OW, OH, DIS = 30, 1080, 1440, 8
for f in ("cut.mp4", "cut_pieces.json", "cut_transcript.json", "captions.json"):
    if not (B / f).exists(): sys.exit(f"基座目录缺 {f}：先按 cangshu-koubo-wudongxiao 第 1–3 步剪好、对好字幕")
# 0. 用户要了倍速才变速：用基座同一套做法出变速版，之后都从变速版取
if a.speed != 1.0:
    subprocess.run([sys.executable, str(BASE_SK / "make_source.py"), str(B), "--speed", str(a.speed)], check=True)
D = B / "fast" if a.speed != 1.0 else B
src = D / "cut.mp4"

# 1. 剪点校正
if not (D / "cut_pieces_校正前.json").exists():
    subprocess.run([sys.executable, str(BASE_SK / "fix_edits.py"), str(src), str(D / "cut_pieces.json")], check=True)
pcs = json.loads((D / "cut_pieces.json").read_text())
INTRO = json.loads((B / "edl.json").read_text()).get("intro", True) if (B / "edl.json").exists() else True
SNAP_F = round(pcs[1]["at"] * FPS) if INTRO and len(pcs) > 1 else -1  # 系列片头响指那一刀不融合
edit_frames = {round(p["at"] * FPS) for p in pcs[1:]} - {SNAP_F}

# 2. 裁切框
pr = json.loads(subprocess.check_output(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height:format=duration", "-of", "json", str(src)]))
W, H = pr["streams"][0]["width"], pr["streams"][0]["height"]; dur = float(pr["format"]["duration"])
if a.face_y == "auto":
    det = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml"); ys = []
    for k in range(12):
        img = subprocess.run(["ffmpeg", "-v", "error", "-ss", f"{dur * (k + 0.5) / 12:.3f}", "-i", str(src), "-frames:v", "1", "-f", "image2pipe", "-vcodec", "png", "-"], capture_output=True).stdout
        g = cv2.imdecode(np.frombuffer(img, np.uint8), cv2.IMREAD_GRAYSCALE)
        if g is None: continue
        fs = det.detectMultiScale(g, 1.1, 6, minSize=(g.shape[1] // 10,) * 2)
        if len(fs): x, y, w, h = max(fs, key=lambda r: r[3]); ys.append((y + h / 2) / g.shape[0])
    face_y = statistics.median(ys) if ys else 0.42
else: face_y = float(a.face_y)
cw, ch = (W, round(W * 4 / 3)) if W / H < 3 / 4 else (round(H * 3 / 4), H)
cx = (W - cw) // 2; cy = int(min(max(face_y * H - a.place * ch, 0), H - ch))

# 3. 逐帧裁切 + 剪点光流融合
_dis = cv2.DISOpticalFlow_create(cv2.DISOPTICAL_FLOW_PRESET_MEDIUM)
_gx, _gy = np.meshgrid(np.arange(OW, dtype=np.float32), np.arange(OH, dtype=np.float32))
def morph(A, Bf, al):
    """A=剪点前最后一帧，Bf=剪点后当前帧：A 顺着光流往 Bf 的姿势挪 al，Bf 从 A 的姿势挪回来 1-al，再按 al 混合"""
    sw, sh = OW // 3, OH // 3
    ga = cv2.cvtColor(cv2.resize(A, (sw, sh)).astype(np.uint8), cv2.COLOR_BGR2GRAY); gb = cv2.cvtColor(cv2.resize(Bf, (sw, sh)).astype(np.uint8), cv2.COLOR_BGR2GRAY)
    up = lambda f: cv2.resize(f, (OW, OH), interpolation=cv2.INTER_LINEAR) * 3.0
    fab, fba = up(_dis.calc(ga, gb, None)), up(_dis.calc(gb, ga, None))
    wa = cv2.remap(A, _gx + al * fba[..., 0], _gy + al * fba[..., 1], cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE)
    wb = cv2.remap(Bf, _gx + (1 - al) * fab[..., 0], _gy + (1 - al) * fab[..., 1], cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE)
    return wa * (1 - al) + wb * al
def eio(x): x = max(0.0, min(1.0, x)); return x * x * (3 - 2 * x)
dec = subprocess.Popen(["ffmpeg", "-v", "error", "-i", str(src), "-r", str(FPS), "-f", "rawvideo", "-pix_fmt", "bgr24", "-"], stdout=subprocess.PIPE)
enc = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "bgr24", "-s", f"{OW}x{OH}", "-r", str(FPS), "-i", "-", "-i", str(src),
                        "-map", "0:v", "-map", "1:a", "-vf", "unsharp=5:5:0.35:5:5:0", "-c:v", "libx264", "-crf", "10", "-preset", "slow", "-pix_fmt", "yuv420p",
                        "-c:a", "copy", "-shortest", str(OUT / "footage34.mp4")], stdin=subprocess.PIPE)
prev = held = None; held_at = -99; i = 0
while True:
    buf = dec.stdout.read(W * H * 3)
    if len(buf) < W * H * 3: break
    fr = np.frombuffer(buf, np.uint8).reshape(H, W, 3)[cy:cy + ch, cx:cx + cw]
    fr = cv2.resize(fr, (OW, OH), interpolation=cv2.INTER_AREA if cw > OW else cv2.INTER_LANCZOS4).astype(np.float32)
    if not a.no_morph:
        if i in edit_frames and prev is not None: held, held_at = prev, i
        raw = fr
        if 0 <= i - held_at < DIS: fr = morph(held, fr, eio((i - held_at + 1) / (DIS + 1)))
        prev = raw
    enc.stdin.write(np.clip(fr, 0, 255).astype(np.uint8).tobytes()); i += 1
enc.stdin.close(); enc.wait(); dec.stdout.close(); dec.wait()

# 4. 逐字时间、剪点、字幕
tr = json.loads((D / "cut_transcript.json").read_text()); words = []
for seg in tr["segments"]:
    ws = seg.get("words", [])
    for k, w in enumerate(ws):
        words.append({"w": w["word"].strip(), "start": round(w["start"], 3), "end": round(w["end"], 3), **({"br": True} if k == len(ws) - 1 else {})})
(OUT / "words.json").write_text(json.dumps(words, ensure_ascii=False))
(OUT / "cuts.json").write_text(json.dumps([round(p["at"], 3) for p in pcs[1:]]))
shutil.copy(D / "captions.json", PROJ / "captions.json")
if (B / "字幕源.txt").exists(): shutil.copy(B / "字幕源.txt", PROJ / "字幕源.txt")
print(("不变速；" if a.speed == 1.0 else f"已按 {a.speed} 倍变速；") + f"原画面 {W}x{H}，脸中心 y={face_y:.2f}，裁切 {cw}x{ch}+{cx}+{cy} → 1080x1440，{i} 帧 {i / FPS:.2f}s；"
      f"剪点 {len(edit_frames)} 个{'（已烤进 8 帧光流融合）' if not a.no_morph else ''}；words.json {len(words)} 字；captions.json、字幕源.txt 已拷到 {PROJ}")
