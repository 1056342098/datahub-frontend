// 登录页面逻辑

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const errorMessage = document.getElementById('errorMessage');

    // 如果已登录，跳转到任务列表
    if (checkAuth()) {
        window.location.href = 'tasks.html';
        return;
    }

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        try {
            const response = await apiPost('/auth/login', {
                username,
                password
            });

            if (response.success) {
                saveToken(response.data.token);
                saveUser(response.data.user);
                window.location.href = 'tasks.html';
            } else {
                showError('登录失败，请检查用户名和密码');
            }
        } catch (error) {
            showError(error.message || '登录失败，请稍后重试');
        }
    });
});




