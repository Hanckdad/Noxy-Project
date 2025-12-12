const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fs = require('fs').promises;
const path = require('path');

const usersFilePath = path.join(__dirname, '../database/users.json');

// Ensure database exists
async function ensureDatabase() {
    try {
        await fs.mkdir(path.dirname(usersFilePath), { recursive: true });
        try {
            await fs.access(usersFilePath);
        } catch {
            await fs.writeFile(usersFilePath, JSON.stringify([]));
            console.log('📁 Created users.json');
            
            // Create default users
            const defaultUsers = [
                {
                    id: "1",
                    username: "admin",
                    email: "admin@noxy.ai",
                    password: await bcrypt.hash("admin123", 10),
                    displayName: "System Admin",
                    role: "admin",
                    avatarColor: "#2563eb",
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    settings: { theme: "light", language: "en" }
                },
                {
                    id: "2",
                    username: "bayu",
                    email: "bayu@official.com",
                    password: await bcrypt.hash("bayu123", 10),
                    displayName: "Bayu Official",
                    role: "creator",
                    avatarColor: "#dc2626",
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    settings: { theme: "dark", language: "id" }
                }
            ];
            
            await fs.writeFile(usersFilePath, JSON.stringify(defaultUsers, null, 2));
            console.log('✅ Default users created');
            console.log('🔑 Admin: username="admin", password="admin123"');
            console.log('🔑 Creator: username="bayu", password="bayu123"');
        }
    } catch (error) {
        console.error('Database setup error:', error);
    }
}

// Read users from file
async function readUsers() {
    try {
        await ensureDatabase();
        const data = await fs.readFile(usersFilePath, 'utf8');
        return JSON.parse(data || '[]');
    } catch (error) {
        console.error('Error reading users:', error);
        return [];
    }
}

// Write users to file
async function writeUsers(users) {
    try {
        await fs.writeFile(usersFilePath, JSON.stringify(users, null, 2));
        return true;
    } catch (error) {
        console.error('Error writing users:', error);
        return false;
    }
}

// Generate JWT token
function generateToken(user) {
    return jwt.sign(
        {
            id: user.id,
            username: user.username
        },
        process.env.JWT_SECRET || 'noxy-secret-key-2024',
        { expiresIn: '7d' }
    );
}

// ================= ROUTES =================

// Login route
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        console.log('🔐 Login attempt:', username);

        if (!username || !password) {
            return res.status(400).json({
                success: false,
                error: 'Username and password are required'
            });
        }

        const users = await readUsers();
        const user = users.find(u => u.username === username);

        if (!user) {
            console.log('❌ User not found:', username);
            return res.status(401).json({
                success: false,
                error: 'Invalid username or password'
            });
        }

        // Check password
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            console.log('❌ Invalid password for:', username);
            return res.status(401).json({
                success: false,
                error: 'Invalid username or password'
            });
        }

        // Generate token
        const token = generateToken(user);

        // Update last login
        user.lastLogin = new Date().toISOString();
        await writeUsers(users);

        console.log('✅ Login successful:', username);

        // Remove password from response
        const { password: _, ...userWithoutPassword } = user;

        res.json({
            success: true,
            message: 'Login successful',
            token: token,
            user: userWithoutPassword
        });

    } catch (error) {
        console.error('❌ Login error:', error);
        res.status(500).json({
            success: false,
            error: 'Login failed. Please try again.'
        });
    }
});

// Register route
router.post('/register', async (req, res) => {
    try {
        const { username, password } = req.body;

        console.log('📝 Register attempt:', username);

        if (!username || !password) {
            return res.status(400).json({
                success: false,
                error: 'Username and password are required'
            });
        }

        if (username.length < 3) {
            return res.status(400).json({
                success: false,
                error: 'Username must be at least 3 characters'
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                error: 'Password must be at least 6 characters'
            });
        }

        const users = await readUsers();

        // Check if user exists
        if (users.find(u => u.username === username)) {
            return res.status(400).json({
                success: false,
                error: 'Username already exists'
            });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create new user
        const newUser = {
            id: Date.now().toString(),
            username: username,
            email: `${username}@noxy.ai`,
            password: hashedPassword,
            displayName: username,
            role: 'user',
            avatarColor: '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0'),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            settings: {
                theme: 'light',
                language: 'en',
                notifications: true
            }
        };

        users.push(newUser);
        await writeUsers(users);

        console.log('✅ User registered:', username);

        // Generate token
        const token = generateToken(newUser);

        // Remove password from response
        const { password: _, ...userWithoutPassword } = newUser;

        res.status(201).json({
            success: true,
            message: 'Registration successful',
            token: token,
            user: userWithoutPassword
        });

    } catch (error) {
        console.error('❌ Registration error:', error);
        res.status(500).json({
            success: false,
            error: 'Registration failed. Please try again.'
        });
    }
});

// Verify token
router.get('/verify', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                error: 'No token provided'
            });
        }

        const token = authHeader.split(' ')[1];

        if (!token) {
            return res.status(401).json({
                success: false,
                error: 'Invalid token format'
            });
        }

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'noxy-secret-key-2024');

        // Get user
        const users = await readUsers();
        const user = users.find(u => u.id === decoded.id);

        if (!user) {
            return res.status(401).json({
                success: false,
                error: 'User not found'
            });
        }

        // Remove password from response
        const { password, ...userWithoutPassword } = user;

        res.json({
            success: true,
            user: userWithoutPassword
        });

    } catch (error) {
        console.error('❌ Token verification error:', error);
        
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                success: false,
                error: 'Invalid token'
            });
        }
        
        res.status(500).json({
            success: false,
            error: 'Token verification failed'
        });
    }
});

// Logout route
router.post('/logout', (req, res) => {
    res.json({
        success: true,
        message: 'Logged out successfully'
    });
});

module.exports = router;