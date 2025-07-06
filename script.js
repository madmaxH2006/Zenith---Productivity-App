// Application State
let appState = {
    tasks: [],
    currentView: 'tasks',
    currentFilter: 'all',
    currentSort: 'newest',
    editingTask: null,
    settings: {
        theme: 'dark',
        taskReminders: true,
        dailySummary: true
    }
};

// DOM Elements
const elements = {
    navItems: document.querySelectorAll('.nav-item'),
    views: document.querySelectorAll('.view'),
    addTaskBtn: document.getElementById('addTaskBtn'),
    taskModal: document.getElementById('taskModal'),
    taskForm: document.getElementById('taskForm'),
    closeModal: document.getElementById('closeModal'),
    cancelBtn: document.getElementById('cancelBtn'),
    filterBtns: document.querySelectorAll('.filter-btn'),
    sortSelect: document.getElementById('sortTasks'),
    currentDate: document.getElementById('currentDate'),
    taskCount: document.querySelector('.task-count'),
    completedToday: document.getElementById('completedToday'),
    totalTasks: document.getElementById('totalTasks'),
    viewTitle: document.getElementById('viewTitle'),
    todayTasks: document.getElementById('todayTasks'),
    upcomingTasks: document.getElementById('upcomingTasks'),
    completedTasks: document.getElementById('completedTasks'),
    calendarGrid: document.getElementById('calendarGrid'),
    currentMonth: document.getElementById('currentMonth'),
    prevMonth: document.getElementById('prevMonth'),
    nextMonth: document.getElementById('nextMonth'),
    productivityScore: document.getElementById('productivityScore'),
    weeklyProgress: document.getElementById('weeklyProgress'),
    taskDistribution: document.getElementById('taskDistribution'),
    themeButtons: document.querySelectorAll('.theme-btn'),
    taskReminders: document.getElementById('taskReminders'),
    dailySummary: document.getElementById('dailySummary')
};

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
    loadData();
    initializeEventListeners();
    updateCurrentDate();
    renderTasks();
    renderCalendar();
    renderAnalytics();
    applyTheme();
    updateStats();
});

// Event Listeners
function initializeEventListeners() {
    // Navigation
    elements.navItems.forEach(item => {
        item.addEventListener('click', () => switchView(item.dataset.view));
    });

    // Task Modal
    elements.addTaskBtn.addEventListener('click', openTaskModal);
    elements.closeModal.addEventListener('click', closeTaskModal);
    elements.cancelBtn.addEventListener('click', closeTaskModal);
    elements.taskForm.addEventListener('submit', saveTask);

    // Filters and Sorting
    elements.filterBtns.forEach(btn => {
        btn.addEventListener('click', () => setFilter(btn.dataset.filter));
    });
    elements.sortSelect.addEventListener('change', (e) => setSorting(e.target.value));

    // Calendar Navigation
    elements.prevMonth.addEventListener('click', () => changeMonth(-1));
    elements.nextMonth.addEventListener('click', () => changeMonth(1));

    // Settings
    elements.themeButtons.forEach(btn => {
        btn.addEventListener('click', () => setTheme(btn.dataset.theme));
    });
    elements.taskReminders.addEventListener('change', (e) => {
        appState.settings.taskReminders = e.target.checked;
        saveData();
    });
    elements.dailySummary.addEventListener('change', (e) => {
        appState.settings.dailySummary = e.target.checked;
        saveData();
    });

    // Modal backdrop click
    elements.taskModal.addEventListener('click', (e) => {
        if (e.target === elements.taskModal) closeTaskModal();
    });
}

// View Management
function switchView(viewName) {
    appState.currentView = viewName;
    
    // Update navigation
    elements.navItems.forEach(item => {
        item.classList.toggle('active', item.dataset.view === viewName);
    });

    // Update views
    elements.views.forEach(view => {
        view.classList.toggle('active', view.id === viewName + 'View');
    });

    // Update title
    const titles = {
        tasks: 'My Tasks',
        calendar: 'Calendar',
        analytics: 'Analytics',
        settings: 'Settings'
    };
    elements.viewTitle.textContent = titles[viewName];

    // Render view-specific content
    if (viewName === 'calendar') renderCalendar();
    if (viewName === 'analytics') renderAnalytics();
}

