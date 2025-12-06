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
        <div class="detail-grid">
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
                <div class="detail-value textarea">${task.description || '-'}</div>
            </div>
            <div class="detail-item">
                <div class="detail-label">所属学院</div>
                <div class="detail-value">${task.department.dept_name}</div>
            </div>
            <div class="detail-item">
                <div class="detail-label">模板文件ID</div>
                <div class="detail-value" style="display: flex; align-items: center; gap: 10px;">
                    <input type="text" value="${task.template_file_id || '-'}" readonly 
                           style="flex: 1; padding: 12px 16px; background: rgba(255, 255, 255, 0.03); 
                                  border: 1px solid rgba(255, 255, 255, 0.05); border-radius: 10px; 
                                  color: #fff; font-size: 16px; font-weight: 500;">
                    ${task.template_file_id ? `
                    <button class="btn btn-primary" onclick="downloadTemplate(${task.template_file_id})" 
                            style="padding: 12px 20px; border: none; border-radius: 10px; 
                                   font-size: 14px; font-weight: 600; cursor: pointer; 
                                   background: linear-gradient(135deg, #00c6ff 0%, #0072ff 100%); 
                                   color: white; transition: all 0.3s ease; white-space: nowrap;">
                        <i class="fas fa-download"></i> 下载模板
                    </button>
                    ` : ''}
                </div>
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
        </div>
    `;
}

// 下载模板文件
async function downloadTemplate(fileId) {
    try {
        const token = getToken();
        const response = await fetch(`${API_BASE_URL}/files/${fileId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const errorCode = errorData.error?.code;
            const errorMessage = getErrorMessage(errorCode, errorData.error?.message || '下载文件失败');
            showError(errorMessage);
            return;
        }

        // 获取文件名
        const contentDisposition = response.headers.get('Content-Disposition');
        let filename = 'template.xlsx';
        if (contentDisposition) {
            const filenameMatch = contentDisposition.match(/filename="?(.+?)"?$/);
            if (filenameMatch) {
                filename = filenameMatch[1];
            }
        }

        // 创建下载链接
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        showSuccess('模板文件下载成功');
    } catch (error) {
        console.error('下载文件错误:', error);
        showError(error.message || '下载文件失败');
    }
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




