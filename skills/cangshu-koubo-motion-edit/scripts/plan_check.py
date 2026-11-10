#!/usr/bin/env python3
"""按对标节奏规则检查 plan.json，输出问题清单。不改文件。
用法: python plan_check.py <plan.json>
退出码 0 = 没有"必须改"，1 = 有。"""
import json
import re
import sys
from pathlib import Path
p = json.load(open(sys.argv[1])); segs = p["segments"]; dur = p["meta"]["duration"]
must, warn, info = [], [], []
pal_f = Path(sys.argv[1]).resolve().parent / "sfx-palette.json"
if p["meta"].get("autoSfx", True) is not False:
    try:
        pal = json.load(open(pal_f))
    except Exception:
        pal = {}
    if not any(isinstance(v, list) and v for v in pal.values()):
        must.append(f"音效清单 {pal_f.name} 是空的：先跑 build_sfx.py；同步模板用 sync_template.sh（不覆盖这个文件）")
# 时间线连续
for a, b in zip(segs, segs[1:]):
    if abs(a["end"] - b["start"]) > 0.02: must.append(f"段落不连续：{a['end']} → {b['start']}")
if abs(segs[0]["start"]) > 0.02 or abs(segs[-1]["end"] - dur) > 0.05: must.append("段落没覆盖 0 到 duration")
# 世界占比与切换
tot = {"A": 0, "B": 0, "S": 0}
for s in segs: tot[s["world"]] += s["end"] - s["start"]
switch = [b["start"] for a, b in zip(segs, segs[1:]) if a["world"] != b["world"]]
gr = (tot["B"] + tot["S"]) / dur
info.append(f"真人 {tot['A']/dur:.0%} / 图形 {tot['B']/dur:.0%} / 实拍 {tot['S']/dur:.0%}；换世界 {len(switch)} 次，平均 {dur/max(1,len(switch)+1):.1f}s 一段")
lo_gr = 0.45 if dur > 60 else 0.30  # style-bible 第 2 节：45–65%，60 秒以内可以降到 30%
for sg in segs:  # 总推近倍数 zoom × punch × 慢推，超过约 1.2 会糊（素材就是 1080×1440）
    if sg["world"] != "A": continue
    zt = (sg.get("zoom") or 1) * max([pu.get("to", 1) for pu in sg.get("punch", [])] or [1]) * (1 + (sg.get("driftRate") or 0.015) * (sg["end"] - sg["start"]))
    if zt > 1.2: warn.append(f"真人段 {sg['start']:.1f} 总推近约 {zt:.2f} 倍（zoom × punch × 慢推），超过 1.2 会糊：减 zoom / punch 或调小 driftRate")
for sg in segs:  # 身后大字太短观众看不清
    for o in sg.get("overlays", []):
        if o.get("type") == "topWord" and (o.get("until", sg["end"]) - o["at"]) < 1.45: warn.append(f"身后大字「{o.get('text')}」只停 {o.get('until', sg['end']) - o['at']:.1f} 秒，至少 1.5 秒：挪前后段边界")
ser_ = p.get("meta", {}).get("series")
if any(sg.get("scene", {}).get("name") == "intro" for sg in segs) and not ser_: warn.append("用了系列片头 intro 但没写 meta.series：会显示兜底的「栏目名 第 01 期」")
caps_ = [(sg["start"], o.get("sub") or o.get("text")) for sg in segs for o in sg.get("overlays", []) if o.get("type") in ("tag", "pill")]
if caps_: warn.append(f"用了 {len(caps_)} 个左上 / 右上小字胶囊（tag / pill），默认不要（AI 味重）；不是用户点名要的就删掉：{caps_[:4]}")
meta_ = p.get("meta", {})
_ipq = Path(sys.argv[1]).resolve().parent / "scenes/custom/ipq.json"
_sprites = json.load(open(_ipq)) if _ipq.exists() else {}
if not _sprites:  # 开源版不附带角色精灵图：没自备就不能开 qkid、不能用变身
    if meta_.get("qkid"): must.append("meta.qkid 开了但 scenes/custom/ipq.json 是空的（没有自备角色精灵图）：删掉 qkid，或先把精灵图放进 public/ipq/ 并登记尺寸")
    _mo = [sg["start"] for sg in segs if sg.get("host") == "morph" or sg.get("exit") == "morph"]
    if _mo: must.append(f"变身（host: morph）要自备角色精灵图，ipq.json 是空的：{_mo[:4]} 这几段改用 corner / bubble / 不写 host")
