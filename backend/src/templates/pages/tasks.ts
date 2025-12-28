import { baseLayout } from '../layouts/base';

export function tasksPage() {
  return baseLayout({
    title: 'Tasks History',
    content: `
    <div class="page-header">
      <div>
        <h1>📋 Tasks History</h1>
        <p class="text-secondary">Manage and track your content tasks with conversation threading</p>
      </div>
      <div class="flex gap-2">
        <select id="statusFilter" class="input" onchange="filterTasks()">
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <button onclick="refreshTasks()" class="btn btn-secondary">
          <span>🔄</span> Refresh
        </button>
      </div>
    </div>

    <div id="tasksContainer" class="space-y-4">
      <div class="text-center py-8">
        <div class="loading-spinner"></div>
        <p class="text-secondary mt-4">Loading tasks...</p>
      </div>
    </div>

    <!-- Task Detail Modal -->
    <div id="taskModal" class="modal-overlay" style="display: none;" onclick="closeTaskModal(event)">
      <div class="modal-content" onclick="event.stopPropagation()">
        <div class="modal-header">
          <h2 id="modalTaskTitle">Task Details</h2>
          <button onclick="closeTaskModal()" class="btn btn-ghost btn-sm">✕</button>
        </div>
        <div class="modal-body">
          <div id="modalTaskContent"></div>
        </div>
      </div>
    </div>

    <style>
      .modal-overlay {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
        backdrop-filter: blur(4px);
      }

      .modal-content {
        background: var(--bg-primary);
        border-radius: var(--radius-lg);
        max-width: 800px;
        width: 90%;
        max-height: 90vh;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        box-shadow: var(--shadow-xl);
      }

      .modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: var(--spacing-6);
        border-bottom: 1px solid var(--border-color);
      }

      .modal-body {
        padding: var(--spacing-6);
        overflow-y: auto;
        flex: 1;
      }

      .task-card {
        background: var(--bg-primary);
        border: 1px solid var(--border-color);
        border-radius: var(--radius-lg);
        padding: var(--spacing-4);
        transition: var(--transition-base);
        cursor: pointer;
      }

      .task-card:hover {
        border-color: var(--primary);
        box-shadow: var(--shadow-md);
        transform: translateY(-2px);
      }

      .task-header {
        display: flex;
        justify-content: space-between;
        align-items: start;
        margin-bottom: var(--spacing-3);
      }

      .task-meta {
        display: flex;
        gap: var(--spacing-2);
        flex-wrap: wrap;
        margin-top: var(--spacing-2);
      }

      .conversation-thread {
        background: var(--bg-secondary);
        border-radius: var(--radius-md);
        padding: var(--spacing-4);
        margin-top: var(--spacing-4);
      }

      .thread-message {
        padding: var(--spacing-3);
        margin-bottom: var(--spacing-2);
        border-radius: var(--radius-md);
        border-left: 3px solid var(--border-color);
      }

      .thread-message.user {
        background: var(--primary-50);
        border-left-color: var(--primary);
      }

      .thread-message.system {
        background: var(--bg-tertiary);
        border-left-color: var(--text-tertiary);
      }

      .follow-up-form {
        margin-top: var(--spacing-4);
        padding: var(--spacing-4);
        background: var(--bg-secondary);
        border-radius: var(--radius-md);
      }

      .source-info {
        display: flex;
        gap: var(--spacing-2);
        padding: var(--spacing-3);
        background: var(--bg-secondary);
        border-radius: var(--radius-md);
        margin-top: var(--spacing-3);
        font-size: var(--text-sm);
      }

      .loading-spinner {
        border: 3px solid var(--border-color);
        border-top-color: var(--primary);
        border-radius: 50%;
        width: 40px;
        height: 40px;
        animation: spin 1s linear infinite;
        margin: 0 auto;
      }

      @keyframes spin {
        to { transform: rotate(360deg); }
      }
    </style>

    <script>
      const API_BASE = window.location.origin;
      let currentTasks = [];
      let selectedTaskId = null;

      async function loadTasks() {
        try {
          const statusFilter = document.getElementById('statusFilter').value;
          const url = statusFilter
            ? API_BASE + '/api/tasks?status=' + statusFilter
            : API_BASE + '/api/tasks';

          const response = await fetch(url);
          const data = await response.json();

          if (!data.success) {
            throw new Error(data.error || 'Failed to load tasks');
          }

          currentTasks = data.tasks || [];
          renderTasks(currentTasks);
        } catch (error) {
          console.error('Error loading tasks:', error);
          document.getElementById('tasksContainer').innerHTML =
            '<div class="alert alert-error">Failed to load tasks: ' + error.message + '</div>';
        }
      }

      function renderTasks(tasks) {
        const container = document.getElementById('tasksContainer');

        if (tasks.length === 0) {
          container.innerHTML = \`
            <div class="card card-flat text-center py-8">
              <div style="font-size: 48px; margin-bottom: var(--spacing-4);">📋</div>
              <h3>No tasks found</h3>
              <p class="text-secondary">Tasks will appear here when you create them from content overlays</p>
            </div>
          \`;
          return;
        }

        container.innerHTML = tasks.map(task => \`
          <div class="task-card" onclick="viewTaskDetails('\${task.id}')">
            <div class="task-header">
              <div style="flex: 1;">
                <div class="flex items-center gap-2 mb-2">
                  <span class="badge \${getStatusBadgeClass(task.status)}">\${task.status}</span>
                  \${task.source_item_type ? '<span class="badge badge-ghost">' + task.source_item_type + '</span>' : ''}
                </div>
                <h3 style="margin: 0;">\${escapeHtml(task.task)}</h3>
              </div>
              <div class="text-secondary text-sm">
                \${formatDate(task.created_at)}
              </div>
            </div>

            \${task.source_text ? \`
              <div class="source-info">
                <span>📝</span>
                <div style="flex: 1; overflow: hidden;">
                  <div class="text-tertiary" style="font-size: var(--text-xs); margin-bottom: 4px;">Source:</div>
                  <div style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                    \${escapeHtml(task.source_text.substring(0, 100))}\${task.source_text.length > 100 ? '...' : ''}
                  </div>
                </div>
              </div>
            \` : ''}

            <div class="task-meta">
              \${task.conversation_thread && task.conversation_thread.length > 0
                ? '<span class="badge badge-ghost">💬 ' + task.conversation_thread.length + ' messages</span>'
                : ''}
              \${task.response ? '<span class="badge badge-success">✓ Response received</span>' : ''}
            </div>
          </div>
        \`).join('');
      }

      function getStatusBadgeClass(status) {
        const classes = {
          pending: 'badge-warning',
          in_progress: 'badge-primary',
          completed: 'badge-success',
          cancelled: 'badge-error'
        };
        return classes[status] || 'badge-ghost';
      }

      async function viewTaskDetails(taskId) {
        try {
          selectedTaskId = taskId;
          const response = await fetch(API_BASE + '/api/tasks/' + taskId);
          const data = await response.json();

          if (!data.success) {
            throw new Error(data.error || 'Failed to load task');
          }

          const task = data.task;
          renderTaskModal(task);
        } catch (error) {
          console.error('Error loading task details:', error);
          alert('Failed to load task details: ' + error.message);
        }
      }

      function renderTaskModal(task) {
        document.getElementById('modalTaskTitle').textContent = 'Task: ' + task.task.substring(0, 50);

        const content = \`
          <div class="space-y-4">
            <!-- Status Section -->
            <div>
              <label class="label">Status</label>
              <select id="taskStatus" class="input" onchange="updateTaskStatus()">
                <option value="pending" \${task.status === 'pending' ? 'selected' : ''}>Pending</option>
                <option value="in_progress" \${task.status === 'in_progress' ? 'selected' : ''}>In Progress</option>
                <option value="completed" \${task.status === 'completed' ? 'selected' : ''}>Completed</option>
                <option value="cancelled" \${task.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
              </select>
            </div>

            <!-- Task Description -->
            <div>
              <label class="label">Task Description</label>
              <div class="card card-bordered">
                <p>\${escapeHtml(task.task)}</p>
              </div>
            </div>

            <!-- Source Information -->
            \${task.source_text || task.source_url ? \`
              <div>
                <label class="label">Source</label>
                <div class="card card-bordered">
                  \${task.source_text ? '<p>' + escapeHtml(task.source_text) + '</p>' : ''}
                  \${task.source_url ? '<p class="text-secondary text-sm mt-2">🔗 <a href="' + escapeHtml(task.source_url) + '" target="_blank">' + escapeHtml(task.source_url) + '</a></p>' : ''}
                </div>
              </div>
            \` : ''}

            <!-- Response -->
            \${task.response ? \`
              <div>
                <label class="label">Response</label>
                <div class="card card-bordered">
                  <p>\${escapeHtml(task.response)}</p>
                </div>
              </div>
            \` : ''}

            <!-- Conversation Thread -->
            \${task.conversation_thread && task.conversation_thread.length > 0 ? \`
              <div>
                <label class="label">Conversation Thread</label>
                <div class="conversation-thread">
                  \${task.conversation_thread.map(msg => \`
                    <div class="thread-message \${msg.type}">
                      <div class="text-xs text-tertiary mb-1">\${msg.type === 'user' ? '👤 You' : '🤖 System'} • \${formatDate(msg.timestamp)}</div>
                      <p>\${escapeHtml(msg.message)}</p>
                    </div>
                  \`).join('')}
                </div>
              </div>
            \` : ''}

            <!-- Add Follow-up -->
            <div class="follow-up-form">
              <label class="label">Add Follow-up Message</label>
              <textarea id="followUpMessage" class="input" rows="3" placeholder="Type your follow-up message..."></textarea>
              <button onclick="addFollowUp()" class="btn btn-primary mt-2">Send Follow-up</button>
            </div>

            <!-- Actions -->
            <div class="flex gap-2 justify-end">
              <button onclick="deleteTask()" class="btn btn-error">Delete Task</button>
              <button onclick="closeTaskModal()" class="btn btn-secondary">Close</button>
            </div>
          </div>
        \`;

        document.getElementById('modalTaskContent').innerHTML = content;
        document.getElementById('taskModal').style.display = 'flex';
      }

      async function updateTaskStatus() {
        if (!selectedTaskId) return;

        try {
          const status = document.getElementById('taskStatus').value;

          const response = await fetch(API_BASE + '/api/tasks/' + selectedTaskId, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status })
          });

          const data = await response.json();

          if (!data.success) {
            throw new Error(data.error || 'Failed to update status');
          }

          await loadTasks();
        } catch (error) {
          console.error('Error updating status:', error);
          alert('Failed to update status: ' + error.message);
        }
      }

      async function addFollowUp() {
        if (!selectedTaskId) return;

        const message = document.getElementById('followUpMessage').value.trim();
        if (!message) {
          alert('Please enter a message');
          return;
        }

        try {
          const response = await fetch(API_BASE + '/api/tasks/' + selectedTaskId + '/follow-up', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message, type: 'user' })
          });

          const data = await response.json();

          if (!data.success) {
            throw new Error(data.error || 'Failed to add follow-up');
          }

          // Reload task details
          await viewTaskDetails(selectedTaskId);
          await loadTasks();
        } catch (error) {
          console.error('Error adding follow-up:', error);
          alert('Failed to add follow-up: ' + error.message);
        }
      }

      async function deleteTask() {
        if (!selectedTaskId) return;

        if (!confirm('Are you sure you want to delete this task?')) {
          return;
        }

        try {
          const response = await fetch(API_BASE + '/api/tasks/' + selectedTaskId, {
            method: 'DELETE'
          });

          const data = await response.json();

          if (!data.success) {
            throw new Error(data.error || 'Failed to delete task');
          }

          closeTaskModal();
          await loadTasks();
        } catch (error) {
          console.error('Error deleting task:', error);
          alert('Failed to delete task: ' + error.message);
        }
      }

      function closeTaskModal(event) {
        if (event && event.target !== event.currentTarget) return;
        document.getElementById('taskModal').style.display = 'none';
        selectedTaskId = null;
      }

      function filterTasks() {
        loadTasks();
      }

      function refreshTasks() {
        loadTasks();
      }

      function formatDate(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));

        if (days === 0) {
          const hours = Math.floor(diff / (1000 * 60 * 60));
          if (hours === 0) {
            const minutes = Math.floor(diff / (1000 * 60));
            return minutes + 'm ago';
          }
          return hours + 'h ago';
        } else if (days === 1) {
          return 'Yesterday';
        } else if (days < 7) {
          return days + 'd ago';
        } else {
          return date.toLocaleDateString();
        }
      }

      function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
      }

      // Load tasks on page load
      loadTasks();
    </script>
    `
  });
}
