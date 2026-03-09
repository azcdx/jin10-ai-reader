/**
 * DOM操作工具函数
 */

/**
 * 等待元素出现
 */
export function waitForElement(selector, timeout = 5000) {
    return new Promise((resolve, reject) => {
        const element = document.querySelector(selector);
        if (element) {
            return resolve(element);
        }

        const observer = new MutationObserver(() => {
            const element = document.querySelector(selector);
            if (element) {
                observer.disconnect();
                resolve(element);
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        setTimeout(() => {
            observer.disconnect();
            reject(new Error(`Element ${selector} not found`));
        }, timeout);
    });
}

/**
 * 查找父元素
 */
export function findParent(element, selector) {
    let current = element;
    while (current && current !== document.body) {
        if (current.matches(selector)) {
            return current;
        }
        current = current.parentElement;
    }
    return null;
}

/**
 * 插入元素
 */
export function insertAfter(target, element) {
    if (target.nextSibling) {
        target.parentNode.insertBefore(element, target.nextSibling);
    } else {
        target.parentNode.appendChild(element);
    }
}

/**
 * 防抖函数
 */
export function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * 节流函数
 */
export function throttle(func, limit) {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}
