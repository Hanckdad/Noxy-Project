class NoxyApp {
    constructor() {
        this.currentUser = null;
        this.currentChatId = null;
        this.chats = [];
        this.baseURL = window.location.origin;
        
        // Initialize immediately
        this.init();
    }

    async init() {
        console.log('🚀 Initializing Noxy App...');
        await this.initializeElements();
        this.setupEventListeners();
        await this.checkAuth();
        this.updateUI();
    }

    async initializeElements() {
        console.log('🔧 Initializing UI elements...');
        
        // Sidebar elements
        this.sidebar = document.querySelector('.sidebar');
        this.newChatBtn = document.getElementById('newChatBtn');
        this.chatHistory = document.getElementById('chatHistory');
        this.userInfo = document.getElementById('userInfo');
        this.loginBtn = document.getElementById('loginBtn');
        
        // Main content elements
        this.mainContent = document.querySelector('.main-content');
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
        this.loginUsernameInput = document.getElementById('loginUsername');
        this.loginPasswordInput = document.getElementById('loginPassword');
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
        
        console.log('✅ UI elements initialized');
    }

    setupEventListeners() {
        console.log('🔗 Setting up event listeners...');
        
        // Chat actions
        if (this.newChatBtn) {
            this.newChatBtn.addEventListener('click', () => this.createNewChat());
            console.log('✓ New Chat button listener added');
        }
        
        if (this.sendBtn) {
            this.sendBtn.addEventListener('click', () => this.sendMessage());
            console.log('✓ Send button listener added');
        }
        
        if (this.messageInput) {
            this.messageInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.sendMessage();
                }
            });
            console.log('✓ Message input listener added');
        }

        // Modal controls
        if (this.loginBtn) {
            this.loginBtn.addEventListener('click', () => this.showModal(this.loginModal));
            console.log('✓ Login button listener added');
        }
        
        if (this.tiktokDownloadBtn) {
            this.tiktokDownloadBtn.addEventListener('click', () => this.showModal(this.tiktokModal));
            console.log('✓ TikTok button listener added');
        }
        
        if (this.settingsBtn) {
            this.settingsBtn.addEventListener('click', () => this.showModal(this.settingsModal));
            console.log('✓ Settings button listener added');
        }
        
        // Close modal buttons
        this.closeModalButtons.forEach(btn => {
            btn.addEventListener('click', () => this.closeAllModals());
        });
        
        // Close modals when clicking outside
        [this.loginModal, this.tiktokModal, this.settingsModal].forEach(modal => {
            if (modal) {
                modal.addEventListener('click', (e) => {
                    if (e.target === modal) this.closeAllModals();
                });
            }
        });

        // Authentication
        if (this.loginSubmitBtn) {
            this.loginSubmitBtn.addEventListener('click', () => this.login());
            console.log('✓ Login submit listener added');
        }
        
        if (this.registerBtn) {
            this.registerBtn.addEventListener('click', () => this.register());
            console.log('✓ Register button listener added');
        }
        
        if (this.logoutBtn) {
            this.logoutBtn.addEventListener('click', () => this.logout());
            console.log('✓ Logout button listener added');
        }

        // TikTok downloader
        if (this.downloadTikTokBtn) {
            this.downloadTikTokBtn.addEventListener('click', () => this.downloadTikTok());
            console.log('✓ TikTok download listener added');
        }

        // File attachment
        if (this.attachBtn) {
            this.attachBtn.addEventListener('click', () => {
                this.showAlert('File attachment feature coming soon!', 'info');
            });
            console.log('✓ Attach button listener added');
        }
        
        console.log('✅ All event listeners setup complete');
    }

    // ================= AUTHENTICATION =================
    async checkAuth() {
        console.log('🔐 Checking authentication...');
        const token = localStorage.getItem('noxy_token');
        
        if (!token) {
            console.log('❌ No authentication token found');
            this.currentUser = null;
            return false;
        }
        
        try {
            const response = await fetch(`${this.baseURL}/api/auth/verify`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error('Verification failed');
            }
            
            const data = await response.json();
            
            if (data.success) {
                this.currentUser = data.user;
                console.log('✅ User authenticated:', this.currentUser.username);
                return true;
            } else {
                localStorage.removeItem('noxy_token');
                this.currentUser = null;
                console.log('❌ Token verification failed');
                return false;
            }
        } catch (error) {
            console.error('⚠️ Auth check error:', error);
            localStorage.removeItem('noxy_token');
            this.currentUser = null;
            return false;
        }
    }

    async login() {
        const username = this.loginUsernameInput?.value?.trim() || '';
        const password = this.loginPasswordInput?.value || '';
        
        if (!username || !password) {
            this.showAlert('Please enter username and password', 'error');
            return;
        }
        
        console.log('🔐 Attempting login for:', username);
        
        try {
            // Show loading state
            const originalText = this.loginSubmitBtn.innerHTML;
            this.loginSubmitBtn.disabled = true;
            this.loginSubmitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in...';
            
            const response = await fetch(`${this.baseURL}/api/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });
            
            const data = await response.json();
            
            if (data.success && data.token) {
                // Save token
                localStorage.setItem('noxy_token', data.token);
                
                // Set current user
                this.currentUser = data.user;
                
                // Update UI
                this.updateUI();
                this.closeAllModals();
                
                // Clear form
                if (this.loginUsernameInput) this.loginUsernameInput.value = '';
                if (this.loginPasswordInput) this.loginPasswordInput.value = '';
                
                // Load user chats
                await this.loadUserChats();
                
                // Show success
                this.showAlert(`Welcome back, ${data.user.displayName}! 🦇`, 'success');
                
                // Create initial chat if none exists
                if (this.chats.length === 0) {
                    this.createNewChat();
                }
            } else {
                this.showAlert(data.error || 'Login failed', 'error');
            }
        } catch (error) {
            console.error('Login error:', error);
            this.showAlert('Network error. Please try again.', 'error');
        } finally {
            // Restore button state
            if (this.loginSubmitBtn) {
                this.loginSubmitBtn.disabled = false;
                this.loginSubmitBtn.innerHTML = originalText || 'Login';
            }
        }
    }

    async register() {
        const username = this.loginUsernameInput?.value?.trim() || '';
        const password = this.loginPasswordInput?.value || '';
        
        if (!username || !password) {
            this.showAlert('Please enter username and password', 'error');
            return;
        }
        
        if (username.length < 3) {
            this.showAlert('Username must be at least 3 characters', 'error');
            return;
        }
        
        if (password.length < 6) {
            this.showAlert('Password must be at least 6 characters', 'error');
            return;
        }
        
        console.log('📝 Attempting registration for:', username);
        
        try {
            // Show loading state
            const originalText = this.registerBtn.innerHTML;
            this.registerBtn.disabled = true;
            this.registerBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating...';
            
            const response = await fetch(`${this.baseURL}/api/auth/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });
            
            const data = await response.json();
            
            if (data.success && data.token) {
                // Save token
                localStorage.setItem('noxy_token', data.token);
                
                // Set current user
                this.currentUser = data.user;
                
                // Update UI
                this.updateUI();
                this.closeAllModals();
                
                // Clear form
                if (this.loginUsernameInput) this.loginUsernameInput.value = '';
                if (this.loginPasswordInput) this.loginPasswordInput.value = '';
                
                // Show success
                this.showAlert(`Account created! Welcome, ${data.user.displayName}! 🎉`, 'success');
                
                // Create welcome chat
                setTimeout(() => {
                    this.createNewChat();
                }, 1000);
            } else {
                this.showAlert(data.error || 'Registration failed', 'error');
            }
        } catch (error) {
            console.error('Registration error:', error);
            this.showAlert('Network error. Please try again.', 'error');
        } finally {
            // Restore button state
            if (this.registerBtn) {
                this.registerBtn.disabled = false;
                this.registerBtn.innerHTML = originalText || 'Create Account';
            }
        }
    }

    logout() {
        console.log('👋 Logging out...');
        
        // Clear token
        localStorage.removeItem('noxy_token');
        
        // Clear user data
        this.currentUser = null;
        this.chats = [];
        this.currentChatId = null;
        
        // Update UI
        this.updateUI();
        this.closeAllModals();
        
        // Clear chat UI
        this.clearChatUI();
        
        // Show welcome message
        this.showWelcomeMessage();
        
        // Show logout message
        this.showAlert('Logged out successfully', 'success');
        
        console.log('✅ Logout complete');
    }

    // ================= CHAT FUNCTIONS =================
    createNewChat() {
        console.log('💬 Creating new chat...');
        
        if (!this.currentUser) {
            this.showModal(this.loginModal);
            this.showAlert('Please login to create a new chat', 'warning');
            return;
        }
        
        const chatId = Date.now().toString();
        const chat = {
            id: chatId,
            title: 'New Chat',
            messages: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            userId: this.currentUser.id
        };
        
        this.chats.unshift(chat);
        this.currentChatId = chatId;
        this.saveToLocalStorage();
        this.updateChatHistory();
        this.clearChatUI();
        this.currentChatTitle.textContent = 'New Chat';
        
        // Show welcome message
        this.showWelcomeMessage();
        
        console.log('✅ New chat created:', chatId);
    }

    async sendMessage() {
        const message = this.messageInput?.value?.trim() || '';
        
        if (!message) {
            this.showAlert('Please enter a message', 'warning');
            return;
        }
        
        if (!this.currentUser) {
            this.showModal(this.loginModal);
            this.showAlert('Please login to send messages', 'warning');
            return;
        }
        
        // Create new chat if none exists
        if (!this.currentChatId) {
            this.createNewChat();
        }
        
        // Add user message to UI
        this.addMessageToUI(message, 'user');
        
        // Clear input
        if (this.messageInput) {
            this.messageInput.value = '';
            this.messageInput.focus();
        }
        
        // Show loading indicator
        const loadingId = this.showLoadingMessage();
        
        try {
            // Send to backend AI
            const response = await fetch(`${this.baseURL}/api/chat/message`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('noxy_token')}`
                },
                body: JSON.stringify({
                    chatId: this.currentChatId,
                    message: message,
                    newChat: !this.currentChatId
                })
            });
            
            const data = await response.json();
            
            // Remove loading indicator
            this.removeLoadingMessage(loadingId);
            
            if (data.success) {
                // Add AI response to UI
                if (data.aiResponse) {
                    this.addMessageToUI(data.aiResponse, 'assistant');
                }
                
                // Update chat in memory
                if (data.chat) {
                    const chatIndex = this.chats.findIndex(c => c.id === data.chat.id);
                    if (chatIndex > -1) {
                        this.chats[chatIndex] = data.chat;
                    } else {
                        this.chats.unshift(data.chat);
                    }
                    
                    // Update title
                    this.currentChatTitle.textContent = data.chat.title;
                    this.updateChatHistory();
                }
                
                this.saveToLocalStorage();
            } else {
                throw new Error(data.error || 'Failed to get response');
            }
        } catch (error) {
            console.error('Chat error:', error);
            this.removeLoadingMessage(loadingId);
            this.addMessageToUI('Sorry, I encountered an error. Please try again.', 'assistant');
            this.showAlert('Failed to get response: ' + error.message, 'error');
        }
    }

    addMessageToUI(content, role) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${role}`;
        
        const avatar = role === 'user' 
            ? `<div class="message-avatar" style="background-color: ${this.currentUser?.avatarColor || '#2563eb'}">
                ${this.currentUser?.username?.substring(0, 1).toUpperCase() || 'U'}
               </div>`
            : `<div class="message-avatar">🦇</div>`;
        
        const escapedContent = this.escapeHtml(content);
        const formattedContent = escapedContent.replace(/\n/g, '<br>');
        
        messageDiv.innerHTML = `
            ${avatar}
            <div class="message-content">${formattedContent}</div>
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
        if (this.chatContainer) {
            this.chatContainer.innerHTML = '';
        }
    }

    updateChatHistory() {
        if (!this.chatHistory) return;
        
        this.chatHistory.innerHTML = '';
        
        this.chats.forEach(chat => {
            const chatItem = document.createElement('div');
            chatItem.className = `chat-item ${chat.id === this.currentChatId ? 'active' : ''}`;
            chatItem.textContent = chat.title || 'Untitled Chat';
            chatItem.addEventListener('click', () => this.loadChat(chat.id));
            this.chatHistory.appendChild(chatItem);
        });
    }

    // ================= TIKTOK DOWNLOADER =================
    async downloadTikTok() {
        const url = this.tiktokUrlInput?.value?.trim() || '';
        
        if (!url) {
            this.showAlert('Please enter a TikTok URL', 'error');
            return;
        }
        
        console.log('⬇️ Downloading TikTok:', url);
        
        try {
            // Show loading state
            const originalText = this.downloadTikTokBtn.innerHTML;
            this.downloadTikTokBtn.disabled = true;
            this.downloadTikTokBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Downloading...';
            
            const response = await fetch(`${this.baseURL}/api/tiktok`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ url })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                this.displayTikTokResult(data);
                this.showAlert('TikTok video loaded successfully!', 'success');
            } else {
                throw new Error(data.error || 'Download failed');
            }
        } catch (error) {
            console.error('TikTok download error:', error);
            this.showAlert('Failed to download TikTok: ' + error.message, 'error');
        } finally {
            // Restore button state
            if (this.downloadTikTokBtn) {
                this.downloadTikTokBtn.disabled = false;
                this.downloadTikTokBtn.innerHTML = originalText || 'Download';
            }
        }
    }

    displayTikTokResult(data) {
        if (!this.tiktokResult || !this.videoPreview || !this.downloadOptions) return;
        
        this.tiktokResult.style.display = 'block';
        
        // Video preview
        this.videoPreview.innerHTML = '';
        if (data.play_url || data.wm_url) {
            const videoUrl = data.play_url || data.wm_url;
            const video = document.createElement('video');
            video.controls = true;
            video.style.maxWidth = '100%';
            video.style.borderRadius = '8px';
            video.style.marginBottom = '16px';
            
            const source = document.createElement('source');
            source.src = videoUrl;
            source.type = 'video/mp4';
            video.appendChild(source);
            
            this.videoPreview.appendChild(video);
        }
        
        if (data.title) {
            const title = document.createElement('h4');
            title.textContent = data.title;
            title.style.margin = '10px 0';
            this.videoPreview.appendChild(title);
        }
        
        if (data.nickname || data.username) {
            const author = document.createElement('p');
            author.textContent = `By: ${data.nickname || data.username || 'Unknown'}`;
            author.style.color = 'var(--text-secondary)';
            this.videoPreview.appendChild(author);
        }
        
        // Download options
        this.downloadOptions.innerHTML = '';
        
        const options = [
            { url: data.play_url, label: 'No Watermark', icon: 'fa-download' },
            { url: data.wm_url, label: 'With Watermark', icon: 'fa-tiktok' },
            { url: data.hd_url, label: 'HD Quality', icon: 'fa-hd' },
            { url: data.music_url, label: 'Music Only', icon: 'fa-music' }
        ];
        
        options.forEach(option => {
            if (option.url) {
                const a = document.createElement('a');
                a.href = option.url;
                a.className = 'download-option';
                a.target = '_blank';
                a.download = true;
                a.innerHTML = `<i class="fas ${option.icon}"></i> ${option.label}`;
                this.downloadOptions.appendChild(a);
            }
        });
    }

    // ================= UTILITY FUNCTIONS =================
    showModal(modal) {
        if (!modal) return;
        
        this.closeAllModals();
        modal.classList.add('active');
        modal.style.display = 'flex';
        console.log('📱 Modal shown:', modal.id);
    }

    closeAllModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.classList.remove('active');
            modal.style.display = 'none';
        });
        console.log('📱 All modals closed');
    }

    scrollToBottom() {
        if (this.chatContainer) {
            this.chatContainer.scrollTop = this.chatContainer.scrollHeight;
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    async loadUserChats() {
        if (!this.currentUser) return;
        
        const token = localStorage.getItem('noxy_token');
        if (!token) return;
        
        try {
            const response = await fetch(`${this.baseURL}/api/chat`, {
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    this.chats = data.chats || [];
                    this.updateChatHistory();
                }
            }
        } catch (error) {
            console.error('Failed to load chats:', error);
            this.loadFromLocalStorage();
        }
    }

    async loadFromLocalStorage() {
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

    updateUI() {
        // Update user info
        if (this.userInfo) {
            if (this.currentUser) {
                const initials = this.currentUser.username?.substring(0, 2).toUpperCase() || 'U';
                const avatarColor = this.currentUser.avatarColor || '#2563eb';
                const displayName = this.currentUser.displayName || this.currentUser.username || 'User';
                
                this.userInfo.innerHTML = `
                    <div class="avatar" style="background-color: ${avatarColor}">
                        ${initials}
                    </div>
                    <div class="user-details">
                        <h4>${displayName}</h4>
                        <p>${this.currentUser.role || 'User'}</p>
                    </div>
                `;
                
                if (this.loginBtn) {
                    this.loginBtn.style.display = 'none';
                }
            } else {
                this.userInfo.innerHTML = `
                    <div class="avatar" style="background-color: #6b7280">
                        <i class="fas fa-user"></i>
                    </div>
                    <div class="user-details">
                        <h4>Guest</h4>
                        <p>Not logged in</p>
                    </div>
                `;
                
                if (this.loginBtn) {
                    this.loginBtn.style.display = 'flex';
                    this.loginBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Login';
                    this.loginBtn.onclick = () => this.showModal(this.loginModal);
                }
            }
        }
        
        // Update chat history
        this.updateChatHistory();
        
        // Show welcome message if no chat is active
        if (!this.currentChatId && this.chats.length === 0) {
            this.showWelcomeMessage();
        }
    }

    showWelcomeMessage() {
        if (!this.chatContainer) return;
        
        this.chatContainer.innerHTML = `
            <div class="welcome-message">
                <div class="welcome-icon">🦇</div>
                <h2>${this.currentUser ? `Welcome, ${this.currentUser.displayName || this.currentUser.username}!` : 'Hello, I\'m Noxy Voldigoard'}</h2>
                <p>How can I assist you today? Ask me anything!</p>
                ${!this.currentUser ? `
                    <div class="welcome-actions">
                        <button class="btn-primary" id="welcomeLoginBtn">
                            <i class="fas fa-sign-in-alt"></i> Login to Start Chatting
                        </button>
                    </div>
                ` : ''}
            </div>
        `;
        
        // Add event listener to login button in welcome message
        const welcomeLoginBtn = document.getElementById('welcomeLoginBtn');
        if (welcomeLoginBtn) {
            welcomeLoginBtn.addEventListener('click', () => {
                this.showModal(this.loginModal);
            });
        }
    }

    showAlert(message, type = 'info') {
        // Remove existing alerts
        const existingAlerts = document.querySelectorAll('.alert-message');
        existingAlerts.forEach(alert => alert.remove());
        
        // Create alert element
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert-message alert-${type}`;
        
        const icons = {
            'success': '✅',
            'error': '❌',
            'warning': '⚠️',
            'info': 'ℹ️'
        };
        
        alertDiv.innerHTML = `
            <div class="alert-content">
                <span class="alert-icon">${icons[type] || 'ℹ️'}</span>
                <span class="alert-text">${message}</span>
            </div>
            <button class="alert-close">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        // Add to body
        document.body.appendChild(alertDiv);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            if (alertDiv.parentNode) {
                alertDiv.remove();
            }
        }, 5000);
        
        // Close button
        alertDiv.querySelector('.alert-close').addEventListener('click', () => {
            alertDiv.remove();
        });
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 DOM Content Loaded');
    window.noxyApp = new NoxyApp();
});

// Also initialize when window loads
window.addEventListener('load', () => {
    console.log('🔄 Window Loaded');
    if (!window.noxyApp) {
        window.noxyApp = new NoxyApp();
    }
});