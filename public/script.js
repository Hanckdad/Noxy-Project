// ====================== AUTH METHODS NEW VERSION ======================

// CHECK TOKEN
async checkAuth() {
    console.log('🔍 Checking authentication...');
    const token = localStorage.getItem('noxy_token');
    
    if (!token) {
        console.log('❌ No token found');
        this.currentUser = null;
        this.updateUserUI();
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
        
        const data = await response.json();
        
        if (response.ok && data.success) {
            console.log('✅ User authenticated:', data.user.username);
            this.currentUser = data.user;
            this.updateUserUI();
            await this.loadUserChats();
            return true;
        } else {
            console.log('❌ Token invalid:', data.error);
            localStorage.removeItem('noxy_token');
            this.currentUser = null;
            this.updateUserUI();
            return false;
        }
    } catch (error) {
        console.error('⚠️ Auth check error:', error);
        localStorage.removeItem('noxy_token');
        this.currentUser = null;
        this.updateUserUI();
        return false;
    }
}

// LOGIN
async handleLogin() {
    const username = this.loginUsernameInput.value.trim();
    const password = this.loginPasswordInput.value.trim();
    
    if (!username || !password) {
        this.showAlert('Please enter both username and password', 'error');
        return;
    }
    
    this.loginSubmitBtn.disabled = true;
    this.loginSubmitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in...';
    
    try {
        const response = await fetch(`${this.baseURL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        
        if (data.success && data.token) {
            localStorage.setItem('noxy_token', data.token);
            this.currentUser = data.user;

            this.updateUserUI();
            this.closeAllModals();

            this.loginUsernameInput.value = '';
            this.loginPasswordInput.value = '';

            await this.loadUserChats();

            this.showAlert(`Welcome back, ${data.user.displayName}! 🦇`, 'success');

            if (this.chats.length > 0) {
                this.loadChat(this.chats[0].id);
            } else {
                this.createNewChat();
            }

            console.log('✅ Login successful');

        } else {
            this.showAlert(data.error || 'Login failed. Please check your credentials.', 'error');
        }
    } catch (error) {
        console.error('⚠️ Login error:', error);
        this.showAlert('Network error. Please check your connection.', 'error');
    } finally {
        this.loginSubmitBtn.disabled = false;
        this.loginSubmitBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Login Now';
    }
}

// REGISTER
async handleRegister() {
    const username = this.registerUsernameInput.value.trim();
    const password = this.registerPasswordInput.value.trim();
    const email = this.registerEmailInput.value.trim() || `${username}@noxy.ai`;
    
    if (!username || !password) {
        this.showAlert('Username and password are required', 'error');
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
    
    this.registerSubmitBtn.disabled = true;
    this.registerSubmitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating account...';
    
    try {
        const response = await fetch(`${this.baseURL}/api/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password, email })
        });
        
        const data = await response.json();
        
        if (data.success && data.token) {
            localStorage.setItem('noxy_token', data.token);

            this.currentUser = data.user;
            this.updateUserUI();
            this.closeAllModals();

            this.registerUsernameInput.value = '';
            this.registerPasswordInput.value = '';
            this.registerEmailInput.value = '';

            this.showAlert(`Account created! Welcome, ${data.user.displayName}! 🎉`, 'success');

            setTimeout(() => this.createNewChat(), 500);

            console.log('✅ Registration success');
        } else {
            this.showAlert(data.error || 'Registration failed.', 'error');
        }
    } catch (error) {
        console.error('⚠️ Register error:', error);
        this.showAlert('Network error. Please try again.', 'error');
    } finally {
        this.registerSubmitBtn.disabled = false;
        this.registerSubmitBtn.innerHTML = '<i class="fas fa-user-plus"></i> Create Account';
    }
}

// DEMO ACCOUNT
useDemoAccount(username, password) {
    this.switchAuthTab('login');
    this.loginUsernameInput.value = username;
    this.loginPasswordInput.value = password;
    this.loginPasswordInput.focus();
    this.showAlert(`Demo account loaded! Click "Login Now"`, 'info');
}

