/**
 * 金十快讯AI解读 - Content Script (悬停显示版)
 */

class Jin10AIReader {
    constructor() {
        this.debug = true;
        this.settings = {
            provider: null,
            apiKey: null,
            apiEndpoint: null
        };
        this.currentButton = null;
        this.hideTimer = null;
        this.isHoveringButton = false;
        this.isHoveringFlash = false;
    }

    init() {
        this.log('=== 插件启动 ===');
        this.log('当前URL:', window.location.href);

        this.loadSettings().then(() => {
            this.setupHoverListener();
            this.setupDOMObserver();
        });
    }

    log(...args) {
        if (this.debug) {
            console.log('[金十AI解读]', ...args);
        }
    }

    async loadSettings() {
        try {
            const result = await chrome.storage.sync.get(['provider', 'apiKey', 'apiEndpoint']);
            this.settings.provider = result.provider || 'deepseek';
            this.settings.apiKey = result.apiKey;
            this.settings.apiEndpoint = result.apiEndpoint;
            this.log('设置已加载:', {
                provider: this.settings.provider,
                hasKey: !!this.settings.apiKey,
                endpoint: this.settings.apiEndpoint
            });
        } catch (error) {
            this.log('加载设置失败:', error);
        }
    }

    setupHoverListener() {
        // 鼠标移动到快讯上
        document.body.addEventListener('mouseover', (e) => {
            const target = e.target;

            // 检查是否悬停在快讯上
            const flashItem = this.findFlashItem(target);
            if (flashItem) {
                this.isHoveringFlash = true;
                this.showButton(flashItem);
            } else {
                this.isHoveringFlash = false;
                this.scheduleHideButton();
            }

            // 检查是否悬停在按钮上
            if (target.closest('.jin10-ai-button')) {
                this.isHoveringButton = true;
                clearTimeout(this.hideTimer);
            }
        }, true);

        // 鼠标移开
        document.body.addEventListener('mouseout', (e) => {
            const target = e.target;

            // 移开按钮
            if (target.closest('.jin10-ai-button')) {
                this.isHoveringButton = false;
                this.scheduleHideButton();
            }

            // 移开快讯
            const flashItem = this.findFlashItem(e.relatedTarget);
            if (!flashItem) {
                this.isHoveringFlash = false;
                this.scheduleHideButton();
            }
        }, true);

        this.log('悬停监听已启动');
    }

    setupDOMObserver() {
        const observer = new MutationObserver(() => {
            // DOM变化时不需要特殊处理，悬停监听已经足够
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        this.log('DOM监听已启动');
    }

    findFlashItem(element) {
        if (!element) return null;

        // 检查元素本身
        if (this.isFlashItem(element)) {
            return element;
        }

        // 向上查找
        let current = element;
        let depth = 0;

        while (current && current !== document.body && depth < 10) {
            if (this.isFlashItem(current)) {
                return current;
            }
            current = current.parentElement;
            depth++;
        }

        return null;
    }

    isFlashItem(element) {
        if (!element || !element.textContent) return false;

        const text = element.textContent.trim();

        // 必须以时间开头
        const timePattern = /^\d{2}:\d{2}:\d{2}/;
        if (!timePattern.test(text)) return false;

        // 长度合理
        if (text.length < 30 || text.length > 500) return false;

        // 排除按钮相关
        if (element.classList.contains('jin10-ai-button-container')) return false;
        if (element.classList.contains('jin10-ai-panel')) return false;

        // 排除导航等
        if (this.isIgnoredElement(element)) return false;

        return true;
    }

    isIgnoredElement(element) {
        const ignored = ['nav', 'sidebar', 'footer', 'header', 'menu', 'toolbar'];
        const className = (element.className || '').toLowerCase();
        const id = (element.id || '').toLowerCase();

        for (const keyword of ignored) {
            if (className.includes(keyword) || id.includes(keyword)) {
                return true;
            }
        }
        return false;
    }

    showButton(flashItem) {
        clearTimeout(this.hideTimer);

        // 检查是否已有按钮
        let existingButton = flashItem.querySelector('.jin10-ai-button-container');

        if (existingButton) {
            // 已有按钮，显示它
            existingButton.style.display = 'block';
            existingButton.style.opacity = '1';
            this.currentButton = existingButton;
            return;
        }

        // 创建新按钮
        this.removeCurrentButton();
        const button = this.createButton(flashItem);
        this.insertButton(flashItem, button);
        this.currentButton = button;

        this.log('✓ 按钮已显示');
    }

    scheduleHideButton() {
        clearTimeout(this.hideTimer);

        // 只有在不在快讯上也不在按钮上时才隐藏
        this.hideTimer = setTimeout(() => {
            if (!this.isHoveringFlash && !this.isHoveringButton && this.currentButton) {
                // 淡出效果
                this.currentButton.style.opacity = '0';
                setTimeout(() => {
                    if (this.currentButton && !this.isHoveringFlash && !this.isHoveringButton) {
                        this.currentButton.style.display = 'none';
                    }
                }, 200);
            }
        }, 200);
    }

    removeCurrentButton() {
        if (this.currentButton && this.currentButton.parentElement) {
            this.currentButton.remove();
        }
        this.currentButton = null;
    }

    createButton(flashItem) {
        const content = this.extractContent(flashItem);

        const container = document.createElement('div');
        container.className = 'jin10-ai-button-container';
        container.style.cssText = `
            margin: 8px 0;
            padding: 0;
            display: block;
            opacity: 0;
            transition: opacity 0.2s ease;
        `;

        container.innerHTML = `
            <button class="jin10-ai-button" style="
                display: inline-flex;
                align-items: center;
                gap: 6px;
                padding: 6px 12px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                border: none;
                border-radius: 6px;
                font-size: 13px;
                font-weight: 500;
                cursor: pointer;
                box-shadow: 0 2px 8px rgba(102, 126, 234, 0.4);
                transition: all 0.2s;
                z-index: 10000;
                position: relative;
            ">
                <span class="ai-icon">🤖</span>
                <span class="ai-text">AI解读</span>
            </button>
        `;

        const button = container.querySelector('.jin10-ai-button');

        // 按钮点击事件
        button.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.log('按钮被点击');
            this.showAIAnalysis(content, container);
        });

        // 按钮悬停效果
        button.onmouseover = () => {
            button.style.transform = 'translateY(-1px)';
            button.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.5)';
        };

