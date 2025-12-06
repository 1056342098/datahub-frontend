// 任务列表页面逻辑

const DEFAULT_COLLEGES = ['信息学院', '数学学院', '统计学院'];

let currentPage = 0;
let pageSize = 10;
let currentFilters = {
    status: '',
    deptIds: [],
    orderBy: 'deadline',
    orderDirection: 'asc'
};

document.addEventListener('DOMContentLoaded', async () => {
    // 检查登录状态
    // if (!checkAuth()) {
    //     redirectToLogin();
    //     return;
    // }

    // 初始化学院下拉框
    await loadDepartments();

    // 绑定事件
    document.getElementById('createTaskBtn').addEventListener('click', () => {
        window.location.href = 'task-create.html';
    });

    document.getElementById('applyFilterBtn').addEventListener('click', () => {
        applyFilters();
    });

    // 加载任务列表
    await loadTasks();
});

// 初始化学院下拉框
function initializeCollegeFilter(selectElement) {
    if (!selectElement) return;
    selectElement.innerHTML = '<option value="">全部学院</option>';
    DEFAULT_COLLEGES.forEach(name => {
        const placeholder = document.createElement('option');
        placeholder.value = '';
        placeholder.textContent = name;
        placeholder.disabled = true;
        placeholder.dataset.placeholder = name;
        placeholder.title = '请先在后台创建该学院后再筛选';
        selectElement.appendChild(placeholder);
    });
}

function addOrUpdateCollegeOption(selectElement, department) {
    if (!selectElement || !department) return;
    const { dept_id: deptId, dept_name: deptName } = department;
    if (deptId === undefined || deptId === null) return;

    const options = Array.from(selectElement.options);
    const existingById = options.find(opt => opt.value && Number(opt.value) === deptId);
    if (existingById) {
        existingById.textContent = deptName;
        existingById.disabled = false;
        existingById.removeAttribute('data-placeholder');
        return;
    }

    const placeholderMatch = options.find(opt => opt.dataset.placeholder === deptName);
    if (placeholderMatch) {
        placeholderMatch.value = deptId;
        placeholderMatch.textContent = deptName;
        placeholderMatch.disabled = false;
        placeholderMatch.removeAttribute('data-placeholder');
        placeholderMatch.removeAttribute('title');
        return;
    }

    const option = document.createElement('option');
    option.value = deptId;
    option.textContent = deptName;
    selectElement.appendChild(option);
}

// 加载学院列表
async function loadDepartments() {
    const deptSelect = document.getElementById('deptFilter');
    initializeCollegeFilter(deptSelect);
    const modalCollegeSelect = document.getElementById('taskDept');
    if (modalCollegeSelect) {
        modalCollegeSelect.innerHTML = '<option value="">请选择学院</option>';
        DEFAULT_COLLEGES.forEach(name => {
            const option = document.createElement('option');
            option.value = '';
            option.textContent = `${name}（待同步到后台）`;
            option.disabled = true;
            modalCollegeSelect.appendChild(option);
        });
    }

    try {
        const response = await apiGet('/departments');
        if (response.success) {
            response.data.departments.forEach(dept => addOrUpdateCollegeOption(deptSelect, dept));
            if (modalCollegeSelect) {
                populateModalCollegeSelect(modalCollegeSelect, response.data.departments);
            }
        }
    } catch (error) {
        console.error('加载学院列表失败:', error);
    }
}

// 应用筛选
function applyFilters() {
    currentFilters.status = document.getElementById('statusFilter').value;
    const deptId = document.getElementById('deptFilter').value;
    currentFilters.deptIds = deptId ? [parseInt(deptId)] : [];
    currentFilters.orderBy = document.getElementById('orderBy').value;
    currentFilters.orderDirection = document.getElementById('orderDirection').value;
    currentPage = 0;
    loadTasks();
}

// 加载任务列表
async function loadTasks() {
    const tbody = document.getElementById('taskTableBody');
    tbody.innerHTML = '<tr><td colspan="7" class="loading">加载中...</td></tr>';

    try {
        const params = new URLSearchParams({
            page_num: currentPage,
            page_size: pageSize,
            order_by: currentFilters.orderBy,
            order_direction: currentFilters.orderDirection
        });

        if (currentFilters.status) {
            params.append('status', currentFilters.status);
        }

        if (currentFilters.deptIds.length > 0) {
            currentFilters.deptIds.forEach(id => {
                params.append('dept_ids', id);
            });
        }

        const response = await apiGet(`/tasks?${params.toString()}`);

        if (response.success) {
            displayTasks(response.data.tasks);
            displayPagination(response.data.page);
        } else {
            showError('加载任务列表失败');
        }
    } catch (error) {
        showError(error.message || '加载任务列表失败');
        tbody.innerHTML = '<tr><td colspan="7" class="loading">加载失败</td></tr>';
    }
}

