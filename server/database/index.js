const fs = require('fs').promises;
const path = require('path');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

class DatabaseManager {
    constructor() {
        this.dbPath = path.join(__dirname, 'database');
        this.init();
    }

    async init() {
        try {
            // Create database directory if not exists
            await fs.mkdir(this.dbPath, { recursive: true });
            
            // Initialize all database files
            await this.initFile('users.json', []);
            await this.initFile('chats.json', []);
            await this.initFile('sessions.json', []);
            await this.initFile('logs.json', []);
            
            // Create default admin user if no users exist
            await this.createDefaultUsers();
            
            console.log('✅ Database initialized successfully');
        } catch (error) {
            console.error('❌ Database initialization failed:', error);
        }
    }

    async initFile(filename, defaultValue) {
        const filePath = path.join(this.dbPath, filename);
        
        try {
            await fs.access(filePath);
            console.log(`📁 ${filename} already exists`);
        } catch {
            await fs.writeFile(filePath, JSON.stringify(defaultValue, null, 2));
            console.log(`📝 Created ${filename}`);
        }
    }

    async createDefaultUsers() {
        const users = await this.readFile('users.json');
        
        if (users.length === 0) {
            const adminPassword = await bcrypt.hash('admin123', 10);
            const creatorPassword = await bcrypt.hash('bayu123', 10);
            
            const defaultUsers = [
                {
                    id: Date.now().toString(),
                    username: 'admin',
                    email: 'admin@noxy.ai',
                    password: adminPassword,
                    displayName: 'System Administrator',
                    role: 'admin',
                    avatarColor: '#2563eb',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    lastLogin: null,
                    settings: {
                        theme: 'light',
                        language: 'en',
                        notifications: true
                    }
                },
                {
                    id: (Date.now() + 1).toString(),
                    username: 'bayu',
                    email: 'bayu@official.com',
                    password: creatorPassword,
                    displayName: 'Bayu Official',
                    role: 'creator',
                    avatarColor: '#dc2626',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    lastLogin: null,
                    settings: {
                        theme: 'dark',
                        language: 'id',
                        notifications: true
                    }
                }
            ];

            await this.writeFile('users.json', defaultUsers);
            console.log('👥 Default users created');
            console.log('🔑 Admin: username="admin", password="admin123"');
            console.log('🔑 Creator: username="bayu", password="bayu123"');
        }
    }

