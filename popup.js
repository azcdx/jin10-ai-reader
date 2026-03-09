/**
 * 金十快讯AI解读 - Popup Script
 * 支持多个AI服务提供商
 */

// API配置
const API_PROVIDERS = {
    deepseek: {
        name: 'DeepSeek',
        defaultEndpoint: 'https://api.deepseek.com/chat/completions',
        keyHint: '格式: sk-xxxxxxxxxxxx',
        guide: `
            <p><strong>获取DeepSeek API Key:</strong></p>
            <ol style="padding-left: 16px; margin-top: 8px;">
                <li>访问 <a href="https://platform.deepseek.com/" target="_blank">platform.deepseek.com</a></li>
                <li>注册/登录账号</li>
                <li>在API Keys页面创建新Key</li>
            </ol>
        `
    },
    minimax: {
        name: 'MiniMax',
        defaultEndpoint: 'https://api.minimax.chat/v1/text/chatcompletion_v2',
        keyHint: '格式: 你的API Key',
        guide: `
            <p><strong>获取MiniMax API Key:</strong></p>
            <ol style="padding-left: 16px; margin-top: 8px;">
                <li>访问 <a href="https://www.minimaxi.com/" target="_blank">www.minimaxi.com</a></li>
                <li>注册/登录账号</li>
                <li>在开发者中心获取API Key</li>
            </ol>
        `
    },
    glm: {
        name: 'GLM (智谱AI)',
        defaultEndpoint: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
        keyHint: '格式: 你的API Key',
        guide: `
            <p><strong>获取GLM API Key:</strong></p>
            <ol style="padding-left: 16px; margin-top: 8px;">
                <li>访问 <a href="https://open.bigmodel.cn/" target="_blank">open.bigmodel.cn</a></li>
                <li>注册/登录账号</li>
                <li>在API Keys页面创建新Key</li>
            </ol>
        `
    }
};

// 当前选择的provider
let selectedProvider = null;

// DOM元素
const apiCards = document.querySelectorAll('.api-card');
const apiKeyInput = document.getElementById('apiKey');
const apiEndpointInput = document.getElementById('apiEndpoint');
const endpointGroup = document.getElementById('endpointGroup');
const saveBtn = document.getElementById('saveBtn');
const statusDiv = document.getElementById('status');
const apiKeyHint = document.getElementById('apiKeyHint');
const guideSection = document.getElementById('guideSection');
const guideContent = document.getElementById('guideContent');

// 初始化
init();

function init() {
    loadSettings();
    setupEventListeners();
}

/**
 * 加载设置
 */
async function loadSettings() {
    try {
        const result = await chrome.storage.sync.get(['provider', 'apiKey', 'apiEndpoint']);

        if (result.provider) {
            selectProvider(result.provider);
        }

        if (result.apiKey) {
            apiKeyInput.value = result.apiKey;
        }

        if (result.apiEndpoint) {
            apiEndpointInput.value = result.apiEndpoint;
        }
    } catch (error) {
        console.error('[金十AI解读] 加载设置失败:', error);
    }
}

/**
 * 设置事件监听
 */
function setupEventListeners() {
    // API卡片点击
    apiCards.forEach(card => {
        card.addEventListener('click', () => {
            const provider = card.dataset.provider;
            selectProvider(provider);
        });
    });

    // 保存按钮
    saveBtn.addEventListener('click', saveSettings);
}

/**
 * 选择AI服务
 */
function selectProvider(provider) {
    selectedProvider = provider;

    // 更新UI
    apiCards.forEach(card => {
        if (card.dataset.provider === provider) {
            card.classList.add('selected');
        } else {
            card.classList.remove('selected');
        }
    });

    // 更新提示和默认endpoint
    const config = API_PROVIDERS[provider];
    apiKeyHint.textContent = config.keyHint;

    // 如果用户没有自定义过endpoint，使用默认值
    if (!apiEndpointInput.value) {
        apiEndpointInput.value = config.defaultEndpoint;
    }

    // 显示endpoint输入框（可选）
    endpointGroup.classList.add('show');

    // 显示获取指南
    guideSection.style.display = 'block';
    guideContent.innerHTML = config.guide;
}

/**
 * 保存设置
 */
async function saveSettings() {
    const apiKey = apiKeyInput.value.trim();
    let apiEndpoint = apiEndpointInput.value.trim();

    // 验证
    if (!selectedProvider) {
        showStatus('请先选择AI服务', 'error');
        return;
    }

    if (!apiKey) {
        showStatus('请输入API Key', 'error');
        return;
    }

    // 如果endpoint为空，使用默认值
    if (!apiEndpoint) {
        apiEndpoint = API_PROVIDERS[selectedProvider].defaultEndpoint;
    }

    // 保存
    try {
        await chrome.storage.sync.set({
            provider: selectedProvider,
            apiKey: apiKey,
            apiEndpoint: apiEndpoint
        });

        showStatus('✓ 配置保存成功！', 'success');

        setTimeout(() => {
            hideStatus();
        }, 2000);

    } catch (error) {
        console.error('[金十AI解读] 保存失败:', error);
        showStatus('保存失败: ' + error.message, 'error');
    }
}

/**
 * 显示状态
 */
function showStatus(message, type) {
    statusDiv.textContent = message;
    statusDiv.className = `status ${type}`;
}

/**
 * 隐藏状态
 */
function hideStatus() {
    statusDiv.className = 'status';
    statusDiv.textContent = '';
}
