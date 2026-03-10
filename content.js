/**
 * 金十快讯AI解读 - Content Script v1.5.0
 * 支持AI解读 + 收藏功能
 */

// ============ 市场数据爬虫 ============
class MarketDataScraper {
    constructor() {
        this.cache = new Map();
        this.cacheTimeout = 2 * 60 * 1000;
    }

    async fetchViaProxy(url) {
        try {
            return new Promise((resolve, reject) => {
                chrome.runtime.sendMessage({
                    action: 'fetchMarketData',
                    url: url
                }, (response) => {
                    if (response && response.success) {
                        resolve(response.data);
                    } else {
                        reject(new Error(response?.error || '获取数据失败'));
                    }
                });
            });
        } catch (e) {
            return '';
        }
    }

    async fetchAllMarketData() {
        const cacheKey = 'all_market_data';
        if (this.cache.has(cacheKey)) {
            const cached = this.cache.get(cacheKey);
            if (Date.now() - cached.timestamp < this.cacheTimeout) {
                return cached.data;
            }
        }

        const data = { timestamp: Date.now(), crypto: {}, forex: {}, commodities: {}, stocks: {} };
        await Promise.all([
            this.fetchCryptoData().then(r => data.crypto = r).catch(() => {}),
            this.fetchForexData().then(r => data.forex = r).catch(() => {}),
            this.fetchCommodityData().then(r => data.commodities = r).catch(() => {}),
            this.fetchStockData().then(r => data.stocks = r).catch(() => {})
        ]);

        this.cache.set(cacheKey, { timestamp: Date.now(), data });
        return data;
    }

    async fetchCryptoData() {
        try {
            const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,binancecoin,solana&vs_currencies=usd&include_24hr_change=true');
            if (!response.ok) throw new Error('CoinGecko失败');
            const result = await response.json();
            return {
                BTC: { price: result.bitcoin?.usd || 0, change: result.bitcoin?.usd_24h_change || 0 },
                ETH: { price: result.ethereum?.usd || 0, change: result.ethereum?.usd_24h_change || 0 },
                BNB: { price: result.binancecoin?.usd || 0, change: result.binancecoin?.usd_24h_change || 0 },
                SOL: { price: result.solana?.usd || 0, change: result.solana?.usd_24h_change || 0 }
            };
        } catch (e) { return { BTC: {}, ETH: {}, BNB: {}, SOL: {} }; }
    }

    async fetchForexData() {
        try {
            const text = await this.fetchViaProxy('https://hq.sinajs.cn/list=USDJPY,USDCNY,EURUSD,GBPUSD');
            const data = this.parseSinaData(text);
            return {
                '美元/日元': data.USDJPY || { price: 0, change: 0 },
                '美元/人民币': data.USDCNY || { price: 0, change: 0 },
                '欧元/美元': data.EURUSD || { price: 0, change: 0 },
                '英镑/美元': data.GBPUSD || { price: 0, change: 0 }
            };
        } catch (e) { return { '美元/日元': {}, '美元/人民币': {}, '欧元/美元': {}, '英镑/美元': {} }; }
    }

    async fetchCommodityData() {
        try {
            const text = await this.fetchViaProxy('https://hq.sinajs.cn/list=HF_CL,HF_GC,HF_SI');
            const data = this.parseSinaData(text);
            return {
                '原油': data.HF_CL || { price: 0, change: 0 },
                '黄金': data.HF_GC || { price: 0, change: 0 },
                '白银': data.HF_SI || { price: 0, change: 0 }
            };
        } catch (e) { return { '原油': {}, '黄金': {}, '白银': {} }; }
    }

    async fetchStockData() {
        try {
            const text = await this.fetchViaProxy('https://hq.sinajs.cn/list=s_sh000001,s_sz399001,s_sh000300');
            const data = this.parseSinaData(text);
            return {
                '上证指数': data.s_sh000001 || { price: 0, change: 0 },
                '深证成指': data.s_sz399001 || { price: 0, change: 0 },
                '沪深300': data.s_sh000300 || { price: 0, change: 0 }
            };
        } catch (e) { return { '上证指数': {}, '深证成指': {}, '沪深300': {} }; }
    }

