let currentUserId = null;
let currentDetail = null;

document.addEventListener('DOMContentLoaded', async () => {
    if (!checkAuth()) {
        redirectToLogin();
        return;
    }

    const storedUser = getUser();
    currentUserId = storedUser?.user_id;

    if (!currentUserId) {
        showError('无法获取当前用户信息，请重新登录');
        redirectToLogin();
        return;
    }

    await loadUserDetail();

    const verifyForm = document.getElementById('verifyForm');
    if (verifyForm) {
        verifyForm.addEventListener('submit', handleVerifySubmit);
    }
});

async function loadUserDetail() {
    try {
        const response = await apiGet(`/users/${currentUserId}`);
        if (!response.success) {
            throw new Error('获取用户信息失败');
        }
        currentDetail = response.data.user;
        renderUserDetail(currentDetail);
    } catch (error) {
        showError(error.message || '加载用户信息失败');
    }
}

function renderUserDetail(detail) {
    const usernameEl = document.getElementById('detailUsername');
    const emailEl = document.getElementById('detailEmail');
    const assistantIdEl = document.getElementById('assistantId');
    const statusTag = document.getElementById('roleStatusTag');
    const statusTagCompact = document.getElementById('roleStatusCompact');
    const verifiedBanner = document.getElementById('verifiedBanner');
    const verifyForm = document.getElementById('verifyForm');

    const role = detail.role || 'Guest';
    const roleLabel = typeof getRoleDisplayName === 'function' ? getRoleDisplayName(role) : role;
    const statusClass = `status-${role.toLowerCase()}`;

    if (usernameEl) usernameEl.textContent = detail.username || '-';
    if (emailEl) emailEl.textContent = detail.user_email || '-';
    if (assistantIdEl) assistantIdEl.textContent = detail.assistant_id ? detail.assistant_id : '未认证';

    [statusTag, statusTagCompact].forEach(tag => {
        if (tag) {
            tag.textContent = roleLabel;
            tag.className = `status-tag ${statusClass}`;
        }
    });

    if (role === 'Guest') {
        verifiedBanner?.classList.add('hidden');
        verifyForm?.classList.remove('hidden');
    } else {
        verifyForm?.classList.add('hidden');
        if (verifiedBanner) {
            verifiedBanner.classList.remove('hidden');
            verifiedBanner.innerHTML = role === 'Administrator'
                ? '<i class="fas fa-crown"></i> 您拥有管理员权限，无需额外认证。'
                : '<i class="fas fa-check-double"></i> 您已完成科研秘书认证，可以创建和管理科研任务。';
        }
    }
}

async function handleVerifySubmit(event) {
    event.preventDefault();
    const submitBtn = document.getElementById('verifySubmitBtn');
    const payload = {
        role: 'Assistant',
        employee_id: document.getElementById('employeeId').value.trim(),
        assistant_name: document.getElementById('assistantName').value.trim(),
        assistant_email: document.getElementById('assistantEmail').value.trim(),
        email_app_password: document.getElementById('emailAppPassword').value.trim()
    };

    if (!payload.employee_id || !payload.assistant_name || !payload.email_app_password) {
        showError('请完整填写认证信息');
        return;
    }

    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 提交中...';
    }

    try {
        const response = await apiPost(`/users/${currentUserId}/verify-role`, payload);
        if (!response.success) {
            throw new Error('认证失败');
        }
        showSuccess(response.message || '认证成功');
        const storedUser = getUser();
        if (storedUser) {
            storedUser.role = 'Assistant';
            saveUser(storedUser);
        }
        await loadUserDetail();
    } catch (error) {
        showError(error.message || '认证失败，请稍后再试');
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-check-circle"></i> 提交认证';
        }
    }
}

