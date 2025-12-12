// GANTI SEMUA AUTH METHODS DI DALAM CLASS NoxyApp:

// Authentication Methods - FIXED VERSION
async checkAuth() {
    const token = localStorage.getItem('token');
    if (token) {
        try {
            const response = await fetch(`${this.baseURL}/api/auth/verify`, {
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.currentUser = data.user;
                this.updateUserUI();
                await this.loadUserChats();
                return true;
            } else {
                // Token invalid, remove it
                localStorage.removeItem('token');
            }
        } catch (error) {
            console.error('Auth check failed:', error);
            localStorage.removeItem('token');
        }
    }
    
    // Not logged in
    this.currentUser = null;
    this.updateUserUI();
    return false;
}

async login() {
    const username = this.usernameInput.value.trim();
    const password = this.passwordInput.value;

    if (!username || !password) {
        this.showAlert('Please enter username and password', 'error');
        return;
    }

    try {
        this.loginSubmitBtn.disabled = true;
        this.loginSubmitBtn.textContent = 'Logging in...';

        const response = await fetch(`${this.baseURL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();
        
        if (data.success) {
            // Save token
            localStorage.setItem('token', data.token);
            
            // Set current user
            this.currentUser = data.user;
            this.updateUserUI();
            
            // Close modal
            this.closeAllModals();
            
            // Load user chats
            await this.loadUserChats();
            
            // Show success message
            this.showAlert(`Welcome back, ${data.user.displayName}! 🦇`, 'success');
            
            // Clear form
            this.usernameInput.value = '';
            this.passwordInput.value = '';
        } else {
            this.showAlert(data.error || 'Login failed', 'error');
        }
    } catch (error) {
        console.error('Login error:', error);
        this.showAlert('Network error. Please try again.', 'error');
    } finally {
        this.loginSubmitBtn.disabled = false;
        this.loginSubmitBtn.textContent = 'Login';
    }
}

async register() {
    const username = this.usernameInput.value.trim();
    const password = this.passwordInput.value;

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

    try {
        this.registerBtn.disabled = true;
        this.registerBtn.textContent = 'Creating account...';

        const response = await fetch(`${this.baseURL}/api/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();
        
        if (data.success) {
            // Save token
            localStorage.setItem('token', data.token);
            
            // Set current user
            this.currentUser = data.user;
            this.updateUserUI();
            
            // Close modal
            this.closeAllModals();
            
            // Clear form
            this.usernameInput.value = '';
            this.passwordInput.value = '';
            
            // Show success message
            this.showAlert(`Account created successfully! Welcome, ${data.user.displayName}! 🎉`, 'success');
            
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
        this.registerBtn.disabled = false;
        this.registerBtn.textContent = 'Create Account';
    }
}

logout() {
    localStorage.removeItem('token');
    this.currentUser = null;
    this.chats = [];
    this.currentChatId = null;
    this.updateUserUI();
    this.closeAllModals();
    this.clearChatUI();
    
    // Show welcome screen
    this.chatContainer.innerHTML = `
        <div class="welcome-message">
            <div class="welcome-icon">🦇</div>
            <h2>Hello, I'm Noxy Voldigoard</h2>
            <p>How can I assist you today? Ask me anything!</p>
        </div>
    `;
    
    // Show login modal
    setTimeout(() => {
        this.showModal(this.loginModal);
    }, 500);
    
    this.showAlert('Logged out successfully', 'success');
}

// Add this helper method to show alerts
showAlert(message, type = 'info') {
    // Remove existing alerts
    const existingAlert = document.querySelector('.alert-message');
    if (existingAlert) {
        existingAlert.remove();
    }
    
    // Create alert element
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert-message alert-${type}`;
    alertDiv.innerHTML = `
        <span>${message}</span>
        <button class="alert-close">&times;</button>
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

// Update the updateUserUI method
updateUserUI() {
    if (this.currentUser) {
        const initials = this.currentUser.username.substring(0, 2).toUpperCase();
        this.userInfo.innerHTML = `
            <div class="avatar" style="background-color: ${this.currentUser.avatarColor || '#2563eb'}">
                ${initials}
            </div>
            <div class="user-details">
                <h4>${this.currentUser.displayName || this.currentUser.username}</h4>
                <p>${this.currentUser.role || 'User'}</p>
            </div>
        `;
        this.loginBtn.style.display = 'none';
    } else {
        this.userInfo.innerHTML = `
            <div class="avatar" style="background-color: #6b7280">
                ?
            </div>
            <div class="user-details">
                <h4>Guest</h4>
                <p>Not logged in</p>
            </div>
        `;
        this.loginBtn.style.display = 'flex';
    }
}