    parseSinaData(text) {
        const result = {};
        const lines = text.split('\n');
        lines.forEach(line => {
            const match = line.match(/var hq_str_(\w+)="([^"]+)"/);
            if (match) {
                const values = match[2].split(',');
                if (values.length > 2) {
                    const price = parseFloat(values[1]) || 0;
                    const prevClose = parseFloat(values[2]) || 0;
                    const change = prevClose > 0 ? ((price - prevClose) / prevClose * 100) : 0;
                    result[match[1]] = { price, change };
                }
            }
        });
        return result;
    }

    getMarketByName(data, marketName) {
        if (marketName.includes('BTC') || marketName.includes('比特币')) return data.crypto?.BTC;
        if (marketName.includes('ETH') || marketName.includes('以太坊')) return data.crypto?.ETH;
        if (marketName.includes('日元') || marketName.includes('JPY') || marketName.includes('日本')) return data.forex?.['美元/日元'];
        if (marketName.includes('人民币') || marketName.includes('CNY')) return data.forex?.['美元/人民币'];
        if (marketName.includes('欧元') || marketName.includes('EUR')) return data.forex?.['欧元/美元'];
        if (marketName.includes('黄金') || marketName.includes('Gold')) return data.commodities?.['黄金'];
        if (marketName.includes('原油') || marketName.includes('石油') || marketName.includes('Oil')) return data.commodities?.['原油'];
        if (marketName.includes('上证') || marketName.includes('A股') || marketName.includes('股市')) return data.stocks?.['上证指数'];
        if (marketName.includes('深证')) return data.stocks?.['深证成指'];
        if (marketName.includes('沪深')) return data.stocks?.['沪深300'];
        return null;
    }

    formatMarketCompact(name, data) {
        if (!data || !data.price) return null;
        const symbol = data.price > 1000 ? (data.price > 50000 ? '$' : '￥') : '';
        const changeStr = data.change >= 0 ? `+${data.change.toFixed(2)}%` : `${data.change.toFixed(2)}%`;
        return `${name} ${symbol}${data.price.toLocaleString()} (${changeStr})`;
    }

    getAvailableMarkets(data) {
        const markets = [];
        Object.entries(data.crypto || {}).forEach(([name, d]) => { if (d.price) markets.push(this.formatMarketCompact(name, d)); });
        Object.entries(data.forex || {}).forEach(([name, d]) => { if (d.price) markets.push(this.formatMarketCompact(name, d)); });
        Object.entries(data.commodities || {}).forEach(([name, d]) => { if (d.price) markets.push(this.formatMarketCompact(name, d)); });
        Object.entries(data.stocks || {}).forEach(([name, d]) => { if (d.price) markets.push(this.formatMarketCompact(name, d)); });
        return markets.filter(m => m !== null);
    }
}

// ============ 收藏管理器 ============
class FavoritesManager {
    constructor() {
        this.storageKey = 'jin10_favorites';
        this.maxFavorites = 100;
    }

    async saveFavorite(event, analysis, marketData, relatedMarkets) {
        const favorite = {
            id: 'fav_' + Date.now(),
            timestamp: new Date().toISOString(),
            event: event,
            analysis: analysis,
            marketData: marketData,
            relatedMarkets: relatedMarkets
        };

        const favorites = await this.getAllFavorites();
        favorites.unshift(favorite);
        if (favorites.length > this.maxFavorites) favorites.pop();

        await chrome.storage.local.set({ [this.storageKey]: favorites });
        return favorite;
    }

    async getAllFavorites() {
        const result = await chrome.storage.local.get(this.storageKey);
        return result[this.storageKey] || [];
    }