if meta_.get("captionStyle") in (None, "box") and any(c.get("hl") for c in p.get("captions", [])): warn.append("captions 里标了 hl 重点词，但 captionStyle 是默认的 box（不显示重点词）：用 pop（放大亮黄）或 burn（仿剪映金黄）")
if not (lo_gr <= gr <= 0.65): warn.append(f"图形+实拍占 {gr:.0%}，目标 {lo_gr:.0%}–65%（style-bible 第 2 节）")
# 每个世界段长度
run = []
for s in segs:
    if run and run[-1][0] == s["world"]: run[-1][2] = s["end"]
    else: run.append([s["world"], s["start"], s["end"]])
for w, a, b in run:
    L = b - a
    if w == "B" and L > 17: warn.append(f"图形段 {a:.1f}-{b:.1f} 长 {L:.1f}s：默认 ≤16s（超 1 秒内可以不拆），在转折词那句插一段真人拆开；只有一口气讲同一个机制才允许到 20s（style-bible 第 4 节）")
    if w == "A" and L > 10.5: warn.append(f"真人段 {a:.1f}-{b:.1f} 连续 {L:.0f}s 没切世界（style-bible：真人段 3–10 秒，对标中位约 6 秒；片尾表态、互动可以长）")
# 真人段太短：两段图形之间的实拍只露一两秒（观众会觉得晃眼）
for i, s in enumerate(segs):
    if s["world"] == "A" and 0 < i < len(segs) - 1 and segs[i - 1]["world"] != "A" and segs[i + 1]["world"] != "A" and s["end"] - s["start"] < 2.2:
        warn.append(f"真人段 {s['start']:.1f}-{s['end']:.1f} 只有 {s['end'] - s['start']:.1f}s 夹在两段图形中间：实拍露一两秒就切走，挪一挪前后图形段的边界（style-bible 第 3 节）")
# 真人段：每 6s 至少有一次视觉变化（叠层出现 / 推拉跳切）
for s in segs:
    if s["world"] != "A": continue
    ev = sorted([s["start"]] + [o["at"] for o in s.get("overlays", [])] + [it["at"] for o in s.get("overlays", []) for it in o.get("items", []) if isinstance(it, dict) and "at" in it] + [pu["at"] for pu in s.get("punch", [])])
    ev.append(s["end"])
    for x, y in zip(ev, ev[1:]):
        if y - x > 6: warn.append(f"真人段 {x:.1f}-{y:.1f} 有 {y-x:.1f}s 画面没新东西，加叠层或推拉跳切")
# B 段：进场 0.6s 内有东西；元素间隔 ≤3s
def beats(sc):
    xs = []
    def walk(x):
        if isinstance(x, dict):
            for k, v in x.items():
                if isinstance(v, (int, float)) and (k == "at" or k.endswith("At")): xs.append(v)
                elif k in ("rings", "activeAt") and isinstance(v, list): xs.extend(x for x in v if isinstance(x, (int, float)))
                else: walk(v)
        elif isinstance(x, list):
            for v in x: walk(v)
    walk(sc)
    return sorted(xs)
