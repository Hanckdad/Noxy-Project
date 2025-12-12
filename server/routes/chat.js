const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');

const chatsFilePath = path.join(__dirname, '../database/chats.json');
const SERPAPI_KEY = "0be5ff098bed53fb055200fa4628d44ff9863d8788c1f98c6069b4ca1773c3b5";

// Initialize chats database
async function initChatsDB() {
    try {
        await fs.mkdir(path.dirname(chatsFilePath), { recursive: true });
        
        try {
            await fs.access(chatsFilePath);
            const data = await fs.readFile(chatsFilePath, 'utf8');
            return JSON.parse(data || '[]');
        } catch {
            await fs.writeFile(chatsFilePath, JSON.stringify([]));
            return [];
        }
    } catch (error) {
        console.error('Chats DB init error:', error);
        return [];
    }
}

// Save chats
async function saveChats(chats) {
    try {
        await fs.writeFile(chatsFilePath, JSON.stringify(chats, null, 2));
        return true;
    } catch (error) {
        console.error('Save chats error:', error);
        return false;
    }
}

// ==================== ROUTES ====================

// Get user's chats
router.get('/', async (req, res) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        if (!token) {
            return res.json({
                success: false,
                error: 'No token provided'
            });
        }

        const chats = await initChatsDB();
        const userChats = chats.filter(chat => chat.userId === req.query.userId);
        
        res.json({
            success: true,
            chats: userChats
        });
    } catch (error) {
        console.error('Get chats error:', error);
        res.json({
            success: false,
            error: 'Failed to get chats'
        });
    }
});

// Send message to chat
router.post('/message', async (req, res) => {
    try {
        const { chatId, message, newChat } = req.body;
        const token = req.headers.authorization?.replace('Bearer ', '');
        
        if (!token) {
            return res.json({
                success: false,
                error: 'Authentication required'
            });
        }

        if (!message || !message.trim()) {
            return res.json({
                success: false,
                error: 'Message is required'
            });
        }

        console.log('💬 Chat message:', { chatId, newChat, messageLength: message.length });

        let chats = await initChatsDB();
        let chat;
        
        if (newChat) {
            // Create new chat
            chat = {
                id: Date.now().toString(),
                userId: "current-user", // In real app, get from token
                title: message.substring(0, 30) + (message.length > 30 ? '...' : ''),
                messages: [
                    {
                        id: '1',
                        role: 'user',
                        content: message.trim(),
                        timestamp: new Date().toISOString()
                    }
                ],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            
            chats.unshift(chat);
        } else if (chatId) {
            // Find existing chat
            chat = chats.find(c => c.id === chatId);
            if (!chat) {
                return res.json({
                    success: false,
                    error: 'Chat not found'
                });
            }
            
            // Add user message
            chat.messages.push({
                id: (chat.messages.length + 1).toString(),
                role: 'user',
                content: message.trim(),
                timestamp: new Date().toISOString()
            });
            
            chat.updatedAt = new Date().toISOString();
        } else {
            return res.json({
                success: false,
                error: 'chatId is required'
            });
        }

        // Get AI response
        const aiResponse = await getAIResponse(message.trim());
        
        // Add AI response to chat
        chat.messages.push({
            id: (chat.messages.length + 1).toString(),
            role: 'assistant',
            content: aiResponse,
            timestamp: new Date().toISOString()
        });
        
        chat.updatedAt = new Date().toISOString();
        
        // Update title if it's a new chat
        if (newChat) {
            chat.title = message.substring(0, 30) + (message.length > 30 ? '...' : '');
        }

        // Save chats
        await saveChats(chats);

        res.json({
            success: true,
            chat: chat,
            aiResponse: aiResponse
        });

    } catch (error) {
        console.error('Chat error:', error);
        res.json({
            success: false,
            error: 'Failed to process message: ' + error.message
        });
    }
});

// Get AI response with web search
async function getAIResponse(query) {
    try {
        console.log('🤖 Getting AI response for:', query);
        
        // Check for simple greetings
        const simpleResponses = {
            'hi': "Hello! 🦇 I'm Noxy Voldigoard. How can I assist you today?",
            'hello': "Hello there! 🦇 I'm Noxy, your AI assistant. What can I help you with?",
            'hey': "Hey! 🦇 What's on your mind today?",
            'hai': "Hai! 🦇 Apa yang bisa saya bantu?",
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
        
        for (const [key, response] of Object.entries(simpleResponses)) {
            if (lowerQuery.includes(key)) {
                console.log('✅ Using simple response for:', key);
                return response;
            }
        }

        // Search web for information
        console.log('🔍 Searching web for:', query);
        const searchResults = await searchWeb(query);
        
        if (searchResults.length === 0) {
            console.log('❌ No search results found');
            return `I couldn't find specific information about "${query}". This could be because:\n\n1. The topic is very new or specialized\n2. There's limited information available online\n3. The search terms need adjustment\n\nTry rephrasing your question or ask about a different topic! 🦇`;
        }

        console.log(`✅ Found ${searchResults.length} search results`);
        
        // Generate response from search results
        let response = `Based on my search for **"${query}"**, here's what I found:\n\n`;
        
        searchResults.forEach((result, index) => {
            if (result.snippet) {
                response += `**${index + 1}. ${result.title || 'Information'}**\n`;
                response += `${result.snippet}\n\n`;
            }
        });
        
        response += "---\n\n*Note: Information is gathered from web search results and may not be current.*";
        
        // Limit response length
        if (response.length > 1500) {
            response = response.substring(0, 1500) + '...\n\n*Response truncated for readability.*';
        }
        
        return response;

    } catch (error) {
        console.error('❌ AI response error:', error);
        return "I encountered an error while processing your request. Please try again in a moment. 🦇";
    }
}

// Search web using SerpApi
async function searchWeb(query) {
    try {
        console.log('🌐 Searching with SerpApi:', query);
        
        const response = await axios.get('https://serpapi.com/search.json', {
            params: {
                engine: 'google',
                q: query,
                api_key: SERPAPI_KEY,
                num: 3,
                gl: 'us',
                hl: 'en'
            },
            timeout: 10000 // 10 second timeout
        });

        console.log('✅ SerpApi response received');
        
        const results = response.data.organic_results || [];
        
        return results
            .filter(result => result.snippet && result.snippet.length > 30)
            .map(result => ({
                title: result.title || '',
                snippet: result.snippet || '',
                link: result.link || '',
                source: result.source || ''
            }));

    } catch (error) {
        console.error('❌ Search error:', error.message);
        
        // Fallback response if SerpApi fails
        return [
            {
                title: "Web Search Information",
                snippet: "I've searched for information about your query. For the most accurate and up-to-date information, I recommend checking reputable websites directly related to your topic."
            }
        ];
    }
}

// Delete chat
router.delete('/:chatId', async (req, res) => {
    try {
        const { chatId } = req.params;
        
        let chats = await initChatsDB();
        const initialLength = chats.length;
        
        chats = chats.filter(chat => chat.id !== chatId);
        
        if (chats.length === initialLength) {
            return res.json({
                success: false,
                error: 'Chat not found'
            });
        }
        
        await saveChats(chats);
        
        res.json({
            success: true,
            message: 'Chat deleted successfully'
        });

    } catch (error) {
        console.error('Delete chat error:', error);
        res.json({
            success: false,
            error: 'Failed to delete chat'
        });
    }
});

module.exports = router;