#!/usr/bin/env python3
"""9:16 成片渲染：3:4 原画面（1440×1920）缩到 1080×1440 嵌在 1080×1920 中间（上黑边 300、下黑边 180），不拉伸。
  上黑边：系列名 + DAY、分节进度条、本节编号和摘要（整行居中，换节时上浮淡出 / 升起）；
  画面：全片一个缩放中心；景别（全 1.03 / 中 1.13 / 近 1.20）按情绪换、0.5 秒缓推且避开剪点；呼吸 0.08 跨剪点连续；
        剪点 8 帧光流融合（片头响指那一刀除外）；片头不推拉不呼吸；
  字幕：白粗字重点词黄，出现 0.18 秒轻弹，消失一帧消失，不进融合。
用法: python render.py <工程> --out <成片.mp4>     读 <工程>/fast/（make_source.py 的输出）和 <工程>/剪辑配置.json
      python render.py <工程> --still <秒> [--out x.png]   只出一张静帧（不含转场融合），给用户看版式
出片时同时写 <成片>.cam.json（每帧缩放），qa.py 用。参数和来由见 references/motion.md、layout.md。"""
import argparse, json, subprocess
from pathlib import Path
import cv2, numpy as np
from PIL import Image, ImageDraw, ImageFont

ap = argparse.ArgumentParser(); ap.add_argument("proj"); ap.add_argument("--out"); ap.add_argument("--still", type=float)
ap.add_argument("--src-dir", default="fast")
a = ap.parse_args(); P = Path(a.proj); Q = P / a.src_dir; src = Q / "cut.mp4"
cfg = json.loads((P / "剪辑配置.json").read_text())
W, H, FPS = 1440, 1920, 30
OW, OH, VY, VW, VH = 1080, 1920, 300, 1080, 1440; K = VW / W
TOT = float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(src)])); N = round(TOT * FPS)
# 字体：默认 macOS 自带的冬青黑体（Hiragino Sans GB，W3=index 0、W6=index 2）和 DIN Condensed Bold；别的系统在剪辑配置.json 里写 font / font_num
HG = cfg.get("font", "/System/Library/Fonts/Hiragino Sans GB.ttc"); DIN = cfg.get("font_num", "/System/Library/Fonts/Supplemental/DIN Condensed Bold.ttf")
FI = (cfg.get("font_index_regular", 0), cfg.get("font_index_bold", 2)) if HG.endswith(".ttc") else (0, 0)
for _f in (HG, DIN):
    if not Path(_f).exists(): raise SystemExit(f"找不到字体 {_f}：在 剪辑配置.json 里用 font（中文粗体，.ttc 时配 font_index_bold / font_index_regular）和 font_num（数字字体）指定")
BG = (11, 11, 12); WHITE = (255, 255, 255); YEL = (255, 210, 63)  # 亮黄只给字幕重点词
ACCENTS = {"鼠尾草绿": (160, 196, 172), "雾蓝": (156, 182, 222), "冷白灰": (214, 217, 224), "丁香紫": (186, 174, 222)}
_acc = cfg.get("accent", "鼠尾草绿")   # 预设名，或直接写 [R, G, B]
ACC = tuple(_acc) if isinstance(_acc, list) else ACCENTS[_acc]
caps = json.loads((Q / "captions.json").read_text()); pcs = json.loads((Q / "cut_pieces.json").read_text())
CHAPTERS = []
for ch in cfg["chapters"]:
    k = ch.get("from_caption", "")
    st = 0.0 if not k else next((c["start"] for c in caps if c["text"] == k), None)
    if st is None: raise SystemExit(f"剪辑配置.json 里分节「{ch['title']}」的 from_caption「{k}」在字幕里找不到，字幕改过就同步改配置")
    CHAPTERS.append((st, ch["title"]))
INTRO = json.loads((P / "edl.json").read_text()).get("intro", True) if (P / "edl.json").exists() else True
SNAP = pcs[1]["at"] if INTRO else 0.0   # 系列片头到响指那一刀为止；没有片头就是 0
edits = [p["at"] for p in pcs[1:] if 0.05 < p["at"] < TOT - 0.05]

