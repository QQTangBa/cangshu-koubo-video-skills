#!/usr/bin/env python3
"""成片 + 一键质检。依次：渲染 → 总线限幅 → 成片音频总检 → 渲纯音效音轨逐个测响度 → 出分镜拼图 → 写汇总。
用法: python3 render_final.py <工程> --ver v15 [--title 稿件名] [--py <装了 numpy、opencv 的 python>] [--skip-render]
输出都在 <工程>/out/<ver>/：
  <稿件名>_<ver>.mp4         成片（限幅后，交付这个）
  <稿件名>_<ver>_raw.mp4     渲染原件
  qa/sfx_only.wav            纯音效音轨（口播原声、BGM 静音）
  qa/sb_*.jpg                分镜拼图：图形段和换章处每秒 5 帧，真人段（连着的几段合在一起）每秒 2 帧；红线标顶部进度条区
  qa/质检.txt                汇总（世界占比、响度、音效逐个响度、要处理的问题、拼图清单）
跑完必须一张张看拼图：元素顶进红线以上、被画框裁切、两个元素互相穿过、两层字叠着，有就改场景重跑。
退出码 1 = 有要处理的问题（口型偏差超过 20ms、音效没出声、音效偏响/偏小/挤、渲染失败）。"""
import argparse, json, math, subprocess, sys
from pathlib import Path

SK = Path(__file__).resolve().parent.parent
ap = argparse.ArgumentParser()
ap.add_argument("project"); ap.add_argument("--ver", required=True); ap.add_argument("--title")
ap.add_argument("--py", default=sys.executable, help="跑 storyboard / sfx_levels / check_audio 的 python（要有 numpy、opencv-python-headless<5）")
ap.add_argument("--skip-render", action="store_true", help="已有渲染原件时跳过渲染，只做限幅和质检")
a = ap.parse_args()
P = Path(a.project).expanduser().resolve()
plan = json.loads((P / "src/plan.json").read_text())
meta, segs, chs = plan["meta"], plan["segments"], plan.get("chapters", [])
title = a.title or P.name
out = P / "out" / a.ver; qa = out / "qa"; qa.mkdir(parents=True, exist_ok=True)
raw, final = out / f"{title}_{a.ver}_raw.mp4", out / f"{title}_{a.ver}.mp4"
problems, lines = [], []


def run(cmd, log=None, cwd=P):
    r = subprocess.run([str(c) for c in cmd], cwd=cwd, capture_output=True, text=True)
    if log: Path(log).write_text(r.stdout + r.stderr)
    return r


def say(s=""):
    print(s); lines.append(s)


chk = run([a.py, "-c", "import numpy, cv2"])
if chk.returncode != 0:
    sys.exit(f"--py {a.py} 缺 numpy 或 opencv：按 SKILL.md「环境」建 venv 后用 --py 指过去")
if meta.get("footageVolume", 1) == 0:
    sys.exit("plan.json 的 meta.footageVolume 是 0，成片会没有人声：删掉这个字段再跑（纯音效音轨本脚本会自己渲）")

# 1. 渲染 + 限幅
if not (a.skip_render and raw.exists()):
    print("渲染中…")
    r = run(["npx", "remotion", "render", "src/index.ts", "Koubo34", raw, "--crf=12", "--concurrency=6", "--timeout=180000"], log=out / "render.log")
    if r.returncode != 0: sys.exit(f"渲染失败，看 {out / 'render.log'}")
# 音画对齐：量出渲染给声音带来的延迟，限幅时扣掉，再量一次口型（渲染会让声音晚几十毫秒，不扣掉口型就对不上）
BASE_SYNC = Path(__import__("os").environ.get("KOUBO_BASE_SK") or Path(__file__).resolve().parents[2] / "cangshu-koubo-wudongxiao/scripts") / "sync_check.py"  # 基座和本 skill 装在同一个 skills 目录下
footage = P / "public" / meta["footage"]
r = run([a.py, BASE_SYNC, "--audio-lag", raw, footage])
try: alag = max(0.0, float(r.stdout.strip().splitlines()[-1]))
except (ValueError, IndexError): sys.exit("量声音延迟失败：\n" + r.stderr)
r = run(["bash", SK / "scripts/master_audio.sh", raw, final, f"{alag:.4f}"])
if r.returncode != 0: sys.exit("总线限幅失败：\n" + r.stderr)
loud = " ".join(x.strip() for x in r.stdout.splitlines() if x.strip())

# 剪过口误（meta.cuts）时 plan 的时间是原时间线，成片短了：质检一律换成成片时间（和 src/timing.ts 的 unwarp 一致，落在剪掉段里的贴到剪点）
CUTS = sorted((c["from"], c["to"]) for c in meta.get("cuts", []))
def uw(t):
    sh = 0.0
    for a0, b0 in CUTS:
        if t >= b0: sh += b0 - a0
        elif t > a0: return a0 - sh
    return t - sh
segs = [{**s, "start": uw(s["start"]), "end": uw(s["end"])} for s in segs]
chs = [{**c, "start": uw(c["start"])} for c in chs]
dur = uw(meta["duration"]); tot = {"A": 0.0, "B": 0.0, "S": 0.0}
for s in segs: tot[s["world"]] += s["end"] - s["start"]
B = [(s["start"], s["end"]) for s in segs if s["world"] == "B"]
say(f"成片：{final}（{final.stat().st_size / 1e6:.0f}MB，{dur:.1f} 秒）")
say(f"世界占比：真人 {tot['A'] / dur:.0%} / 图形 {tot['B'] / dur:.0%} / 实拍 {tot['S'] / dur:.0%}；整片响度 {loud}")