// 显示任务列表
function displayTasks(tasks) {
    const tbody = document.getElementById('taskTableBody');

    if (tasks.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="loading">暂无任务</td></tr>';
        updateStats(tasks);
        mergeCollegesFromTasks(tasks);
        return;
    }

    // 更新统计信息
    updateStats(tasks);
    mergeCollegesFromTasks(tasks);

    tbody.innerHTML = tasks.map(task => `
        <tr>
            <td>${task.task_id}</td>
            <td>${task.task_name}</td>
            <td>${task.department.dept_name}</td>
            <td><span class="status-badge status-${task.status.toLowerCase()}">${task.status === 'Ongoing' ? '正在进行' : '已完成'}</span></td>
            <td>${formatDateTime(task.deadline)}</td>
            <td>${formatDateTime(task.create_time)}</td>
            <td>
                <button class="btn btn-secondary" onclick="viewTask(${task.task_id})" style="padding: 5px 10px; font-size: 12px;">查看</button>
                <button class="btn btn-primary" onclick="editTask(${task.task_id})" style="padding: 5px 10px; font-size: 12px;">编辑</button>
                <button class="btn btn-danger" onclick="deleteTask(${task.task_id})" style="padding: 5px 10px; font-size: 12px;">删除</button>
                <button class="btn btn-secondary" onclick="viewTeachers(${task.task_id})" style="padding: 5px 10px; font-size: 12px;">教师</button>
            </td>
        </tr>
    `).join('');
}

function mergeCollegesFromTasks(tasks) {
    const deptSelect = document.getElementById('deptFilter');
    tasks.forEach(task => {
        if (task.department) {
            addOrUpdateCollegeOption(deptSelect, task.department);
        }
    });
}

function populateModalCollegeSelect(selectElement, departments = []) {
    if (!selectElement) return;
    selectElement.innerHTML = '<option value="">请选择学院</option>';

    const ordered = [];
    const handled = new Set();
    DEFAULT_COLLEGES.forEach(name => {
        const match = departments.find(dept => dept.dept_name === name);
        if (match) {
            ordered.push(match);
            handled.add(match.dept_id);
        }
    });
    departments.forEach(dept => {
        if (!handled.has(dept.dept_id)) {
            ordered.push(dept);
            handled.add(dept.dept_id);
        }
    });

    ordered.forEach(dept => {
        const option = document.createElement('option');
        option.value = dept.dept_id;
        option.textContent = dept.dept_name;
        selectElement.appendChild(option);
    });

    if (ordered.length === 0) {
        DEFAULT_COLLEGES.forEach(name => {
            const option = document.createElement('option');
            option.value = '';
            option.textContent = `${name}（请在后台创建该学院后再选择）`;
            option.disabled = true;
            selectElement.appendChild(option);
        });
    }
}

    // 更新统计信息（需要从所有任务中计算，当前只显示当前页的统计）
function updateStats(tasks) {
    // 注意：这里只统计当前页的任务，如果需要全局统计，需要额外API调用
    const total = tasks.length;
    const ongoing = tasks.filter(task => task.status === 'Ongoing').length;
    const finished = tasks.filter(task => task.status === 'Finished').length;
    
    const totalEl = document.getElementById('totalTasks');
    const ongoingEl = document.getElementById('ongoingTasks');
    const finishedEl = document.getElementById('finishedTasks');
    
    if (totalEl) totalEl.textContent = total;
    if (ongoingEl) ongoingEl.textContent = ongoing;
    if (finishedEl) finishedEl.textContent = finished;
}

// 显示分页
function displayPagination(pageInfo) {
    const pagination = document.getElementById('pagination');
    const totalPages = pageInfo.total_pages;
    const currentPageNum = pageInfo.page_num;

    if (totalPages <= 1) {
        pagination.innerHTML = '';
        return;
    }

    let html = '';

    // 上一页按钮
    html += `<button ${currentPageNum === 0 ? 'disabled' : ''} onclick="goToPage(${currentPageNum - 1})">上一页</button>`;

    // 页码信息
    html += `<span class="page-info">第 ${currentPageNum + 1} 页 / 共 ${totalPages} 页</span>`;

    // 下一页按钮
    html += `<button ${currentPageNum >= totalPages - 1 ? 'disabled' : ''} onclick="goToPage(${currentPageNum + 1})">下一页</button>`;

    pagination.innerHTML = html;
}

// 跳转到指定页面
function goToPage(page) {
    currentPage = page;
    loadTasks();
}

// 查看任务详情
function viewTask(taskId) {
    window.location.href = `task-detail.html?task_id=${taskId}`;
}

// 编辑任务
function editTask(taskId) {
    window.location.href = `task-create.html?task_id=${taskId}`;
}

// 删除任务
async function deleteTask(taskId) {
    if (!confirm('确定要删除这个任务吗？')) {
        return;
    }

    try {
        const response = await apiDelete(`/tasks/${taskId}`);
        if (response.success) {
            showSuccess('任务删除成功');
            loadTasks();
        } else {
            showError('删除任务失败');
        }
    } catch (error) {
        showError(error.message || '删除任务失败');
    }
}

// 查看教师列表
function viewTeachers(taskId) {
    window.location.href = `task-teachers.html?task_id=${taskId}`;
}