    async deleteFavorite(id) {
        let favorites = await this.getAllFavorites();
        favorites = favorites.filter(f => f.id !== id);
        await chrome.storage.local.set({ [this.storageKey]: favorites });
    }

    toMarkdown(favorite) {
        const date = new Date(favorite.timestamp);
        const dateStr = date.toLocaleString('zh-CN');
        const markets = favorite.relatedMarkets.join(', ') || '无';

        return `---
title: 金十快讯解读收藏
date: ${dateStr}
related: ${markets}
---

# 📰 快讯内容

${favorite.event}

# 🤖 AI解读

${favorite.analysis}

# 📊 相关市场

${markets}

---
收藏时间: ${dateStr}
`;
    }
}

// ============ 主插件类 ============
class Jin10AIReader {
    constructor() {
        this.debug = true;
        this.settings = { provider: null, apiKey: null, apiEndpoint: null };
        this.currentButton = null;
        this.hideTimer = null;
        this.isHoveringButton = false;
        this.isHoveringFlash = false;
        this.scraper = new MarketDataScraper();
        this.favoritesManager = new FavoritesManager();
        this.currentAnalysis = null;
        this.currentMarketData = null;
        this.currentRelatedMarkets = null;
    }

    init() {
        this.log('=== 插件启动 v1.5.0 (收藏功能版) ===');
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
            this.log('设置已加载:', { provider: this.settings.provider, hasKey: !!this.settings.apiKey });
        } catch (error) {
            this.log('加载设置失败:', error);
        }
    }

    setupHoverListener() {
        document.body.addEventListener('mouseover', (e) => {
            const target = e.target;
            const flashItem = this.findFlashItem(target);
            if (flashItem) {
                this.isHoveringFlash = true;
                this.showButton(flashItem);
            } else {
                this.isHoveringFlash = false;
                this.scheduleHideButton();
            }
            if (target.closest('.jin10-ai-button')) {
                this.isHoveringButton = true;
                clearTimeout(this.hideTimer);
            }
        }, true);

        document.body.addEventListener('mouseout', (e) => {
            const target = e.target;
            if (target.closest('.jin10-ai-button')) {
                this.isHoveringButton = false;
                this.scheduleHideButton();
            }
            const flashItem = this.findFlashItem(e.relatedTarget);
            if (!flashItem) {
                this.isHoveringFlash = false;
                this.scheduleHideButton();
            }
        }, true);

        this.log('悬停监听已启动');
    }

    setupDOMObserver() {
        const observer = new MutationObserver(() => {});
        observer.observe(document.body, { childList: true, subtree: true });
        this.log('DOM监听已启动');
    }

    findFlashItem(element) {
        if (!element) return null;
        if (this.isFlashItem(element)) return element;
        let current = element;
        let depth = 0;
        while (current && current !== document.body && depth < 10) {
            if (this.isFlashItem(current)) return current;
            current = current.parentElement;
            depth++;
        }
        return null;
    }

    isFlashItem(element) {
        if (!element || !element.textContent) return false;
        const text = element.textContent.trim();
        const timePattern = /^\d{2}:\d{2}:\d{2}/;
        if (!timePattern.test(text)) return false;
        if (text.length < 30 || text.length > 500) return false;
        if (element.classList.contains('jin10-ai-button-container')) return false;
        if (element.classList.contains('jin10-ai-panel')) return false;
        if (this.isIgnoredElement(element)) return false;
        return true;
    }

    isIgnoredElement(element) {
        const ignored = ['nav', 'sidebar', 'footer', 'header', 'menu', 'toolbar'];
        const className = (element.className || '').toLowerCase();
        const id = (element.id || '').toLowerCase();
        for (const keyword of ignored) {
            if (className.includes(keyword) || id.includes(keyword)) return true;
        }
        return false;
    }

    showButton(flashItem) {
        clearTimeout(this.hideTimer);
        let existingButton = flashItem.querySelector('.jin10-ai-button-container');
        if (existingButton) {
            existingButton.style.display = 'block';
            existingButton.style.opacity = '1';
            this.currentButton = existingButton;
            return;
        }
        this.removeCurrentButton();
        const button = this.createButton(flashItem);
        this.insertButton(flashItem, button);
        this.currentButton = button;
    }

    scheduleHideButton() {
        clearTimeout(this.hideTimer);
        this.hideTimer = setTimeout(() => {
            if (!this.isHoveringFlash && !this.isHoveringButton && this.currentButton) {
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
        container.style.cssText = 'margin: 8px 0; padding: 0; display: block; opacity: 0; transition: opacity 0.2s ease;';
        container.innerHTML = `<button class="jin10-ai-button" style="display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; border-radius: 6px; font-size: 13px; font-weight: 500; cursor: pointer; box-shadow: 0 2px 8px rgba(102, 126, 234, 0.4); z-index: 10000; position: relative;"><span class="ai-icon">🤖</span><span class="ai-text">AI解读</span></button>`;
        const button = container.querySelector('.jin10-ai-button');
        button.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.showAIAnalysis(content, container);
        });
        button.onmouseover = () => { button.style.transform = 'translateY(-1px)'; button.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.5)'; };
        button.onmouseout = () => { button.style.transform = ''; button.style.boxShadow = '0 2px 8px rgba(102, 126, 234, 0.4)'; };
        setTimeout(() => { container.style.opacity = '1'; }, 10);
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

        if (analysis.content && !analysis.error) {
            const relatedMarkets = this.extractRelatedMarkets(analysis.content);
            this.log('识别到的相关市场:', relatedMarkets);

            const marketData = await this.scraper.fetchAllMarketData();

            // 保存当前分析结果用于收藏
            this.currentAnalysis = { content: analysis.content, originalEvent: content };
            this.currentMarketData = marketData;
            this.currentRelatedMarkets = relatedMarkets;

            this.updatePanel(panel, analysis, marketData, relatedMarkets);
        } else {
            this.updatePanel(panel, analysis, {}, []);
        }
    }

    extractRelatedMarkets(analysisText) {
        const markets = new Set();
        const keywords = {
            'BTC': ['btc', '比特币', 'bitcoin', '加密货币', '虚拟币'],
            'ETH': ['eth', '以太坊', 'ethereum'],
            '美元/日元': ['日元', 'jpy', 'japan', '日本'],
            '美元/人民币': ['人民币', 'cny', '汇率'],
            '欧元/美元': ['欧元', 'eur', 'europe', '欧洲'],
            '黄金': ['黄金', 'gold', '贵金属', '避险'],
            '原油': ['原油', '石油', 'oil', '能源'],
            '上证指数': ['a股', '上证', '股市', '股票', '沪指']
        };

        const text = analysisText.toLowerCase();

        for (const [market, keys] of Object.entries(keywords)) {
            for (const key of keys) {
                if (text.includes(key)) {
                    markets.add(market);
                    break;
                }
            }
        }

        return Array.from(markets);
    }

    createPanel() {
        const panel = document.createElement('div');
        panel.className = 'jin10-ai-panel';
        panel.style.cssText = 'margin: 12px 0; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12); overflow: hidden; z-index: 9999; position: relative;';
        panel.innerHTML = `<div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white;"><span style="font-size: 14px; font-weight: 600;">🤖 AI深度解读 (${this.settings.provider || 'AI'})</span><button class="ai-panel-close" style="background: rgba(255, 255, 255, 0.2); border: none; color: white; width: 24px; height: 24px; border-radius: 4px; cursor: pointer; font-size: 14px;">✕</button></div><div class="ai-panel-body" style="padding: 16px; max-height: 500px; overflow-y: auto;"><div class="ai-loading" style="text-align: center; padding: 32px; color: #6b7280;"><div style="width: 32px; height: 32px; border: 3px solid #e5e7eb; border-top-color: #667eea; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto;"></div><p style="margin-top: 12px; font-size: 13px;">正在分析中...</p></div></div>`;
        this.addAnimations();
        panel.querySelector('.ai-panel-close').addEventListener('click', () => { panel.remove(); });
        return panel;
    }

    addAnimations() {
        if (document.getElementById('jin10-ai-animations')) return;
        const style = document.createElement('style');
        style.id = 'jin10-ai-animations';
        style.textContent = `@keyframes spin { to { transform: rotate(360deg); } } @keyframes slideDown { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }`;
        document.head.appendChild(style);
    }

    async fetchAIAnalysis(content) {
        if (!this.settings.apiKey) {
            return { error: '请先配置API Key\n点击插件图标→选择AI服务→输入API Key' };
        }

        this.log('调用API:', this.settings.provider);

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
                body = { model: 'deepseek-chat', messages: [{ role: 'user', content: prompt }], max_tokens: 2000 };
                headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this.settings.apiKey}` };
                break;
            case 'minimax':
                body = { model: 'abab6.5s-chat', messages: [{ role: 'user', content: prompt }], tokens_to_generate: 2000 };
                headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this.settings.apiKey}` };
                break;
            case 'glm':
                body = { model: 'glm-4-flash', messages: [{ role: 'user', content: prompt }], max_tokens: 2000 };
                headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this.settings.apiKey}` };
                break;
            default:
                throw new Error('未知的AI服务提供商');
        }

        const response = await fetch(endpoint, { method: 'POST', headers: headers, body: JSON.stringify(body) });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP ${response.status}: ${errorText.substring(0, 200)}`);
        }

        const data = await response.json();

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
• 当前状态：[根据事件内容，描述相关市场的当前状态]
• 理论影响：[事件对市场的理论影响]
• 关注指标：[列出需要重点关注的指标，例如：BTC价格、美元日元汇率、黄金价格等]

