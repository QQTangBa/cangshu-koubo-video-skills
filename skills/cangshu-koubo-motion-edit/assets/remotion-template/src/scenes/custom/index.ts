// 手写场景登记表（归工程自己，sync_template.sh 不会覆盖它）。新场景：在本目录写 <name>.tsx，导出 scene: CustomScene，再加到 CUSTOM 里。
// plan.json 里这样用：{ "world": "B", "start": .., "end": .., "scene": { "layout": "custom", "name": "<name>" } }
// 样例：stock1 / stock2（白卡 lux 画风）；toon_panel_example.tsx（动画片画风 + 主题配色 + lbkit 道具，没登记，照着写）
// 系列片头：import { scene as introScene, cuesAt as introCues } from "./intro"; 登记成 intro: { ...introScene, cues: introCues(<片头段开头秒>) }
export type { Cue, CustomProps, CustomScene, SfxRole } from "./types";
import type { CustomScene } from "./types";

import { scene as stock1 } from "./stock1";
import { scene as stock2 } from "./stock2";

export const CUSTOM: Record<string, CustomScene> = { stock1, stock2 };
