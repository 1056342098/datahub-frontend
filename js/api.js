// API 基础配置和工具函数
const API_BASE_URL = 'http://localhost:8080/api';

// 获取存储的 token
function getToken() {
    return localStorage.getItem('token');
}

// 保存 token
function saveToken(token) {
    localStorage.setItem('token', token);
}

// 清除 token
function clearToken() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
}

// 获取用户信息
function getUser() {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
}

// 保存用户信息
function saveUser(user) {
    localStorage.setItem('user', JSON.stringify(user));
}

// 错误代码到中文消息的映射
const ERROR_MESSAGES = {
    'USER_NOT_FOUND': '用户不存在',
    'INVALID_CREDENTIALS': '用户名或密码错误',
    'USER_EMAIL_ALREADY_EXISTS': '该邮箱已被注册',
    'USER_NAME_ALREADY_EXISTS': '该用户名已被使用',
    'ASSISTANT_NOT_FOUND': '科研秘书信息不存在',
    'TASK_NOT_FOUND': '任务不存在',
    'PERMISSION_DENIED': '权限不足，无法执行此操作',
    'FILE_UPLOAD_ERROR': '文件上传失败',
    'UPLOAD_DIR_ERROR': '上传目录错误',
    'FILE_NOT_FOUND': '文件不存在',
    'FILE_DELETE_ERROR': '文件删除失败',
    'INVALID_EMAIL_ADDRESS': '邮箱地址格式不正确',
    'MAIL_CONNECTION_ERROR': '邮件服务器连接失败',
    'ASSISTANT_NOT_CONFIGURED': '科研秘书未配置',
    'MAILBOX_CHECK_FAILED': '邮箱检查失败',
    'EMAIL_SEND_FAILED': '邮件发送失败',
    'MAIL_SERVER_CONNECTION_ERROR': '邮件服务器连接错误'
};

// 获取友好的错误消息
function getErrorMessage(errorCode, defaultMessage) {
    if (errorCode && ERROR_MESSAGES[errorCode]) {
        return ERROR_MESSAGES[errorCode];
    }
    return defaultMessage || '操作失败，请稍后重试';
}

// 通用 API 请求函数
async function apiRequest(url, options = {}) {
    const token = getToken();
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const config = {
        ...options,
        headers
    };

    try {
        const response = await fetch(`${API_BASE_URL}${url}`, config);
        
        // 处理非JSON响应（如文件下载）
        const contentType = response.headers.get('content-type');
        if (contentType && !contentType.includes('application/json')) {
            if (!response.ok) {
                const errorMessage = getErrorMessage(null, '文件操作失败');
                showErrorModal(errorMessage);
                throw new Error(errorMessage);
            }
            return response;
        }
        
        let data;
        try {
            data = await response.json();
        } catch (jsonError) {
            // JSON解析失败
            const errorMessage = getErrorMessage(null, '服务器响应格式错误');
            showErrorModal(errorMessage);
            throw new Error(errorMessage);
        }

        // 处理HTTP错误状态码
        if (!response.ok) {
            const errorCode = data.error?.code;
            const errorMessage = getErrorMessage(errorCode, data.error?.message || data.message || '请求失败');
            showErrorModal(errorMessage);
            throw new Error(errorMessage);
        }
        
        // 处理success为false的情况（根据Design.md的错误响应格式）
        if (data.success === false) {
            const errorCode = data.error?.code;
            const errorMessage = getErrorMessage(errorCode, data.error?.message || data.message || '操作失败');
            showErrorModal(errorMessage);
            throw new Error(errorMessage);
        }

        return data;
    } catch (error) {
        console.error('API请求错误:', error);
        
        // 检查弹窗是否已经显示（避免重复显示）
        const overlay = document.getElementById('errorModalOverlay');
        const isModalShowing = overlay && overlay.classList.contains('show');
        
        // 如果是网络错误
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            if (!isModalShowing) {
                showErrorModal('网络连接失败，请检查网络设置');
            }
        } 
        // 如果错误消息已经显示过（在try块中已调用showErrorModal），不再重复显示
        // 否则显示错误消息
        else if (!isModalShowing) {
            if (error.message) {
                showErrorModal(error.message);
            } else {
                showErrorModal('操作失败，请稍后重试');
            }
        }
        
        throw error;
    }
}