// Task Management
function openTaskModal(task = null) {
    appState.editingTask = task;
    const modal = elements.taskModal;
    const form = elements.taskForm;
    
    if (task) {
        document.getElementById('modalTitle').textContent = 'Edit Task';
        document.getElementById('taskTitle').value = task.title;
        document.getElementById('taskDescription').value = task.description || '';
        document.getElementById('taskPriority').value = task.priority;
        document.getElementById('taskDueDate').value = task.dueDate || '';
        document.getElementById('taskCategory').value = task.category;
        document.getElementById('saveTaskBtn').textContent = 'Update Task';
    } else {
        document.getElementById('modalTitle').textContent = 'Add New Task';
        form.reset();
        document.getElementById('saveTaskBtn').textContent = 'Save Task';
    }
    
    modal.classList.add('active');
    document.getElementById('taskTitle').focus();
}

function closeTaskModal() {
    elements.taskModal.classList.remove('active');
    appState.editingTask = null;
}

function saveTask(e) {
    e.preventDefault();
    
    const formData = new FormData(elements.taskForm);
    const taskData = {
        title: document.getElementById('taskTitle').value,
        description: document.getElementById('taskDescription').value,
        priority: document.getElementById('taskPriority').value,
        dueDate: document.getElementById('taskDueDate').value,
        category: document.getElementById('taskCategory').value,
        completed: false,
        createdAt: new Date().toISOString(),
        id: appState.editingTask ? appState.editingTask.id : generateId()
    };

    if (appState.editingTask) {
        const index = appState.tasks.findIndex(t => t.id === appState.editingTask.id);
        appState.tasks[index] = { ...appState.editingTask, ...taskData };
        showToast('Task updated successfully!', 'success');
    } else {
        appState.tasks.push(taskData);
        showToast('Task added successfully!', 'success');
    }

    saveData();
    renderTasks();
    updateStats();
    closeTaskModal();
}

function deleteTask(taskId) {
    if (confirm('Are you sure you want to delete this task?')) {
        appState.tasks = appState.tasks.filter(task => task.id !== taskId);
        saveData();
        renderTasks();
        updateStats();
        showToast('Task deleted successfully!', 'success');
    }
}

function toggleTaskComplete(taskId) {
    const task = appState.tasks.find(t => t.id === taskId);
    if (task) {
        task.completed = !task.completed;
        task.completedAt = task.completed ? new Date().toISOString() : null;
        saveData();
        renderTasks();
        updateStats();
        showToast(task.completed ? 'Task completed!' : 'Task reopened!', 'success');
    }
}

// Task Rendering
function renderTasks() {
    const filteredTasks = getFilteredTasks();
    const sortedTasks = getSortedTasks(filteredTasks);
    
    // Group tasks by category
    const today = new Date();
    const todayTasks = sortedTasks.filter(task => {
        if (task.completed) return false;
        if (!task.dueDate) return true;
        const dueDate = new Date(task.dueDate);
        return dueDate.toDateString() === today.toDateString();
    });
    
    const upcomingTasks = sortedTasks.filter(task => {
        if (task.completed) return false;
        if (!task.dueDate) return false;
        const dueDate = new Date(task.dueDate);
        return dueDate > today;
    });
    
    const completedTasks = sortedTasks.filter(task => task.completed);
    
    // Render each category
    renderTaskList(elements.todayTasks, todayTasks, 'No tasks for today');
    renderTaskList(elements.upcomingTasks, upcomingTasks, 'No upcoming tasks');
    renderTaskList(elements.completedTasks, completedTasks, 'No completed tasks');
}

function renderTaskList(container, tasks, emptyMessage) {
    if (tasks.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📝</div>
                <h3>${emptyMessage}</h3>
                <p>Tasks will appear here when you add them</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = tasks.map(task => createTaskHTML(task)).join('');
    
    // Add event listeners
    container.querySelectorAll('.task-checkbox').forEach(checkbox => {
        checkbox.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleTaskComplete(checkbox.dataset.taskId);
        });
    });
    
    container.querySelectorAll('.task-item').forEach(item => {
        item.addEventListener('click', (e) => {
            if (!e.target.classList.contains('task-action')) {
                const taskId = item.dataset.taskId;
                const task = appState.tasks.find(t => t.id === taskId);
                openTaskModal(task);
            }
        });
    });
    
    container.querySelectorAll('.task-action[data-action="delete"]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            deleteTask(btn.dataset.taskId);
        });
    });
}

