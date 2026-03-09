# 金十快讯AI解读

Chrome浏览器插件，为金十数据快讯添加AI深度解读功能。

## 功能特性

- 🤖 **AI深度解读**: 支持DeepSeek、MiniMax、GLM三个AI服务
- 🎯 **悬停显示**: 鼠标悬停在快讯上时显示解读按钮
- 📊 **六大分析维度**: 核心逻辑、关联影响、利益博弈、市场验证、走势预判、操作建议
- ⚡ **实时市场数据**: 自动识别相关市场并显示实时价格
- ⭐ **自动下载收藏**: 点击收藏自动保存Markdown文件到项目目录
- 📂 **按日期组织**: 文件自动存入 `favorites/YYYY-MM-DD/` 文件夹
- 📋 **收藏管理**: 支持查看、删除、复制Markdown

## 安装方法

1. 克隆或下载本项目
2. 打开Chrome浏览器，访问 `chrome://extensions/`
3. 开启"开发者模式"
4. 点击"加载已解压的扩展程序"
5. 选择项目文件夹

### 重要：设置下载位置

为了让收藏文件保存到项目目录，需要设置浏览器下载位置：

1. Chrome 设置 → 下载内容
2. 将"位置"改为：`F:/实例/jin10-ai-reader/`
3. 或者点击每次下载前询问"保存位置"

## 配置API

1. 点击插件图标打开设置
2. 选择AI服务（DeepSeek/MiniMax/GLM）
3. 输入API Key
4. 保存配置

## 使用方法

1. 访问金十快讯页面：https://www.jin10.com/flash
2. 鼠标悬停在快讯上
3. 点击"🤖 AI解读"按钮
4. 查看AI分析结果
5. 点击"⭐ 收藏并下载"自动保存

## 收藏文件说明

收藏的解读会自动下载为Markdown文件，保存在项目目录下：

```
F:/实例/jin10-ai-reader/
├── favorites/
│   ├── 2026-03-09/
│   │   ├── 1430_美联储降息.md
│   │   ├── 1455_BTC突破新高.md
│   │   └── ...
│   ├── 2026-03-10/
│   │   └── ...
│   └── README.md
├── content.js
├── manifest.json
└── ...
```

文件命名格式：`HHMM_事件标题.md`

## 技术栈

- Vanilla JavaScript
- Chrome Extension Manifest V3
- 支持多个AI API（OpenAI兼容格式）
- chrome.downloads API 自动下载

## 免责声明

本插件提供的AI解读仅供参考，不构成任何投资建议。市场有风险，投资需谨慎。

## 许可证

MIT License