def font(px, w6=True, f=HG): return ImageFont.truetype(f, round(px), index=FI[1 if w6 else 0]) if f == HG else ImageFont.truetype(f, round(px))
def clamp(x): return max(0.0, min(1.0, x))
def eo(x): x = clamp(x); return 1 - (1 - x) ** 3
def eio(x): x = clamp(x); return x * x * (3 - 2 * x)
def eback(x): x = clamp(x); c = 1.6; return 1 + (c + 1) * (x - 1) ** 3 + c * (x - 1) ** 2

def text_img(segs, size, w6=True, f=HG):
    """[(文字, 颜色)] → 紧凑 RGBA numpy"""
    ft = font(size, w6, f); wsum = sum(ft.getlength(s) for s, _ in segs)
    img = Image.new("RGBA", (int(wsum) + 8, int(size * 1.45)), (0, 0, 0, 0)); d = ImageDraw.Draw(img); x = 4
    for s, col in segs: d.text((x, size * 1.1), s, font=ft, anchor="ls", fill=col); x += ft.getlength(s)
    return np.array(img).astype(np.float32)

def put(canvas, L, x, y, alpha=1.0):
    """把 RGBA 图层按 alpha 叠到画布（原地改；越界自动裁）"""
    if alpha <= 0.003: return
    h, w = L.shape[:2]; x, y = int(round(x)), int(round(y))
    x0, y0, x1, y1 = max(x, 0), max(y, 0), min(x + w, canvas.shape[1]), min(y + h, canvas.shape[0])
    if x1 <= x0 or y1 <= y0: return
    l = L[y0 - y:y1 - y, x0 - x:x1 - x]; al = l[..., 3:4] / 255 * alpha
    roi = canvas[y0:y1, x0:x1]; roi[:] = roi * (1 - al) + l[..., :3] * al

def rrect(canvas, x0, y0, x1, y1, col, alpha=1.0):
    if x1 - x0 < 1: return
    img = Image.new("L", (int(x1 - x0) + 2, int(y1 - y0) + 2), 0)
    ImageDraw.Draw(img).rounded_rectangle([0, 0, x1 - x0, y1 - y0], radius=(y1 - y0) / 2, fill=255)
    m = np.array(img).astype(np.float32)[..., None]
    put(canvas, np.concatenate([np.broadcast_to(np.array(col, np.float32), m.shape[:2] + (3,)), m], axis=2), x0, y0, alpha)

# ---- 上黑边 ----
SERIES, DAY = cfg.get("series", ""), cfg.get("day", "")   # 都可以留空：留空就不画
series_L = text_img([(SERIES, (160, 160, 160))], 30, w6=False) if SERIES else None
day_L = text_img([(DAY, ACC)], 34, f=DIN) if DAY else None
chap_L = [(text_img([(f"{i + 1:02d}", ACC)], 54, f=DIN), text_img([(n, WHITE)], 40)) for i, (_, n) in enumerate(CHAPTERS)]
seg_x = [56 + (OW - 112) * c / TOT for c, _ in CHAPTERS] + [OW - 56]
def chapter_at(t): return max(i for i, (c, _) in enumerate(CHAPTERS) if t >= c)
def top_band(t):
    band = np.zeros((VY, OW, 3), np.float32); band[:] = BG
    if series_L is not None: put(band, series_L, 52, 113)
    if day_L is not None: rrect(band, OW - 56 - day_L.shape[1] - 20, 111, OW - 56, 155, ACC, 0.18); put(band, day_L, OW - 66 - day_L.shape[1], 110)
    y0, y1 = 190, 202  # 分节进度条：讲完的浅灰、当前段点缀色填到当前位置、没讲的深灰
    for i in range(len(CHAPTERS)):
        x0, x1 = seg_x[i] + (4 if i else 0), seg_x[i + 1] - (4 if i < len(CHAPTERS) - 1 else 0)
        rrect(band, x0, y0, x1, y1, WHITE, 0.19)
        ca, cb = CHAPTERS[i][0], (CHAPTERS[i + 1][0] if i + 1 < len(CHAPTERS) else TOT)
        f = clamp((t - ca) / (cb - ca))
        if f > 0: rrect(band, x0, y0, max(x0 + (x1 - x0) * f, x0 + 12), y1, ACC if t < cb else WHITE, 1.0 if t < cb else 0.5)
    px = seg_x[0] + (seg_x[-1] - seg_x[0]) * t / TOT; cy = (y0 + y1) / 2
    for r, al in ((20, 0.12), (14, 0.22)): rrect(band, px - r, cy - r, px + r, cy + r, ACC, al)
    rrect(band, px - 9, cy - 9, px + 9, cy + 9, WHITE)
    ci = chapter_at(t); since = t - CHAPTERS[ci][0]
    def draw_ch(i, dy, al):
        num, nm = chap_L[i]; x0 = (OW - num.shape[1] - 14 - nm.shape[1]) / 2
        put(band, num, x0, 215 + dy, al); put(band, nm, x0 + num.shape[1] + 14, 230 + dy, al)
    if since < 0.45 and ci > 0:
        e1 = eio(since / 0.18); draw_ch(ci - 1, -18 * e1, 1 - e1)
        e2 = eo((since - 0.15) / 0.3); draw_ch(ci, 22 * (1 - e2), e2)
    else: draw_ch(ci, 0, 1)
    return band

