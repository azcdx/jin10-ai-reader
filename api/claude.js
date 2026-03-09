/**
 * Claude API调用模块
 */

/**
 * 调用Claude API分析快讯
 */
export async function analyzeFlash(content, apiKey, apiEndpoint) {
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
            const error = await response.json();
            throw new Error(error.error?.message || 'API请求失败');
        }

        const data = await response.json();
        return {
            success: true,
            content: data.content[0].text
        };

    } catch (error) {
        console.error('[Claude API] 调用失败:', error);
        return {
            success: false,
            error: error.message
        };
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
