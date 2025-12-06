// 认证相关功能

// 角色展示名称
function getRoleDisplayName(role) {
    switch (role) {
        case 'Assistant':
            return '科研秘书';
        case 'Administrator':
            return '管理员';
        default:
            return '游客';
    }
}

// 初始化用户信息显示
function initUserInfo() {
    const user = getUser();
    const userInfoElement = document.getElementById('userInfo');

    if (userInfoElement && user) {
        const targetSpan = userInfoElement.querySelector('span');
        const roleLabel = getRoleDisplayName(user.role);
        const displayText = `${roleLabel} - ${user.username}`;

        if (targetSpan) {
            targetSpan.textContent = displayText;
        } else {
            userInfoElement.textContent = displayText;
        }

        const isProfilePage = window.location.pathname.includes('user-detail.html');
        const goToProfile = () => {
            if (!isProfilePage) {
                window.location.href = 'user-detail.html';
            }
        };

        userInfoElement.style.cursor = 'pointer';
        userInfoElement.setAttribute('title', '查看身份详情与认证');
        userInfoElement.setAttribute('tabindex', '0');
        userInfoElement.addEventListener('click', goToProfile);
        userInfoElement.addEventListener('keypress', (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
                goToProfile();
            }
        });
    }
}

// 初始化退出按钮
function initLogout() {
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            clearToken();
            redirectToLogin();
        });
    }
}

// 页面加载时初始化
document.addEventListener('DOMContentLoaded', () => {
    initUserInfo();
    initLogout();
});




