const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

const usersFilePath = path.join(__dirname, '../database/users.json');

// Initialize database with simple passwords
async function initDatabase() {
    try {
        await fs.mkdir(path.dirname(usersFilePath), { recursive: true });
        
        let users = [];
        try {
            const data = await fs.readFile(usersFilePath, 'utf8');
            users = JSON.parse(data || '[]');
        } catch {
            // Create default users with SIMPLE passwords
            users = [
                {
                    id: "1",
                    username: "admin",
                    password: "admin123", // SIMPLE PASSWORD
                    displayName: "Administrator",
                    role: "admin",
                    avatarColor: "#2563eb",
                    createdAt: new Date().toISOString(),
                    settings: { theme: "light" }
                },
                {
                    id: "2",
                    username: "bayu",
                    password: "bayu123", // SIMPLE PASSWORD
                    displayName: "Bayu Official",
                    role: "creator",
                    avatarColor: "#dc2626",
                    createdAt: new Date().toISOString(),
                    settings: { theme: "dark" }
                }
            ];
            
            await fs.writeFile(usersFilePath, JSON.stringify(users, null, 2));
            console.log('✅ Created users.json with default users');
            console.log('🔑 Admin: username="admin", password="admin123"');
            console.log('🔑 Creator: username="bayu", password="bayu123"');
        }
        
        return users;
    } catch (error) {
        console.error('Database init error:', error);
        return [];
    }
}

// Simple token generation
function generateToken(user) {
    const payload = {
        id: user.id,
        username: user.username,
        timestamp: Date.now()
    };
    
    // Simple token (in production use JWT)
    return Buffer.from(JSON.stringify(payload)).toString('base64');
}

// Verify simple token
function verifyToken(token) {
    try {
        const decoded = JSON.parse(Buffer.from(token, 'base64').toString());
        return decoded;
    } catch {
        return null;
    }
}

// ==================== ROUTES ====================

// LOGIN - SIMPLE VERSION
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        console.log('🔐 Login attempt:', { username, password });

        if (!username || !password) {
            return res.json({
                success: false,
                error: 'Username and password are required'
            });
        }

        const users = await initDatabase();
        const user = users.find(u => 
            u.username.toLowerCase() === username.toLowerCase() && 
            u.password === password // DIRECT COMPARE - NO HASH
        );

        if (!user) {
            console.log('❌ Login failed for:', username);
            return res.json({
                success: false,
                error: 'Invalid username or password'
            });
        }

        // Generate token
        const token = generateToken(user);
        
        // Remove password from response
        const userResponse = { ...user };
        delete userResponse.password;

        console.log('✅ Login successful:', username);
        
        res.json({
            success: true,
            message: 'Login successful',
            token: token,
            user: userResponse
        });

    } catch (error) {
        console.error('Login error:', error);
        res.json({
            success: false,
            error: 'Login failed. Please try again.'
        });
    }
});

// REGISTER - SIMPLE VERSION
router.post('/register', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        console.log('📝 Register attempt:', { username });

        if (!username || !password) {
            return res.json({
                success: false,
                error: 'Username and password are required'
            });
        }

        if (username.length < 3) {
            return res.json({
                success: false,
                error: 'Username must be at least 3 characters'
            });
        }

        if (password.length < 3) {
            return res.json({
                success: false,
                error: 'Password must be at least 3 characters'
            });
        }

        let users = await initDatabase();

        // Check if user exists
        if (users.some(u => u.username.toLowerCase() === username.toLowerCase())) {
            return res.json({
                success: false,
                error: 'Username already exists'
            });
        }

        // Create new user
        const newUser = {
            id: Date.now().toString(),
            username: username.trim(),
            password: password, // STORE PLAIN TEXT (for testing)
            displayName: username.trim(),
            role: 'user',
            avatarColor: '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0'),
            createdAt: new Date().toISOString(),
            settings: { theme: 'light' }
        };

        users.push(newUser);
        await fs.writeFile(usersFilePath, JSON.stringify(users, null, 2));

        // Generate token
        const token = generateToken(newUser);
        
        // Remove password from response
        const userResponse = { ...newUser };
        delete userResponse.password;

        console.log('✅ User registered:', username);
        
        res.json({
            success: true,
            message: 'Registration successful',
            token: token,
            user: userResponse
        });

    } catch (error) {
        console.error('Registration error:', error);
        res.json({
            success: false,
            error: 'Registration failed. Please try again.'
        });
    }
});

// VERIFY TOKEN
router.get('/verify', async (req, res) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        
        if (!token) {
            return res.json({
                success: false,
                error: 'No token provided'
            });
        }

        const decoded = verifyToken(token);
        if (!decoded) {
            return res.json({
                success: false,
                error: 'Invalid token'
            });
        }

        const users = await initDatabase();
        const user = users.find(u => u.id === decoded.id);
        
        if (!user) {
            return res.json({
                success: false,
                error: 'User not found'
            });
        }

        // Remove password from response
        const userResponse = { ...user };
        delete userResponse.password;

        res.json({
            success: true,
            user: userResponse
        });

    } catch (error) {
        console.error('Verify error:', error);
        res.json({
            success: false,
            error: 'Verification failed'
        });
    }
});

// LOGOUT
router.post('/logout', (req, res) => {
    res.json({
        success: true,
        message: 'Logged out successfully'
    });
});

module.exports = router;