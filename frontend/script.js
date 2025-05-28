(() => {
  const API_BASE = '/api';

  // Elements
  const userListEl = document.getElementById('user-list');
  const userSearchEl = document.getElementById('user-search');
  const chatHeaderEl = document.getElementById('chat-header');
  const chatMessagesEl = document.getElementById('chat-messages');
  const messageFormEl = document.getElementById('message-form');
  const messageInputEl = document.getElementById('message-input');
  const logoutBtn = document.getElementById('logout-btn');
  const currentUsernameEl = document.getElementById('current-username');

  // State
  let token = localStorage.getItem('token');
  let currentUsername = localStorage.getItem('username');
  let selectedUser = null;
  let pollingInterval = null;

  if (!token) {
    // Not authenticated, redirect to index.html
    window.location.href = '/';
  } else {
    currentUsernameEl.textContent = currentUsername;
  }

  logoutBtn.addEventListener('click', () => {
    localStorage.clear();
    window.location.href = '/';
  });

  // Fetch users from server based on search input
  async function fetchUsers(search = '') {
    try {
      const res = await fetch(`${API_BASE}/messages/users?search=${encodeURIComponent(search)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.status === 401 || res.status === 403) {
        logoutAndRedirect();
        return;
      }

      const users = await res.json();
      renderUserList(users);
    } catch (err) {
      console.error(err);
    }
  }

  // Render users in sidebar
  function renderUserList(users) {
    userListEl.innerHTML = '';
    if (users.length === 0) {
      userListEl.innerHTML = '<li><em>No users found</em></li>';
      return;
    }

    users.forEach(user => {
      const li = document.createElement('li');
      li.textContent = user.username;
      li.dataset.userId = user._id;
      if (selectedUser && selectedUser._id === user._id) {
        li.classList.add('selected');
      }

      li.addEventListener('click', () => {
        if (selectedUser && selectedUser._id === user._id) return; // already selected
        selectedUser = user;
        setSelectedUserUI();
        loadMessages();
      });

      userListEl.appendChild(li);
    });
  }

  // Update chat header and UI on user selection
  function setSelectedUserUI() {
    chatHeaderEl.innerHTML = `<h3>Chatting with <strong>${selectedUser.username}</strong></h3>`;
    messageFormEl.classList.remove('hidden');

    // Highlight selected user
    [...userListEl.children].forEach(li => {
      li.classList.toggle('selected', li.dataset.userId === selectedUser._id);
    });

    chatMessagesEl.innerHTML = '<p class="loading-msg">Loading messages...</p>';
  }

  // Load messages from backend
  async function loadMessages() {
    if (!selectedUser) return;

    try {
      const res = await fetch(`${API_BASE}/messages/history/${selectedUser._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.status === 401 || res.status === 403) {
        logoutAndRedirect();
        return;
      }

      const messages = await res.json();
      renderMessages(messages);
    } catch (err) {
      console.error(err);
    }
  }

  // Render chat messages
  function renderMessages(messages) {
    chatMessagesEl.innerHTML = '';

    if (messages.length === 0) {
      chatMessagesEl.innerHTML = '<p><em>No messages yet. Say hi!</em></p>';
      return;
    }

    messages.forEach(msg => {
      const bubble = document.createElement('div');
      bubble.classList.add('message-bubble');
      bubble.classList.add(msg.sender.username === currentUsername ? 'self' : 'other');
      bubble.innerHTML = `
        <div class="message-text">${escapeHtml(msg.text)}</div>
        <div class="message-timestamp">${formatTimestamp(msg.timestamp)}</div>
      `;
      chatMessagesEl.appendChild(bubble);
    });

    chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;
  }

  // Format timestamp nicely
  function formatTimestamp(ts) {
    const date = new Date(ts);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  // Escape HTML to prevent XSS
  function escapeHtml(text) {
    return text.replace(/[&<>"']/g, (match) => {
      const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;',
      };
      return map[match];
    });
  }

  // Handle send message form submit
  messageFormEl.addEventListener('submit', async e => {
    e.preventDefault();
    const text = messageInputEl.value.trim();
    if (!text || !selectedUser) return;

    try {
      const res = await fetch(`${API_BASE}/messages/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ recipientId: selectedUser._id, text }),
      });

      if (res.status === 401 || res.status === 403) {
        logoutAndRedirect();
        return;
      }

      const newMessage = await res.json();

      // Append new message bubble
      renderMessages([...getCurrentMessages(), newMessage]);

      messageInputEl.value = '';
      messageInputEl.focus();
    } catch (err) {
      console.error(err);
    }
  });

  // Maintain a local message cache for better performance
  let currentMessagesCache = [];

  function getCurrentMessages() {
    return currentMessagesCache;
  }

  function setCurrentMessages(messages) {
    currentMessagesCache = messages;
  }

  // Override renderMessages to update cache
  const originalRenderMessages = renderMessages;
  renderMessages = function(messages) {
    setCurrentMessages(messages);
    originalRenderMessages(messages);
  };

  // Poll messages every 3 seconds to simulate real-time
  function startPolling() {
    if (pollingInterval) clearInterval(pollingInterval);
    pollingInterval = setInterval(() => {
      if (selectedUser) loadMessages();
    }, 3000);
  }

  // Logout and redirect helper
  function logoutAndRedirect() {
    localStorage.clear();
    window.location.href = '/';
  }

  // Initial load
  fetchUsers();
  startPolling();

  // Search input debounce
  let debounceTimer = null;
  userSearchEl.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      fetchUsers(userSearchEl.value.trim());
    }, 300);
  });
})();
