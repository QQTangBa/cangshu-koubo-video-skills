import { Config } from "@remotion/cli/config";

Config.setRspack(true);
Config.setVideoImageFormat("png"); // 清晰度：逐帧无损，JPEG 80 会把真人画面压糊
Config.setOverwriteOutput(true);
Config.setChromiumOpenGlRenderer("angle");