# ---- 字幕 ----
def cap_segments(c):
    hls = c.get("hl") or []; hls = [hls] if isinstance(hls, str) else hls; out, rest = [], c["text"]
    while rest:
        best = min(((rest.find(h), h) for h in hls if rest.find(h) >= 0), default=None)
        if not best: out.append((rest, WHITE)); break
        i, h = best
        if i: out.append((rest[:i], WHITE))
        out.append((h, YEL)); rest = rest[i + len(h):]
    return out
def cap_layer(c):  # 白粗字 + 深色柔阴影
    T = text_img(cap_segments(c), 58); al = T[..., 3]
    pad = 16; out = np.zeros((T.shape[0] + 2 * pad, T.shape[1] + 2 * pad, 4), np.float32)
    sa = np.zeros(out.shape[:2], np.float32); sa[pad:-pad, pad:-pad] = np.maximum(cv2.GaussianBlur(al, (0, 0), 5) * 0.75, cv2.GaussianBlur(al, (0, 0), 1.4) * 0.9)
    out[..., 3] = np.maximum(sa, cv2.GaussianBlur(sa, (0, 0), 3)); core = out[pad:-pad, pad:-pad]
    core[..., :3] = T[..., :3]; core[..., 3] = np.maximum(core[..., 3], al)
    return out
for c in caps: c["L"] = cap_layer(c)
def draw_caption(vid, t):
    c = next((c for c in caps if c["start"] <= t < c["end"]), None)
    if c is None: return  # 字幕消失：这一帧就没有了，不淡出
    f = t - c["start"]; L = c["L"]; sc = 0.9 + 0.1 * eback(f / 0.18)  # 出现：0.18 秒轻弹 + 0.1 秒淡入
    if sc != 1.0: L = cv2.resize(L, None, fx=sc, fy=sc, interpolation=cv2.INTER_LINEAR)
    put(vid, L[..., [2, 1, 0, 3]], (VW - L.shape[1]) / 2, 0.80 * VH - L.shape[0] / 2, clamp(f / 0.1))

# ---- 镜头 ----
# 全片一个缩放中心：各剪辑段中间帧的人脸（锚在脸的上部）取中位数。每段各用各的会在剪点处跳
det = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")
segb = [0.0] + edits + [TOT]; found = []
for k, (x0, x1) in enumerate(zip(segb, segb[1:])):
    if k == 0 and len(segb) > 2: continue  # 片头不参与
    img = subprocess.run(["ffmpeg", "-v", "error", "-ss", f"{(x0 + x1) / 2:.3f}", "-i", str(src), "-frames:v", "1", "-vf", "scale=480:-1", "-f", "image2pipe", "-vcodec", "png", "-"], capture_output=True).stdout
    g = cv2.imdecode(np.frombuffer(img, np.uint8), cv2.IMREAD_GRAYSCALE); fs = det.detectMultiScale(g, 1.1, 6, minSize=(60, 60))
    if len(fs): x, y, w, h = max(fs, key=lambda r: r[2] * r[3]); found.append(((x + w / 2) / 480 * W, (y + h * 0.4) / 640 * H))
