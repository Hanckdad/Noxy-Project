const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

// Import database
const database = require('./database/index');

// Import routes
const authRoutes = require('./routes/auth');
const chatRoutes = require('./routes/chat');
const tiktokRoutes = require('./routes/tiktok');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from public directory
app.use(express.static(path.join(__dirname, '../public')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/tiktok', tiktokRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        message: 'Noxy Voldigoard is running',
        timestamp: new Date().toISOString()
    });
});

// Database stats endpoint
app.get('/api/stats', async (req, res) => {
    try {
        const stats = await database.getStats();
        res.json({
            success: true,
            stats: stats
        });
    } catch (error) {
        res.status(500).json({ 
            error: 'Failed to get stats' 
        });
    }
});

// Serve frontend for all other routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Global error:', err.stack);
    
    const statusCode = err.status || 500;
    const message = err.message || 'Internal Server Error';
    
    res.status(statusCode).json({
        success: false,
        error: message,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: 'Route not found'
    });
});

// Start server only if not in Vercel environment
if (require.main === module) {
    const PORT = process.env.PORT || 3000;
    
    database.init().then(() => {
        app.listen(PORT, () => {
            console.log(`🦇 Noxy Voldigoard running on port ${PORT}`);
            console.log(`👤 Author: Bayu Official`);
            console.log(`🔗 http://localhost:${PORT}`);
            console.log(`🌐 API: http://localhost:${PORT}/api/health`);
        });
    });
}

// Export for Vercel
module.exports = app;