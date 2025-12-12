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
            username: user.username,
            role: user.role || 'user'
        },
        process.env.JWT_SECRET || 'noxy-voldigoard-secret-key-2024-bayu-official',
        { expiresIn: '7d' }
    );
}

// Initialize default users if empty
async function initDefaultUsers() {
    const users = await readUsers();
    
    if (users.length === 0) {
        console.log('👥 Creating default users...');
        
        const defaultUsers = [
            {
                id: Date.now().toString(),
                username: 'admin',
                email: 'admin@noxy.ai',
                password: await bcrypt.hash('admin123', 10),
                displayName: 'System Admin',
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
                password: await bcrypt.hash('bayu123', 10),
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
        
        await writeUsers(defaultUsers);
        console.log('✅ Default users created');
        console.log('🔑 Admin: username="admin", password="admin123"');
        console.log('🔑 Creator: username="bayu", password="bayu123"');
    }
}

// Call initialization
initDefaultUsers();

// REGISTER endpoint
router.post('/register', async (req, res) => {
    try {
        const { username, password } = req.body;

        console.log('📝 Register attempt:', { username });

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

        // Check if username already exists
        if (users.some(user => user.username.toLowerCase() === username.toLowerCase())) {
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
            username: username.trim(),
            email: `${username}@noxy.ai`, // Auto-generate email
            password: hashedPassword,
            displayName: username.trim(),
            role: 'user',
            avatarColor: '#' + Math.floor(Math.random() * 16777215).toString(16), // Random color
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

// LOGIN endpoint
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        console.log('🔐 Login attempt:', { username });

        if (!username || !password) {
            return res.status(400).json({
                success: false,
                error: 'Username and password are required'
            });
        }

        const users = await readUsers();
        
        // Find user by username
        const user = users.find(u => 
            u.username.toLowerCase() === username.toLowerCase()
        );

        if (!user) {
            console.log('❌ User not found:', username);
            return res.status(401).json({
                success: false,
                error: 'Invalid username or password'
            });
        }

        // Check password
        const isPasswordValid = await bcrypt.compare(password, user.password);
        
        if (!isPasswordValid) {
            console.log('❌ Invalid password for user:', username);
            return res.status(401).json({
                success: false,
                error: 'Invalid username or password'
            });
        }

        // Generate token
        const token = generateToken(user);

        // Update last login
        user.lastLogin = new Date().toISOString();
        user.updatedAt = new Date().toISOString();
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

// VERIFY token endpoint
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
        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET || 'noxy-voldigoard-secret-key-2024-bayu-official'
        );

        // Get user from database
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
        
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                error: 'Token expired'
            });
        }

        res.status(500).json({
            success: false,
            error: 'Token verification failed'
        });
    }
});

// LOGOUT endpoint
router.post('/logout', (req, res) => {
    // Since we're using JWT stateless, just return success
    // In production, you might want to implement a token blacklist
    res.json({
        success: true,
        message: 'Logged out successfully'
    });
});

module.exports = router;