function createTaskHTML(task) {
    const dueDate = task.dueDate ? new Date(task.dueDate).toLocaleDateString() : '';
    const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && !task.completed;
    
    return `
        <div class="task-item ${task.completed ? 'completed' : ''}" data-task-id="${task.id}">
            <div class="task-header">
                <div class="task-checkbox ${task.completed ? 'checked' : ''}" data-task-id="${task.id}"></div>
                <div class="task-title">${task.title}</div>
                <div class="task-actions">
                    <button class="task-action" data-action="edit" data-task-id="${task.id}">Edit</button>
                    <button class="task-action" data-action="delete" data-task-id="${task.id}">Delete</button>
                </div>
            </div>
            ${task.description ? `<div class="task-description">${task.description}</div>` : ''}
            <div class="task-meta">
                <span class="task-priority ${task.priority}">${task.priority}</span>
                <span class="task-category">${task.category}</span>
                ${dueDate ? `<span class="task-due-date ${isOverdue ? 'overdue' : ''}">${dueDate}</span>` : ''}
            </div>
        </div>
    `;
}

// Filtering and Sorting
function getFilteredTasks() {
    switch (appState.currentFilter) {
        case 'pending':
            return appState.tasks.filter(task => !task.completed);
        case 'completed':
            return appState.tasks.filter(task => task.completed);
        default:
            return appState.tasks;
    }
}

function getSortedTasks(tasks) {
    return [...tasks].sort((a, b) => {
        switch (appState.currentSort) {
            case 'oldest':
                return new Date(a.createdAt) - new Date(b.createdAt);
            case 'priority':
                const priorities = { high: 3, medium: 2, low: 1 };
                return priorities[b.priority] - priorities[a.priority];
            case 'alphabetical':
                return a.title.localeCompare(b.title);
            default: // newest
                return new Date(b.createdAt) - new Date(a.createdAt);
        }
    });
}

function setFilter(filter) {
    appState.currentFilter = filter;
    elements.filterBtns.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.filter === filter);
    });
    renderTasks();
}

function setSorting(sort) {
    appState.currentSort = sort;
    renderTasks();
}

// Calendar
let currentCalendarDate = new Date();

function renderCalendar() {
    const year = currentCalendarDate.getFullYear();
    const month = currentCalendarDate.getMonth();
    
    elements.currentMonth.textContent = new Date(year, month).toLocaleDateString('en-US', { 
        month: 'long', 
        year: 'numeric' 
    });
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    const days = [];
    const current = new Date(startDate);
    
    for (let i = 0; i < 42; i++) {
        days.push(new Date(current));
        current.setDate(current.getDate() + 1);
    }
    
    elements.calendarGrid.innerHTML = days.map(day => {
        const isCurrentMonth = day.getMonth() === month;
        const isToday = day.toDateString() === new Date().toDateString();
        const tasksForDay = appState.tasks.filter(task => {
            return task.dueDate && new Date(task.dueDate).toDateString() === day.toDateString();
        });
        
        return `
            <div class="calendar-day ${!isCurrentMonth ? 'other-month' : ''} ${isToday ? 'today' : ''}">
                <div class="calendar-day-number">${day.getDate()}</div>
                <div class="calendar-tasks">
                    ${tasksForDay.length > 0 ? `${tasksForDay.length} task${tasksForDay.length > 1 ? 's' : ''}` : ''}
                </div>
            </div>
        `;
    }).join('');
}

function changeMonth(direction) {
    currentCalendarDate.setMonth(currentCalendarDate.getMonth() + direction);
    renderCalendar();
}

// Analytics
function renderAnalytics() {
    renderProductivityScore();
    renderWeeklyProgress();
    renderTaskDistribution();
}

function renderProductivityScore() {
    const totalTasks = appState.tasks.length;
    const completedTasks = appState.tasks.filter(task => task.completed).length;
    const score = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    
    elements.productivityScore.textContent = score;
}

