import React from "react";

// 样例物件：代码画的扁平矢量，和精灵图小人同一路（平涂 + 一层明暗，没有写实质感，没有方形底座，也没有粗描边）。
// 物件自己用代码画，不用写实图标（精致写实的图标和整体风格不搭）。
// 画布统一 200×200，物件按自身轮廓画，外面的尺寸由 s 决定。
const DRAW: Record<string, React.ReactNode> = {
  burger: (<>
    <path d="M28 88 C28 44 62 30 100 30 C138 30 172 44 172 88 Z" fill="#F4B860" />
    <path d="M28 88 C28 72 34 60 44 50 C40 66 44 78 52 88 Z" fill="#E9A247" />
    {[[70, 52], [100, 44], [130, 54], [86, 68], [118, 70]].map(([x, y], i) => <ellipse key={i} cx={x} cy={y} rx="6" ry="3.6" fill="#FFF1D2" />)}
    <path d="M22 96 Q40 86 56 96 T90 96 T124 96 T158 96 T178 96 L178 106 L22 106 Z" fill="#7CC46A" />
    <rect x="28" y="104" width="144" height="24" rx="12" fill="#8A5636" />
    <path d="M38 104 H162 L136 120 L118 104 Z" fill="#FFD45A" />
    <path d="M28 134 H172 V142 C172 160 158 170 140 170 H60 C42 170 28 160 28 142 Z" fill="#F4B860" />
    <path d="M28 134 H172 V142 H28 Z" fill="#E9A247" />
  </>),
  milktea: (<>
    <rect x="112" y="10" width="11" height="50" rx="5" transform="rotate(12 118 35)" fill="#F2735A" />
    <path d="M52 62 H148 L134 186 Q133 192 126 192 H74 Q67 192 66 186 Z" fill="#E8CBA8" />
    <path d="M52 62 H70 L80 192 H74 Q67 192 66 186 Z" fill="#F4E0C8" />
    {[[80, 170], [100, 176], [120, 170], [90, 156], [112, 156], [100, 140]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="8" fill="#5A3F31" />)}
    <rect x="42" y="50" width="116" height="16" rx="8" fill="#FFFFFF" />
    <rect x="42" y="50" width="116" height="7" rx="3.5" fill="#F1EDE6" />
  </>),
  pie: (<>
    <circle cx="100" cy="100" r="84" fill="#E9A94D" />
    <circle cx="100" cy="100" r="70" fill="#F6CD7B" />
    <path d="M60 70 Q90 50 128 66 M52 108 Q92 88 150 110 M66 142 Q104 126 138 142" fill="none" stroke="#EBB35C" strokeWidth="8" strokeLinecap="round" />
    {[[78, 84], [122, 90], [98, 118], [136, 128], [68, 124]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="5.5" fill="#7CC46A" />)}
  </>),
  chips: (<>
    <ellipse cx="72" cy="46" rx="26" ry="17" transform="rotate(-24 72 46)" fill="#FFD45A" />
    <ellipse cx="128" cy="44" rx="26" ry="17" transform="rotate(22 128 44)" fill="#F7C544" />
    <ellipse cx="100" cy="36" rx="26" ry="17" fill="#FFE07A" />
    <path d="M42 56 Q100 76 158 56 L150 170 Q148 186 132 186 H68 Q52 186 50 170 Z" fill="#6CB4F0" />
    <path d="M42 56 Q54 62 68 65 L74 186 H68 Q52 186 50 170 Z" fill="#4B97E0" />
    <ellipse cx="102" cy="128" rx="30" ry="21" transform="rotate(-12 102 128)" fill="#FFD45A" />
    <path d="M82 124 Q102 112 122 124" fill="none" stroke="#EDB02C" strokeWidth="5" strokeLinecap="round" />
    <ellipse cx="172" cy="172" rx="18" ry="12" transform="rotate(20 172 172)" fill="#F7C544" />
  </>),
  fish: (<>
    <path d="M136 100 L186 66 Q178 100 186 134 Z" fill="#4B97E0" />
    <ellipse cx="88" cy="100" rx="70" ry="44" fill="#6CB4F0" />
    <path d="M26 112 C40 142 110 150 150 114 C118 126 66 128 26 112 Z" fill="#CFE7FB" />
    <path d="M92 58 Q106 40 124 42 Q118 60 108 66 Z" fill="#4B97E0" />
    <path d="M86 112 Q102 118 112 104 Q98 96 86 112 Z" fill="#4B97E0" />
    <circle cx="52" cy="90" r="10" fill="#FFFFFF" /><circle cx="50" cy="90" r="5.5" fill="#2A2320" />
    <path d="M24 106 Q32 110 38 106" fill="none" stroke="#2A2320" strokeWidth="3" strokeLinecap="round" />
  </>),
  scale: (<>
    <rect x="28" y="30" width="144" height="144" rx="30" fill="#8FB7D6" />
    <rect x="28" y="112" width="144" height="62" rx="30" fill="#79A3C4" />
    <path d="M58 92 A42 42 0 0 1 142 92 Z" fill="#FFFFFF" />
    <path d="M58 92 A42 42 0 0 1 142 92" fill="none" stroke="#5F88A8" strokeWidth="5" />
    <rect x="96" y="56" width="8" height="36" rx="4" transform="rotate(26 100 92)" fill="#E8483B" />
    <circle cx="100" cy="92" r="7" fill="#2A2320" />
  </>),
  sneaker: (<>
    <path d="M26 76 Q40 62 58 74 Q78 90 104 96 L150 110 Q176 118 176 140 H26 Z" fill="#6CB4F0" />
    <path d="M26 76 Q40 62 58 74 L62 140 H26 Z" fill="#4B97E0" />
    {[0, 1, 2].map((i) => <rect key={i} x={72 + i * 16} y={80 + i * 6} width="22" height="6" rx="3" transform={`rotate(26 ${72 + i * 16} ${80 + i * 6})`} fill="#FFFFFF" />)}
    <path d="M20 138 H180 V152 Q180 164 168 164 H32 Q20 164 20 152 Z" fill="#FFFFFF" />
    <rect x="20" y="152" width="160" height="12" rx="6" fill="#E4DFD6" />
  </>),
  course: (<>
    <rect x="30" y="112" width="140" height="44" rx="8" fill="#E8735F" /><rect x="30" y="112" width="24" height="44" rx="8" fill="#D15C4A" />
    <rect x="52" y="120" width="112" height="28" fill="#FFF8EC" />
    <rect x="40" y="62" width="130" height="50" rx="8" fill="#5B8DE0" /><rect x="40" y="62" width="24" height="50" rx="8" fill="#4676C7" />
    <rect x="62" y="70" width="102" height="34" fill="#FFF8EC" />
    <path d="M130 56 H150 V96 L140 88 L130 96 Z" fill="#F7C544" />
  </>),
  star: <path d="M100 22 L124 74 L180 80 L138 118 L150 174 L100 146 L50 174 L62 118 L20 80 L76 74 Z" fill="#F7C544" stroke="#F7C544" strokeWidth="10" strokeLinejoin="round" />,
  brain: (<>
    <path d="M100 38 C86 22 56 26 52 50 C30 54 22 80 36 96 C24 114 38 140 60 136 C66 156 92 158 100 142 C108 158 134 156 140 136 C162 140 176 114 164 96 C178 80 170 54 148 50 C144 26 114 22 100 38 Z" fill="#F7A9B8" />
    <path d="M100 38 V142" stroke="#E58799" strokeWidth="6" strokeLinecap="round" />
    <path d="M60 72 Q76 64 84 78 M50 104 Q68 94 82 108 M140 72 Q124 64 116 78 M150 104 Q132 94 118 108" fill="none" stroke="#E58799" strokeWidth="6" strokeLinecap="round" />
    <path d="M86 154 Q100 172 114 154 L110 176 H90 Z" fill="#E58799" />
  </>),
  sofa: (<>
    <rect x="44" y="62" width="112" height="60" rx="18" fill="#F39A54" />
    <rect x="96" y="66" width="8" height="52" rx="4" fill="#E4853E" />
    <rect x="18" y="86" width="42" height="72" rx="20" fill="#E4853E" /><rect x="140" y="86" width="42" height="72" rx="20" fill="#E4853E" />
    <rect x="44" y="112" width="112" height="46" rx="14" fill="#F7AB6C" />
    <rect x="36" y="156" width="14" height="18" rx="5" fill="#8A5636" /><rect x="150" y="156" width="14" height="18" rx="5" fill="#8A5636" />
  </>),
  calendar: (<>
    <rect x="30" y="42" width="140" height="132" rx="20" fill="#FFFFFF" />
    <path d="M30 80 V62 Q30 42 50 42 H150 Q170 42 170 62 V80 Z" fill="#E8483B" />
    <rect x="58" y="26" width="12" height="32" rx="6" fill="#8D2A22" /><rect x="130" y="26" width="12" height="32" rx="6" fill="#8D2A22" />
    {[0, 1, 2].flatMap((r) => [0, 1, 2, 3].map((c) => <rect key={`${r}${c}`} x={48 + c * 28} y={94 + r * 24} width="18" height="14" rx="4" fill={r === 0 && c === 1 ? "#F2A81D" : "#E9E4DC"} />))}
  </>),
  ticket: <path d="M18 62 H182 V84 A16 16 0 0 0 182 116 V138 H18 V116 A16 16 0 0 0 18 84 Z" fill="#F7C544" stroke="#EDB02C" strokeWidth="4" strokeLinejoin="round" />,
  receipt: (<>
    <path d="M46 22 H154 V170 L136 182 L118 170 L100 182 L82 170 L64 182 L46 170 Z" fill="#FFFFFF" />
    {[0, 1, 2, 3].map((i) => <rect key={i} x="62" y={48 + i * 24} width={[76, 56, 68, 44][i]} height="9" rx="4.5" fill="#D9D3CA" />)}
    <rect x="62" y="144" width="76" height="10" rx="5" fill="#E8483B" />
  </>),
  trophy: (<>
    <path d="M58 44 H28 Q26 92 66 96 M142 44 H172 Q174 92 134 96" fill="none" stroke="#EDB02C" strokeWidth="11" strokeLinecap="round" />
    <path d="M56 30 H144 V76 Q144 118 100 122 Q56 118 56 76 Z" fill="#F7C544" />
    <path d="M56 30 H78 V76 Q78 100 92 118 Q56 112 56 76 Z" fill="#FBD978" />
    <rect x="90" y="118" width="20" height="26" fill="#EDB02C" />
    <rect x="62" y="142" width="76" height="26" rx="8" fill="#8A5636" />
  </>),
  game: (<>
    <path d="M50 62 H150 Q184 62 188 112 Q190 152 164 152 Q150 152 140 130 H60 Q50 152 36 152 Q10 152 12 112 Q16 62 50 62 Z" fill="#F4F1EB" />
    <rect x="46" y="86" width="12" height="36" rx="4" fill="#5A5048" /><rect x="34" y="98" width="36" height="12" rx="4" fill="#5A5048" />
    <circle cx="142" cy="90" r="8" fill="#E8483B" /><circle cx="160" cy="106" r="8" fill="#F7C544" /><circle cx="124" cy="106" r="8" fill="#6CB4F0" /><circle cx="142" cy="122" r="8" fill="#7CC46A" />
  </>),
  laptop: (<>
    <rect x="40" y="40" width="120" height="88" rx="10" fill="#5A5048" /><rect x="50" y="50" width="100" height="68" rx="4" fill="#CFE7FB" />
    <path d="M22 134 H178 L170 154 Q168 158 162 158 H38 Q32 158 30 154 Z" fill="#C9C2B8" />
    <rect x="84" y="134" width="32" height="6" rx="3" fill="#A8A198" />
  </>),
  hourglass: (<>
    <path d="M58 34 H142 V58 Q142 82 112 100 Q142 118 142 142 V166 H58 V142 Q58 118 88 100 Q58 82 58 58 Z" fill="#EAF3FA" />
    <path d="M70 62 H130 Q126 80 100 96 Q74 80 70 62 Z" fill="#F7C544" />
    <path d="M100 118 L132 156 H68 Z" fill="#F7C544" />
    <rect x="44" y="22" width="112" height="16" rx="8" fill="#B97C45" /><rect x="44" y="162" width="112" height="16" rx="8" fill="#B97C45" />
  </>),
};

export const Obj: React.FC<{ name: string; s: number; dim?: number; style?: React.CSSProperties }> = ({ name, s, dim = 0, style }) => (
  <svg width={s} height={s} viewBox="0 0 200 200" style={{ display: "block", overflow: "visible", filter: `drop-shadow(0 ${s * 0.04}px ${s * 0.06}px rgba(60,44,30,0.18))${dim ? ` grayscale(${dim})` : ""}`, ...style }}>{DRAW[name]}</svg>
);