    // CRUD Operations
    async readFile(filename) {
        try {
            const filePath = path.join(this.dbPath, filename);
            const data = await fs.readFile(filePath, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            console.error(`Error reading ${filename}:`, error);
            return [];
        }
    }

    async writeFile(filename, data) {
        try {
            const filePath = path.join(this.dbPath, filename);
            await fs.writeFile(filePath, JSON.stringify(data, null, 2));
            return true;
        } catch (error) {
            console.error(`Error writing ${filename}:`, error);
            return false;
        }
    }

    // User Operations
    async findUser(query) {
        const users = await this.readFile('users.json');
        
        if (query.id) {
            return users.find(user => user.id === query.id);
        }
        if (query.username) {
            return users.find(user => user.username === query.username);
        }
        if (query.email) {
            return users.find(user => user.email === query.email);
        }
        
        return null;
    }

    async createUser(userData) {
        const users = await this.readFile('users.json');
        
        // Check if user exists
        if (users.find(u => u.username === userData.username)) {
            throw new Error('Username already exists');
        }
        if (users.find(u => u.email === userData.email)) {
            throw new Error('Email already exists');
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(userData.password, 10);
        
        const newUser = {
            id: Date.now().toString(),
            username: userData.username,
            email: userData.email,
            password: hashedPassword,
            displayName: userData.displayName || userData.username,
            role: 'user',
            avatarColor: this.generateRandomColor(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            lastLogin: null,
            settings: {
                theme: 'light',
                language: 'en',
                notifications: true
            }
        };

        users.push(newUser);
        await this.writeFile('users.json', users);
        
        // Log the action
        await this.logAction('user_registration', newUser.id, 'user_created', {
            username: newUser.username,
            email: newUser.email
        });

        // Remove password before returning
        const { password, ...userWithoutPassword } = newUser;
        return userWithoutPassword;
    }

    async updateUser(userId, updates) {
        const users = await this.readFile('users.json');
        const userIndex = users.findIndex(u => u.id === userId);
        
        if (userIndex === -1) {
            throw new Error('User not found');
        }

        // Update user
        users[userIndex] = {
            ...users[userIndex],
            ...updates,
            updatedAt: new Date().toISOString()
        };

        await this.writeFile('users.json', users);
        
        const { password, ...updatedUser } = users[userIndex];
        return updatedUser;
    }

    // Chat Operations
    async getUserChats(userId) {
        const chats = await this.readFile('chats.json');
        return chats.filter(chat => chat.userId === userId);
    }

    async createChat(userId, title, initialMessage = null) {
        const chats = await this.readFile('chats.json');
        
        const newChat = {
            id: Date.now().toString(),
            userId: userId,
            title: title || 'New Chat',
            messages: initialMessage ? [initialMessage] : [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            isPinned: false,
            tags: []
        };

        chats.push(newChat);
        await this.writeFile('chats.json', chats);
        
        await this.logAction('chat_created', userId, 'new_chat', {
            chatId: newChat.id,
            title: newChat.title
        });

        return newChat;
    }

    async addMessageToChat(chatId, message) {
        const chats = await this.readFile('chats.json');
        const chatIndex = chats.findIndex(c => c.id === chatId);
        
        if (chatIndex === -1) {
            throw new Error('Chat not found');
        }

        const messageWithId = {
            id: `msg_${Date.now()}`,
            ...message,
            timestamp: new Date().toISOString()
        };

        chats[chatIndex].messages.push(messageWithId);
        chats[chatIndex].updatedAt = new Date().toISOString();
        
        // Update title if first message
        if (chats[chatIndex].messages.length === 1 && message.role === 'user') {
            chats[chatIndex].title = message.content.substring(0, 30) + 
                                   (message.content.length > 30 ? '...' : '');
        }

        await this.writeFile('chats.json', chats);
        return messageWithId;
    }

    // Session Management
    async createSession(userId, token, ipAddress, userAgent) {
        const sessions = await this.readFile('sessions.json');
        
        const newSession = {
            sessionId: `sess_${Date.now()}`,
            userId: userId,
            token: token,
            createdAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
            ipAddress: ipAddress,
            userAgent: userAgent
        };

        sessions.push(newSession);
        await this.writeFile('sessions.json', sessions);
        
        return newSession;
    }

    async validateSession(token) {
        const sessions = await this.readFile('sessions.json');
        const session = sessions.find(s => s.token === token);
        
        if (!session) return null;
        
        // Check if session is expired
        if (new Date(session.expiresAt) < new Date()) {
            await this.deleteSession(session.sessionId);
            return null;
        }
        
        return session;
    }

    async deleteSession(sessionId) {
        const sessions = await this.readFile('sessions.json');
        const filteredSessions = sessions.filter(s => s.sessionId !== sessionId);
        await this.writeFile('sessions.json', filteredSessions);
    }

    // Logging
    async logAction(type, userId, action, details = {}) {
        const logs = await this.readFile('logs.json');
        
        const newLog = {
            id: `log_${Date.now()}`,
            type: type,
            userId: userId,
            action: action,
            details: details,
            timestamp: new Date().toISOString(),
            ipAddress: details.ipAddress || 'system'
        };

        logs.push(newLog);
        
        // Keep only last 1000 logs
        if (logs.length > 1000) {
            logs.splice(0, logs.length - 1000);
        }
        
        await this.writeFile('logs.json', logs);
    }

    // Utility Methods
    generateRandomColor() {
        const colors = [
            '#2563eb', '#dc2626', '#059669', '#7c3aed', '#0ea5e9',
            '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#10b981'
        ];
        return colors[Math.floor(Math.random() * colors.length)];
    }

    async cleanupExpiredSessions() {
        const sessions = await this.readFile('sessions.json');
        const now = new Date();
        const activeSessions = sessions.filter(s => new Date(s.expiresAt) > now);
        
        if (activeSessions.length !== sessions.length) {
            await this.writeFile('sessions.json', activeSessions);
            console.log(`🧹 Cleaned up ${sessions.length - activeSessions.length} expired sessions`);
        }
    }

    async getStats() {
        const users = await this.readFile('users.json');
        const chats = await this.readFile('chats.json');
        const sessions = await this.readFile('sessions.json');
        const logs = await this.readFile('logs.json');
        
        return {
            users: {
                total: users.length,
                active: sessions.filter(s => new Date(s.expiresAt) > new Date()).length,
                byRole: users.reduce((acc, user) => {
                    acc[user.role] = (acc[user.role] || 0) + 1;
                    return acc;
                }, {})
            },
            chats: {
                total: chats.length,
                messages: chats.reduce((acc, chat) => acc + chat.messages.length, 0),
                last7Days: chats.filter(c => 
                    new Date(c.createdAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
                ).length
            },
            logs: {
                total: logs.length,
                last24h: logs.filter(l => 
                    new Date(l.timestamp) > new Date(Date.now() - 24 * 60 * 60 * 1000)
                ).length
            }
        };
    }
}

// Create singleton instance
const database = new DatabaseManager();

// Export the instance
module.exports = database;