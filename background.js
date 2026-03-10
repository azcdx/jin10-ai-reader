/**
 * 金十快讯AI解读 - Background Service Worker
 * 处理文件下载、市场数据代理、新闻验证
 * v1.7.0 - 添加中英文新闻验证功能
 */

// ============ 配置 ============

// 重大事件关键词（自动触发新闻验证）
const MAJOR_EVENT_KEYWORDS = [
    '美联储', 'Fed', 'Powell', '利率',
    '非农', 'Nonfarm', 'NFP', '就业',
    'CPI', '通胀', 'PCE',
    'GDP', '经济数据',
    'ECB', '欧央行', '央行',
    '战争', 'War', '冲突',
    '地震', 'Earthquake',
    '降息', '加息', 'rate cut', 'hike',
    '原油', '石油', 'Oil',
    '黄金', 'Gold',
    '美股', 'A股', '股市'
];

// RSS数据源配置（只保留可靠的源）
const RSS_SOURCES = [
    {
        name: 'Bloomberg',
        url: 'https://feeds.bloomberg.com/markets/news.rss',
        lang: 'en',
        category: 'finance'
    }
];

// Nitter实例（Twitter无API前端）
const NITTER_INSTANCES = [
    'https://nitter.net',
    'https://nitter.poast.org',
    'https://nitter.privacydev.net'
];

// 新闻验证配置
const NEWS_CONFIG = {
    enabled: true,
    maxResults: 3,
    includeTwitter: false,  // 暂时禁用Twitter
    timeout: 5000,
    cacheTTL: 2 * 60 * 1000
};

// ============ 消息处理 ============

console.log("[金十AI] Background script loaded!");
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'downloadFavorite') {
        downloadFavoriteFile(request.data);
        sendResponse({ success: true });
    } else if (request.action === 'fetchMarketData') {
        fetchMarketData(request.url).then(data => {
            sendResponse({ success: true, data: data });
        }).catch(error => {
            sendResponse({ success: false, error: error.message });
        });
        return true;
    } else if (request.action === 'fetchRelatedNews') {
        fetchRelatedNews(request.keywords, request.limit).then(news => {
            sendResponse({ success: true, news: news });
        }).catch(error => {
            sendResponse({ success: false, error: error.message });
        });
        return true;
    }
    return true;
});

// ============ 下载功能 ============

async function downloadFavoriteFile(data) {
    const { event, analysis, marketData, relatedMarkets, timestamp } = data;

    const date = new Date(timestamp);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');

    const folderPath = `favorites/${year}-${month}-${day}/`;
    const title = event.substring(0, 20).replace(/[<>:"/\\|?*]/g, '').trim();
    const filename = `${folderPath}${hours}${minutes}_${title}.md`;

    const markdown = generateMarkdown(data, date);

    try {
        const dataUrl = 'data:text/markdown;charset=utf-8,' + encodeURIComponent(markdown);
        await chrome.downloads.download({
            url: dataUrl,
            filename: filename,
            saveAs: false
        });
        console.log('[金十AI解读] 收藏文件已保存:', filename);
    } catch (error) {
        console.error('[金十AI解读] 下载失败:', error);
    }
}

// ============ 市场数据代理 ============

async function fetchMarketData(url) {
    try {
        const response = await fetch(url);
        const text = await response.text();
        return text;
    } catch (error) {
        console.error('[金十AI解读] 获取市场数据失败:', error);
        throw error;
    }
}

// ============ 新闻验证功能 ============

/**
 * 搜索相关新闻（中英文混合）
 */

/**
 * 从Google News获取新闻（支持中文）
 */
async function fetchGoogleNews(keywords) {
    const allNews = [];

    try {
        // 中文财经搜索
        const chinaFinanceUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(keywords.join(' OR '))}+财经&hl=zh-CN&gl=CN&ceid=CN:zh-Hans`;
        const chinaNews = await fetchFromURL(chinaFinanceUrl, 'Google财经-中国');
console.log(`[金十AI] Google中国返回: ${chinaNews.length} 条`);
        allNews.push(...chinaNews);

        // 英文搜索
        const worldUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(keywords.join(' OR '))}&hl=en&gl=US&ceid=US:en`;
        const worldNews = await fetchFromURL(worldUrl, 'Google News-全球');
console.log(`[金十AI] Google全球返回: ${worldNews.length} 条`);
        allNews.push(...worldNews);

    } catch (error) {
        console.error('[金十AI解读] Google News 获取失败:', error.message);
    }

    return allNews;
}

/**
 * 从Bloomberg获取RSS
 */
async function fetchRSSNews(keywords) {
    const allNews = [];

    for (const source of RSS_SOURCES) {
        try {
            const news = await fetchFromURL(source.url, source.name);
            allNews.push(...news);
        } catch (error) {
            console.error(`[金十AI解读] ${source.name} 获取失败:`, error.message);
        }
    }

    return allNews;
}

/**
 * 从URL获取并解析RSS
 */
async function fetchFromURL(url, sourceName) {
    try {
        console.log(`[金十AI解读] 获取: ${sourceName}`);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), NEWS_CONFIG.timeout);

        const response = await fetch(url, {
            signal: controller.signal,
            headers: {
                'Accept': 'application/rss+xml, application/xml, text/xml'
            }
        });
        clearTimeout(timeoutId);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const text = await response.text();

        // 解析RSS
        const items = text.match(/<item>[\s\S]*?<\/item>/g) || [];

        const news = items.map(item => {
            const titleMatch = item.match(/<title[^>]*>([^<]+)<\/title>/);
            const linkMatch = item.match(/<link[^>]*>([^<]+)<\/link>/) || item.match(/<link\s+[^>]*href="([^"]+)"/);
            const dateMatch = item.match(/<pubDate[^>]*>([^<]+)<\/pubDate>/) || item.match(/<dc:date[^>]*>([^<]+)<\/dc:date>/);

            let title = titleMatch ? decodeHTMLEntities(stripCDATA(titleMatch[1])) : '';
            let url = linkMatch ? linkMatch[1] : '';
            let publishedAt = dateMatch ? new Date(dateMatch[1]) : new Date();

            // 清理
            title = title.replace(/<!\[CDATA\[|\]\]>/g, '').trim();
            url = url.replace(/<!\[CDATA\[|\]\]>/g, '').trim();

            return {
                title: title,
                url: url,
                publishedAt: publishedAt,
                source: sourceName,
                language: sourceName.includes('中国') || sourceName.includes('zh') ? 'zh' : 'en',
                type: 'news'
            };
        }).filter(item => item.title && item.url);

        console.log(`[金十AI解读] ${sourceName} 获取到 ${news.length} 条`);
        return news;

    } catch (error) {
        console.error(`[金十AI解读] ${sourceName} 失败:`, error.message);
        return [];
    }
}