ANCHOR = (float(np.median([p[0] for p in found])), float(np.median([p[1] for p in found]))) if found else (W / 2, H * 0.3)

# 按情绪换景别：转折词 +2、新一节 +2、有重点词 +1；≥3 切近景（已在近景不再切）、近景最多停 4.5 秒；
# 2 分且离上一刀 ≥6 秒换全/中景；13 秒没换就换；两刀至少隔 3 秒
TURN = ("但是", "其实", "所以", "你想", "反而", "恰恰", "可是", "结果", "然后呢")
ch_starts = [c for c, _ in CHAPTERS]
def score(c):
    sc = 2 if any(c["text"].startswith(w) or c["text"][:4].find(w) >= 0 for w in TURN) else 0
    sc += 2 if any(abs(c["start"] - x) < 0.15 for x in ch_starts) else 0
    return sc + (1 if c.get("hl") else 0)
shot_b, SHOT_S, WHY, last, emph = [0.0], [1.03], ["开头"], SNAP, False
for c in caps:
    x = c["start"]
    if x <= 0.05: continue
    g, sc = x - last, score(c)
    if g < 3.0: continue
    if sc >= 3 and not emph: size, why, nxt = 1.20, "重点句切近", True
    elif sc >= 2 and (g >= 6 or emph): size, why, nxt = None, "转折/新一节", False
    elif emph and g >= 4.5: size, why, nxt = None, "近景停够了退回", False
    elif g >= 13: size, why, nxt = None, "太久没动", False
    else: continue
    if size is None: size = 1.03 if SHOT_S[-1] >= 1.1 else 1.13
    shot_b.append(x); SHOT_S.append(size); WHY.append(f"{why}：{c['text']}"); last, emph = x, nxt
shot_b.append(TOT)
for k in range(1, len(shot_b) - 1):  # 0.5 秒缓推（前后各宽 0.1）里碰到剪点，就推到剪点 +0.45 秒（融合做完）再开始，直到窗口里没有剪点
    for _ in range(6):
        hit = [e for e in edits if shot_b[k] - 0.1 <= e <= shot_b[k] + 0.6]
        if not hit: break
        shot_b[k] = min(max(hit) + 0.45, shot_b[k + 1] - 0.6)
# 呼吸：贴着成片时间线，约每 3 秒（落在句子开头、至少隔 2.8 秒）换一次方向，幅度 0.08，跨剪点连续
br_k = [SNAP]
for c in caps:
    if c["start"] - br_k[-1] >= 2.8: br_k.append(c["start"])
br_k.append(TOT)
def breath(t):
    if t < br_k[0]: return 0.0
    j = max(i for i, b in enumerate(br_k[:-1]) if t >= b); x = eio((t - br_k[j]) / max(br_k[j + 1] - br_k[j], 1e-6))
    return 0.08 * (x if j % 2 == 0 else 1 - x)
def shot_of(t): return max(k for k, b in enumerate(shot_b[:-1]) if t >= b)
def zoom(t):
    if t < SNAP: return 1.0  # 片头原样
    k = shot_of(t); s = SHOT_S[k]
    if k > 0 and t - shot_b[k] < 0.5: s = SHOT_S[k - 1] + (s - SHOT_S[k - 1]) * eio((t - shot_b[k]) / 0.5)
    return s + breath(t)
def frame_of(buf, s):
    ax, ay = ANCHOR  # 锚点在画面里位置不动；裁切框夹在原片范围内，不露边
    tx = min(max(ax - ax / s, 0.0), W - VW / (K * s)); ty = min(max(ay - ay / s, 0.0), H - VH / (K * s))
    M = np.array([[1 / (K * s), 0, tx], [0, 1 / (K * s), ty]], np.float32)
    return cv2.warpAffine(np.frombuffer(buf, np.uint8).reshape(H, W, 3), M, (VW, VH), flags=cv2.INTER_CUBIC | cv2.WARP_INVERSE_MAP, borderMode=cv2.BORDER_REPLICATE).astype(np.float32)
