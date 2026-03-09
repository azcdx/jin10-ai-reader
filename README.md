# 金十快讯AI解读

Chrome浏览器插件，为金十数据快讯添加AI深度解读功能。

## 功能特性

- 🤖 **AI深度解读**: 支持DeepSeek、MiniMax、GLM三个AI服务
- 🎯 **悬停显示**: 鼠标悬停在快讯上时显示解读按钮
- 📊 **六大分析维度**: 核心逻辑、关联影响、利益博弈、市场验证、走势预判、操作建议
- ⚡ **实时响应**: 使用WebSocket监听动态快讯

## 安装方法

1. 克隆或下载本项目
2. 打开Chrome浏览器，访问 `chrome://extensions/`
3. 开启"开发者模式"
4. 点击"加载已解压的扩展程序"
5. 选择项目文件夹

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

## 技术栈

- Vanilla JavaScript
- Chrome Extension Manifest V3
- 支持多个AI API（OpenAI兼容格式）

## 免责声明

本插件提供的AI解读仅供参考，不构成任何投资建议。市场有风险，投资需谨慎。

## 许可证

MIT License
