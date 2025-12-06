// 任务教师列表页面逻辑

let taskId = null;
let taskInfo = null; // 添加任务信息存储
let currentPage = 0;
let pageSize = 10;
let statusFilter = '';

document.addEventListener('DOMContentLoaded', async () => {
    // 检查登录状态
    if (!checkAuth()) {
        redirectToLogin();
        return;
    }

    // 获取任务ID
    const urlParams = new URLSearchParams(window.location.search);
    taskId = urlParams.get('task_id');

    if (!taskId) {
        showError('缺少任务ID参数');
        return;
    }

    // 绑定事件
    document.getElementById('applyFilterBtn').addEventListener('click', () => {
        statusFilter = document.getElementById('statusFilter').value;
        currentPage = 0;
        loadTeachers();
    });

    const prevPageBtn = document.getElementById('prevPageBtn');
    const nextPageBtn = document.getElementById('nextPageBtn');
    if (prevPageBtn) prevPageBtn.addEventListener('click', () => goToPage(currentPage - 1));
    if (nextPageBtn) nextPageBtn.addEventListener('click', () => goToPage(currentPage + 1));
    
    document.getElementById('remindBtn').addEventListener('click', remindTeachers);
    document.getElementById('exportBtn').addEventListener('click', exportSubmissions);
    document.getElementById('logoutBtn').addEventListener('click', logout);

    // 加载任务信息和教师列表
    await loadTaskInfo();
    await loadTeachers();
});

// 加载任务信息
async function loadTaskInfo() {
    try {
        const response = await apiGet(`/tasks/${taskId}`);
        if (response.success) {
            taskInfo = response.data; // 保存任务信息
            document.getElementById('dynamicTaskName').textContent = response.data.task_name;
            document.getElementById('taskTitle').textContent = `${taskInfo.task_name} - 教师列表`;
            document.title = `${taskInfo.task_name} - 教师列表 | DataHub 科研数据管理平台`;
            return taskInfo;
        }
    } catch (error) {
        console.error('加载任务信息失败:', error);
        showError('加载任务信息失败');
    }
}

// 加载教师列表
async function loadTeachers() {
    const tbody = document.getElementById('teacherTableBody');
    tbody.innerHTML = '<tr><td colspan="6" class="loading">加载中...</td></tr>';

    try {
        const params = new URLSearchParams({
            page_num: currentPage + 1,
            page_size: pageSize
        });

        if (statusFilter) {
            params.append('status', statusFilter);
        }

        const response = await apiGet(`/tasks/${taskId}/teachers?${params.toString()}`);

        if (response.success) {
            displayTeachers(response.data.teachers);
            displayPagination(response.data.page);
        } else {
            showError('加载教师列表失败');
        }
    } catch (error) {
        showError(error.message || '加载教师列表失败');
        tbody.innerHTML = '<tr><td colspan="6" class="loading">加载失败</td></tr>';
    }
}

// 显示教师列表
function displayTeachers(teachers) {
    const tbody = document.getElementById('teacherTableBody');

    if (teachers.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="loading">暂无教师</td></tr>';
        return;
    }

    // 更新统计数据
    updateStats(teachers);

    tbody.innerHTML = teachers.map(teacher => {
        const status = teacher.submission?.status || 'Pending';
        const statusClass = status.toLowerCase();
        const statusText = status === 'Pending' ? '待提交' : '已提交';
        const attachmentId = teacher.submission?.attachment_file_id;
        const downloadCell = attachmentId
            ? `<button class="download-btn" data-file-id="${attachmentId}" data-teacher-name="${teacher.teacher_name}">
                    <i class="fas fa-download"></i> 下载
               </button>`
            : '<span class="text-muted">暂无文件</span>';
        
        return `
        <tr>
            <td>${teacher.teacher_id}</td>
            <td>${teacher.teacher_name}</td>
            <td>${teacher.teacher_email}</td>
            <td>
                <span class="status-badge status-${statusClass}">
                    ${statusText}
                </span>
            </td>
            <td>${teacher.submission?.submitted_at ? formatDateTime(teacher.submission.submitted_at) : '-'}</td>
            <td>${downloadCell}</td>
        </tr>
    `;
    }).join('');

    tbody.querySelectorAll('.download-btn').forEach(button => {
        button.addEventListener('click', (event) => {
            const fileId = event.currentTarget.dataset.fileId;
            const teacherName = event.currentTarget.dataset.teacherName;
            downloadSubmissionFile(fileId, teacherName);
        });
    });
}

