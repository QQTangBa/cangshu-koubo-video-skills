#!/usr/bin/env python3
"""抽出 plan.json 里所有会出现在画面上的文字（字幕除外），交给合规检查。
用法: python screen_text.py <plan.json> [--with-captions]"""
import json, re, sys
from pathlib import Path
p = json.load(open(sys.argv[1])); out = []
def walk(x, where):
    if isinstance(x, dict):
        for k, v in x.items():
            if k in ("src", "type", "layout", "tone", "icon", "enter", "exit", "host", "look", "sprite", "crop", "morphStyle", "sfx", "footageSrc", "personSrc", "bg", "world", "mark", "pos", "footage", "person", "id", "kind", "show", "focus", "ghost", "links", "to", "from", "dir", "target", "move", "region", "camera", "variant", "style", "place", "kind", "x", "s"): continue
            if isinstance(v, str) and v.strip(): out.append(f"{where}\t{k}\t{v}")
            else: walk(v, where)
    elif isinstance(x, list):
        for v in x:
            if isinstance(v, str) and v.strip(): out.append(f"{where}\t列表\t{v}")
            else: walk(v, where)
# 手写场景的字写在 src/scenes/custom/<name>.tsx 里：抽出所有上屏的字符串（含中文的字面量、text/label/title 等属性、代码行）
KEYS = r"(?:text|label|title|topLabel|addLabel|left|right|center|coin|meta|unit|foot|ch|value|cn|en|l|v)"
FOLLOWED = set()
def custom_text(name, where):
    f = Path(sys.argv[1]).resolve().parent / "scenes/custom" / f"{name}.tsx"
    if not f.exists(): out.append(f"{where}\t缺文件\t{f.name}"); return
    # 长画布这类场景用 import * as X 把别的页面整个嵌进来：顺着抽（每个文件只抽一次）；real.tsx 里有「AI 生成」角标
    for sub in re.findall(r'import \* as \w+ from "\./(\w+)"', f.read_text()) + re.findall(r'from "\./(real)"', f.read_text()):
        if sub not in FOLLOWED: FOLLOWED.add(sub); custom_text(sub, where)
    src = re.sub(r"//[^\n]*", "", f.read_text())  # 去掉行注释
    src = re.sub(r"/\*.*?\*/", "", src, flags=re.S)  # 去掉块注释（JSX 里的 {/* */} 不上屏）
    seen = set()
    for m in re.finditer(KEYS + r"\s*[:=]\s*\{?\s*\"((?:[^\"\\]|\\.)+)\"", src):
        seen.add(m.group(1))
    for m in re.finditer(r"\"((?:[^\"\\\n]|\\.)*[\u4e00-\u9fff][^\"\n]*?)\"", src):
        seen.add(m.group(1))
    # 直接写在 JSX / SVG 标签里的字：>互联网大盘<
    for m in re.finditer(r">\s*([^<>{}\n]*?[\u4e00-\u9fffA-Za-z][^<>{}\n]*?)\s*<", src):
        v = m.group(1).strip()
        if v and (re.fullmatch(r"[A-Z]{2,6}", v) or not re.fullmatch(r"[A-Za-z]+[\w.]*\s*=?>?", v)) and "=>" not in v and "&&" not in v: seen.add(v)  # 全大写短词（AI、REC）是上屏文字
    for m in re.finditer(r"const LINES = \[(.*?)\];", src, re.S):
        seen.update(x.replace('\\"', '"') for x in re.findall(r"\"((?:[^\"\\]|\\.)+)\"", m.group(1)))
    noise = re.compile(r"^(#[0-9A-Fa-f]{3,8}|url\(.*|rgba?\(.*|none|transparent)$|[=+(&|].*\?|^\(|^=")
    seen = {x for x in seen if not noise.search(x.strip())}
    for v in sorted({x.replace('\\"', '"') for x in seen if not x.endswith("\\")}): out.append(f"{where}\t手写\t{v}")
m = p.get("meta", {})  # 水印字墙上的字也上屏
out.append(f"水印\tbrand\t{m.get('brand', '')}"); out.append(f"水印\tbrandTag\t{m.get('brandTag') or 'ORIGINAL'}")
for k, v in (m.get("series") or {}).items(): out.append(f"片头\t{k}\t{v}")  # custom/intro.tsx 读 meta.series
for k in ("line1", "line2"):
    if (m.get("cover") or {}).get(k): out.append(f"封面\t{k}\t{m['cover'][k]}")
out.append("提醒\t组件默认字\ttoon / lbkit 组件没传文字时有默认字（Jug 大水、Weight 压力、Ticket 彩票 $1、Thermo 调性），抽不出来，按画面人工补查")
for s in p["segments"]:
    where = f"{s['world']}@{s['start']:.1f}"
    for o in s.get("overlays", []):
        if o.get("type") == "cta" and not o.get("items"): out.append(f"{where}\tcta\t点赞 / 收藏 / 关注（模板默认）")
        for k in ("value", "from", "to"):  # 数据卡、计数卡上的数字也要核
            if isinstance(o.get(k), (int, float)): out.append(f"{where}\t{o['type']}.{k}\t{o[k]}{o.get('unit') or o.get('suffix') or ''}")
    for k in ("kicker", "source"):
        if s.get(k): out.append(f"{where}\t{k}\t{s[k]}")
    if s.get("scene", {}).get("layout") == "custom": custom_text(s["scene"]["name"], where); continue
    walk({k: v for k, v in s.items() if k not in ("start", "end", "zoom", "world")}, where)
walk(p.get("chapters", []), "章节")
if "--with-captions" in sys.argv: walk(p["captions"], "字幕")
print("\n".join(out))
