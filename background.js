/**
 * 金十快讯AI解读 - Background Service Worker
 * 处理文件下载功能和市场数据代理
 */

// 监听来自content script的消息
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
        return true; // 保持消息通道开启
    }
    return true;
});

/**
 * 下载收藏文件到按日期组织的文件夹
 */
async function downloadFavoriteFile(data) {
    const { event, analysis, marketData, relatedMarkets, timestamp } = data;

    // 生成日期文件夹路径
    const date = new Date(timestamp);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');

    // 文件夹结构: favorites/2026-03-09/
    const folderPath = `favorites/${year}-${month}-${day}/`;

    // 生成文件名（使用事件的前20个字符作为标题）
    const title = event.substring(0, 20).replace(/[<>:"/\\|?*]/g, '').trim();
    const filename = `${folderPath}${hours}${minutes}_${title}.md`;

    // 生成Markdown内容
    const markdown = generateMarkdown(data, date);

    // 使用chrome.downloads API下载文件
    try {
        // 将内容转换为 data URL (Service Worker 不支持 URL.createObjectURL)
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

/**
 * 代理获取市场数据（解决CORS问题）
 */
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
