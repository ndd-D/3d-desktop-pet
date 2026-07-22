# 小桌宠 (Desktop Pet)

一个基于 Electron + Vue 3 开发的桌面宠物应用，具有任务管理、提醒、便签和剪贴板记录功能。

<img src="./public/preview1.png" width="49%" style="display: inline-block"> <img src="./public/preview2.png" width="49%" style="display: inline-block">

## ✨ 功能特性

- 🐰 可爱的 3D 宠物模型
- 📝 任务管理系统（实时更新待办数量）
- ⏰ 灵活的提醒功能（自动消失弹窗）
- 📌 便签功能（支持置顶、拖拽、调整大小）
- 📋 剪贴板自动记录（文字和图片）
- 🎮 宠物互动（运动/休息）
- 🖥️ 跨平台支持（Windows/MacOS/Linux）

## 🚀 技术栈

- Electron
- Vue 3
- TypeScript
- Electron-Vite
- Vite
- TresJS (Three.js for Vue)
- Tailwind CSS
- Dexie.js (IndexedDB)

## 📦 安装

```bash
# 克隆项目
git clone https://github.com/your-username/desktop-pet.git
# 进入项目目录
cd desktop-pet
# 安装依赖
npm install
# 开发模式运行
npm run dev
# 打包应用
npm run build:win    # Windows
npm run build:mac-universal # MacOS
npm run build:linux  # Linux
```

## 📦 打包与分发

### Windows 打包

```bash
# 生成便携版（推荐用于分发）
npm run build:win
```

打包完成后，产物位于 `release/win-unpacked` 目录下，将整个文件夹压缩发给用户即可。

### 使用国内镜像

在项目根目录创建 `.npmrc` 文件可以加速依赖下载：

```
electron_mirror=https://npmmirror.com/mirrors/electron/
electron_builder_binaries_mirror=https://npmmirror.com/mirrors/electron-builder-binaries/
```

## 🎯 主要功能

### 桌面宠物

- 3D 模型展示
- 拖拽移动
- 互动动画（点击对话气泡）
- 始终置顶显示
- 待办任务数量实时显示

### 任务管理

- 创建/编辑/删除任务
- 任务优先级设置（高/中/低）
- 任务状态追踪（待处理/进行中/已完成）
- 截止时间提醒
- 实时更新到桌宠显示

### 提醒系统

- 单次提醒
- 自定义间隔重复提醒
- 每日定时提醒
- 弹窗通知（2秒自动消失）
- 跟随桌宠位置显示

### 便签功能

- 创建/编辑便签
- 拖拽移动位置
- 调整大小
- 置顶功能（始终在最上层）
- 自动保存

### 剪贴板记录

- 自动记录复制的文字
- 自动保存复制的图片
- 支持按时间分组保存
- 复制内容预览和重新复制

## � 用户操作指南

### 桌面宠物交互

| 操作 | 效果 |
|------|------|
| **左键拖拽** | 拖动宠物到任意位置 |
| **双击宠物** | 最小化到托盘 |
| **点击左上角数字** | 打开任务列表窗口 |
| **右键点击宠物** | 打开功能菜单 |
| **点击宠物身体** | 触发互动动画 |
| **点击对话框气泡** | 切换对话内容 |

### 右键功能菜单

右键点击宠物后会弹出菜单，包含以下选项：

| 选项 | 功能 |
|------|------|
| 任务管理 | 打开任务列表窗口 |
| 提醒管理 | 打开提醒设置窗口 |
| 新建便签 | 创建一个新的便签 |
| 暂停动画 | 暂停宠物动画效果 |
| 设置 | 打开应用设置窗口 |

### 子窗口操作

所有功能窗口（任务管理、提醒管理、便签、设置）都支持以下操作：

| 操作 | 效果 |
|------|------|
| **拖拽标题栏** | 移动窗口位置 |
| **点击最小化按钮** | 最小化窗口 |
| **点击关闭按钮** | 关闭窗口 |
| **双击窗口标题** | 无效果（仅拖拽） |

### 任务管理

| 操作 | 效果 |
|------|------|
| **点击任务标题** | 切换任务状态（待处理→进行中→已完成） |
| **点击编辑图标** | 修改任务内容、优先级、截止时间 |
| **点击删除图标** | 删除任务 |
| **点击优先级标签** | 切换优先级（高/中/低） |
| **任务数量变化** | 自动更新到宠物左上角数字 |

### 提醒管理

| 操作 | 效果 |
|------|------|
| **点击开关** | 启用/禁用提醒 |
| **点击编辑图标** | 修改提醒内容、时间、重复规则 |
| **点击删除图标** | 删除提醒 |
| **提醒触发** | 自动弹出消息框，2秒后自动消失 |

### 便签功能

| 操作 | 效果 |
|------|------|
| **点击文字区域** | 进入编辑模式 |
| **拖拽标题栏** | 移动便签位置 |
| **拖拽右下角** | 调整便签大小 |
| **点击置顶按钮** | 切换便签是否始终显示在最上层 |
| **点击关闭按钮** | 关闭便签（自动保存） |

### 托盘图标

当宠物最小化后，会在系统托盘显示图标：

| 操作 | 效果 |
|------|------|
| **左键点击托盘图标** | 显示宠物窗口 |
| **右键点击托盘图标** | 打开退出菜单 |

## 💡 使用提示

1. **宠物位置**：拖拽宠物到合适位置，它会始终显示在桌面最上层
2. **任务提醒**：为重要任务设置截止时间，到期前会自动提醒
3. **便签置顶**：重要的便签可以点击置顶按钮，确保不会被其他窗口遮挡
4. **提醒弹窗**：提醒消息框会跟随宠物位置显示，确保在可见区域
5. **数据安全**：所有数据均保存在本地 IndexedDB 中，不会上传到云端

## �📁 项目结构

```bash
src/
├── components/ # 组件（SubWindowLayout, ContextMenu, Toast等）
├── views/ # 页面（Home, TodoView, ReminderView, StickyNote等）
├── composable/ # 组合式函数（useReminder, useModel等）
├── db/ # 数据库相关（Dexie配置）
├── router/ # 路由配置
└── assets/ # 静态资源
electron/ # Electron 主进程（main.ts, preload.ts, tray.ts）
```

## 🤝 贡献指南

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 提交 Pull Request

## 📄 开源协议

本项目基于 [MIT](LICENSE) 协议开源。

## 🙏 致谢

- [Vue](https://vuejs.org/)
- [electron-vite](https://electron-vite.github.io/)
- [TresJS](https://tresjs.org/)
- [Electron](https://www.electronjs.org/)
- [Dexie.js](https://dexie.org/)
- [Three.js](https://threejs.org/)
- [Tailwind CSS](https://tailwindcss.com/)