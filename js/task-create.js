// 创建/编辑任务页面逻辑

let taskId = null;
let isEditMode = false;

document.addEventListener('DOMContentLoaded', async () => {
    // 检查登录状态
    // if (!checkAuth()) {
    //     redirectToLogin();
    //     return;
    // }

    // 获取任务ID（编辑模式）
    const urlParams = new URLSearchParams(window.location.search);
    taskId = urlParams.get('task_id');
    isEditMode = !!taskId;

    // 更新页面标题
    if (isEditMode) {
        document.getElementById('pageTitle').textContent = '编辑任务';
        document.getElementById('submitBtn').textContent = '更新任务';
    }

    // 加载学院列表
    await loadDepartments();

    // 如果是编辑模式，加载任务数据
    if (isEditMode) {
        await loadTaskData();
    }

    // 绑定表单提交事件
    document.getElementById('taskForm').addEventListener('submit', handleSubmit);
});

// 加载学院列表
async function loadDepartments() {
    try {
        const response = await apiGet('/departments');
        if (response.success) {
            const deptSelect = document.getElementById('dept_id');
            populateCollegeOptions(deptSelect, response.data.departments);
        }
    } catch (error) {
        console.error('加载学院列表失败:', error);
        showError('加载学院列表失败');
    }
}

function populateCollegeOptions(selectElement, departments = []) {
    const DEFAULT_COLLEGES = ['信息学院', '数学学院', '统计学院'];
    selectElement.innerHTML = '<option value="">请选择学院</option>';

    // 保证默认学院优先显示
    const orderedDepartments = [];
    const handledIds = new Set();

    DEFAULT_COLLEGES.forEach(name => {
        const match = departments.find(dept => dept.dept_name === name);
        if (match) {
            orderedDepartments.push(match);
            handledIds.add(match.dept_id);
        }
    });

    departments.forEach(dept => {
        if (!handledIds.has(dept.dept_id)) {
            orderedDepartments.push(dept);
            handledIds.add(dept.dept_id);
        }
    });

    orderedDepartments.forEach(dept => {
        const option = document.createElement('option');
        option.value = dept.dept_id;
        option.textContent = dept.dept_name;
        selectElement.appendChild(option);
    });

    // 如果后端没有返回任何学院，仍然展示默认占位（不可选）
    if (orderedDepartments.length === 0) {
        DEFAULT_COLLEGES.forEach(name => {
                const option = document.createElement('option');
            option.value = '';
            option.textContent = `${name}（请在后台创建该学院后再选择）`;
            option.disabled = true;
            selectElement.appendChild(option);
            });
        }
}

// 加载任务数据（编辑模式）
async function loadTaskData() {
    try {
        const response = await apiGet(`/tasks/${taskId}`);
        if (response.success) {
            const task = response.data;
            document.getElementById('task_name').value = task.task_name;
            document.getElementById('description').value = task.description || '';
            // 无法预填本地文件输入，仅保留原有模板文件
            document.getElementById('dept_id').value = task.department.dept_id;
            document.getElementById('deadline').value = formatDateTimeLocal(task.deadline);
        } else {
            showError('加载任务数据失败');
        }
    } catch (error) {
        showError(error.message || '加载任务数据失败');
    }
}

// 处理表单提交
async function handleSubmit(e) {
    e.preventDefault();

    const templateInput = document.getElementById('template_file');
    const templateFile = templateInput?.files?.[0] || null;

    if (!isEditMode && !templateFile) {
        showError('请先上传模板文件');
        return;
    }

    // 获取并转换 deadline 格式
    const deadlineInput = document.getElementById('deadline').value;
    const deadline = formatDateTimeToISO(deadlineInput);
    
    if (!deadline) {
        showError('请选择有效的截止日期');
        return;
    }

    const metadata = {
        task_name: document.getElementById('task_name').value,
        description: document.getElementById('description').value,
        dept_id: parseInt(document.getElementById('dept_id').value, 10),
        deadline: deadline
    };

    const formData = new FormData();
    formData.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    if (templateFile) {
        formData.append('template_file', templateFile);
    }

    try {
        const token = getToken();
        const url = isEditMode ? `/tasks/${taskId}` : '/tasks';
        const response = await fetch(`${API_BASE_URL}${url}`, {
            method: isEditMode ? 'PUT' : 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
                // 注意：不要设置 Content-Type，让浏览器自动设置 multipart/form-data 的边界
            },
            body: formData
        });

        let data;
        try {
            data = await response.json();
        } catch (jsonError) {
            // 如果响应不是 JSON，可能是 404 或其他错误
            if (!response.ok) {
                showError(`请求失败: ${response.status} ${response.statusText}`);
                return;
            }
            throw jsonError;
        }

        if (response.ok && data && data.success) {
            showSuccess(isEditMode ? '任务更新成功' : '任务创建成功');
            setTimeout(() => {
                window.location.href = 'tasks.html';
            }, 1500);
        } else {
            const msg = data?.error?.message || data?.message || (isEditMode ? '更新任务失败' : '创建任务失败');
            showError(msg);
        }
    } catch (error) {
        console.error('创建任务错误:', error);
        showError(error.message || (isEditMode ? '更新任务失败' : '创建任务失败'));
    }
}




