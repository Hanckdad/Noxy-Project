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

    /* ---------------------------------------------------
       INITIALIZE ELEMENTS
    --------------------------------------------------- */
    initializeElements() {
        console.log("🔧 Initializing elements...");

        // Sidebar
        this.sidebar = document.querySelector(".sidebar");
        this.newChatBtn = document.getElementById("newChatBtn");
        this.chatHistory = document.getElementById("chatHistory");
        this.userInfo = document.getElementById("userInfo");
        this.loginBtn = document.getElementById("loginBtn");

        // Main
        this.messageInput = document.getElementById("messageInput");
        this.sendBtn = document.getElementById("sendBtn");
        this.chatContainer = document.getElementById("chatContainer");
        this.currentChatTitle = document.getElementById("currentChatTitle");

        // Modals
        this.loginModal = document.getElementById("loginModal");
        this.tiktokModal = document.getElementById("tiktokModal");
        this.settingsModal = document.getElementById("settingsModal");
        this.closeModalButtons = document.querySelectorAll(".close-modal");

        // Login Modal (new)
        this.loginUsernameInput = document.getElementById("username");
        this.loginPasswordInput = document.getElementById("password");
        this.loginSubmitBtn = document.getElementById("loginBtnModal");
        this.registerBtn = document.getElementById("registerBtnModal");

        // TikTok
        this.tiktokUrlInput = document.getElementById("tiktokUrl");
        this.downloadTikTokBtn = document.getElementById("downloadTikTokBtn");
        this.tiktokResult = document.getElementById("tiktokResult");
        this.videoPreview = document.getElementById("videoPreview");
        this.downloadOptions = document.getElementById("downloadOptions");

        // Buttons
        this.tiktokDownloadBtn = document.getElementById("tiktokDownloadBtn");
        this.settingsBtn = document.getElementById("settingsBtn");
        this.logoutBtn = document.getElementById("logoutBtn");
        this.attachBtn = document.getElementById("attachBtn");

        console.log("✅ UI elements initialized!");
    }

    /* ---------------------------------------------------
       EVENT LISTENERS
    --------------------------------------------------- */
    setupEventListeners() {
        this.sendBtn?.addEventListener("click", () => this.sendMessage());
        this.messageInput?.addEventListener("keypress", (e) => {
            if (e.key === "Enter") this.sendMessage();
        });

        this.newChatBtn?.addEventListener("click", () => this.createNewChat());
        this.loginBtn?.addEventListener("click", () => this.openModal(this.loginModal));
        this.tiktokDownloadBtn?.addEventListener("click", () => this.openModal(this.tiktokModal));
        this.settingsBtn?.addEventListener("click", () => this.openModal(this.settingsModal));
        this.logoutBtn?.addEventListener("click", () => this.logout());

        // Auth new
        this.loginSubmitBtn?.addEventListener("click", () => this.login());
        this.registerBtn?.addEventListener("click", () => this.register());

        // Modal closing
        this.closeModalButtons.forEach((btn) => {
            btn.addEventListener("click", () => this.closeAllModals());
        });

        window.addEventListener("click", (e) => {
            if (e.target.classList.contains("modal")) this.closeAllModals();
        });
    }

    /* ---------------------------------------------------
       LOCAL STORAGE
    --------------------------------------------------- */
    loadFromLocalStorage() {
        const savedChats = localStorage.getItem("noxy_chats");
        if (savedChats) this.chats = JSON.parse(savedChats);

        this.renderChatHistory();
    }

    saveToLocalStorage() {
        localStorage.setItem("noxy_chats", JSON.stringify(this.chats));
    }

    /* ---------------------------------------------------
       MODALS
    --------------------------------------------------- */
    openModal(modal) {
        modal.classList.add("active");
    }

    closeAllModals() {
        document.querySelectorAll(".modal").forEach((m) => m.classList.remove("active"));
    }

    /* ---------------------------------------------------
       AUTH FUNCTIONS
    --------------------------------------------------- */
    async checkAuth() {
        const token = localStorage.getItem("noxy_token");
        if (!token) return;

        try {
            const response = await fetch(`${this.baseURL}/api/auth/me`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await response.json();

            if (data.success) {
                this.currentUser = data.user;
                this.updateUI();
                this.loadUserChats();
            }
        } catch (err) {
            console.log("Auth check failed");
        }
    }

    async login() {
        const username = this.loginUsernameInput.value.trim();
        const password = this.loginPasswordInput.value;

        if (!username || !password)
            return this.showAlert("Please enter username and password", "error");

        const btn = this.loginSubmitBtn;
        const oldText = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Logging in...`;

        try {
            const res = await fetch(`${this.baseURL}/api/auth/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, password })
            });

            const data = await res.json();

            if (!data.success) {
                this.showAlert(data.error, "error");
            } else {
                localStorage.setItem("noxy_token", data.token);
                this.currentUser = data.user;
                this.updateUI();
                this.closeAllModals();
                this.loadUserChats();
                this.showAlert("Login success!", "success");
            }
        } catch (e) {
            this.showAlert("Network error", "error");
        }

        btn.disabled = false;
        btn.innerHTML = oldText;
    }

    async register() {
        const username = this.loginUsernameInput.value.trim();
        const password = this.loginPasswordInput.value;

        if (username.length < 3)
            return this.showAlert("Username must be 3+ chars", "error");
        if (password.length < 6)
            return this.showAlert("Password must be 6+ chars", "error");

        const btn = this.registerBtn;
        const oldText = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Creating...`;

        try {
            const res = await fetch(`${this.baseURL}/api/auth/register`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, password })
            });

            const data = await res.json();

            if (!data.success) {
                this.showAlert(data.error, "error");
            } else {
                localStorage.setItem("noxy_token", data.token);
                this.currentUser = data.user;
                this.updateUI();
                this.closeAllModals();
                this.showAlert("Account created!", "success");
                this.createNewChat();
            }
        } catch (e) {
            this.showAlert("Network error", "error");
        }

        btn.disabled = false;
        btn.innerHTML = oldText;
    }

    logout() {
        localStorage.removeItem("noxy_token");
        this.currentUser = null;
        this.updateUI();
        this.showAlert("Logged out!", "success");
    }

    updateUI() {
        if (this.currentUser) {
            this.userInfo.innerHTML = `
                <div class="user-avatar">👤</div>
                <div class="user-name">${this.currentUser.displayName}</div>
            `;
            this.loginBtn.style.display = "none";
        } else {
            this.userInfo.innerHTML = "";
            this.loginBtn.style.display = "block";
        }
    }

    /* ---------------------------------------------------
       CHAT HANDLING
    --------------------------------------------------- */
    createNewChat() {
        const newChat = {
            id: Date.now().toString(),
            title: "New Chat",
            messages: []
        };

        this.chats.unshift(newChat);
        this.saveToLocalStorage();
        this.renderChatHistory();
        this.loadChat(newChat.id);
    }

    renderChatHistory() {
        this.chatHistory.innerHTML = "";

        this.chats.forEach((chat) => {
            const div = document.createElement("div");
            div.classList.add("chat-item");
            if (chat.id === this.currentChatId) div.classList.add("active");
            div.innerText = chat.title;

            div.addEventListener("click", () => this.loadChat(chat.id));

            this.chatHistory.appendChild(div);
        });
    }

    loadChat(chatId) {
        this.currentChatId = chatId;
        const chat = this.chats.find((c) => c.id === chatId);
        if (!chat) return;

        this.currentChatTitle.innerText = chat.title;
        this.chatContainer.innerHTML = "";

        chat.messages.forEach((msg) => this.addMessageToUI(msg));

        this.renderChatHistory();
    }

    /* ---------------------------------------------------
       MESSAGE SENDING
    --------------------------------------------------- */
    async sendMessage() {
        const text = this.messageInput.value.trim();
        if (!text) return;

        if (!this.currentChatId) this.createNewChat();

        const chat = this.chats.find((c) => c.id === this.currentChatId);

        const message = {
            role: "user",
            content: text
        };

        chat.messages.push(message);
        this.addMessageToUI(message);
        this.messageInput.value = "";
        this.saveToLocalStorage();

        // Send to AI API
        this.sendToAI(text);
    }

    addMessageToUI(msg) {
        const div = document.createElement("div");
        div.classList.add("message", msg.role);

        div.innerHTML = `
            <div class="msg-bubble">${msg.content}</div>
        `;

        this.chatContainer.appendChild(div);
        this.chatContainer.scrollTop = this.chatContainer.scrollHeight;
    }

    async sendToAI(text) {
        const chat = this.chats.find((c) => c.id === this.currentChatId);

        const loadingMsg = {
            role: "assistant",
            content: `<i class="fas fa-spinner fa-spin"></i> Noxy is thinking...`
        };

        this.addMessageToUI(loadingMsg);

        try {
            const res = await fetch(`${this.baseURL}/api/chat`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    chatId: this.currentChatId,
                    message: text
                })
            });

            const data = await res.json();
            if (!data.success) throw new Error();

            chat.messages.pop();
            const aiMsg = { role: "assistant", content: data.reply };

            chat.messages.push(aiMsg);
            this.saveToLocalStorage();

            this.chatContainer.lastChild.remove();
            this.addMessageToUI(aiMsg);
        } catch (e) {
            this.chatContainer.lastChild.remove();
            this.addMessageToUI({
                role: "assistant",
                content: "⚠ Error: Unable to get response."
            });
        }
    }

    /* ---------------------------------------------------
       TIKTOK DOWNLOADER
    --------------------------------------------------- */
    async downloadTikTok() {
        const url = this.tiktokUrlInput.value.trim();
        if (!url) return this.showAlert("Enter TikTok URL");

        this.downloadTikTokBtn.disabled = true;
        this.downloadTikTokBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Loading...`;

        try {
            const res = await fetch(`${this.baseURL}/api/tiktok?url=${encodeURIComponent(url)}`);
            const data = await res.json();

            if (!data.success) throw new Error(data.error);

            this.videoPreview.innerHTML = `<video src="${data.video}" controls></video>`;

            this.downloadOptions.innerHTML = `
                <a href="${data.video}" class="btn-primary" download>Download Video</a>
            `;

            this.tiktokResult.style.display = "block";
        } catch (e) {
            this.showAlert("Failed to fetch TikTok", "error");
        }

        this.downloadTikTokBtn.disabled = false;
        this.downloadTikTokBtn.innerHTML = 'Download';
    }

    /* ---------------------------------------------------
       ALERT SYSTEM
    --------------------------------------------------- */
    showAlert(text, type = "info") {
        const div = document.createElement("div");
        div.classList.add("alert", type);
        div.innerText = text;

        document.body.appendChild(div);

        setTimeout(() => div.classList.add("show"), 10);
        setTimeout(() => {
            div.classList.remove("show");
            setTimeout(() => div.remove(), 300);
        }, 3000);
    }
}

/* ---------------------------------------------------
   INIT APP
--------------------------------------------------- */
document.addEventListener("DOMContentLoaded", () => {
    window.noxyApp = new NoxyApp();
});