// REGISTER VALIDATOR
validateRegisterForm() {
    const username = this.registerUsernameInput.value.trim();
    const password = this.registerPasswordInput.value.trim();

    if (username.length > 0) {
        if (username.length < 3) {
            this.usernameHint.textContent = '❌ Min 3 characters';
            this.usernameHint.className = 'form-hint invalid';
        } else if (!/^[a-zA-Z0-9_]+$/.test(username)) {
            this.usernameHint.textContent = '❌ Only letters, numbers, _';
            this.usernameHint.className = 'form-hint invalid';
        } else {
            this.usernameHint.textContent = '✅ Good';
            this.usernameHint.className = 'form-hint valid';
        }
    } else {
        this.usernameHint.textContent = '';
        this.usernameHint.className = 'form-hint';
    }

    if (password.length > 0) {
        if (password.length < 6) {
            this.passwordHint.textContent = '❌ Min 6 chars';
            this.passwordHint.className = 'form-hint invalid';
        } else {
            this.passwordHint.textContent = '✅ Strong';
            this.passwordHint.className = 'form-hint valid';
        }
    } else {
        this.passwordHint.textContent = '';
        this.passwordHint.className = 'form-hint';
    }
}

// SWITCH TABS
switchAuthTab(tab) {
    this.loginTabBtn.classList.toggle('active', tab === 'login');
    this.registerTabBtn.classList.toggle('active', tab === 'register');

    this.loginForm.classList.toggle('active', tab === 'login');
    this.registerForm.classList.toggle('active', tab === 'register');

    this.usernameHint.textContent = '';
    this.passwordHint.textContent = '';
    this.usernameHint.className = 'form-hint';
    this.passwordHint.className = 'form-hint';

    if (tab === 'login') {
        this.registerUsernameInput.value = '';
        this.registerPasswordInput.value = '';
        this.registerEmailInput.value = '';
    }
}

// LOGOUT
logout() {
    console.log('👋 Logging out...');
    localStorage.removeItem('noxy_token');

    this.currentUser = null;
    this.chats = [];
    this.currentChatId = null;

    this.updateUserUI();
    this.closeAllModals();
    this.clearChatUI();

    this.chatContainer.innerHTML = `
        <div class="welcome-message">
            <div class="welcome-icon">🦇</div>
            <h2>Hello, I'm Noxy Voldigoard</h2>
            <p>Your AI assistant with web search capabilities</p>
            <button class="btn-primary" id="getStartedBtn">
                <i class="fas fa-rocket"></i> Get Started
            </button>
        </div>
    `;

    document.getElementById('getStartedBtn')?.addEventListener('click', () => {
        this.showModal(this.loginModal);
    });

    this.showAlert('Logged out successfully', 'success');
}

// UPDATE USER INFO UI
updateUserUI() {
    const userInfo = document.getElementById('userInfo');
    const loginBtn = document.getElementById('loginBtn');
    
    if (this.currentUser) {
        const initials = this.currentUser.username.substring(0, 2).toUpperCase();

        userInfo.innerHTML = `
            <div class="avatar" style="background-color: ${this.currentUser.avatarColor || '#2563eb'}">
                ${initials}
            </div>
            <div class="user-details">
                <h4>${this.currentUser.displayName}</h4>
                <p>${this.currentUser.role || 'User'}</p>
            </div>
            <div class="user-actions">
                <button class="logout-btn" id="userLogoutBtn">
                    <i class="fas fa-sign-out-alt"></i>
                </button>
            </div>
        `;

        loginBtn.style.display = 'none';

        document.getElementById('userLogoutBtn')?.addEventListener('click', () => this.logout());
    } else {
        userInfo.innerHTML = `
            <div class="avatar" style="background-color:#6b7280">
                <i class="fas fa-user"></i>
            </div>
            <div class="user-details">
                <h4>Guest User</h4>
                <p>Not logged in</p>
            </div>
        `;

        loginBtn.style.display = 'flex';
        loginBtn.onclick = () => this.showModal(this.loginModal);
    }
}

// NICE ALERT
showAlert(message, type = 'info') {
    const old = document.querySelector('.alert-message');
    if (old) old.remove();

    const alert = document.createElement('div');
    alert.className = `alert-message alert-${type}`;

    const icons = {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️'
    };

    alert.innerHTML = `
        <div class="alert-content">
            <span class="alert-icon">${icons[type] || 'ℹ️'}</span>
            <span class="alert-text">${message}</span>
        </div>
        <button class="alert-close"><i class="fas fa-times"></i></button>
    `;

    document.body.appendChild(alert);

    setTimeout(() => alert.remove(), 5000);

    alert.querySelector('.alert-close').addEventListener('click', () => alert.remove());
}