/**
 * 匹配和排序新闻
 */

function decodeHTMLEntities(text) {
    return text
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&nbsp;/g, ' ');
}

function stripCDATA(text) {
    return text.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1');
}

/**
 * 生成Markdown内容
 */
function generateMarkdown(data, date) {
    const { event, analysis, relatedMarkets } = data;
    const dateStr = date.toLocaleString('zh-CN');
    const markets = relatedMarkets.join(', ') || '无';

    return `---
title: 金十快讯解读收藏
date: ${dateStr}
related: ${markets}
---

# 📰 快讯内容

${event}

# 🤖 AI解读

${analysis}

# 📊 相关市场

${markets}

---
收藏时间: ${dateStr}
`;
}


function matchAndSortNews(news, keywords) {
    const now = Date.now();
    const MAX_DAYS_OLD = 3;
    const MAX_RESULTS = 5;

    console.log(`[金十AI] 过滤前总新闻数: ${news.length}`);

    const scored = news.map(item => {
        const text = (item.title + ' ' + (item.description || '')).toLowerCase();
        let score = 0;

        keywords.forEach(keyword => {
            const kw = keyword.toLowerCase();
            if (text.includes(kw)) {
                score += 10;
            }
        });

        const hoursOld = (now - new Date(item.publishedAt)) / (1000 * 60 * 60);
        if (hoursOld < 1) score += 50;
        else if (hoursOld < 6) score += 30;
        else if (hoursOld < 24) score += 20;
        else if (hoursOld < 72) score += 10;

        if (item.source.includes('Google')) score += 3;
        if (item.source.includes('Bloomberg')) score += 5;
        if (item.language === 'zh') score += 2;

        return { ...item, score, hoursOld };
    });

    const withScore = scored.filter(item => item.score > 0);
    console.log(`[金十AI] 有分新闻数: ${withScore.length}`);

    const withinTime = withScore.filter(item => item.hoursOld < MAX_DAYS_OLD * 24);
    const tooOld = withScore.filter(item => item.hoursOld >= MAX_DAYS_OLD * 24);
    console.log(`[金十AI] 30天内: ${withinTime.length}, 太老: ${tooOld.length}`);
    
    if (tooOld.length > 0) {
        console.log(`[金十AI] 太老的新闻示例: ${tooOld[0].title.substring(0,30)}... (${Math.round(tooOld[0].hoursOld/24)}天前)`);
    }

    const sorted = withinTime.sort((a, b) => {
        if (Math.abs(b.score - a.score) > 10) {
            return b.score - a.score;
        }
        return new Date(b.publishedAt) - new Date(a.publishedAt);
    });

    const result = sorted.slice(0, MAX_RESULTS);
    console.log(`[金十AI] 最终返回: ${result.length} 条`);

    return result.map(item => ({
        title: item.title,
        url: item.url,
        publishedAt: item.publishedAt,
        source: item.source,
        language: item.language,
        type: item.type || 'news',
        score: item.score
    }));
}

async function fetchRelatedNews(keywords, limit = 5) {
    console.log('[金十AI] 新闻搜索开始 - 关键词:', keywords);
    console.log(`[金十AI] 搜索时间: ${new Date().toISOString()}`);

    const allNews = [];
    const searchPromises = [];

    searchPromises.push(fetchGoogleNews(keywords));
    searchPromises.push(fetchRSSNews(keywords));

    const results = await Promise.allSettled(searchPromises);

    results.forEach(result => {
        if (result.status === 'rejected') {
            console.error(`[金十AI] 搜索源失败:`, result.reason);
        } else if (result.value) {
            console.log(`[金十AI] 搜索源返回: ${result.value.length} 条`);
            allNews.push(...result.value);
        }
    });

    console.log(`[金十AI] 总共找到: ${allNews.length} 条新闻`);

    const matched = matchAndSortNews(allNews, keywords);
    return matched;
}
