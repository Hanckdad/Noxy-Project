const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../public')));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/chat', require('./routes/chat'));
app.use('/api/tiktok', require('./routes/tiktok'));

// Health check
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        message: 'Noxy Voldigoard is running',
        timestamp: new Date().toISOString()
    });
});

// Serve frontend
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Error handling
app.use((err, req, res, next) => {
    console.error('Server error:', err.stack);
    res.status(500).json({ 
        success: false,
        error: 'Something went wrong!' 
    });
});

const PORT = process.env.PORT || 3000;

if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`🦇 Noxy Voldigoard running on port ${PORT}`);
        console.log(`👤 Author: Bayu Official`);
        console.log(`🔗 http://localhost:${PORT}`);
        console.log(`🌐 API Health: http://localhost:${PORT}/api/health`);
    });
}

module.exports = app;