const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const axios = require('axios');
const database = require('../database/index');

// Get user from token
async function authenticateUser(req) {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        
        if (!token) {
            return null;
        }

        // Verify JWT
        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET || 'noxy-voldigoard-secret-2024'
        );

        // Check session
        const session = await database.validateSession(token);
        if (!session) {
            return null;
        }

        // Get user
        const user = await database.findUser({ id: decoded.id });
        return user;

    } catch (error) {
        console.error('Authentication error:', error);
        return null;
    }
}

// Get all user chats
router.get('/', async (req, res) => {
    try {
        const user = await authenticateUser(req);
        if (!user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const chats = await database.getUserChats(user.id);
        
        res.json({
            success: true,
            chats: chats.sort((a, b) => 
                new Date(b.updatedAt) - new Date(a.updatedAt)
            )
        });

    } catch (error) {
        console.error('Get chats error:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to get chats' 
        });
    }
});

// Create new chat
router.post('/new', async (req, res) => {
    try {
        const user = await authenticateUser(req);
        if (!user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const { title } = req.body;
        const chat = await database.createChat(user.id, title || 'New Chat');
        
        await database.logAction('chat_created', user.id, 'new_chat', {
            chatId: chat.id,
            title: chat.title
        });

        res.json({
            success: true,
            chat: chat
        });

    } catch (error) {
        console.error('Create chat error:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to create chat' 
        });
    }
});

// Send message to chat
router.post('/message', async (req, res) => {
    try {
        const user = await authenticateUser(req);
        if (!user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const { chatId, message, newChat } = req.body;
        
        if (!message || !message.trim()) {
            return res.status(400).json({ 
                success: false,
                error: 'Message is required' 
            });
        }

        let chat;
        
        if (newChat) {
            // Create new chat
            chat = await database.createChat(user.id, null, {
                role: 'user',
                content: message.trim()
            });
        } else if (chatId) {
            // Add to existing chat
            await database.addMessageToChat(chatId, {
                role: 'user',
                content: message.trim()
            });
            
            const chats = await database.getUserChats(user.id);
            chat = chats.find(c => c.id === chatId);
        } else {
            return res.status(400).json({ 
                success: false,
                error: 'chatId is required for existing chat' 
            });
        }

        // Get AI response
        const aiResponse = await getAIResponse(message.trim(), user);
        
        // Add AI response to chat
        await database.addMessageToChat(chat.id, {
            role: 'assistant',
            content: aiResponse
        });

        // Get updated chat
        const chats = await database.getUserChats(user.id);
        const updatedChat = chats.find(c => c.id === chat.id);
        
        await database.logAction('chat_message', user.id, 'message_sent', {
            chatId: chat.id,
            messageLength: message.length,
            hasAIResponse: true
        });

        res.json({
            success: true,
            chat: updatedChat,
            aiResponse: aiResponse
        });

    } catch (error) {
        console.error('Send message error:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to send message',
            details: error.message 
        });
    }
});

// Get AI response
async function getAIResponse(query, user) {
    try {
        // Check for greetings
        const greetings = {
            'hi': "Hello! 🦇 I'm Noxy Voldigoard. How can I assist you today?",
            'hello': "Hello there! 🦇 I'm Noxy, your AI assistant. What can I help you with?",
            'hey': "Hey! 🦇 What's on your mind today?",
            'hai': "Hai! 🦇 Apa yang bisa saya bantu?",
            'hallo': "Hallo! 🦇 Wie kann ich Ihnen helfen?",
            'hola': "¡Hola! 🦇 ¿En qué puedo ayudarte?",
            'bonjour': "Bonjour! 🦇 Comment puis-je vous aider?",
            'how are you': "I'm doing great, thank you! 🦇 How can I assist you today?",
            'what is your name': "I'm Noxy Voldigoard! 🦇 Your AI assistant created by Bayu Official.",
            'who created you': "I was created by Bayu Official. 🦇 He's an awesome developer!",
            'what can you do': "I can search the web for information, answer questions, summarize content, and help with various tasks! 🦇 Try asking me anything.",
            'thank you': "You're welcome! 🦇 Is there anything else I can help you with?",
            'thanks': "Glad I could help! 🦇 Feel free to ask me anything else.",
            'bye': "Goodbye!