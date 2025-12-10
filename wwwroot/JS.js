(function () {
    const newTaskInput = document.getElementById('newTask');
    const addBtn = document.getElementById('addBtn');
    const taskList = document.getElementById('taskList');
    const countEl = document.getElementById('count');
    const toast = document.getElementById('toast');
    const clearCompletedBtn = document.getElementById('clearCompleted');
    const clearAllBtn = document.getElementById('clearAll');
    const allBtn = document.getElementById('allBtn');
    const activeBtn = document.getElementById('activeBtn');
    const completedBtn = document.getElementById('completedBtn');

    let tasks = [];
    const STORAGE_KEY = 'todo_tasks_v1';
    let filter = 'all';

    function uid() {
        return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    }

    function showToast(msg, duration = 2500) {
        toast.textContent = msg;
        toast.style.display = 'block';
        clearTimeout(toast._t);
        toast._t = setTimeout(() => toast.style.display = 'none', duration);
    }

    function save() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
        } catch (err) {
            console.error('Save error', err);
            showToast('Error saving to localStorage');
        }
    }

    function load() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) tasks = JSON.parse(raw);
        } catch (err) {
            console.error('Load error', err);
            tasks = [];
            showToast('Corrupt data — reset');
            localStorage.removeItem(STORAGE_KEY);
        }
    }

    function updateCount() {
        const total = tasks.length;
        const remaining = tasks.filter(t => !t.completed).length;
        countEl.textContent = `${remaining} / ${total} tasks remaining`;
    }

    function formatDate(iso) {
        try {
            return new Date(iso).toLocaleString();
        } catch { return iso; }
    }

    function render() {
        taskList.innerHTML = '';
        const visible = tasks.filter(t => {
            if (filter === 'all') return true;
            if (filter === 'active') return !t.completed;
            if (filter === 'completed') return t.completed;
        });

        if (visible.length === 0) {
            const el = document.createElement('div');
            el.className = 'empty';
            el.textContent = tasks.length === 0
                ? 'No tasks yet — add your first task!'
                : filter === 'completed'
                    ? 'No completed tasks'
                    : filter === 'active'
                        ? 'No active tasks'
                        : 'No tasks';
            taskList.appendChild(el);
        } else {
            visible.forEach(t => taskList.appendChild(renderTask(t)));
        }

        updateCount();
    }

    function renderTask(task) {
        const item = document.createElement('div');
        item.className = 'task' + (task.completed ? ' completed' : '');
        item.setAttribute('data-id', task.id);

        const chk = document.createElement('button');
        chk.className = 'chk';
        chk.innerHTML = task.completed ? '✔' : '';
        chk.title = task.completed ? 'Mark incomplete' : 'Mark complete';
        chk.setAttribute('aria-pressed', task.completed ? 'true' : 'false');
        chk.addEventListener('click', () => toggleComplete(task.id));

        const content = document.createElement('div');
        content.className = 'content';

        const title = document.createElement('div');
        title.className = 'title';
        title.tabIndex = 0;
        title.textContent = task.text;
        title.title = 'Double-click to edit';
        title.addEventListener('dblclick', () => beginEdit(task.id, title));
        title.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') beginEdit(task.id, title);
        });

        const meta = document.createElement('div');
        meta.className = 'meta';
        meta.textContent = 'Created: ' + formatDate(task.createdAt);

        content.appendChild(title);
        content.appendChild(meta);

        const actions = document.createElement('div');
        actions.className = 'actions';

        const editBtn = document.createElement('button');
        editBtn.className = 'icon-btn';
        editBtn.innerHTML = '✏️';
        editBtn.title = 'Edit';
        editBtn.addEventListener('click', () => beginEdit(task.id, title));

        const delBtn = document.createElement('button');
        delBtn.className = 'icon-btn trash';
        delBtn.innerHTML = '🗑️';
        delBtn.title = 'Delete';
        delBtn.addEventListener('click', () => removeTask(task.id));

        actions.appendChild(editBtn);
        actions.appendChild(delBtn);

        if (task.completed) {
            const badge = document.createElement('div');
            badge.className = 'done-badge';
            badge.textContent = 'Done';
            actions.appendChild(badge);
        }

        item.appendChild(chk);
        item.appendChild(content);
        item.appendChild(actions);

        return item;
    }

    function addTask(text) {
        const trimmed = (text || '').trim();
        if (!trimmed) {
            showToast('Task cannot be empty');
            return false;
        }
        tasks.unshift({
            id: uid(),
            text: trimmed,
            completed: false,
            createdAt: new Date().toISOString()
        });
        save();
        render();
        showToast('Task added ✔️');
        return true;
    }

    function toggleComplete(id) {
        const idx = tasks.findIndex(t => t.id === id);
        if (idx === -1) return;
        tasks[idx].completed = !tasks[idx].completed;
        save();
        render();
        showToast(tasks[idx].completed ? 'Marked complete' : 'Marked incomplete');
    }

    function removeTask(id) {
        if (!confirm('Delete this task?')) return;
        tasks = tasks.filter(t => t.id !== id);
        save();
        render();
        showToast('Task removed');
    }

    function beginEdit(id, titleEl) {
        const parent = titleEl.closest('.task');
        const taskObj = tasks.find(t => t.id === id);
        if (!taskObj) return;

        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'edit-input';
        input.value = taskObj.text;
        input.addEventListener('keydown', e => {
            if (e.key === 'Enter') finishEdit(id, input.value);
            if (e.key === 'Escape') render();
        });
        input.addEventListener('blur', () => finishEdit(id, input.value));
        titleEl.replaceWith(input);
        input.focus();
        input.setSelectionRange(input.value.length, input.value.length);
    }

    function finishEdit(id, newText) {
        const trimmed = (newText || '').trim();
        if (!trimmed) {
            showToast('Task cannot be empty');
            render();
            return;
        }
        const idx = tasks.findIndex(t => t.id === id);
        if (idx === -1) { render(); return; }
        tasks[idx].text = trimmed;
        save();
        render();
        showToast('Task updated');
    }

    function clearCompleted() {
        const count = tasks.filter(t => t.completed).length;
        if (count === 0) { showToast('No completed tasks'); return; }
        if (!confirm(`Delete ${count} completed tasks?`)) return;
        tasks = tasks.filter(t => !t.completed);
        save();
        render();
        showToast('Completed tasks removed');
    }

    function clearAll() {
        if (tasks.length === 0) { showToast('No tasks'); return; }
        if (!confirm('Delete ALL tasks?')) return;
        tasks = [];
        save();
        render();
        showToast('All tasks cleared');
    }

    addBtn.addEventListener('click', () => {
        const ok = addTask(newTaskInput.value);
        if (ok) newTaskInput.value = '';
    });

    newTaskInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            const ok = addTask(newTaskInput.value);
            if (ok) newTaskInput.value = '';
        }
    });

    clearCompletedBtn.addEventListener('click', clearCompleted);
    clearAllBtn.addEventListener('click', clearAll);

    allBtn.addEventListener('click', () => { filter = 'all'; render(); });
    activeBtn.addEventListener('click', () => { filter = 'active'; render(); });
    completedBtn.addEventListener('click', () => { filter = 'completed'; render(); });

    load();
    render();

    window.addEventListener('storage', (e) => {
        if (e.key === STORAGE_KEY) {
            load();
            render();
            showToast('Updated from another tab');
        }
    });

})();
