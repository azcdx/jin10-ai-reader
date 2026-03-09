/**
 * 金十快讯AI解读 - Background Service Worker
 * 后台服务，处理插件生命周期和消息通信
 */

// 插件安装时
chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === 'install') {
        console.log('[金十AI解读] 插件已安装');

        // 打开设置页面
        chrome.tabs.create({
            url: chrome.runtime.getURL('popup.html'),
            active: false
        });

    } else if (details.reason === 'update') {
        console.log('[金十AI解读] 插件已更新');
    }
});

// 监听来自content script的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('[金十AI解读] 收到消息:', request);

    if (request.action === 'fetchAIAnalysis') {
        // 处理AI分析请求
        fetchAIAnalysis(request.data)
            .then(result => sendResponse({ success: true, data: result }))
            .catch(error => sendResponse({ success: false, error: error.message }));

        return true; // 保持消息通道开启
    }
});

/**
 * 调用AI分析接口
 */
async function fetchAIAnalysis(data) {
    const { content, apiKey, apiEndpoint } = data;

    try {
        const response = await fetch(apiEndpoint || 'https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: 'claude-sonnet-4-20250514',
                max_tokens: 2000,
                messages: [
                    {
                        role: 'user',
                        content: buildPrompt(content)
                    }
                ]
            })
        });

        if (!response.ok) {
            throw new Error(`API请求失败: ${response.status}`);
        }

        const result = await response.json();
        return result.content[0].text;

    } catch (error) {
        console.error('[金十AI解读] API调用失败:', error);
        throw error;
    }
}

/**
 * 构建AI提示词
 */
function buildPrompt(content) {
    return `请分析以下金十快讯，提供深度解读：

【快讯内容】
${content}

请按照以下格式输出（简洁直观，每个模块3-5行）：

📌 核心逻辑
事件本质：
因果链：

🔗 关联影响
直接影响：
间接影响：

💰 利益博弈
✓ 赢家：
✗ 输家：
当前情绪：[贪婪/恐惧]（●●●●○）

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
市场有风险，投资需谨慎。
━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
}