// GET 请求
async function apiGet(url) {
    return apiRequest(url, { method: 'GET' });
}

// POST 请求
async function apiPost(url, body) {
    return apiRequest(url, {
        method: 'POST',
        body: JSON.stringify(body)
    });
}

// PUT 请求
async function apiPut(url, body) {
    return apiRequest(url, {
        method: 'PUT',
        body: JSON.stringify(body)
    });
}

// DELETE 请求
async function apiDelete(url) {
    return apiRequest(url, { method: 'DELETE' });
}

// 检查登录状态
function checkAuth() {
    const token = getToken();
    const user = getUser();
    return token && user;
}

// 跳转到登录页
function redirectToLogin() {
    window.location.href = 'index.html';
}

// 创建弹窗容器（如果不存在）
function ensureModalContainer() {
    let modalContainer = document.getElementById('errorModalContainer');
    if (!modalContainer) {
        modalContainer = document.createElement('div');
        modalContainer.id = 'errorModalContainer';
        modalContainer.innerHTML = `
            <div class="error-modal-overlay" id="errorModalOverlay">
                <div class="error-modal">
                    <div class="error-modal-header">
                        <i class="fas fa-exclamation-circle"></i>
                        <h3>错误提示</h3>
                    </div>
                    <div class="error-modal-body">
                        <p id="errorModalMessage"></p>
                    </div>
                    <div class="error-modal-footer">
                        <button class="error-modal-btn" id="errorModalCloseBtn">确定</button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modalContainer);
        
        // 添加样式
        if (!document.getElementById('errorModalStyles')) {
            const style = document.createElement('style');
            style.id = 'errorModalStyles';
            style.textContent = `
                .error-modal-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0, 0, 0, 0.6);
                    backdrop-filter: blur(4px);
                    display: none;
                    align-items: center;
                    justify-content: center;
                    z-index: 10000;
                    animation: errorModalFadeIn 0.3s ease;
                }
                
                .error-modal-overlay.show {
                    display: flex;
                }
                
                @keyframes errorModalFadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                
                @keyframes errorModalSlideUp {
                    from {
                        transform: translateY(50px);
                        opacity: 0;
                    }
                    to {
                        transform: translateY(0);
                        opacity: 1;
                    }
                }
                
                .error-modal {
                    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
                    border-radius: 16px;
                    padding: 0;
                    max-width: 450px;
                    width: 90%;
                    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    animation: errorModalSlideUp 0.3s ease;
                    overflow: hidden;
                }
                
                .error-modal-header {
                    background: linear-gradient(135deg, #ff4757 0%, #ff6348 100%);
                    padding: 20px 24px;
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    color: white;
                }
                
                .error-modal-header i {
                    font-size: 24px;
                }
                
                .error-modal-header h3 {
                    margin: 0;
                    font-size: 18px;
                    font-weight: 600;
                }
                
                .error-modal-body {
                    padding: 24px;
                    color: #e0e0e0;
                    min-height: 60px;
                }
                
                .error-modal-body p {
                    margin: 0;
                    font-size: 15px;
                    line-height: 1.6;
                    word-wrap: break-word;
                }
                
                .error-modal-footer {
                    padding: 16px 24px;
                    border-top: 1px solid rgba(255, 255, 255, 0.1);
                    display: flex;
                    justify-content: flex-end;
                }
                
                .error-modal-btn {
                    background: linear-gradient(135deg, #00c6ff 0%, #0072ff 100%);
                    color: white;
                    border: none;
                    padding: 10px 24px;
                    border-radius: 8px;
                    font-size: 14px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.3s ease;
                }
                
                .error-modal-btn:hover {
                    background: linear-gradient(135deg, #00b4e6 0%, #0066cc 100%);
                    transform: translateY(-2px);
                    box-shadow: 0 4px 12px rgba(0, 114, 255, 0.3);
                }
                
                .error-modal-btn:active {
                    transform: translateY(0);
                }
            `;
            document.head.appendChild(style);
        }
        
        // 绑定关闭事件
        const overlay = document.getElementById('errorModalOverlay');
        const closeBtn = document.getElementById('errorModalCloseBtn');
        
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                hideErrorModal();
            });
        }
        
        if (overlay) {
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    hideErrorModal();
                }
            });
        }
        
        // ESC键关闭
        document.addEventListener('keydown', (e) => {
            const overlayEl = document.getElementById('errorModalOverlay');
            if (e.key === 'Escape' && overlayEl && overlayEl.classList.contains('show')) {
                hideErrorModal();
            }
        });
    }
    return modalContainer;
}

// 显示错误弹窗
function showErrorModal(message) {
    ensureModalContainer();
    const overlay = document.getElementById('errorModalOverlay');
    const messageEl = document.getElementById('errorModalMessage');
    
    if (messageEl) {
        messageEl.textContent = message || '发生未知错误';
    }
    
    if (overlay) {
        overlay.classList.add('show');
    }
}

// 隐藏错误弹窗
function hideErrorModal() {
    const overlay = document.getElementById('errorModalOverlay');
    if (overlay) {
        overlay.classList.remove('show');
    }
}

// 显示错误消息（保留向后兼容，但使用弹窗）
function showError(message) {
    showErrorModal(message);
}

// 创建成功弹窗容器（如果不存在）
function ensureSuccessModalContainer() {
    let modalContainer = document.getElementById('successModalContainer');
    if (!modalContainer) {
        modalContainer = document.createElement('div');
        modalContainer.id = 'successModalContainer';
        modalContainer.innerHTML = `
            <div class="success-modal-overlay" id="successModalOverlay">
                <div class="success-modal">
                    <div class="success-modal-header">
                        <i class="fas fa-check-circle"></i>
                        <h3>操作成功</h3>
                    </div>
                    <div class="success-modal-body">
                        <p id="successModalMessage"></p>
                    </div>
                    <div class="success-modal-footer">
                        <button class="success-modal-btn" id="successModalCloseBtn">确定</button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modalContainer);
        
        // 添加样式
        if (!document.getElementById('successModalStyles')) {
            const style = document.createElement('style');
            style.id = 'successModalStyles';
            style.textContent = `
                .success-modal-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0, 0, 0, 0.6);
                    backdrop-filter: blur(4px);
                    display: none;
                    align-items: center;
                    justify-content: center;
                    z-index: 10000;
                    animation: successModalFadeIn 0.3s ease;
                }
                
                .success-modal-overlay.show {
                    display: flex;
                }
                
                @keyframes successModalFadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                
                @keyframes successModalSlideUp {
                    from {
                        transform: translateY(50px);
                        opacity: 0;
                    }
                    to {
                        transform: translateY(0);
                        opacity: 1;
                    }
                }
                
                .success-modal {
                    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
                    border-radius: 16px;
                    padding: 0;
                    max-width: 450px;
                    width: 90%;
                    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    animation: successModalSlideUp 0.3s ease;
                    overflow: hidden;
                }
                
                .success-modal-header {
                    background: linear-gradient(135deg, #2ecc71 0%, #27ae60 100%);
                    padding: 20px 24px;
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    color: white;
                }
                
                .success-modal-header i {
                    font-size: 24px;
                }
                
                .success-modal-header h3 {
                    margin: 0;
                    font-size: 18px;
                    font-weight: 600;
                }
                
                .success-modal-body {
                    padding: 24px;
                    color: #e0e0e0;
                    min-height: 60px;
                }
                
                .success-modal-body p {
                    margin: 0;
                    font-size: 15px;
                    line-height: 1.6;
                    word-wrap: break-word;
                }
                
                .success-modal-footer {
                    padding: 16px 24px;
                    border-top: 1px solid rgba(255, 255, 255, 0.1);
                    display: flex;
                    justify-content: flex-end;
                }
                
                .success-modal-btn {
                    background: linear-gradient(135deg, #00c6ff 0%, #0072ff 100%);
                    color: white;
                    border: none;
                    padding: 10px 24px;
                    border-radius: 8px;
                    font-size: 14px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.3s ease;
                }
                
                .success-modal-btn:hover {
                    background: linear-gradient(135deg, #00b4e6 0%, #0066cc 100%);
                    transform: translateY(-2px);
                    box-shadow: 0 4px 12px rgba(0, 114, 255, 0.3);
                }
                
                .success-modal-btn:active {
                    transform: translateY(0);
                }
            `;
            document.head.appendChild(style);
        }
        
        // 绑定关闭事件
        const overlay = document.getElementById('successModalOverlay');
        const closeBtn = document.getElementById('successModalCloseBtn');
        
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                hideSuccessModal();
            });
        }
        
        if (overlay) {
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    hideSuccessModal();
                }
            });
        }
        
        // ESC键关闭
        document.addEventListener('keydown', (e) => {
            const overlayEl = document.getElementById('successModalOverlay');
            if (e.key === 'Escape' && overlayEl && overlayEl.classList.contains('show')) {
                hideSuccessModal();
            }
        });
    }
    return modalContainer;
}

