#!/usr/bin/env python3
"""片头防抖：逐帧用背景特征点算相机抖动（平移 + 旋转），把相机轨迹做高斯平滑（去掉抖、保留慢慢的晃），
反向补偿后统一放大一点裁掉黑边。不锁死机位：手持自拍锁住背景的话人会左右甩，反而不居中。只处理 cut.mp4 开头到响指那一刀。
用法: python stabilize_intro.py <工程> [--probe] [--sigma 8] [--out intro_stab.mp4]
默认不做防抖：先 --probe 量，片头明显抖再问用户，同意了才出片。
写: <工程>/intro_stab.mp4（1440×1920，和原片同分辨率，近无损）、<工程>/intro_stab.json（每帧补偿量和放大倍数）"""
import argparse, json, subprocess
from pathlib import Path
import cv2, numpy as np

ap = argparse.ArgumentParser(); ap.add_argument("proj"); ap.add_argument("--out", default="intro_stab.mp4")
ap.add_argument("--sigma", type=float, default=8.0, help="轨迹平滑强度（帧），越大越稳、要裁得越多"); ap.add_argument("--probe", action="store_true", help="只报各平滑强度要放大多少，不出片")
a = ap.parse_args(); P = Path(a.proj); src = P / "cut.mp4"
W, H, FPS = 1440, 1920, 30
end = json.loads((P / "cut_pieces.json").read_text())[1]["at"]; N = round(end * FPS)

raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(src), "-frames:v", str(N), "-f", "rawvideo", "-pix_fmt", "bgr24", "-"], capture_output=True).stdout
frames = [np.frombuffer(raw[i * W * H * 3:(i + 1) * W * H * 3], np.uint8).reshape(H, W, 3) for i in range(N)]
sw = 480; sc = sw / W
grays = [cv2.cvtColor(cv2.resize(f, (sw, round(H * sc))), cv2.COLOR_BGR2GRAY) for f in frames]

# 相邻帧之间的相机运动：只用画面四周（背景），中间是人和手，会乱动
mask = np.full(grays[0].shape, 255, np.uint8); h, w = mask.shape
mask[int(h * 0.18):, int(w * 0.18):int(w * 0.82)] = 0
steps = [(0.0, 0.0, 0.0)]
for i in range(1, N):
    p0 = cv2.goodFeaturesToTrack(grays[i - 1], 300, 0.01, 8, mask=mask)
    dx = dy = da = 0.0
    if p0 is not None:
        p1, st, _ = cv2.calcOpticalFlowPyrLK(grays[i - 1], grays[i], p0, None)
        g0, g1 = p0[st.ravel() == 1], p1[st.ravel() == 1]
        if len(g0) >= 12:
            m, inl = cv2.estimateAffinePartial2D(g0, g1, method=cv2.RANSAC, ransacReprojThreshold=2.0)
            if m is not None and inl.sum() >= 10:
                dx, dy, da = m[0, 2] / sc, m[1, 2] / sc, float(np.arctan2(m[1, 0], m[0, 0]))
    steps.append((dx, dy, da))
traj = np.cumsum(np.array(steps), axis=0)
from scipy.ndimage import gaussian_filter1d
def plan(sig):
    corr = gaussian_filter1d(traj, sig, axis=0, mode="nearest") - traj  # 每帧要补的平移和旋转
    need = max(np.abs(corr[:, 0]).max() / (W / 2), np.abs(corr[:, 1]).max() / (H / 2)) + abs(corr[:, 2]).max() * 0.6
    return corr, 1.0 + 2 * need + 0.01
if a.probe:
    st = np.array(steps)[1:]
    print(f"片头 {N} 帧，相机帧间抖动（帧间位移的变化量，均值）x {np.abs(np.diff(st[:, 0])).mean():.1f}px y {np.abs(np.diff(st[:, 1])).mean():.1f}px；5px 以上肉眼能看出晃")
    for sig in (3, 5, 8, 12, 16):
        corr, z = plan(sig); print(f"sigma {sig:>2}：最大补偿 x {np.abs(corr[:, 0]).max():.0f}px y {np.abs(corr[:, 1]).max():.0f}px，要放大 {z:.3f}")
    raise SystemExit
corr, zoom = plan(a.sigma); zoom = min(zoom, 1.2)
print(f"片头 {N} 帧，抖动最大 x {np.abs(corr[:, 0]).max():.1f}px y {np.abs(corr[:, 1]).max():.1f}px 角 {np.degrees(np.abs(corr[:, 2]).max()):.2f}°，放大 {zoom:.3f}")

out = P / a.out
enc = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "bgr24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
                        "-c:v", "libx264", "-crf", "8", "-preset", "slow", "-pix_fmt", "yuv420p", str(out)], stdin=subprocess.PIPE)
c = np.array([W / 2, H / 2])
for i, f in enumerate(frames):
    dx, dy, da = corr[i]
    M = cv2.getRotationMatrix2D((c[0], c[1]), -np.degrees(da), zoom)  # 以画面中心旋转 + 放大（OpenCV 正角是逆时针，和矩阵里的角方向相反）
    M[0, 2] += dx * zoom; M[1, 2] += dy * zoom
    enc.stdin.write(cv2.warpAffine(f, M, (W, H), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REFLECT).tobytes())
enc.stdin.close(); enc.wait()
(P / "intro_stab.json").write_text(json.dumps({"frames": N, "zoom": round(zoom, 4), "corr": np.round(corr, 3).tolist()}))
print("✓", out)
