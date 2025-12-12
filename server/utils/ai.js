const axios = require('axios');

class AIAssistant {
    constructor() {
        this.serpapiKey = "0be5ff098bed53fb055200fa4628d44ff9863d8788c1f98c6069b4ca1773c3b5";
        this.cache = new Map();
    }

    async processMessage(message, userId) {
        // Check cache first
        const cacheKey = `${userId}:${message}`;
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        // Handle common greetings
        const greetings = this.handleGreetings(message);
        if (greetings) return greetings;

        // Handle simple questions
        const simpleResponse = this.handleSimpleQuestions(message);
        if (simpleResponse) return simpleResponse;

        // Search for information
        const searchResults = await this.searchInformation(message);
        
        // Generate response
        const response = this.generateResponse(message, searchResults);
        
        // Cache the response
        this.cache.set(cacheKey, response);
        
        return response;
    }

    handleGreetings(message) {
        const lowerMessage = message.toLowerCase().trim();
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

        for (const [greeting, response] of Object.entries(greetings)) {
            if (lowerMessage.includes(greeting)) {
                return response;
            }
        }

        return null;
    }

    handleSimpleQuestions(message) {
        const lowerMessage = message.toLowerCase();
        
        const qaPairs = {
            'weather': "I can't check real-time weather, but I recommend checking weather apps or websites for accurate weather information.",
            'time': `The current time is approximately ${new Date().toLocaleTimeString()}. Please note this is based on your system time.`,
            'date': `Today's date is ${new Date().toLocaleDateString()}.`,
            'joke': "Why don't scientists trust atoms? Because they make up everything! 🦇",
            'jokes': "What do you call a bear with no teeth? A gummy bear! 🦇",
            'help': "I can help you with:\n1. Searching information online\n2. Answering questions\n3. Summarizing content\n4. TikTok downloads\nJust ask me anything! 🦇",
            'features': "My features include:\n• AI Chat with web search\n• Multiple chat sessions\n• User accounts\n• TikTok video downloader\n• File attachment (coming soon)\n• Dark/light theme",
            'commands': "You can:\n• Type any question to get information\n• Use the TikTok downloader button\n• Create new chats\n• Switch between conversations",
            'creator': "I was created by Bayu Official. He's a talented developer who built me to help people with information and tasks.",
            'capabilities': "I can search the web for current information, summarize articles, answer questions on various topics, and help you download TikTok videos."
        };

        for (const [keyword, response] of Object.entries(qaPairs)) {
            if (lowerMessage.includes(keyword)) {
                return response;
            }
        }

        return null;
    }

    async searchInformation(query) {
        try {
            // Use SerpApi for search
            const response = await axios.get('https://serpapi.com/search.json', {
                params: {
                    engine: 'google',
                    q: query,
                    api_key: this.serpapiKey,
                    num: 5,
                    gl: 'us',
                    hl: 'en'
                },
                timeout: 10000
            });

            const results = response.data.organic_results || [];
            
            // Process and filter results
            const processedResults = results
                .filter(result => result.snippet && result.snippet.length > 30)
                .map(result => ({
                    title: result.title || '',
                    snippet: result.snippet || '',
                    link: result.link || '',
                    source: result.source || '',
                    date: result.date || ''
                }))
                .slice(0, 3); // Get top 3 results

            return processedResults;
        } catch (error) {
            console.error('Search error:', error);
            
            // Fallback to different search approach if SerpApi fails
            try {
                // Try alternative search method
                const fallbackResponse = await axios.get(
                    `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1`
                );
                
                if (fallbackResponse.data && fallbackResponse.data.Abstract) {
                    return [{
                        title: fallbackResponse.data.Heading || 'Information',
                        snippet: fallbackResponse.data.Abstract,
                        link: fallbackResponse.data.AbstractURL || '',
                        source: 'DuckDuckGo'
                    }];
                }
            } catch (fallbackError) {
                console.error('Fallback search error:', fallbackError);
            }
            
            return [];
        }
    }

    generateResponse(query, searchResults) {
        if (searchResults.length === 0) {
            return `I couldn't find specific information about "${query}". This could be because:\n\n1. The topic is very new or specialized\n2. There's limited information available online\n3. The search terms need adjustment\n\nTry rephrasing your question or ask about a different topic! 🦇`;
        }

        // Analyze query type
        const questionWords = ['what', 'how', 'why', 'when', 'where', 'who', 'which', 'can', 'is', 'are', 'does', 'do', 'will', 'should'];
        const isQuestion = questionWords.some(word => 
            query.toLowerCase().startsWith(word + ' ') || 
            query.toLowerCase().includes(' ' + word + ' ')
        );

        let response = '';
        
        if (isQuestion) {
            // Direct answer format for questions
            response = `Based on my search for "${query}", here's what I found:\n\n`;
            
            searchResults.forEach((result, index) => {
                if (result.snippet) {
                    response += `**${result.title || 'Source ' + (index + 1)}**\n`;
                    response += `${result.snippet}\n\n`;
                    
                    if (result.source) {
                        response += `*Source: ${result.source}*\n`;
                    }
                    
                    response += '---\n\n';
                }
            });
            
            response += "**Disclaimer:** Information may not be current or complete. Always verify important details from official sources.";
        } else {
            // Summary format for general queries
            response = `Here's information about **${query}**:\n\n`;
            
            // Combine and summarize snippets
            const allSnippets = searchResults.map(r => r.snippet).join(' ');
            const sentences = allSnippets.split(/[.!?]+/).filter(s => s.trim().length > 20);
            
            // Take first 3-4 sentences for summary
            const summarySentences = sentences.slice(0, Math.min(4, sentences.length));
            response += summarySentences.map(s => s.trim() + '.').join(' ');
            
            response += '\n\n**Sources consulted:**\n';
            searchResults.forEach((result, index) => {
                if (result.source) {
                    response += `• ${result.source}\n`;
                }
            });
        }

        // Add contextual advice based on query type
        if (query.toLowerCase().includes('how to') || query.toLowerCase().includes('tutorial')) {
            response += '\n\n💡 **Tip:** For detailed tutorials, consider checking video platforms like YouTube for step-by-step guides.';
        } else if (query.toLowerCase().includes('news') || query.toLowerCase().includes('latest')) {
            response += '\n\n📰 **Note:** For the most current news, check reputable news websites directly.';
        } else if (query.toLowerCase().includes('recipe') || query.toLowerCase().includes('cook')) {
            response += '\n\n🍳 **Cooking tip:** Always adjust ingredients to your taste and dietary needs!';
        }

        // Ensure response isn't too long
        if (response.length > 1500) {
            response = response.substring(0, 1500) + '...\n\n[Response truncated for readability]';
        }

        return response;
    }

    // Clear cache periodically
    clearCache() {
        this.cache.clear();
        console.log('AI cache cleared');
    }
}

module.exports = new AIAssistant();