// 任务详情页面逻辑

let taskId = null;

document.addEventListener('DOMContentLoaded', async () => {
    // 检查登录状态
    // if (!checkAuth()) {
    //     redirectToLogin();
    //     return;
    // }

    // 获取任务ID
    const urlParams = new URLSearchParams(window.location.search);
    taskId = urlParams.get('task_id');

    if (!taskId) {
        showError('缺少任务ID参数');
        return;
    }

    // 绑定事件
    document.getElementById('editTaskBtn').addEventListener('click', () => {
        window.location.href = `task-create.html?task_id=${taskId}`;
    });

    document.getElementById('deleteTaskBtn').addEventListener('click', deleteTask);
    document.getElementById('viewTeachersBtn').addEventListener('click', () => {
        window.location.href = `task-teachers.html?task_id=${taskId}`;
    });

    // 加载任务详情
    await loadTaskDetail();
});

// 加载任务详情
async function loadTaskDetail() {
    const detailDiv = document.getElementById('taskDetail');
    detailDiv.innerHTML = '<div class="loading">加载中...</div>';

    try {
        const response = await apiGet(`/tasks/${taskId}`);

        if (response.success) {
            displayTaskDetail(response.data);
        } else {
            showError('加载任务详情失败');
        }
    } catch (error) {
        showError(error.message || '加载任务详情失败');
        detailDiv.innerHTML = '<div class="loading">加载失败</div>';
    }
}

// 显示任务详情
function displayTaskDetail(task) {
    const detailDiv = document.getElementById('taskDetail');
    
    detailDiv.innerHTML = `
        <div class="detail-item">
            <div class="detail-label">任务ID</div>
            <div class="detail-value">${task.task_id}</div>
        </div>
        <div class="detail-item">
            <div class="detail-label">任务名称</div>
            <div class="detail-value">${task.task_name}</div>
        </div>
        <div class="detail-item">
            <div class="detail-label">任务描述</div>
            <div class="detail-value">${task.description || '-'}</div>
        </div>
        <div class="detail-item">
            <div class="detail-label">所属学院</div>
            <div class="detail-value">${task.department.dept_name}</div>
        </div>
        <div class="detail-item">
            <div class="detail-label">模板路径</div>
            <div class="detail-value">${task.template_path}</div>
        </div>
        <div class="detail-item">
            <div class="detail-label">截止日期</div>
            <div class="detail-value">${formatDateTime(task.deadline)}</div>
        </div>
        <div class="detail-item">
            <div class="detail-label">状态</div>
            <div class="detail-value">
                <span class="status-badge status-${task.status.toLowerCase()}">
                    ${task.status === 'Ongoing' ? '正在进行' : '已完成'}
                </span>
            </div>
        </div>
        <div class="detail-item">
            <div class="detail-label">创建时间</div>
            <div class="detail-value">${formatDateTime(task.create_time)}</div>
        </div>
    `;
}

// 删除任务
async function deleteTask() {
    if (!confirm('确定要删除这个任务吗？此操作不可恢复！')) {
        return;
    }

    try {
        const response = await apiDelete(`/tasks/${taskId}`);
        if (response.success) {
            showSuccess('任务删除成功，正在跳转...');
            setTimeout(() => {
                window.location.href = 'tasks.html';
            }, 1500);
        } else {
            showError('删除任务失败');
        }
    } catch (error) {
        showError(error.message || '删除任务失败');
    }
}




