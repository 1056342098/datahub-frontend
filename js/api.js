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
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error?.message || '请求失败');
        }

        return data;
    } catch (error) {
        console.error('API请求错误:', error);
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

// 显示错误消息
function showError(message) {
    const errorDiv = document.getElementById('errorMessage');
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.classList.add('show');
        setTimeout(() => {
            errorDiv.classList.remove('show');
        }, 5000);
    }
}

// 显示成功消息
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
    const date = new Date(dateTimeString);
    return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
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