// 更新统计数据
function updateStats(teachers) {
    const total = teachers.length;
    const submitted = teachers.filter(t => t.submission?.status === 'Submitted').length;
    const pending = teachers.filter(t => !t.submission || t.submission.status === 'Pending').length;
    
    const totalEl = document.getElementById('totalTeachers');
    const submittedEl = document.getElementById('submittedTeachers');
    const pendingEl = document.getElementById('pendingTeachers');
    
    if (totalEl) totalEl.textContent = total;
    if (submittedEl) submittedEl.textContent = submitted;
    if (pendingEl) pendingEl.textContent = pending;
}

// 显示分页
function displayPagination(pageInfo) {
    const pagination = document.getElementById('pagination');
    const totalPages = pageInfo.total_pages;
    const currentPageNum = pageInfo.page_num - 1; // API返回的页码从1开始

    if (totalPages <= 1) {
        pagination.innerHTML = '';
        return;
    }

    // 更新分页按钮状态
    const prevPageBtn = document.getElementById('prevPageBtn');
    const nextPageBtn = document.getElementById('nextPageBtn');
    const pageInfoEl = document.getElementById('pageInfo');
    
    if (prevPageBtn) {
        prevPageBtn.disabled = currentPageNum === 0;
        prevPageBtn.onclick = () => goToPage(currentPageNum - 1);
    }
    
    if (nextPageBtn) {
        nextPageBtn.disabled = currentPageNum >= totalPages - 1;
        nextPageBtn.onclick = () => goToPage(currentPageNum + 1);
    }
    
    if (pageInfoEl) {
        pageInfoEl.textContent = `第 ${currentPageNum + 1} 页 / 共 ${totalPages} 页`;
    }
}

// 跳转到指定页面
function goToPage(page) {
    currentPage = page;
    loadTeachers();
}

// 提醒未提交教师
async function remindTeachers() {
    const taskName = taskInfo ? taskInfo.task_name : '任务';
    if (!confirm(`确定要提醒"${taskName}"中所有未提交的教师吗？`)) {
        return;
    }

    try {
        const response = await apiPost(`/tasks/${taskId}/remind_teachers`, {});
        if (response.success) {
            showSuccess('提醒发送成功');
        } else {
            showError('提醒发送失败');
        }
    } catch (error) {
        showError(error.message || '提醒发送失败');
    }
}

// 导出提交
async function exportSubmissions() {
    try {
        const token = getToken();
        const response = await fetch(`/api/tasks/${taskId}/submissions/export`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `task_${taskId}_submissions.xlsx`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            showSuccess('导出成功');
        } else {
            showError('导出失败');
        }
    } catch (error) {
        showError(error.message || '导出失败');
    }
}

// 下载单个教师的提交附件
async function downloadSubmissionFile(fileId, teacherName) {
    if (!fileId) {
        showError('暂无可下载的附件');
        return;
    }

    try {
        const token = getToken();
        const response = await fetch(`/api/files/${fileId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('下载附件失败');
        }

        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        const disposition = response.headers.get('Content-Disposition') || '';
        let fileName = `submission_${teacherName || 'teacher'}_${fileId}`;

        const utfMatch = disposition.match(/filename\*=UTF-8''([^;]+)/i);
        const asciiMatch = disposition.match(/filename="?([^"]+)"?/i);
        if (utfMatch && utfMatch[1]) {
            fileName = utfMatch[1];
        } else if (asciiMatch && asciiMatch[1]) {
            fileName = asciiMatch[1];
        }
        try {
            fileName = decodeURIComponent(fileName);
        } catch (e) {
            // ignore decode error and use raw value
        }

        link.href = downloadUrl;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(downloadUrl);
        showSuccess('附件下载成功');
    } catch (error) {
        showError(error.message || '下载附件失败');
    }
}

// 登出功能
function logout() {
    if (confirm('确定要退出登录吗？')) {
        clearToken();
        window.location.href = 'index.html';
    }
}


