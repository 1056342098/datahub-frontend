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
        
        // 编辑模式下，模板文件不是必填项
        const templateFileInput = document.getElementById('template_file');
        const templateFileLabel = document.getElementById('template_file_label');
        const templateFileHint = document.getElementById('template_file_hint');
        
        templateFileInput.removeAttribute('required');
        templateFileLabel.removeAttribute('data-required');
        templateFileHint.textContent = '如需更新模板，请选择新文件上传（可选）';
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
            document.getElementById('dept_id').value = task.department.dept_id;
            document.getElementById('deadline').value = formatDateTimeLocal(task.deadline);
            
            // 在编辑模式下显示当前模板文件ID
            if (task.template_file_id) {
                displayCurrentTemplateFile(task.template_file_id);
            }
        } else {
            showError('加载任务数据失败');
        }
    } catch (error) {
        showError(error.message || '加载任务数据失败');
    }
}

// 显示当前模板文件信息（编辑模式）
function displayCurrentTemplateFile(fileId) {
    const templateFileGroup = document.querySelector('#template_file').closest('.form-group');
    const existingInfo = document.getElementById('currentTemplateInfo');
    
    if (existingInfo) {
        existingInfo.remove();
    }
    
    const infoDiv = document.createElement('div');
    infoDiv.id = 'currentTemplateInfo';
    infoDiv.style.cssText = 'margin-top: 10px; padding: 15px; background: rgba(0, 198, 255, 0.05); border-radius: 10px; border-left: 3px solid #00c6ff;';
    infoDiv.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: space-between; gap: 15px; flex-wrap: wrap;">
            <div style="flex: 1; min-width: 200px;">
                <div style="font-size: 12px; color: #888; margin-bottom: 5px;">当前模板文件ID</div>
                <div style="display: flex; align-items: center; gap: 10px;">
                    <input type="text" value="${fileId}" readonly 
                           style="flex: 1; padding: 10px 14px; background: rgba(255, 255, 255, 0.03); 
                                  border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 8px; 
                                  color: #fff; font-size: 14px; font-weight: 500;">
                    <button type="button" onclick="downloadCurrentTemplate(${fileId})" 
                            style="padding: 10px 18px; border: none; border-radius: 8px; 
                                   font-size: 13px; font-weight: 600; cursor: pointer; 
                                   background: linear-gradient(135deg, #00c6ff 0%, #0072ff 100%); 
                                   color: white; transition: all 0.3s ease; white-space: nowrap;">
                        <i class="fas fa-download"></i> 下载当前模板
                    </button>
                </div>
            </div>
            <div style="font-size: 12px; color: #888; line-height: 1.5;">
                <i class="fas fa-info-circle" style="color: #00c6ff;"></i>
                如需更新模板，请选择新文件上传
            </div>
        </div>
    `;
    
    templateFileGroup.appendChild(infoDiv);
}

// 下载当前模板文件（编辑模式）
async function downloadCurrentTemplate(fileId) {
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
    // const deadline = formatDateTimeToISO(deadlineInput);
    const deadline = deadlineInput + ':00.000Z'; // 补全秒部分
    
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




