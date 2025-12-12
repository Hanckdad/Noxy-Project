const express = require('express');
const router = express.Router();
const axios = require('axios');

// TikTok Download API
router.post('/', async (req, res) => {
    try {
        let { url } = req.body;

        if (!url) {
            return res.status(400).json({ error: 'Masukkan URL TikTok' });
        }

        // Normalize URL
        if (!url.startsWith('http')) {
            url = 'https://' + url;
        }

        // Remove tracking parameters
        url = url.split('?')[0];

        // Use multiple API endpoints for better reliability
        const apiEndpoints = [
            'https://www.tikwm.com/api/',
            'https://tikwm.org/api/',
            'https://api.tikmate.app/api/lookup'
        ];

        let result = null;
        let lastError = null;

        // Try each API endpoint
        for (const apiUrl of apiEndpoints) {
            try {
                console.log(`Trying API: ${apiUrl}`);
                
                const response = await axios.post(apiUrl, {
                    url: url
                }, {
                    headers: {
                        'Content-Type': 'application/json',
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                    },
                    timeout: 10000
                });

                const data = response.data.data || response.data;

                if (data && (data.play || data.wmplay || data.hdplay)) {
                    // TikWM format
                    result = {
                        id: data.id || Date.now().toString(),
                        region: data.region || 'ID',
                        title: data.title || 'TikTok Video',
                        duration: data.duration || 0,
                        create_time: data.create_time || new Date().toISOString(),
                        username: data.author?.unique_id || 'unknown',
                        nickname: data.author?.nickname || 'Unknown User',
                        avatar: data.author?.avatar || '',
                        caption: data.title || '',
                        cover: data.cover || '',
                        dynamic_cover: data.dynamic_cover || '',
                        play_url: data.play || '',
                        wm_url: data.wmplay || '',
                        hd_url: data.hdplay || '',
                        music_url: data.music || '',
                        music_info: data.music_info || { title: 'Unknown Music' },
                        raw: data
                    };
                    break;
                } else if (data && data.video_url) {
                    // TikMate format
                    result = {
                        id: Date.now().toString(),
                        title: 'TikTok Video',
                        username: 'tiktok_user',
                        nickname: 'TikTok User',
                        play_url: data.video_url,
                        wm_url: data.video_url,
                        cover: data.cover || '',
                        music_url: data.music_url || '',
                        raw: data
                    };
                    break;
                }
            } catch (error) {
                lastError = error.message;
                console.log(`API ${apiUrl} failed: ${error.message}`);
                continue;
            }
        }

        if (!result) {
            // Fallback to HTML parsing if APIs fail
            try {
                const htmlResponse = await axios.get(url, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                    }
                });

                const html = htmlResponse.data;
                
                // Try to extract video URL from HTML (simple regex)
                const videoRegex = /"playAddr":"(https:\/\/[^"]+\.mp4[^"]*)"/g;
                const match = videoRegex.exec(html);
                
                if (match && match[1]) {
                    const videoUrl = match[1].replace(/\\\//g, '/');
                    result = {
                        id: Date.now().toString(),
                        title: 'TikTok Video',
                        play_url: videoUrl,
                        wm_url: videoUrl,
                        message: 'Video extracted from page source'
                    };
                }
            } catch (error) {
                console.error('HTML parsing failed:', error);
            }
        }

        if (!result) {
            return res.status(500).json({ 
                error: 'Gagal mengambil data dari TikTok',
                detail: lastError || 'Semua API gagal'
            });
        }

        res.json(result);
    } catch (err) {
        console.error('TikTok download error:', err);
        res.status(500).json({ 
            error: 'Terjadi kesalahan server', 
            detail: err.message 
        });
    }
});

// Alternative TikTok download endpoints
router.post('/v2', async (req, res) => {
    try {
        const { url } = req.body;
        
        if (!url) {
            return res.status(400).json({ error: 'URL is required' });
        }

        // Alternative API using different service
        const response = await axios.get('https://api.tiktokvideosaver.com/download', {
            params: {
                url: url
            },
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });

        if (response.data && response.data.video) {
            res.json({
                success: true,
                play_url: response.data.video,
                wm_url: response.data.video,
                title: response.data.title || 'TikTok Video'
            });
        } else {
            throw new Error('No video found in response');
        }
    } catch (error) {
        console.error('Alternative TikTok API error:', error);
        res.status(500).json({ error: 'Download failed' });
    }
});

module.exports = router;