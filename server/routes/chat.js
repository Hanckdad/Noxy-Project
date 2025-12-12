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
            'bye': "Goodbye! 🦇 Have a great day!",
            'goodbye': "See you later! 🦇 Don't hesitate to come back if you need help."
        };

        const lowerQuery = query.toLowerCase().trim();
        
        for (const [greeting, response] of Object.entries(greetings)) {
            if (lowerQuery.includes(greeting)) {
                return response;
            }
        }

        // Search web for information
        const searchResults = await searchWeb(query);
        
        if (searchResults.length === 0) {
            return `I couldn't find specific information about "${query}". This could be because:\n\n1. The topic is very new or specialized\n2. There's limited information available online\n3. The search terms need adjustment\n\nTry rephrasing your question or ask about a different topic! 🦇`;
        }

        // Generate response from search results
        let response = `Based on my search for "${query}", here's what I found:\n\n`;
        
        searchResults.forEach((result, index) => {
            response += `**${result.title || 'Source ' + (index + 1)}**\n`;
            response += `${result.snippet}\n\n`;
            
            if (result.source) {
                response += `*Source: ${result.source}*\n`;
            }
            
            response += '---\n\n';
        });
        
        response += "**Note:** Information may not be current or complete. Always verify important details.";
        
        return response;

    } catch (error) {
        console.error('AI response error:', error);
        return "I encountered an error while processing your request. Please try again in a moment. 🦇";
    }
}

// Search web using SerpApi
async function searchWeb(query) {
    try {
        const SERPAPI_KEY = "0be5ff098bed53fb055200fa4628d44ff9863d8788c1f98c6069b4ca1773c3b5";
        
        const response = await axios.get('https://serpapi.com/search.json', {
            params: {
                engine: 'google',
                q: query,
                api_key: SERPAPI_KEY,
                num: 3,
                gl: 'us',
                hl: 'en'
            },
            timeout: 10000
        });

        const results = response.data.organic_results || [];
        
        return results
            .filter(result => result.snippet && result.snippet.length > 30)
            .map(result => ({
                title: result.title || '',
                snippet: result.snippet || '',
                link: result.link || '',
                source: result.source || '',
                date: result.date || ''
            }));

    } catch (error) {
        console.error('Search error:', error);
        return [];
    }
}

// Delete chat
router.delete('/:chatId', async (req, res) => {
    try {
        const user = await authenticateUser(req);
        if (!user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const { chatId } = req.params;
        const chats = await database.getUserChats(user.id);
        const chat = chats.find(c => c.id === chatId);
        
        if (!chat) {
            return res.status(404).json({ 
                success: false,
                error: 'Chat not found' 
            });
        }

        // In real implementation, we would delete from database
        // For now, we'll just filter it out
        const allChats = await database.readFile('chats.json');
        const filteredChats = allChats.filter(c => c.id !== chatId);
        await database.writeFile('chats.json', filteredChats);
        
        await database.logAction('chat_deleted', user.id, 'chat_removed', {
            chatId: chatId,
            title: chat.title,
            messagesCount: chat.messages.length
        });

        res.json({
            success: true,
            message: 'Chat deleted successfully'
        });

    } catch (error) {
        console.error('Delete chat error:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to delete chat' 
        });
    }
});

// Update chat title
router.put('/:chatId/title', async (req, res) => {
    try {
        const user = await authenticateUser(req);
        if (!user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const { chatId } = req.params;
        const { title } = req.body;
        
        if (!title || !title.trim()) {
            return res.status(400).json({ 
                success: false,
                error: 'Title is required' 
            });
        }

        const chats = await database.getUserChats(user.id);
        const chat = chats.find(c => c.id === chatId);
        
        if (!chat) {
            return res.status(404).json({ 
                success: false,
                error: 'Chat not found' 
            });
        }

        // Update chat
        const allChats = await database.readFile('chats.json');
        const chatIndex = allChats.findIndex(c => c.id === chatId);
        
        if (chatIndex !== -1) {
            allChats[chatIndex].title = title.trim();
            allChats[chatIndex].updatedAt = new Date().toISOString();
            await database.writeFile('chats.json', allChats);
        }

        res.json({
            success: true,
            chat: allChats[chatIndex]
        });

    } catch (error) {
        console.error('Update title error:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to update title' 
        });
    }
});

// Get chat statistics
router.get('/stats', async (req, res) => {
    try {
        const user = await authenticateUser(req);
        if (!user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const chats = await database.getUserChats(user.id);
        const totalMessages = chats.reduce((acc, chat) => acc + chat.messages.length, 0);
        
        const today = new Date();
        const last7Days = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        
        const recentChats = chats.filter(chat => 
            new Date(chat.updatedAt) > last7Days
        ).length;

        res.json({
            success: true,
            stats: {
                totalChats: chats.length,
                totalMessages: totalMessages,
                recentChats: recentChats,
                pinnedChats: chats.filter(c => c.isPinned).length,
                averageMessages: chats.length > 0 ? 
                    Math.round(totalMessages / chats.length) : 0
            }
        });

    } catch (error) {
        console.error('Stats error:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to get statistics' 
        });
    }
});

module.exports = router;