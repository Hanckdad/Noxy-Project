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
       INITIALIZE UI ELEMENTS
    --------------------------------------------------- */
    initializeElements() {
        this.sidebar = document.querySelector(".sidebar");
        this.newChatBtn = document.getElementById("newChatBtn");
        this.chatHistory = document.getElementById("chatHistory");
        this.userInfo = document.getElementById("userInfo");
        this.loginBtn = document.getElementById("loginBtn");

        this.messageInput = document.getElementById("messageInput");
        this.sendBtn = document.getElementById("sendBtn");
        this.chatContainer = document.getElementById("chatContainer");
        this.currentChatTitle = document.getElementById("currentChatTitle");

        this.loginModal = document.getElementById("loginModal");
        this.tiktokModal = document.getElementById("tiktokModal");
        this.settingsModal = document.getElementById("settingsModal");

        this.closeModalButtons = document.querySelectorAll(".close-modal");

        this.loginUsernameInput = document.getElementById("username");
        this.loginPasswordInput = document.getElementById("password");
        this.loginSubmitBtn = document.getElementById("loginBtnModal");
        this.registerBtn = document.getElementById("registerBtnModal");

        this.settingsBtn = document.getElementById("settingsBtn");
        this.logoutBtn = document.getElementById("logoutBtn");
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
        this.settingsBtn?.addEventListener("click", () => this.openModal(this.settingsModal));
        this.logoutBtn?.addEventListener("click", () => this.logout());

        this.loginSubmitBtn?.addEventListener("click", () => this.login());
        this.registerBtn?.addEventListener("click", () => this.register());

        this.closeModalButtons.forEach((btn) =>
            btn.addEventListener("click", () => this.closeAllModals())
        );

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
       AUTH
    --------------------------------------------------- */
    async checkAuth() {
        const token = localStorage.getItem("noxy_token");
        if (!token) return;

        try {
            const res = await fetch(`${this.baseURL}/api/auth/me`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            const data = await res.json();
            if (data.success) {
                this.currentUser = data.user;
                this.updateUI();
                this.loadUserChats();
            }
        } catch {}
    }

    async login() {
        const username = this.loginUsernameInput.value.trim();
        const password = this.loginPasswordInput.value;

        if (!username || !password)
            return this.showAlert("Please enter username and password", "error");

        try {
            const res = await fetch(`${this.baseURL}/api/auth/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, password }),
            });

            const data = await res.json();

            if (data.success) {
                localStorage.setItem("noxy_token", data.token);
                this.currentUser = data.user;
                this.updateUI();
                this.closeAllModals();
                this.loadUserChats();
                this.showAlert("Login success!", "success");
            } else {
                this.showAlert(data.error, "error");
            }
        } catch {
            this.showAlert("Network error", "error");
        }
    }

    async register() {
        const username = this.loginUsernameInput.value.trim();
        const password = this.loginPasswordInput.value;

        if (username.length < 3) return this.showAlert("Username must be 3+ chars", "error");
        if (password.length < 6) return this.showAlert("Password must be 6+ chars", "error");

        try {
            const res = await fetch(`${this.baseURL}/api/auth/register`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, password }),
            });

            const data = await res.json();

            if (data.success) {
                localStorage.setItem("noxy_token", data.token);
                this.currentUser = data.user;
                this.updateUI();
                this.closeAllModals();
                this.createNewChat();
                this.showAlert("Account created!", "success");
            } else {
                this.showAlert(data.error, "error");
            }
        } catch {
            this.showAlert("Network error", "error");
        }
    }

    logout() {
        localStorage.removeItem("noxy_token");
        this.currentUser = null;
        this.updateUI();
        this.showAlert("Logged out!", "success");
    }

    updateUI() {
        if (this.currentUser) {
            this.loginBtn.style.display = "none";
            this.userInfo.innerHTML = `<div class="user-avatar">👤</div><div class="user-name">${this.currentUser.displayName}</div>`;
        } else {
            this.loginBtn.style.display = "block";
            this.userInfo.innerHTML = "";
        }
    }

    /* ---------------------------------------------------
       CHAT
    --------------------------------------------------- */
    createNewChat() {
        const chat = {
            id: Date.now().toString(),
            title: "New Chat",
            messages: [],
        };

        this.currentChatId = chat.id;
        this.chats.unshift(chat);
        this.saveToLocalStorage();
        this.renderChatHistory();
        this.loadChat(chat.id);
    }

    renderChatHistory() {
        this.chatHistory.innerHTML = "";

        this.chats.forEach((chat) => {
            const div = document.createElement("div");
            div.classList.add("chat-item");
            if (chat.id === this.currentChatId) div.classList.add("active");

            div.textContent = chat.title;
            div.addEventListener("click", () => this.loadChat(chat.id));

            this.chatHistory.appendChild(div);
        });
    }

    loadChat(chatId) {
        this.currentChatId = chatId;

        const chat = this.chats.find((c) => c.id === chatId);
        if (!chat) return;

        this.currentChatTitle.textContent = chat.title;
        this.chatContainer.innerHTML = "";

        chat.messages.forEach((m) => this.addMessageToUI(m));
        this.renderChatHistory();
    }

    /* ---------------------------------------------------
       SEND MESSAGE FIXED VERSION
    --------------------------------------------------- */
    async sendMessage() {
        const message = this.messageInput?.value?.trim() || "";

        if (!message) return this.showAlert("Please enter a message", "warning");

        if (!this.currentUser) {
            this.openModal(this.loginModal);
            return this.showAlert("Please login to send messages", "warning");
        }

        const isNewChat = !this.currentChatId;
        if (isNewChat) {
            this.createNewChat();
            await new Promise((r) => setTimeout(r, 80));
        }

        const userMsg = { role: "user", content: message };
        this.addMessageToUI(userMsg);

        this.messageInput.value = "";

        const loadingBubble = this.showLoadingMessage();

        try {
            const token = localStorage.getItem("noxy_token");

            const res = await fetch(`${this.baseURL}/api/chat/message`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    chatId: this.currentChatId,
                    message,
                    newChat: isNewChat,
                }),
            });

            const data = await res.json();
            this.removeLoadingMessage(loadingBubble);

            if (!data.success) throw new Error(data.error);

            if (data.aiResponse) {
                this.addMessageToUI({
                    role: "assistant",
                    content: data.aiResponse,
                });
            }

            if (data.chat) {
                const index = this.chats.findIndex((c) => c.id === data.chat.id);

                if (index !== -1) {
                    this.chats[index] = data.chat;
                } else {
                    this.chats.unshift(data.chat);
                }

                this.currentChatId = data.chat.id;

                if (data.chat.title) {
                    this.currentChatTitle.textContent = data.chat.title;
                }

                this.renderChatHistory();
                this.saveToLocalStorage();
            }
        } catch (err) {
            this.removeLoadingMessage(loadingBubble);

            this.addMessageToUI({
                role: "assistant",
                content: `⚠ Error: ${err.message}`,
            });

            this.showAlert("Failed: " + err.message, "error");
        }
    }

    /* ---------------------------------------------------
       MESSAGE UI
    --------------------------------------------------- */
    addMessageToUI(msg) {
        const div = document.createElement("div");
        div.classList.add("message", msg.role);

        div.innerHTML = `<div class="msg-bubble">${msg.content}</div>`;
        this.chatContainer.appendChild(div);
        this.chatContainer.scrollTop = this.chatContainer.scrollHeight;
    }

    showLoadingMessage() {
        const div = document.createElement("div");
        div.classList.add("message", "assistant", "loading");
        div.innerHTML = `<div class="msg-bubble"><i class="fas fa-spinner fa-spin"></i> Thinking...</div>`;
        this.chatContainer.appendChild(div);
        this.chatContainer.scrollTop = this.chatContainer.scrollHeight;
        return div;
    }

    removeLoadingMessage(element) {
        if (element && element.remove) element.remove();
    }

    /* ---------------------------------------------------
       ALERTS
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