// 显示成功弹窗
function showSuccessModal(message) {
    ensureSuccessModalContainer();
    const overlay = document.getElementById('successModalOverlay');
    const messageEl = document.getElementById('successModalMessage');
    
    if (messageEl) {
        messageEl.textContent = message || '操作成功';
    }
    
    if (overlay) {
        overlay.classList.add('show');
    }
}

// 隐藏成功弹窗
function hideSuccessModal() {
    const overlay = document.getElementById('successModalOverlay');
    if (overlay) {
        overlay.classList.remove('show');
    }
}

// 显示成功消息（保留向后兼容，但使用弹窗）
function showSuccess(message) {
    const successDiv = document.getElementById('successMessage');
    if (successDiv) {
        successDiv.textContent = message;
        successDiv.classList.add('show');
        setTimeout(() => {
            successDiv.classList.remove('show');
        }, 3000);
    }
}

// 格式化日期时间
function formatDateTime(dateTimeString) {
    if (!dateTimeString) return '-';
    
    // 处理 ISO 8601 格式的时间字符串
    // 格式示例: "2025-12-06T14:51:55.760461Z" (包含微秒的 UTC 时间)
    // 或 "2023-01-01T00:00:00Z" (标准格式)
    let date;
    try {
        // JavaScript Date 对象可以自动解析 ISO 8601 格式，包括带微秒的格式
        // 格式: YYYY-MM-DDTHH:mm:ss.sssZ 或 YYYY-MM-DDTHH:mm:ssZ
        date = new Date(dateTimeString);
        
        // 检查日期是否有效
        if (isNaN(date.getTime())) {
            console.warn('无效的日期时间格式:', dateTimeString);
            return String(dateTimeString); // 如果无法解析，返回原始字符串
        }
    } catch (error) {
        console.error('日期时间解析错误:', error, dateTimeString);
        return String(dateTimeString); // 如果解析失败，返回原始字符串
    }
    
    // 格式化为中文本地时间格式
    // toLocaleString 会自动将 UTC 时间转换为本地时区
    return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false // 使用 24 小时制
    });
}

// 格式化日期（用于 datetime-local input）
function formatDateTimeLocal(dateTimeString) {
    if (!dateTimeString) return '';
    const date = new Date(dateTimeString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
}

// 将 datetime-local 格式转换为 ISO 8601 格式（用于提交到后端）
function formatDateTimeToISO(dateTimeLocalString) {
    if (!dateTimeLocalString) return null;
    // datetime-local 格式: "YYYY-MM-DDTHH:mm"
    // 转换为 ISO 8601 格式: "YYYY-MM-DDTHH:mm:ssZ"
    const date = new Date(dateTimeLocalString);
    if (isNaN(date.getTime())) {
        return null;
    }
    // 转换为 ISO 8601 格式（UTC 时间）
    return date.toISOString();
}