        button.onmouseout = () => {
            button.style.transform = '';
            button.style.boxShadow = '0 2px 8px rgba(102, 126, 234, 0.4)';
        };

        // 显示按钮
        setTimeout(() => {
            container.style.opacity = '1';
        }, 10);

        return container;
    }

    insertButton(flashItem, button) {
        flashItem.appendChild(button);
    }

    extractContent(item) {
        let text = item.textContent?.trim() || '';
        text = text.replace(/^\d{2}:\d{2}:\d{2}\s*/, '');
        text = text.replace(/\s+/g, ' ');
        return text.substring(0, 500);
    }

    async showAIAnalysis(content, buttonElement) {
        this.log('开始AI分析:', content.substring(0, 50));

        let panel = buttonElement.parentElement?.querySelector('.jin10-ai-panel');
        if (panel) {
            panel.remove();
            return;
        }

        panel = this.createPanel();
        buttonElement.parentElement?.appendChild(panel);

        const analysis = await this.fetchAIAnalysis(content);
        this.updatePanel(panel, analysis);
    }

    createPanel() {
        const panel = document.createElement('div');
        panel.className = 'jin10-ai-panel';
        panel.style.cssText = `
            margin: 12px 0;
            background: #ffffff;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
            overflow: hidden;
            animation: slideDown 0.3s ease;
            z-index: 9999;
            position: relative;
        `;

        panel.innerHTML = `
            <div style="
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 12px 16px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
            ">
                <span style="font-size: 14px; font-weight: 600;">🤖 AI深度解读 (${this.settings.provider || 'AI'})</span>
                <button class="ai-panel-close" style="
                    background: rgba(255, 255, 255, 0.2);
                    border: none;
                    color: white;
                    width: 24px;
                    height: 24px;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 14px;
                ">✕</button>
            </div>
            <div class="ai-panel-body" style="
                padding: 16px;
                max-height: 500px;
                overflow-y: auto;
            ">
                <div class="ai-loading" style="
                    text-align: center;
                    padding: 32px;
                    color: #6b7280;
                ">
                    <div style="
                        width: 32px;
                        height: 32px;
                        border: 3px solid #e5e7eb;
                        border-top-color: #667eea;
                        border-radius: 50%;
                        animation: spin 1s linear infinite;
                        margin: 0 auto;
                    "></div>
                    <p style="margin-top: 12px; font-size: 13px;">正在分析中...</p>
                </div>
            </div>
        `;

        this.addAnimations();

        panel.querySelector('.ai-panel-close').addEventListener('click', () => {
            panel.remove();
        });

        return panel;
    }

    addAnimations() {
        if (document.getElementById('jin10-ai-animations')) return;

        const style = document.createElement('style');
        style.id = 'jin10-ai-animations';
        style.textContent = `
            @keyframes spin {
                to { transform: rotate(360deg); }
            }
            @keyframes slideDown {
                from {
                    opacity: 0;
                    transform: translateY(-10px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }
        `;
        document.head.appendChild(style);
    }

    async fetchAIAnalysis(content) {
        if (!this.settings.apiKey) {
            return {
                error: '请先配置API Key\n点击插件图标→选择AI服务→输入API Key'
            };
        }

        this.log('调用API:', this.settings.provider);
        this.log('API Endpoint:', this.settings.apiEndpoint);

        try {
            const result = await this.callAPI(content);
            this.log('API调用成功');
            return { content: result };
        } catch (error) {
            this.log('API调用失败:', error);
            return { error: `分析失败: ${error.message}` };
        }
    }

    async callAPI(content) {
        const endpoint = this.settings.apiEndpoint;
        const prompt = this.buildPrompt(content);

        let body, headers;

        switch (this.settings.provider) {
            case 'deepseek':
                body = {
                    model: 'deepseek-chat',
                    messages: [{ role: 'user', content: prompt }],
                    max_tokens: 2000
                };
                headers = {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.settings.apiKey}`
                };
                break;

            case 'minimax':
                body = {
                    model: 'abab6.5s-chat',
                    messages: [{ role: 'user', content: prompt }],
                    tokens_to_generate: 2000
                };
                headers = {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.settings.apiKey}`
                };
                break;

            case 'glm':
                body = {
                    model: 'glm-4-flash',
                    messages: [{ role: 'user', content: prompt }],
                    max_tokens: 2000
                };
                headers = {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.settings.apiKey}`
                };
                break;

            default:
                throw new Error('未知的AI服务提供商');
        }

        this.log('发送请求到:', endpoint);

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const errorText = await response.text();
            this.log('API错误响应:', errorText);
            throw new Error(`HTTP ${response.status}: ${errorText.substring(0, 200)}`);
        }

        const data = await response.json();
        this.log('API响应:', data);

        if (this.settings.provider === 'minimax') {
            return data.choices[0].text;
        } else {
            return data.choices[0].message.content;
        }
    }

    buildPrompt(content) {
        return `请分析以下金十快讯：

【快讯内容】
${content}

请按以下格式输出（简洁直观，每个模块3-5行）：

📌 核心逻辑
事件本质：
因果链：

🔗 关联影响
直接影响：
间接影响：

💰 利益博弈
✓ 赢家：
✗ 输家：
当前情绪：[贪婪●●●●○ 恐惧]

📊 市场验证
理论影响：
实际表现：（说明：需要实时数据验证，请标注"待验证"）
消息消化度：

📈 走势预判
短期（1-3天）：
中期（1-2周）：
关键价位：（标注"需要实时数据"）

🎯 操作建议
• 适合：
• 风险：
• 机会：

⚠️ 重要提醒

📚 历史参考
类似事件：
当时表现：
本轮相似度：

✅ 信息可信度
来源：可信度：★★★★☆

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ 免责声明
本解读仅供参考，不构成投资建议。
━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
    }

    updatePanel(panel, analysis) {
        const body = panel.querySelector('.ai-panel-body');

        if (analysis.error) {
            body.innerHTML = `
                <div style="
                    padding: 16px;
                    background: #fef2f2;
                    border: 1px solid #fecaca;
                    border-radius: 6px;
                    color: #991b1b;
                ">
                    <p style="margin: 0; white-space: pre-wrap;">❌ ${this.escapeHtml(analysis.error)}</p>
                </div>
            `;
        } else {
            body.innerHTML = `
                <div style="color: #1f2937;">
                    <pre style="
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Microsoft YaHei', sans-serif;
                        font-size: 13px;
                        line-height: 1.8;
                        white-space: pre-wrap;
                        word-break: break-word;
                        margin: 0;
                    ">${this.escapeHtml(analysis.content)}</pre>
                </div>
            `;
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// 初始化
const reader = new Jin10AIReader();

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => reader.init());
} else {
    reader.init();
}