def compose(vid, t):
    frame = np.zeros((OH, OW, 3), np.float32); frame[:] = BG[::-1]
    frame[:VY] = top_band(t)[..., ::-1]; frame[VY:VY + VH] = vid
    return np.clip(frame, 0, 255).astype(np.uint8)

if a.still is not None:
    t = a.still; buf = subprocess.run(["ffmpeg", "-v", "error", "-ss", f"{t:.3f}", "-i", str(src), "-frames:v", "1", "-f", "rawvideo", "-pix_fmt", "bgr24", "-"], capture_output=True).stdout
    vid = frame_of(buf, zoom(t)); draw_caption(vid, t); out = a.out or str(P / f"静帧_{t:.0f}s.png")
    cv2.imwrite(out, compose(vid, t)); print("✓", out); raise SystemExit

# 剪点 8 帧光流融合（思路同 Premiere 的 Morph Cut）：剪点前最后一帧 A 顺着光流挪到剪点后 B 的姿势，B 从 A 的姿势挪回来，再按进度混合
DIS = 8
_dis = cv2.DISOpticalFlow_create(cv2.DISOPTICAL_FLOW_PRESET_MEDIUM)
_gx, _gy = np.meshgrid(np.arange(VW, dtype=np.float32), np.arange(VH, dtype=np.float32))
def morph(A, B, al):
    sw, sh = VW // 3, VH // 3
    ga = cv2.cvtColor(cv2.resize(A, (sw, sh)).astype(np.uint8), cv2.COLOR_BGR2GRAY); gb = cv2.cvtColor(cv2.resize(B, (sw, sh)).astype(np.uint8), cv2.COLOR_BGR2GRAY)
    up = lambda f: cv2.resize(f, (VW, VH), interpolation=cv2.INTER_LINEAR) * 3.0
    fab, fba = up(_dis.calc(ga, gb, None)), up(_dis.calc(gb, ga, None))
    wa = cv2.remap(A, _gx + al * fba[..., 0], _gy + al * fba[..., 1], cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE)
    wb = cv2.remap(B, _gx + (1 - al) * fab[..., 0], _gy + (1 - al) * fab[..., 1], cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE)
    return wa * (1 - al) + wb * al

out = Path(a.out)
dec = subprocess.Popen(["ffmpeg", "-v", "error", "-i", str(src), "-f", "rawvideo", "-pix_fmt", "bgr24", "-"], stdout=subprocess.PIPE)
enc = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "bgr24", "-s", f"{OW}x{OH}", "-r", str(FPS), "-i", "-",
                        "-i", str(src), "-map", "0:v", "-map", "1:a", "-c:v", "libx264", "-crf", "14", "-preset", "medium", "-pix_fmt", "yuv420p",
                        "-c:a", "aac", "-b:a", "256k", "-shortest", str(out)], stdin=subprocess.PIPE)
edit_frames = {round(e * FPS) for e in edits} - ({round(SNAP * FPS)} if INTRO else set())  # 响指那一刀硬切
prev = held = None; held_at = -99; camlog = []
for i in range(N):
    buf = dec.stdout.read(W * H * 3)
    if len(buf) < W * H * 3: break
    t = i / FPS; s = zoom(t); camlog.append((round(t, 4), round(s, 5)))
    vid = frame_of(buf, s)
    if i in edit_frames and prev is not None: held, held_at = prev, i
    raw = vid
    if 0 <= i - held_at < DIS: vid = morph(held, vid, eio((i - held_at + 1) / (DIS + 1)))
    prev = raw.copy()  # 必须在叠字幕之前拷：put() 原地改，不拷的话融合时上一句字幕会扭着淡出
    draw_caption(vid, t)
    enc.stdin.write(compose(vid, t).tobytes())
enc.stdin.close(); enc.wait(); dec.stdout.close(); dec.kill(); dec.wait()
Path(str(out) + ".cam.json").write_text(json.dumps({"anchor": ANCHOR, "snap": SNAP, "edits": edits, "frames": camlog}))
print("✓", out)
for b, sz, w in zip(shot_b, SHOT_S, WHY): print(f"  {b:7.2f}s ×{sz:.2f}  {w}")
