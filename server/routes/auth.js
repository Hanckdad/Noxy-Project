const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const database = require('../database/index');

// Register route
router.post('/register', async (req, res) => {
    try {
        const { username, email, password, displayName } = req.body;

        if (!username || !password || !email) {
            return res.status(400).json({ 
                error: 'Username, email, and password are required' 
            });
        }

        if (password.length < 6) {
            return res.status(400).json({ 
                error: 'Password must be at least 6 characters' 
            });
        }

        // Create user in database
        const userData = {
            username,
            email,
            password,
            displayName: displayName || username
        };

        const user = await database.createUser(userData);

        // Generate JWT token
        const token = jwt.sign(
            { 
                id: user.id, 
                username: user.username,
                role: user.role 
            },
            process.env.JWT_SECRET || 'noxy-voldigoard-secret-2024',
            { expiresIn: '7d' }
        );

        // Create session
        const ipAddress = req.headers['x-forwarded-for'] || req.ip;
        const userAgent = req.headers['user-agent'];
        await database.createSession(user.id, token, ipAddress, userAgent);

        // Update last login
        await database.updateUser(user.id, { lastLogin: new Date().toISOString() });

        res.status(201).json({
            success: true,
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                displayName: user.displayName,
                role: user.role,
                avatarColor: user.avatarColor,
                settings: user.settings
            }
        });

    } catch (error) {
        console.error('Registration error:', error);
        
        if (error.message.includes('already exists')) {
            return res.status(409).json({ error: error.message });
        }
        
        res.status(500).json({ 
            error: 'Registration failed',
            details: error.message 
        });
    }
});

// Login route
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ 
                error: 'Username and password required' 
            });
        }

        // Find user
        const user = await database.findUser({ username });
        if (!user) {
            await database.logAction('user_login', null, 'login_failed', {
                username,
                reason: 'User not found',
                ipAddress: req.ip
            });
            
            return res.status(401).json({ 
                error: 'Invalid credentials' 
            });
        }

        // Verify password
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            await database.logAction('user_login', user.id, 'login_failed', {
                username,
                reason: 'Invalid password',
                ipAddress: req.ip
            });
            
            return res.status(401).json({ 
                error: 'Invalid credentials' 
            });
        }

        // Generate JWT token
        const token = jwt.sign(
            { 
                id: user.id, 
                username: user.username,
                role: user.role 
            },
            process.env.JWT_SECRET || 'noxy-voldigoard-secret-2024',
            { expiresIn: '7d' }
        );

        // Create session
        const ipAddress = req.headers['x-forwarded-for'] || req.ip;
        const userAgent = req.headers['user-agent'];
        await database.createSession(user.id, token, ipAddress, userAgent);

        // Update last login
        await database.updateUser(user.id, { 
            lastLogin: new Date().toISOString() 
        });

        // Log successful login
        await database.logAction('user_login', user.id, 'login_success', {
            ipAddress: req.ip
        });

        // Remove password from response
        const { password: _, ...userWithoutPassword } = user;

        res.json({
            success: true,
            token,
            user: userWithoutPassword
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ 
            error: 'Login failed',
            details: error.message 
        });
    }
});

// Verify token route
router.get('/verify', async (req, res) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({ 
                success: false,
                error: 'No token provided' 
            });
        }

        // Verify JWT
        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET || 'noxy-voldigoard-secret-2024'
        );

        // Check session
        const session = await database.validateSession(token);
        if (!session) {
            return res.status(401).json({ 
                success: false,
                error: 'Session expired' 
            });
        }

        // Get user
        const user = await database.findUser({ id: decoded.id });
        if (!user) {
            return res.status(401).json({ 
                success: false,
                error: 'User not found' 
            });
        }

        const { password, ...userWithoutPassword } = user;
        
        res.json({
            success: true,
            user: userWithoutPassword,
            session: {
                expiresAt: session.expiresAt,
                createdAt: session.createdAt
            }
        });

    } catch (error) {
        console.error('Token verification error:', error);
        
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

// Logout route
router.post('/logout', async (req, res) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        
        if (token) {
            const sessions = await database.readFile('sessions.json');
            const session = sessions.find(s => s.token === token);
            
            if (session) {
                await database.deleteSession(session.sessionId);
                
                await database.logAction('user_logout', session.userId, 'logout', {
                    ipAddress: req.ip
                });
            }
        }

        res.json({ 
            success: true, 
            message: 'Logged out successfully' 
        });

    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({ 
            success: false,
            error: 'Logout failed' 
        });
    }
});

// Get user profile
router.get('/profile', async (req, res) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET || 'noxy-voldigoard-secret-2024'
        );

        const user = await database.findUser({ id: decoded.id });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const { password, ...userWithoutPassword } = user;
        
        res.json({
            success: true,
            profile: userWithoutPassword
        });

    } catch (error) {
        console.error('Profile error:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to get profile' 
        });
    }
});

// Update user settings
router.put('/settings', async (req, res) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        const { settings } = req.body;
        
        if (!token) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET || 'noxy-voldigoard-secret-2024'
        );

        const updatedUser = await database.updateUser(decoded.id, { 
            settings: settings 
        });

        res.json({
            success: true,
            settings: updatedUser.settings
        });

    } catch (error) {
        console.error('Settings update error:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to update settings' 
        });
    }
});

module.exports = router;