for s in segs:
    if s["world"] != "B": continue
    if s["scene"].get("layout") == "custom":
        cdir = Path(sys.argv[1]).resolve().parent / "scenes/custom"; name = s["scene"]["name"]
        f = cdir / f"{name}.tsx"
        if not f.exists(): must.append(f"图形段 {s['start']:.1f} 的手写场景 {f.name} 不存在")
        reg = (cdir / "index.ts").read_text() if (cdir / "index.ts").exists() else ""
        # 取 CUSTOM = { ... } 整块（按括号配对，里面可以有 intro: { ... } 这种嵌套）
        blk = ""
        k0 = re.search(r"CUSTOM[^=]*=\s*\{", reg)
        if k0:
            d, j = 1, k0.end()
            while j < len(reg) and d:
                d += {"{": 1, "}": -1}.get(reg[j], 0); j += 1
            blk = reg[k0.end():j - 1]
        if not re.search(rf"(^|[\s,{{]){re.escape(name)}\s*(,|:|}}|$)", blk, re.M):
            must.append(f"图形段 {s['start']:.1f} 的手写场景 {name} 没登记进 scenes/custom/index.ts 的 CUSTOM（没登记会渲成空白画布）")
        continue  # 手写场景的节拍写在组件里，看渲染结果
    bt = beats(s["scene"])
    if not bt: must.append(f"B 段 {s['start']:.1f} 的 scene 没有任何 at"); continue
    if any(x < s["start"] - 0.01 or x > s["end"] for x in bt): must.append(f"B 段 {s['start']:.1f}-{s['end']:.1f} 有 at 落在段外")
    gaps = [b - a for a, b in zip([s["start"] + 0.6] + bt, bt + [s["end"]])]
    L = s["end"] - s["start"]
    if max(gaps) > 3.0: must.append(f"B 段 {s['start']:.1f}-{s['end']:.1f} 有 {max(gaps):.1f}s 没有任何事件，画面会死（对标最长静止 ≤0.7s）")
    elif max(gaps) > 1.5: warn.append(f"B 段 {s['start']:.1f}-{s['end']:.1f} 最长 {max(gaps):.1f}s 没新事件（对标 0.6–0.9s 一个，上限 1.5s）")
    if L > 6 and s["scene"].get("layout") != "board": warn.append(f"图形段 {s['start']:.1f}-{s['end']:.1f} 长 {L:.0f}s 却用单卡版式 {s['scene'].get('layout')}：>6s 写手写场景（custom）")
    if s["scene"].get("layout") == "board":
        warn.append(f"图形段 {s['start']:.1f} 用的是 board 画板：只当草稿对时间轴，成片换成手写场景（custom）")
        st = s["scene"]["steps"]
        if len(st) < max(2, L / 3): warn.append(f"board {s['start']:.1f} 只有 {len(st)} 拍，{L:.0f}s 至少 {int(max(2, L/3))} 拍")
        ids = {c["id"] for c in s["scene"]["cards"]}
        for x in st:
            for i in x["show"]:
                if i not in ids: must.append(f"board {s['start']:.1f} 的 step at={x['at']} 引用了不存在的卡 {i}")
# 叠层 at 在段内
for s in segs:
    for o in s.get("overlays", []):
        if not (s["start"] - 0.01 <= o["at"] < s["end"]): must.append(f"{o['type']} at={o['at']} 不在所属段 {s['start']}-{s['end']} 内")
        if o["type"] == "bigText" and o.get("behind") and not p["meta"].get("person"): warn.append(f"bigText at={o['at']} 要头挡字但没有 person 抠像，会画在前景")
# 字幕
caps = p["captions"]
for c in caps:
    if len(c["text"].replace(" ", "")) > 14: warn.append(f"字幕超过 14 字：{c['text']}")
for a, b in zip(caps, caps[1:]):
    if b["start"] < a["end"] - 0.01: must.append(f"字幕重叠：{a['text']} / {b['text']}")
# 进度导航、身后大字、原声
if not p.get("chapters"): warn.append("没写 chapters：顶部进度导航默认要加，短视频分 3 段即可")
behind = [o["at"] for s in segs for o in s.get("overlays", []) if o["type"] == "bigText" and o.get("behind")]
if len(behind) > 2: warn.append(f"身后大字用了 {len(behind)} 次（{', '.join(f'{x:.1f}s' for x in behind)}）：一条片子一两次就够，其余放到人前面")
if p["meta"].get("footageVolume", 1) == 0: must.append("meta.footageVolume 是 0，成片没有人声：删掉这个字段（纯音效音轨由 render_final.py 自己渲）")
if p["meta"].get("bgm") and p["meta"]["bgm"].get("dropAt") is None and dur > 90: info.append("长视频建议 bgm.dropAt 设在正文第一步，前段只留氛围")
for k, xs in (("必须改", must), ("建议改", warn), ("参考", info)):
    for x in xs: print(f"[{k}] {x}")
if not must and not warn: print("[通过] 节奏规则全部满足")
sys.exit(1 if must else 0)
