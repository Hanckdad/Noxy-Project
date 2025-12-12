class NoxyApp {
    constructor() {
        this.currentUser = null;
        this.currentChatId = null;
        this.chats = [];
        this.baseURL = window.location.origin;
        
        this.initializeElements();
        this.setupEventListeners();
        this.loadFromLocalStorage();
        this.checkAuth();
    }

    initializeElements() {
        // Sidebar elements
        this.newChatBtn = document.getElementById('newChatBtn');
        this.chatHistory = document.getElementById('chatHistory');
        this.userInfo = document.getElementById('userInfo');
        this.loginBtn = document.getElementById('loginBtn');
        
        // Main content elements
        this.messageInput = document.getElementById('messageInput');
        this.sendBtn = document.getElementById('sendBtn');
        this.chatContainer = document.getElementById('chatContainer');
        this.currentChatTitle = document.getElementById('currentChatTitle');
        
        // Modal elements
        this.loginModal = document.getElementById('loginModal');
        this.tiktokModal = document.getElementById('tiktokModal');
        this.settingsModal = document.getElementById('settingsModal');
        this.closeModalButtons = document.querySelectorAll('.close-modal');
        
        // Form elements
        this.loginSubmitBtn = document.getElementById('loginSubmitBtn');
        this.registerBtn = document.getElementById('registerBtn');
        this.usernameInput = document.getElementById('username');
        this.passwordInput = document.getElementById('password');
        this.tiktokUrlInput = document.getElementById('tiktokUrl');
        this.downloadTikTokBtn = document.getElementById('downloadTikTokBtn');
        this.tiktokResult = document.getElementById('tiktokResult');
        this.videoPreview = document.getElementById('videoPreview');
        this.downloadOptions = document.getElementById('downloadOptions');
        
        // Action buttons
        this.tiktokDownloadBtn = document.getElementById('tiktokDownloadBtn');
        this.settingsBtn = document.getElementById('settingsBtn');
        this.logoutBtn = document.getElementById('logoutBtn');
        this.attachBtn = document.getElementById('attachBtn');
    }

    setupEventListeners() {
        // Chat actions
        this.newChatBtn.addEventListener('click', () => this.createNewChat());
        this.sendBtn.addEventListener('click', () => this.sendMessage());
        this.messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        // Modal controls
        this.loginBtn.addEventListener('click', () => this.showModal(this.loginModal));
        this.tiktokDownloadBtn.addEventListener('click', () => this.showModal(this.tiktokModal));
        this.settingsBtn.addEventListener('click', () => this.showModal(this.settingsModal));
        
        this.closeModalButtons.forEach(btn => {
            btn.addEventListener('click', () => this.closeAllModals());
        });

        // Modals click outside to close
        [this.loginModal, this.tiktokModal, this.settingsModal].forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) this.closeAllModals();
            });
        });

        // Authentication
        this.loginSubmitBtn.addEventListener('click', () => this.login());
        this.registerBtn.addEventListener('click', () => this.register());
        this.logoutBtn.addEventListener('click', () => this.logout());

        // TikTok downloader
        this.downloadTikTokBtn.addEventListener('click', () => this.downloadTikTok());

        // File attachment (placeholder)
        this.attachBtn.addEventListener('click', () => {
            alert('File attachment feature coming soon!');
        });
    }

    // Authentication Methods
    async checkAuth() {
        const token = localStorage.getItem('token');
        if (token) {
            try {
                const response = await fetch(`${this.baseURL}/api/auth/verify`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (response.ok) {
                    const user = await response.json();
                    this.currentUser = user;
                    this.updateUserUI();
                    this.loadUserChats();
                    return true;
                }
            } catch (error) {
                console.error('Auth check failed:', error);
            }
        }
        this.showModal(this.loginModal);
        return false;
    }

    async login() {
        const username = this.usernameInput.value.trim();
        const password = this.passwordInput.value;

        if (!username || !password) {
            alert('Please enter username and password');
            return;
        }

        try {
            const response = await fetch(`${this.baseURL}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();
            
            if (response.ok) {
                localStorage.setItem('token', data.token);
                this.currentUser = data.user;
                this.updateUserUI();
                this.closeAllModals();
                this.loadUserChats();
                alert('Login successful!');
            } else {
                alert(data.error || 'Login failed');
            }
        } catch (error) {
            console.error('Login error:', error);
            alert('Network error. Please try again.');
        }
    }

    async register() {
        const username = this.usernameInput.value.trim();
        const password = this.passwordInput.value;

        if (!username || !password) {
            alert('Please enter username and password');
            return;
        }

        if (password.length < 6) {
            alert('Password must be at least 6 characters');
            return;
        }

        try {
            const response = await fetch(`${this.baseURL}/api/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();
            
            if (response.ok) {
                alert('Registration successful! Please login.');
            } else {
                alert(data.error || 'Registration failed');
            }
        } catch (error) {
            console.error('Registration error:', error);
            alert('Network error. Please try again.');
        }
    }

    logout() {
        localStorage.removeItem('token');
        this.currentUser = null;
        this.chats = [];
        this.currentChatId = null;
        this.updateUserUI();
        this.closeAllModals();
        this.showModal(this.loginModal);
        this.clearChatUI();
    }

    updateUserUI() {
        if (this.currentUser) {
            const initials = this.currentUser.username.substring(0, 2).toUpperCase();
            this.userInfo.innerHTML = `
                <div class="avatar">${initials}</div>
                <div class="user-details">
                    <h4>${this.currentUser.username}</h4>
                    <p>${this.currentUser.email || 'User'}</p>
                </div>
            `;
            this.loginBtn.style.display = 'none';
        } else {
            this.userInfo.innerHTML = '';
            this.loginBtn.style.display = 'flex';
        }
    }

    // Chat Methods
    createNewChat() {
        if (!this.currentUser) {
            this.showModal(this.loginModal);
            return;
        }

        const chatId = Date.now().toString();
        const chat = {
            id: chatId,
            title: 'New Chat',
            messages: [],
            createdAt: new Date().toISOString(),
            userId: this.currentUser.id
        };

        this.chats.unshift(chat);
        this.currentChatId = chatId;
        this.saveToLocalStorage();
        this.updateChatHistory();
        this.clearChatUI();
        this.currentChatTitle.textContent = 'New Chat';
        
        // Show welcome message
        const welcomeHTML = `
            <div class="welcome-message">
                <div class="welcome-icon">🦇</div>
                <h2>Hello, I'm Noxy Voldigoard</h2>
                <p>How can I assist you today? Ask me anything!</p>
            </div>
        `;
        this.chatContainer.innerHTML = welcomeHTML;
    }

    async sendMessage() {
        if (!this.currentUser) {
            this.showModal(this.loginModal);
            return;
        }

        const message = this.messageInput.value.trim();
        if (!message) return;

        // Create new chat if none exists
        if (!this.currentChatId) {
            this.createNewChat();
        }

        // Add user message to UI
        this.addMessageToUI(message, 'user');
        this.messageInput.value = '';

        // Show loading indicator
        const loadingId = this.showLoadingMessage();

        try {
            // Send to backend AI
            const response = await fetch(`${this.baseURL}/api/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    message: message,
                    chatId: this.currentChatId
                })
            });

            const data = await response.json();

            // Remove loading indicator
            this.removeLoadingMessage(loadingId);

            if (response.ok) {
                // Add AI response to UI
                this.addMessageToUI(data.response, 'assistant');
                
                // Update chat in memory
                const chat = this.chats.find(c => c.id === this.currentChatId);
                if (chat) {
                    chat.messages.push(
                        { role: 'user', content: message },
                        { role: 'assistant', content: data.response }
                    );
                    
                    // Update title if first message
                    if (chat.messages.length === 2) {
                        chat.title = message.substring(0, 30) + (message.length > 30 ? '...' : '');
                        this.currentChatTitle.textContent = chat.title;
                        this.updateChatHistory();
                    }
                    
                    this.saveToLocalStorage();
                }
            } else {
                throw new Error(data.error || 'Failed to get response');
            }
        } catch (error) {
            console.error('Chat error:', error);
            this.removeLoadingMessage(loadingId);
            this.addMessageToUI('Sorry, I encountered an error. Please try again.', 'assistant');
        }
    }

    addMessageToUI(content, role) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${role}`;
        
        const avatar = role === 'user' 
            ? `<div class="message-avatar">${this.currentUser.username.substring(0, 1).toUpperCase()}</div>`
            : `<div class="message-avatar">🦇</div>`;
        
        messageDiv.innerHTML = `
            ${avatar}
            <div class="message-content">${this.escapeHtml(content)}</div>
        `;
        
        // Remove welcome message if it exists
        const welcomeMsg = this.chatContainer.querySelector('.welcome-message');
        if (welcomeMsg) {
            welcomeMsg.remove();
        }
        
        this.chatContainer.appendChild(messageDiv);
        this.scrollToBottom();
    }

    showLoadingMessage() {
        const loadingId = 'loading-' + Date.now();
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message assistant loading';
        messageDiv.id = loadingId;
        messageDiv.innerHTML = `
            <div class="message-avatar">🦇</div>
            <div class="message-content">
                <div class="loading-dots">
                    <span></span>
                    <span></span>
                    <span></span>
                </div>
            </div>
        `;
        
        this.chatContainer.appendChild(messageDiv);
        this.scrollToBottom();
        return loadingId;
    }

    removeLoadingMessage(id) {
        const element = document.getElementById(id);
        if (element) {
            element.remove();
        }
    }

    loadChat(chatId) {
        const chat = this.chats.find(c => c.id === chatId);
        if (!chat) return;

        this.currentChatId = chatId;
        this.currentChatTitle.textContent = chat.title;
        
        // Clear chat UI
        this.clearChatUI();
        
        // Load messages
        chat.messages.forEach(msg => {
            this.addMessageToUI(msg.content, msg.role);
        });
        
        // Update active state in sidebar
        this.updateChatHistory();
    }

    clearChatUI() {
        this.chatContainer.innerHTML = '';
    }

    updateChatHistory() {
        this.chatHistory.innerHTML = '';
        
        this.chats.forEach(chat => {
            const chatItem = document.createElement('div');
            chatItem.className = `chat-item ${chat.id === this.currentChatId ? 'active' : ''}`;
            chatItem.textContent = chat.title;
            chatItem.addEventListener('click', () => this.loadChat(chat.id));
            this.chatHistory.appendChild(chatItem);
        });
    }

    // TikTok Downloader
    async downloadTikTok() {
        const url = this.tiktokUrlInput.value.trim();
        if (!url) {
            alert('Please enter a TikTok URL');
            return;
        }

        try {
            this.downloadTikTokBtn.disabled = true;
            this.downloadTikTokBtn.textContent = 'Downloading...';

            const response = await fetch(`${this.baseURL}/api/tiktok`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url })
            });

            const data = await response.json();

            if (response.ok) {
                this.displayTikTokResult(data);
            } else {
                throw new Error(data.error || 'Download failed');
            }
        } catch (error) {
            console.error('TikTok download error:', error);
            alert('Failed to download TikTok: ' + error.message);
        } finally {
            this.downloadTikTokBtn.disabled = false;
            this.downloadTikTokBtn.textContent = 'Download';
        }
    }

    displayTikTokResult(data) {
        this.tiktokResult.style.display = 'block';
        
        // Video preview
        this.videoPreview.innerHTML = `
            <video controls style="max-width: 100%;">
                <source src="${data.play_url || data.wm_url}" type="video/mp4">
                Your browser does not support the video tag.
            </video>
            <h4>${data.title || 'TikTok Video'}</h4>
            <p>By: ${data.nickname || data.username || 'Unknown'}</p>
        `;

        // Download options
        let optionsHTML = '';
        
        if (data.play_url) {
            optionsHTML += `
                <a href="${data.play_url}" class="download-option" target="_blank" download>
                    <i class="fas fa-download"></i> No Watermark
                </a>
            `;
        }
        
        if (data.wm_url) {
            optionsHTML += `
                <a href="${data.wm_url}" class="download-option" target="_blank" download>
                    <i class="fas fa-download"></i> With Watermark
                </a>
            `;
        }
        
        if (data.hd_url) {
            optionsHTML += `
                <a href="${data.hd_url}" class="download-option" target="_blank" download>
                    <i class="fas fa-hd"></i> HD Quality
                </a>
            `;
        }
        
        if (data.music_url) {
            optionsHTML += `
                <a href="${data.music_url}" class="download-option" target="_blank" download>
                    <i class="fas fa-music"></i> Music Only
                </a>
            `;
        }

        this.downloadOptions.innerHTML = optionsHTML;
    }

    // Utility Methods
    showModal(modal) {
        this.closeAllModals();
        modal.classList.add('active');
    }

    closeAllModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.classList.remove('active');
        });
    }

    scrollToBottom() {
        this.chatContainer.scrollTop = this.chatContainer.scrollHeight;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    async loadUserChats() {
        if (!this.currentUser) return;

        try {
            const response = await fetch(`${this.baseURL}/api/chats`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });

            if (response.ok) {
                this.chats = await response.json();
                this.updateChatHistory();
            }
        } catch (error) {
            console.error('Failed to load chats:', error);
            this.loadFromLocalStorage();
        }
    }

    loadFromLocalStorage() {
        try {
            const savedChats = localStorage.getItem('noxy_chats');
            if (savedChats) {
                this.chats = JSON.parse(savedChats);
                this.updateChatHistory();
            }
        } catch (error) {
            console.error('Failed to load from localStorage:', error);
        }
    }

    saveToLocalStorage() {
        try {
            localStorage.setItem('noxy_chats', JSON.stringify(this.chats));
        } catch (error) {
            console.error('Failed to save to localStorage:', error);
        }
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.noxyApp = new NoxyApp();
});