# 1.5 口型：成片的画面和声音分别对到素材，差值超过 20ms 算问题
say(f"\n【口型】渲染带来的声音延迟 {alag * 1000:.0f}ms，已扣掉")
r = run([a.py, BASE_SYNC, final, footage, "--plan", P / "src/plan.json", "--json", qa / "sync.json"])
(qa / "口型.txt").write_text(r.stdout)
say("  " + (r.stdout.strip().splitlines() or ["没有测量结果"])[-1])
if r.returncode != 0: problems.append("口型偏差超过 20ms：看 qa/口型.txt")

# 2. 成片音频总检（只判没出声、盖过人声）
r = run([a.py, SK / "scripts/check_audio.py", P, final])
say("\n【成片音频总检】"); [say("  " + x) for x in r.stdout.strip().splitlines()[-4:]]
if r.returncode != 0: problems.append("成片里一个音效都测不到：先查 src/sfx-palette.json，跑 build_sfx.py")
if "【偏响】" in r.stdout: problems.append("音效盖过人声：调低 meta.sfxVolume")

# 3. 纯音效音轨逐个测响度
say("\n【音效逐个响度】（目标：每个都比人声中位低 1–6dB，两两隔 ≥0.5 秒，图形段每秒 0.3–0.7 个）")
if meta.get("autoSfx", True) is False:
    say("  这条片子关了音效（meta.autoSfx=false，连 sfx 数组也不出声），跳过")
else:
    wav = qa / "sfx_only.wav"
    r = run(["npx", "remotion", "render", "src/index.ts", "Koubo34", wav, "--codec=wav", '--props={"sfxOnly":true}'], log=qa / "sfx_only.log")
    if r.returncode != 0:
        problems.append(f"纯音效音轨渲染失败，看 {qa / 'sfx_only.log'}")
    else:
        r = run([a.py, SK / "scripts/sfx_levels.py", wav, P / "public" / meta["footage"], "--json", qa / "sfx_levels.json"])
        if r.returncode != 0 or not (qa / "sfx_levels.json").exists():
            problems.append("sfx_levels.py 跑失败（--py 指的 python 要有 numpy）：音效逐个响度没测")
            rep = {"events": [], "loud": 0, "quiet": 0, "tight": 0}
        else:
            rep = json.loads((qa / "sfx_levels.json").read_text())
        ev = rep["events"]
        nb = sum(1 for e in ev if any(s <= e["t"] < t for s, t in B)); bdur = sum(t - s for s, t in B) or 1
        rel = [e["rel_db"] for e in ev]
        say(f"  {len(ev)} 个音效；图形段每秒 {nb / bdur:.2f} 个；比人声中位 {min(rel, default=0):+.1f} 到 {max(rel, default=0):+.1f} dB；偏响 {rep['loud']}、偏小 {rep['quiet']}、挤 {rep['tight']}")
        for e in ev:
            if e["rel_db"] > -1 or e["rel_db"] < -6: say(f"    {e['t']:.2f}s 比人声中位 {e['rel_db']:+.1f} dB")
        if not ev: problems.append("纯音效音轨里没有音效")
        if rep["loud"] or rep["quiet"]: problems.append(f"有 {rep['loud']} 个音效偏响、{rep['quiet']} 个偏小：整体偏调 meta.sfxVolume，个别偏调那条 cue 的 vol")
        if rep["tight"]: problems.append(f"有 {rep['tight']} 处两个音效隔不到 0.5 秒")
        if B and not 0.3 <= nb / bdur <= 0.7: problems.append(f"图形段每秒 {nb / bdur:.2f} 个音效，偏离 0.3–0.7：太密删 cue，太稀在关键联动处补")

# 4. 分镜拼图：图形段和换章处每秒 5 帧（约 4 秒一张），真人段连着的合成一段、每秒 2 帧（约 6 秒一张）
for f in qa.glob("sb_*.jpg"): f.unlink()  # 只清本脚本上次生成的拼图


def board(name, t0, t1, fps, chunk, cols, w):
    n = max(1, math.ceil((t1 - t0) / chunk - 0.15)); d = (t1 - t0) / n  # 均分，不留零头
    for k in range(n):
        t = t0 + k * d; fn = qa / f"{name}_{k + 1}_{t:.1f}s.jpg"
        run([a.py, SK / "scripts/storyboard.py", final, f"{t:.2f}", f"{d:.2f}", "--fps", str(fps), "--cols", str(cols), "--w", str(w), "--hud", "--out", fn])
        sheets.append(fn)


sheets, runs = [], []
for s in segs:  # B 段一段一组；真人、实拍段连着的合在一起
    if runs and s["world"] != "B" and runs[-1][0] != "B": runs[-1][2] = s["end"]
    else: runs.append([s["world"], s["start"], s["end"]])
for i, (w, t0, t1) in enumerate(runs):
    if w == "B": board(f"sb_{i + 1:02d}图形", t0, t1, 5, 4.0, 5, 216)
    else: board(f"sb_{i + 1:02d}真人", t0, t1, 2, 6.0, 6, 200)
for j, c in enumerate(chs):
    if c["start"] > 0.3: board(f"sb_换章{j + 1}", max(0, c["start"] - 0.5), min(dur, c["start"] + 3.5), 5, 4.0, 5, 216)
say(f"\n【分镜拼图】{len(sheets)} 张，在 {qa}")
say("  逐张看四件事：元素顶进红线以上（进度条区）、被画框裁切、两个元素互相穿过、两层字叠在一起。可疑处用 storyboard.py --at 抽大图。")

say("\n【要处理】" + ("无" if not problems else ""))
for x in problems: say("  - " + x)
(qa / "质检.txt").write_text("\n".join(lines) + "\n")
sys.exit(1 if problems else 0)
