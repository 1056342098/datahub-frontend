// 注册页面逻辑

document.addEventListener('DOMContentLoaded', () => {
    const registerForm = document.getElementById('registerForm');
    const errorMessage = document.getElementById('errorMessage');
    const successMessage = document.getElementById('successMessage');

    // 如果已登录，跳转到任务列表
    if (checkAuth()) {
        window.location.href = 'tasks.html';
        return;
    }

    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const formData = {
            username: document.getElementById('username').value,
            password: document.getElementById('password').value,
            user_email: document.getElementById('user_email').value,
            role: 'Guest'
        };

        try {
            const response = await apiPost('/users/signup', formData);

            if (response.success) {
                successMessage.textContent = '注册成功！正在跳转到登录页面...';
                successMessage.classList.add('show');
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 2000);
            } else {
                showError('注册失败，请稍后重试');
            }
        } catch (error) {
            showError(error.message || '注册失败，请检查输入信息');
        }
    });
});




