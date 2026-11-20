# liyuedev.github.io

黎月的前端作品集 —— 安静的界面，会回应你。

**在线**：<https://liyuedev.github.io>

用原生 HTML / CSS / Canvas 做小而有手感的东西，每个作品都是单文件，双击就能跑。
整站没有构建、没有框架、没有第三方库。

---

## 页面

| 文件 | 说明 |
| --- | --- |
| `index.html` | 首页：作品 / 关于 / 开源 / 联系 |
| `star-rain.html` | **把雨接成星光** —— 伞接住的雨变成光，Canvas 粒子，单文件 |
| `wind-tree.html` | **风过梨花** —— 像素花树，两百多根关节，风从枝头一段段传下去 |
| `showpages/liyue-pixel-plants/` | 像素植物引擎 `pixel-flora.js`（梨 / 桃 / 樱 / 银杏 / 灌木 / 松）、全屏轮播页 `demo.html`、单株页 `pine.html` |

`assets/` 是签名与图标，`preview.png` 用于社交分享卡片。

## 一个主推项目，两个 Skill

站里展示的东西都单独开源，可以 `git clone` 走：

- **LyLaunch · 轻启**（主推）—— 热键唤起的 Windows 启动器：拼音搜应用、剪贴板历史、插件系统，纯本地不上传。22,000+ 行 Python，PySide6 + Win32 原生 API。
  <https://github.com/LiyueDev/LyLaunch>
- **liyue-air-design** —— 这套「Air」设计风格本身：配色、字体、圆角、阴影、缓动、图标线宽，`SKILL.md` 加一张 token 表。
  <https://github.com/LiyueDev/liyue-air-design>
- **liyue-pixel-plants** —— 像素植物引擎：六种树、骨骼风力、开花落花，页面里那棵会摆的树就是它长的。
  <https://github.com/LiyueDev/liyue-pixel-plants>

## 本地跑

不需要 `npm install`，也不需要 `serve`：

```bash
git clone https://github.com/LiyueDev/LiyueDev.github.io.git
cd LiyueDev.github.io
start index.html
```

`wind-tree.html` 支持 `?embed=1` 参数，去掉页面外壳，只留画布 —— 首页作品卡里的实时预览就是这么嵌的。

## 部署

仓库名就是 `LiyueDev.github.io`，GitHub Pages 直接以 `main` 分支根目录发布。
改完 push，一两分钟内自动上线：

```bash
git add -A
git commit -m "update"
git push
```

---

MIT · 黎月（LiyueDev）