📈 走势预判
短期（1-3天）：
中期（1-2周）：

🎯 操作建议
• 适合：
• 风险：

📚 历史参考
类似事件：
当时表现：

🔑 搜索关键词：请提取3-5个关键词（用逗号分隔），用于搜索相关新闻`;
    }

    async updatePanel(panel, analysis, marketData, relatedMarkets) {
        
        const body = panel.querySelector('.ai-panel-body');

        if (analysis.error) {
            body.innerHTML = `<div style="padding: 16px; background: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; color: #991b1b;"><p style="margin: 0; white-space: pre-wrap;">❌ ${this.escapeHtml(analysis.error)}</p></div>`;
            return;
        }

        // 清理AI生成的内容：去掉重复的免责声明
        const cleanedContent = this.cleanContent(analysis.content);

        // 在"关注指标"后插入实时数据
        const enhancedContent = this.injectMarketData(cleanedContent, marketData, relatedMarkets);

        body.innerHTML = `
            <div style="color: #1f2937;">
                <pre style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Microsoft YaHei', sans-serif; font-size: 13px; line-height: 1.8; white-space: pre-wrap; word-break: break-word; margin: 0;">${enhancedContent}</pre>
            </div>
            <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #e5e7eb; display: flex; gap: 8px;">
                <button id="btn-favorite" class="ai-action-btn" style="flex: 1; padding: 8px 16px; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; border: none; border-radius: 6px; font-size: 12px; font-weight: 500; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 4px;">
                    ⭐ 收藏
                </button>
                <button id="btn-view-favorites" class="ai-action-btn" style="flex: 1; padding: 8px 12px; background: #f3f4f6; color: #374151; border: 1px solid #d1d5db; border-radius: 6px; font-size: 12px; font-weight: 500; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 4px;">
                    📋 查看收藏
                </button>
                <button id="btn-news-verify" class="ai-action-btn" style="flex: 1; padding: 8px 12px; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white; border: none; border-radius: 6px; font-size: 12px; font-weight: 500; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 4px;">
                    🔍 相关新闻
                </button>
            </div>
            <div id="news-display-area" style="display: none;"></div>
            <div style="margin-top: 8px; font-size: 10px; color: #9ca3af; text-align: center;">
                相关市场: ${relatedMarkets.join(', ') || '无'}
            </div>
        `;

        // 绑定收藏按钮
        const favBtn = body.querySelector('#btn-favorite');
        if (favBtn) {
            favBtn.addEventListener('click', async () => {
                if (this.currentAnalysis) {
                    await this.favoritesManager.saveFavorite(
                        this.currentAnalysis.originalEvent,
                        this.currentAnalysis.content,
                        this.currentMarketData,
                        this.currentRelatedMarkets
                    );
                    favBtn.textContent = '✓ 已收藏';
                    favBtn.style.background = '#10b981';
                    setTimeout(() => {
                        favBtn.textContent = '⭐ 收藏';
                        favBtn.style.background = 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)';
                    }, 2000);
                }
            });
        }

        const viewBtn = body.querySelector('#btn-view-favorites');
        if (viewBtn) {
            viewBtn.addEventListener('click', () => this.showFavoritesModal(panel));
        }
        // 绑定相关新闻按钮
        const newsBtn = panel.querySelector('#btn-news-verify');
        
        if (newsBtn) {
            
            newsBtn.addEventListener('click', () => {
                
                this.fetchAndShowNews(panel);
            });
        } else {
            
            // 尝试从 body 查找
            const newsBtn2 = body.querySelector('#btn-news-verify');
            
        }

        // 按钮悬停效果
        body.querySelectorAll('.ai-action-btn').forEach(btn => {
            btn.onmouseover = () => btn.style.transform = 'translateY(-1px)';
            btn.onmouseout = () => btn.style.transform = '';
        });
    }

    // 清理AI生成的内容中的重复免责声明
    cleanContent(content) {
        const lines = content.split('\n');
        const cleaned = [];
        const skipPatterns = [
            /⚠️.*重要提醒.*/,
            /⚠️.*免责声明.*/,
            /本解读仅供参考.*/,
            /不构成投资建议.*/,
            /━.*/
        ];
        let inDisclaimer = false;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            // 检查是否进入免责声明区域
            if (skipPatterns.some(p => p.test(line))) {
                inDisclaimer = true;
                continue;
            }

            // 如果已经在免责声明区域，跳过
            if (inDisclaimer) {
                // 遇到新的主要模块时退出免责声明区域
                if (/^📌|^🔗|^💰|^📊|^📈|^🎯|^📚/.test(line)) {
                    inDisclaimer = false;
                    cleaned.push(line);
                }
                continue;
            }

            cleaned.push(line);
        }

        return cleaned.join('\n');
    }

    injectMarketData(analysisText, marketData, relatedMarkets) {
        if (!relatedMarkets || relatedMarkets.length === 0) {
            return analysisText;
        }

        const lines = analysisText.split('\n');
        const result = [];

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            if (line.includes('关注指标') || line.includes('• 关注指标：')) {
                result.push(line);

                let j = i + 1;
                let hasContent = false;

                // 跳过已有的内容行
                while (j < lines.length && !lines[j].match(/^📈|^🎯|^📚/)) {
                    if (lines[j].trim()) {
                        result.push(lines[j]);
                        hasContent = true;
                    }
                    j++;
                }

                // 插入实时数据
                const marketLines = this.getMarketDataLines(marketData, relatedMarkets);
                if (marketLines) {
                    result.push('');
                    result.push('📡 实时数据：');
                    result.push(marketLines);
                }

                while (j < lines.length) {
                    result.push(lines[j]);
                    j++;
                }

                break;
            }

            result.push(line);
        }

        return result.join('\n');
    }

    getMarketDataLines(marketData, relatedMarkets) {
        const lines = [];

        for (const market of relatedMarkets) {
            const data = this.scraper.getMarketByName(marketData, market);
            const formatted = this.scraper.formatMarketCompact(market, data);
            if (formatted) {
                lines.push(`  • ${formatted}`);
            }
        }

        if (lines.length === 0) {
            lines.push('  • 暂无相关市场数据');
        }

        lines.push('');
        lines.push('  数据来源: CoinGecko / 新浪财经');

        return lines.join('\n');
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    extractKeywords() {
        if (!this.currentAnalysis?.content) return [];
        const aiContent = this.currentAnalysis.content;
        const match = aiContent.match(/🔑 搜索关键词[:：](.+)/);
        if (match) {
            const keywordStr = match[1].trim();
            const keywords = keywordStr.split(/[,，、]/).map(k => k.trim()).filter(k => k.length >= 2);
            
            return keywords.slice(0, 5);
        }
        
        return [];
    }

    async fetchAndShowNews(panel) {
        
        const body = panel.querySelector('.ai-panel-body');
        const newsArea = panel.querySelector('#news-display-area');
        if (!newsArea) return;
        newsArea.style.display = 'block';
        newsArea.innerHTML = '<div style="padding: 12px; text-align: center;">正在搜索相关新闻...</div>';
        try {
            const keywords = this.extractKeywords();
            
            if (keywords.length === 0) {
                this.updateNewsDisplay(newsArea, [], 'AI未提供搜索关键词');
                return;
            }
            const news = await this.fetchRelatedNewsViaBackground(keywords);
            this.updateNewsDisplay(newsArea, news);
        } catch (e) {
            console.error('[金十AI] 获取新闻失败:', e);
            newsArea.innerHTML = '<div style="padding: 12px; background: #fef2f2; color: #991b1b;">获取失败</div>';
        }
    }

    fetchRelatedNewsViaBackground(keywords) {
        return new Promise((resolve, reject) => {
            chrome.runtime.sendMessage({ action: 'fetchRelatedNews', keywords: keywords, limit: 5 }, (r) => {
                r?.success ? resolve(r.news || []) : reject(new Error(r?.error || '失败'));
            });
        });
    }

    updateNewsDisplay(newsArea, news, errorMsg) {
        if (errorMsg) { newsArea.innerHTML = '<div style="padding: 12px; background: #fef3c7; color: #92400e;">⚠️ ' + errorMsg + '</div>'; return; }
        if (!news?.length) { newsArea.innerHTML = '<div style="padding: 12px; background: #f3f4f6; color: #6b7280;">暂无相关新闻</div>'; return; }
        const html = news.map(item => '<div style="padding: 10px; background: #f9fafb; border-radius: 6px; margin-bottom: 8px; border-left: 3px solid #667eea;"><div><a href="' + item.url + '" target="_blank" style="font-size: 12px; color: #1f2937; text-decoration: none;">' + this.escapeHtml(item.title) + '</a></div><div style="font-size: 10px; color: #9ca3af; margin-top: 4px;"><span style="background: ' + (item.language === 'zh' ? '#dbeafe' : '#e0e7ff') + '; padding: 2px 6px; border-radius: 3px;">' + item.source + '</span><span>' + this.getTimeAgo(new Date(item.publishedAt)) + '</span></div></div>').join('');
        newsArea.innerHTML = '<div style="padding: 12px 0;"><div style="display: flex; gap: 6px; margin-bottom: 10px; border-bottom: 1px solid #e5e7eb;"><span>📰</span><span style="font-weight: 600;">相关新闻 (' + news.length + ')</span></div>' + html + '</div>';
    }

    getTimeAgo(date) {
        if (!(date instanceof Date) || isNaN(date)) return '未知时间';
        const s = Math.floor((Date.now() - date.getTime()) / 1000);
        if (s < 60) return '刚刚';
        if (s < 3600) return Math.floor(s / 60) + '分钟前';
        if (s < 86400) return Math.floor(s / 3600) + '小时前';
        return Math.floor(s / 86400) + '天前';
    }

    async showFavoritesModal(parentPanel) {
        const favorites = await this.favoritesManager.getAllFavorites();

        const modal = document.createElement('div');
        modal.className = 'jin10-favorites-modal';
        modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 100000; display: flex; align-items: center; justify-content: center;';

        const content = document.createElement('div');
        content.style.cssText = 'background: white; border-radius: 12px; width: 90%; max-width: 600px; max-height: 80vh; display: flex; flex-direction: column; box-shadow: 0 20px 60px rgba(0,0,0,0.3);';

        const header = document.createElement('div');
        header.style.cssText = 'padding: 16px 20px; border-bottom: 1px solid #e5e7eb; display: flex; justify-content: space-between; align-items: center;';
        header.innerHTML = `
            <span style="font-size: 16px; font-weight: 600; color: #1f2937;">📋 我的收藏 (${favorites.length})</span>
            <button id="close-favorites" style="background: none; border: none; font-size: 20px; cursor: pointer; color: #6b7280; padding: 4px;">✕</button>
        `;

        const body = document.createElement('div');
        body.style.cssText = 'padding: 16px; overflow-y: auto; flex: 1;';

        if (favorites.length === 0) {
            body.innerHTML = '<div style="text-align: center; color: #9ca3af; padding: 40px;">暂无收藏</div>';
        } else {
            favorites.forEach(fav => {
                const date = new Date(fav.timestamp);
                const dateStr = date.toLocaleString('zh-CN');
                const markets = fav.relatedMarkets.join(', ') || '无';

                const item = document.createElement('div');
                item.style.cssText = 'background: #f9fafb; border-radius: 8px; padding: 12px; margin-bottom: 12px; border: 1px solid #e5e7eb;';
                item.innerHTML = `
                    <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px;">
                        <span style="font-size: 10px; color: #9ca3af;">${dateStr}</span>
                        <button class="delete-fav" data-id="${fav.id}" style="background: none; border: none; color: #ef4444; cursor: pointer; font-size: 12px; padding: 4px 8px; border-radius: 4px;">删除</button>
                    </div>
                    <div style="font-size: 12px; color: #374151; margin-bottom: 8px; line-height: 1.6;">${this.escapeHtml(fav.event.substring(0, 100))}${fav.event.length > 100 ? '...' : ''}</div>
                    <div style="font-size: 10px; color: #6b7280;">相关市场: ${markets}</div>
                    <button class="copy-fav" data-id="${fav.id}" style="margin-top: 8px; background: #f3f4f6; border: 1px solid #d1d5db; color: #374151; cursor: pointer; font-size: 11px; padding: 6px 12px; border-radius: 4px;">📋 复制Markdown</button>
                `;

                // 绑定删除按钮
                item.querySelector('.delete-fav').addEventListener('click', async () => {
                    await this.favoritesManager.deleteFavorite(fav.id);
                    item.remove();
                    header.querySelector('span').textContent = `📋 我的收藏 (${favorites.length - 1})`;
                });

                // 绑定复制按钮
                item.querySelector('.copy-fav').addEventListener('click', () => {
                    const markdown = this.favoritesManager.toMarkdown(fav);
                    navigator.clipboard.writeText(markdown).then(() => {
                        const btn = item.querySelector('.copy-fav');
                        btn.textContent = '✓ 已复制';
                        setTimeout(() => btn.textContent = '📋 复制Markdown', 2000);
                    });
                });

                body.appendChild(item);
            });
        }

        content.appendChild(header);
        content.appendChild(body);
        modal.appendChild(content);
        document.body.appendChild(modal);

        // 关闭按钮
        modal.querySelector('#close-favorites').addEventListener('click', () => modal.remove());
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });
    }
}

// 初始化
const reader = new Jin10AIReader();
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => reader.init());
} else {
    reader.init();
}
