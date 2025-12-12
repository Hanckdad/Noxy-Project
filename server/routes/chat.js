const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');

const chatsFilePath = path.join(__dirname, '../database/chats.json');
const SERPAPI_KEY = "0be5ff098bed53fb055200fa4628d44ff9863d8788c1f98c6069b4ca1773c3b5";

// Ensure chats database exists
async function ensureChatsDatabase() {
    try {
        await fs.mkdir(path.dirname(chatsFilePath), { recursive: true });
        try {
            await fs.access(chatsFilePath);
        } catch {
            await fs.writeFile(chatsFilePath, JSON.stringify([]));
        }
    } catch (error) {
        console.error('Chats database setup error:', error);
    }
}

// Read chats from file
async function readChats() {
    try {
        await ensureChatsDatabase();
        const data = await fs.readFile(chatsFilePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error reading chats:', error);
        return [];
    }
}

// Write chats to file
async function writeChats(chats) {
    try {
        await fs.writeFile(chatsFilePath, JSON.stringify(chats, null, 2));
    } catch (error) {
        console.error('Error writing chats:', error);
    }
}

// Get user ID from token
function getUserIdFromToken(req) {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return null;
    
    try {
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'noxy-secret-key-2024');
        return decoded.id;
    } catch {
        return null;
    }
}

// Get user chats
router.get('/', async (req, res) => {
    try {
        const userId = getUserIdFromToken(req);
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const chats = await readChats();
        const userChats = chats.filter(chat => chat.userId === userId);
        
        res.json(userChats);
    } catch (error) {
        console.error('Get chats error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Process chat message
router.post('/', async (req, res) => {
    try {
        const userId = getUserIdFromToken(req);
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const { message, chatId } = req.body;
        
        if (!message) {
            return res.status(400).json({ error: 'Message is required' });
        }

        // Check for greetings
        const greetings = ['hi', 'hello', 'hey', 'hai', 'hola', 'bonjour', 'hallo'];
        const messageLower = message.toLowerCase().trim();
        
        if (greetings.includes(messageLower)) {
            return res.json({
                response: `Hello! 🦇 I'm Noxy Voldigoard. How can I help you today?`,
                chatId: chatId || Date.now().toString()
            });
        }

        // Search the web for information
        const searchResults = await searchWeb(message);
        
        // Generate AI response based on search results
        const aiResponse = await generateAIResponse(message, searchResults);
        
        // Save chat if chatId provided
        if (chatId) {
            const chats = await readChats();
            let chat = chats.find(c => c.id === chatId && c.userId === userId);
            
            if (!chat) {
                chat = {
                    id: chatId,
                    userId: userId,
                    title: message.substring(0, 30) + (message.length > 30 ? '...' : ''),
                    messages: [
                        { role: 'user', content: message },
                        { role: 'assistant', content: aiResponse }
                    ],
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                };
                chats.push(chat);
            } else {
                chat.messages.push(
                    { role: 'user', content: message },
                    { role: 'assistant', content: aiResponse }
                );
                chat.updatedAt = new Date().toISOString();
            }
            
            await writeChats(chats);
        }

        res.json({
            response: aiResponse,
            chatId: chatId || Date.now().toString()
        });
    } catch (error) {
        console.error('Chat processing error:', error);
        res.status(500).json({ error: 'Failed to process message' });
    }
});

// Search web using SerpApi
async function searchWeb(query) {
    try {
        const response = await axios.get('https://serpapi.com/search.json', {
            params: {
                engine: 'google',
                q: query,
                api_key: SERPAPI_KEY,
                num: 5
            }
        });

        const results = response.data.organic_results || [];
        
        // Extract relevant information
        const extractedResults = results.map(result => ({
            title: result.title,
            snippet: result.snippet,
            link: result.link,
            source: result.source
        })).filter(r => r.snippet && r.snippet.length > 20);

        return extractedResults.slice(0, 3); // Return top 3 results
    } catch (error) {
        console.error('Search error:', error);
        return [];
    }
}

// Generate AI response
async function generateAIResponse(query, searchResults) {
    try {
        if (searchResults.length === 0) {
            return "I couldn't find specific information about that. Could you please rephrase your question or ask about something else?";
        }

        // Analyze the query type
        const questionWords = ['what', 'how', 'why', 'when', 'where', 'who', 'which', 'can', 'is', 'are', 'does', 'do'];
        const isQuestion = questionWords.some(word => 
            query.toLowerCase().startsWith(word) || 
            query.toLowerCase().includes(` ${word} `)
        );

        let response = "";
        
        if (isQuestion) {
            // For questions, provide direct answer
            response = `Based on my search, here's what I found about "${query}":\n\n`;
            
            searchResults.forEach((result, index) => {
                response += `${index + 1}. ${result.snippet}\n`;
                if (result.source) {
                    response += `   Source: ${result.source}\n`;
                }
                response += '\n';
            });
            
            response += "Please note that this information may not be up-to-date or completely accurate. Always verify important information from multiple sources.";
        } else {
            // For general queries, provide summarized information
            response = `Here's some information about "${query}":\n\n`;
            
            const snippets = searchResults.map(r => r.snippet);
            const combinedInfo = snippets.join(' ');
            
            // Simple summarization (in production, use proper NLP)
            const sentences = combinedInfo.split('. ').filter(s => s.length > 20);
            const summary = sentences.slice(0, 3).join('. ');
            
            response += summary;
            
            if (summary.length < 100 && sentences.length > 3) {
                response += '. ' + sentences[3];
            }
            
            response += '\n\nThis information was gathered from web search results.';
        }

        // Add disclaimer if response is long
        if (response.length > 1000) {
            response = response.substring(0, 1000) + '...\n\n[Response truncated due to length]';
        }

        return response;
    } catch (error) {
        console.error('AI response generation error:', error);
        return "I found some information but encountered an error processing it. Please try asking in a different way.";
    }
}

// Delete chat
router.delete('/:chatId', async (req, res) => {
    try {
        const userId = getUserIdFromToken(req);
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const { chatId } = req.params;
        const chats = await readChats();
        
        const initialLength = chats.length;
        const filteredChats = chats.filter(chat => 
            !(chat.id === chatId && chat.userId === userId)
        );
        
        if (filteredChats.length === initialLength) {
            return res.status(404).json({ error: 'Chat not found' });
        }
        
        await writeChats(filteredChats);
        res.json({ message: 'Chat deleted successfully' });
    } catch (error) {
        console.error('Delete chat error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;