/**
 * Chat page template
 * RAG-powered chat interface for querying memories
 */

import { baseLayout } from '../layouts/base';
import { nav } from '../components/nav';

export interface ChatPageProps {
  apiBase: string;
  conversationCount?: number;
}

export function chatPage({ apiBase, conversationCount = 0 }: ChatPageProps): string {
  const content = `
    ${nav({ currentPage: '/dashboard/chat', apiBase })}
    <div class="chat-container">
      <!-- Sidebar: Conversations List -->
      <div class="chat-sidebar">
        <div class="sidebar-header">
          <h3>Conversations</h3>
          <button id="new-chat-btn" class="btn-icon" title="New Chat">
            <span>+</span>
          </button>
        </div>
        <div id="conversations-list" class="conversations-list">
          <div class="loading-state">Loading conversations...</div>
        </div>
      </div>

      <!-- Main Chat Area -->
      <div class="chat-main">
        <div class="chat-header">
          <h2 id="chat-title">New Conversation</h2>
          <div class="chat-actions">
            <button id="delete-chat-btn" class="btn-icon btn-danger" title="Delete Conversation" style="display: none;">
              <span>🗑️</span>
            </button>
          </div>
        </div>

        <div id="messages-container" class="messages-container">
          <div class="empty-state">
            <div class="empty-icon">💬</div>
            <h3>Ask Your Memory</h3>
            <p>Start a conversation to search your saved memories, tweets, and videos using AI.</p>
            <div class="example-queries">
              <p><strong>Try asking:</strong></p>
              <button class="example-query">"What did I save about React hooks?"</button>
              <button class="example-query">"Find tweets about productivity"</button>
              <button class="example-query">"Summarize my notes on AI"</button>
            </div>
          </div>
        </div>

        <div class="chat-input-container">
          <div class="input-wrapper">
            <textarea
              id="chat-input"
              placeholder="Ask about your memories..."
              rows="1"
              maxlength="2000"
            ></textarea>
            <button id="send-btn" class="btn-primary" disabled>
              <span class="send-icon">➤</span>
            </button>
          </div>
          <div class="input-hint">
            <span id="char-count">0</span>/2000 characters
          </div>
        </div>
      </div>
    </div>

    <style>
      .chat-container {
        display: flex;
        height: calc(100vh - 60px);
        background: var(--background);
      }

      /* Sidebar */
      .chat-sidebar {
        width: 280px;
        background: var(--surface);
        border-right: 1px solid var(--border);
        display: flex;
        flex-direction: column;
      }

      .sidebar-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1rem;
        border-bottom: 1px solid var(--border);
      }

      .sidebar-header h3 {
        margin: 0;
        font-size: 1rem;
        color: var(--text-primary);
      }

      .btn-icon {
        width: 32px;
        height: 32px;
        border-radius: 8px;
        border: 1px solid var(--border);
        background: var(--background);
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.25rem;
        transition: all 0.2s;
      }

      .btn-icon:hover {
        background: var(--primary-light);
        border-color: var(--primary);
      }

      .btn-danger:hover {
        background: #fee;
        border-color: #c00;
      }

      .conversations-list {
        flex: 1;
        overflow-y: auto;
        padding: 0.5rem;
      }

      .conversation-item {
        padding: 0.75rem 1rem;
        border-radius: 8px;
        cursor: pointer;
        margin-bottom: 0.25rem;
        transition: all 0.2s;
      }

      .conversation-item:hover {
        background: var(--background);
      }

      .conversation-item.active {
        background: var(--primary-light);
      }

      .conversation-item .title {
        font-weight: 500;
        color: var(--text-primary);
        font-size: 0.875rem;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .conversation-item .date {
        font-size: 0.75rem;
        color: var(--text-secondary);
        margin-top: 0.25rem;
      }

      /* Main Chat Area */
      .chat-main {
        flex: 1;
        display: flex;
        flex-direction: column;
        min-width: 0;
      }

      .chat-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1rem 1.5rem;
        border-bottom: 1px solid var(--border);
        background: var(--surface);
      }

      .chat-header h2 {
        margin: 0;
        font-size: 1.125rem;
        color: var(--text-primary);
      }

      .messages-container {
        flex: 1;
        overflow-y: auto;
        padding: 1.5rem;
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }

      .empty-state {
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        text-align: center;
        color: var(--text-secondary);
      }

      .empty-icon {
        font-size: 3rem;
        margin-bottom: 1rem;
      }

      .empty-state h3 {
        color: var(--text-primary);
        margin-bottom: 0.5rem;
      }

      .example-queries {
        margin-top: 1.5rem;
      }

      .example-query {
        display: block;
        margin: 0.5rem auto;
        padding: 0.5rem 1rem;
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: 20px;
        cursor: pointer;
        font-size: 0.875rem;
        color: var(--text-secondary);
        transition: all 0.2s;
      }

      .example-query:hover {
        background: var(--primary-light);
        border-color: var(--primary);
        color: var(--primary);
      }

      /* Messages */
      .message {
        max-width: 80%;
        padding: 1rem;
        border-radius: 12px;
        line-height: 1.5;
      }

      .message.user {
        align-self: flex-end;
        background: var(--primary);
        color: white;
        border-bottom-right-radius: 4px;
      }

      .message.assistant {
        align-self: flex-start;
        background: var(--surface);
        border: 1px solid var(--border);
        border-bottom-left-radius: 4px;
      }

      .message .content {
        white-space: pre-wrap;
        word-break: break-word;
      }

      .message .sources {
        margin-top: 0.75rem;
        padding-top: 0.75rem;
        border-top: 1px solid var(--border);
        font-size: 0.8rem;
      }

      .message .sources-title {
        font-weight: 600;
        margin-bottom: 0.5rem;
        color: var(--text-secondary);
      }

      .source-item {
        display: flex;
        align-items: flex-start;
        gap: 0.5rem;
        padding: 0.375rem 0;
        position: relative;
      }

      .source-link {
        display: flex;
        align-items: flex-start;
        gap: 0.5rem;
        text-decoration: none;
        cursor: pointer;
        transition: all 0.2s;
        padding: 0.25rem 0.5rem;
        margin: -0.25rem -0.5rem;
        border-radius: 6px;
      }

      .source-link:hover {
        background: var(--primary-light);
      }

      .source-badge {
        font-size: 0.7rem;
        padding: 0.125rem 0.375rem;
        border-radius: 4px;
        background: var(--primary-light);
        color: var(--primary);
        font-weight: 500;
        text-transform: uppercase;
        flex-shrink: 0;
      }

      .source-preview {
        color: var(--text-secondary);
        font-size: 0.8rem;
      }

      .source-link:hover .source-preview {
        color: var(--primary);
      }

      /* Tooltip */
      .source-tooltip {
        position: absolute;
        left: 0;
        bottom: 100%;
        width: 320px;
        max-width: 90vw;
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: 8px;
        padding: 0.75rem;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 1000;
        display: none;
        margin-bottom: 0.5rem;
      }

      .source-item:hover .source-tooltip {
        display: block;
      }

      .tooltip-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 0.5rem;
        padding-bottom: 0.5rem;
        border-bottom: 1px solid var(--border);
      }

      .tooltip-type {
        font-size: 0.7rem;
        padding: 0.125rem 0.375rem;
        border-radius: 4px;
        background: var(--primary-light);
        color: var(--primary);
        font-weight: 500;
        text-transform: uppercase;
      }

      .tooltip-similarity {
        font-size: 0.75rem;
        color: var(--text-secondary);
      }

      .tooltip-content {
        font-size: 0.8rem;
        color: var(--text-primary);
        line-height: 1.5;
        max-height: 150px;
        overflow-y: auto;
        white-space: pre-wrap;
        word-break: break-word;
      }

      .tooltip-footer {
        margin-top: 0.5rem;
        padding-top: 0.5rem;
        border-top: 1px solid var(--border);
        font-size: 0.7rem;
        color: var(--text-secondary);
      }

      .tooltip-footer a {
        color: var(--primary);
        text-decoration: none;
      }

      .tooltip-footer a:hover {
        text-decoration: underline;
      }

      .message.loading {
        background: var(--surface);
        border: 1px solid var(--border);
      }

      .loading-dots {
        display: flex;
        gap: 0.25rem;
      }

      .loading-dots span {
        width: 8px;
        height: 8px;
        background: var(--text-secondary);
        border-radius: 50%;
        animation: bounce 1.4s infinite ease-in-out both;
      }

      .loading-dots span:nth-child(1) { animation-delay: -0.32s; }
      .loading-dots span:nth-child(2) { animation-delay: -0.16s; }

      @keyframes bounce {
        0%, 80%, 100% { transform: scale(0); }
        40% { transform: scale(1); }
      }

      /* Input Area */
      .chat-input-container {
        padding: 1rem 1.5rem;
        background: var(--surface);
        border-top: 1px solid var(--border);
      }

      .input-wrapper {
        display: flex;
        gap: 0.75rem;
        align-items: flex-end;
      }

      #chat-input {
        flex: 1;
        resize: none;
        border: 1px solid var(--border);
        border-radius: 12px;
        padding: 0.75rem 1rem;
        font-size: 0.9375rem;
        font-family: inherit;
        line-height: 1.5;
        max-height: 120px;
        background: var(--background);
        color: var(--text-primary);
      }

      #chat-input:focus {
        outline: none;
        border-color: var(--primary);
      }

      .btn-primary {
        background: var(--primary);
        color: white;
        border: none;
        border-radius: 12px;
        padding: 0.75rem 1rem;
        cursor: pointer;
        font-size: 1rem;
        transition: all 0.2s;
      }

      .btn-primary:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      .btn-primary:not(:disabled):hover {
        background: var(--primary-dark);
      }

      .input-hint {
        font-size: 0.75rem;
        color: var(--text-secondary);
        margin-top: 0.5rem;
        text-align: right;
      }

      /* Loading state */
      .loading-state {
        text-align: center;
        padding: 2rem;
        color: var(--text-secondary);
      }

      /* Responsive */
      @media (max-width: 768px) {
        .chat-sidebar {
          display: none;
        }

        .chat-container {
          height: calc(100vh - 60px);
        }

        .messages-container {
          padding: 1rem;
        }

        .message {
          max-width: 90%;
        }

        .chat-input-container {
          padding: 0.75rem;
        }
      }
    </style>

    <script>
      (function() {
        const API_BASE = '${apiBase}';
        let currentConversationId = null;
        let isLoading = false;

        // DOM Elements
        const conversationsList = document.getElementById('conversations-list');
        const messagesContainer = document.getElementById('messages-container');
        const chatInput = document.getElementById('chat-input');
        const sendBtn = document.getElementById('send-btn');
        const newChatBtn = document.getElementById('new-chat-btn');
        const deleteChatBtn = document.getElementById('delete-chat-btn');
        const chatTitle = document.getElementById('chat-title');
        const charCount = document.getElementById('char-count');

        // Initialize
        loadConversations();
        setupEventListeners();

        function setupEventListeners() {
          // Auto-resize textarea
          chatInput.addEventListener('input', function() {
            this.style.height = 'auto';
            this.style.height = Math.min(this.scrollHeight, 120) + 'px';
            charCount.textContent = this.value.length;
            sendBtn.disabled = !this.value.trim() || isLoading;
          });

          // Send on Enter (Shift+Enter for new line)
          chatInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              if (!sendBtn.disabled) sendMessage();
            }
          });

          sendBtn.addEventListener('click', sendMessage);
          newChatBtn.addEventListener('click', startNewChat);
          deleteChatBtn.addEventListener('click', deleteConversation);

          // Example queries
          document.querySelectorAll('.example-query').forEach(btn => {
            btn.addEventListener('click', function() {
              chatInput.value = this.textContent.replace(/"/g, '');
              chatInput.dispatchEvent(new Event('input'));
              chatInput.focus();
            });
          });
        }

        async function loadConversations() {
          try {
            const res = await fetch(API_BASE + '/api/chat/conversations?limit=50');
            const data = await res.json();

            if (data.success && data.conversations.length > 0) {
              conversationsList.innerHTML = data.conversations.map(conv => \`
                <div class="conversation-item" data-id="\${conv.id}">
                  <div class="title">\${conv.title || 'New Conversation'}</div>
                  <div class="date">\${formatDate(conv.last_message_at || conv.created_at)}</div>
                </div>
              \`).join('');

              // Add click handlers
              conversationsList.querySelectorAll('.conversation-item').forEach(item => {
                item.addEventListener('click', () => loadConversation(item.dataset.id));
              });
            } else {
              conversationsList.innerHTML = '<div class="loading-state">No conversations yet</div>';
            }
          } catch (err) {
            console.error('Load conversations error:', err);
            conversationsList.innerHTML = '<div class="loading-state">Failed to load</div>';
          }
        }

        async function loadConversation(id) {
          try {
            // Update UI
            document.querySelectorAll('.conversation-item').forEach(item => {
              item.classList.toggle('active', item.dataset.id === id);
            });

            const res = await fetch(API_BASE + '/api/chat/conversations/' + id);
            const data = await res.json();

            if (data.success) {
              currentConversationId = id;
              chatTitle.textContent = data.conversation.title || 'Conversation';
              deleteChatBtn.style.display = 'flex';

              renderMessages(data.messages);
            }
          } catch (err) {
            console.error('Load conversation error:', err);
          }
        }

        function renderMessages(messages) {
          if (!messages || messages.length === 0) {
            messagesContainer.innerHTML = '<div class="empty-state"><p>No messages yet</p></div>';
            return;
          }

          messagesContainer.innerHTML = messages.map(msg => {
            let html = \`<div class="message \${msg.role}"><div class="content">\${escapeHtml(msg.content)}</div>\`;

            if (msg.sources && msg.sources.length > 0) {
              html += \`
                <div class="sources">
                  <div class="sources-title">Sources:</div>
                  \${msg.sources.map(s => renderSource(s)).join('')}
                </div>
              \`;
            }

            html += '</div>';
            return html;
          }).join('');

          messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }

        async function sendMessage() {
          const message = chatInput.value.trim();
          if (!message || isLoading) return;

          isLoading = true;
          sendBtn.disabled = true;

          // Clear empty state and add user message
          const emptyState = messagesContainer.querySelector('.empty-state');
          if (emptyState) emptyState.remove();

          appendMessage('user', message);
          chatInput.value = '';
          chatInput.style.height = 'auto';
          charCount.textContent = '0';

          // Show loading
          const loadingDiv = document.createElement('div');
          loadingDiv.className = 'message assistant loading';
          loadingDiv.innerHTML = '<div class="loading-dots"><span></span><span></span><span></span></div>';
          messagesContainer.appendChild(loadingDiv);
          messagesContainer.scrollTop = messagesContainer.scrollHeight;

          try {
            const res = await fetch(API_BASE + '/api/chat', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                message,
                conversationId: currentConversationId
              })
            });

            const data = await res.json();
            loadingDiv.remove();

            if (data.success) {
              currentConversationId = data.conversationId;
              deleteChatBtn.style.display = 'flex';

              // Append assistant message with sources
              appendMessage('assistant', data.message, data.sources);

              // Refresh conversations list
              loadConversations();
            } else {
              appendMessage('assistant', 'Error: ' + (data.error || 'Failed to get response'));
            }
          } catch (err) {
            loadingDiv.remove();
            appendMessage('assistant', 'Error: Failed to connect to server');
            console.error('Send message error:', err);
          }

          isLoading = false;
          sendBtn.disabled = !chatInput.value.trim();
        }

        function appendMessage(role, content, sources = null) {
          const div = document.createElement('div');
          div.className = 'message ' + role;

          let html = '<div class="content">' + escapeHtml(content) + '</div>';

          if (sources && sources.length > 0) {
            html += \`
              <div class="sources">
                <div class="sources-title">Sources:</div>
                \${sources.map(s => renderSource(s)).join('')}
              </div>
            \`;
          }

          div.innerHTML = html;
          messagesContainer.appendChild(div);
          messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }

        function startNewChat() {
          currentConversationId = null;
          chatTitle.textContent = 'New Conversation';
          deleteChatBtn.style.display = 'none';

          document.querySelectorAll('.conversation-item').forEach(item => {
            item.classList.remove('active');
          });

          messagesContainer.innerHTML = \`
            <div class="empty-state">
              <div class="empty-icon">💬</div>
              <h3>Ask Your Memory</h3>
              <p>Start a conversation to search your saved memories using AI.</p>
            </div>
          \`;

          chatInput.focus();
        }

        async function deleteConversation() {
          if (!currentConversationId) return;
          if (!confirm('Delete this conversation?')) return;

          try {
            await fetch(API_BASE + '/api/chat/conversations/' + currentConversationId, {
              method: 'DELETE'
            });
            startNewChat();
            loadConversations();
          } catch (err) {
            console.error('Delete conversation error:', err);
          }
        }

        function formatDate(timestamp) {
          if (!timestamp) return '';
          const date = new Date(timestamp);
          const now = new Date();
          const diff = now - date;

          if (diff < 86400000) { // Less than 1 day
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          } else if (diff < 604800000) { // Less than 1 week
            return date.toLocaleDateString([], { weekday: 'short' });
          }
          return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
        }

        function escapeHtml(text) {
          const div = document.createElement('div');
          div.textContent = text;
          return div.innerHTML;
        }

        function renderSource(s) {
          const url = s.url || s.link || '';
          const preview = escapeHtml(s.preview || '');
          const fullPreview = escapeHtml(s.preview || s.text || '');
          const similarity = s.similarity ? Math.round(s.similarity * 100) + '%' : '';
          const type = s.type || 'memory';

          // Determine icon based on type
          let icon = '📄';
          if (type === 'tweet') icon = '🐦';
          else if (type === 'youtube_video') icon = '📺';
          else if (type === 'memory') icon = '🧠';
          else if (type === 'post') icon = '📝';

          // Build tooltip
          const tooltip = \`
            <div class="source-tooltip">
              <div class="tooltip-header">
                <span class="tooltip-type">\${icon} \${type}</span>
                <span class="tooltip-similarity">\${similarity} match</span>
              </div>
              <div class="tooltip-content">\${fullPreview}</div>
              \${url ? \`
                <div class="tooltip-footer">
                  <a href="\${escapeHtml(url)}" target="_blank" rel="noopener">Open source ↗</a>
                </div>
              \` : ''}
            </div>
          \`;

          // Render clickable source with tooltip
          if (url) {
            return \`
              <div class="source-item">
                <a href="\${escapeHtml(url)}" target="_blank" rel="noopener" class="source-link">
                  <span class="source-badge">\${icon} \${type}</span>
                  <span class="source-preview">\${preview}</span>
                </a>
                \${tooltip}
              </div>
            \`;
          } else {
            return \`
              <div class="source-item">
                <div class="source-link">
                  <span class="source-badge">\${icon} \${type}</span>
                  <span class="source-preview">\${preview}</span>
                </div>
                \${tooltip}
              </div>
            \`;
          }
        }
      })();
    </script>
  `;

  return baseLayout({
    title: 'Chat - My Memory',
    content,
  });
}