function renderWeeklyProgress() {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const today = new Date();
    const weekStart = new Date(today.setDate(today.getDate() - today.getDay() + 1));
    
    const progressHTML = days.map((day, index) => {
        const date = new Date(weekStart);
        date.setDate(date.getDate() + index);
        
        const dayTasks = appState.tasks.filter(task => {
            return task.dueDate && new Date(task.dueDate).toDateString() === date.toDateString();
        });
        
        const completedDayTasks = dayTasks.filter(task => task.completed);
        const progress = dayTasks.length > 0 ? (completedDayTasks.length / dayTasks.length) * 100 : 0;
        
        return `
            <div class="progress-bar">
                <div class="progress-label">${day}</div>
                <div class="progress-track">
                    <div class="progress-fill" style="width: ${progress}%"></div>
                </div>
                <div class="progress-value">${Math.round(progress)}%</div>
            </div>
        `;
    }).join('');
    
    elements.weeklyProgress.innerHTML = progressHTML;
}

function renderTaskDistribution() {
    const categories = {};
    appState.tasks.forEach(task => {
        categories[task.category] = (categories[task.category] || 0) + 1;
    });
    
    const distributionHTML = Object.entries(categories).map(([category, count]) => `
        <div class="distribution-item">
            <div class="distribution-label">${category.charAt(0).toUpperCase() + category.slice(1)}</div>
            <div class="distribution-value">${count}</div>
        </div>
    `).join('');
    
    elements.taskDistribution.innerHTML = distributionHTML || '<div class="empty-state"><p>No tasks yet</p></div>';
}

// Theme Management
function setTheme(theme) {
    appState.settings.theme = theme;
    elements.themeButtons.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.theme === theme);
    });
    applyTheme();
    saveData();
}

function applyTheme() {
    const theme = appState.settings.theme;
    if (theme === 'auto') {
        const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        document.body.setAttribute('data-theme', isDark ? 'dark' : 'light');
    } else {
        document.body.setAttribute('data-theme', theme);
    }
}

// Utility Functions
function updateCurrentDate() {
    const now = new Date();
    elements.currentDate.textContent = now.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

function updateStats() {
    const totalTasks = appState.tasks.length;
    const completedTasks = appState.tasks.filter(task => task.completed).length;
    const today = new Date().toDateString();
    const completedToday = appState.tasks.filter(task => 
        task.completed && task.completedAt && 
        new Date(task.completedAt).toDateString() === today
    ).length;
    
    elements.taskCount.textContent = totalTasks;
    elements.totalTasks.textContent = totalTasks;
    elements.completedToday.textContent = completedToday;
}

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

// Data Persistence
function saveData() {
    const data = {
        tasks: appState.tasks,
        settings: appState.settings,
        lastUpdated: new Date().toISOString()
    };
    
    // In a real Electron app, this would use electron-store or similar
    // For now, we'll use a simple object storage
    window.appData = data;
}

function loadData() {
    // In a real Electron app, this would load from electron-store
    // For now, we'll use sample data
    if (window.appData) {
        appState.tasks = window.appData.tasks || [];
        appState.settings = window.appData.settings || appState.settings;
    } else {
        // Sample data for demonstration
        appState.tasks = [
            {
                id: 'sample1',
                title: 'Complete project proposal',
                description: 'Write and submit the Q1 project proposal',
                priority: 'high',
                category: 'work',
                dueDate: new Date().toISOString().split('T')[0],
                completed: false,
                createdAt: new Date().toISOString()
            },
            {
                id: 'sample2',
                title: 'Grocery shopping',
                description: 'Buy weekly groceries',
                priority: 'medium',
                category: 'personal',
                dueDate: '',
                completed: true,
                createdAt: new Date(Date.now() - 86400000).toISOString(),
                completedAt: new Date().toISOString()
            },
            {
                id: 'sample3',
                title: 'Morning workout',
                description: '30-minute cardio session',
                priority: 'high',
                category: 'health',
                dueDate: '',
                completed: false,
                createdAt: new Date(Date.now() - 172800000).toISOString()
            }
        ];
    }
    
    // Apply settings
    elements.taskReminders.checked = appState.settings.taskReminders;
    elements.dailySummary.checked = appState.settings.dailySummary;
    elements.themeButtons.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.theme === appState.settings.theme);
    });
}