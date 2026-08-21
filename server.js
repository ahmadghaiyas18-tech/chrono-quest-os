const express = require('express');
const cors = require('cors');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());

// Serve static frontend files from current directory
app.use(express.static(path.join(__dirname)));

// Check API key availability at startup; the actual request still validates it.
const apiKey = process.env.GEMINI_API_KEY;
console.log(`API Key Loaded: ${apiKey ? 'Yes' : 'No'}`);

// API Endpoint for Gemini using @google/generative-ai SDK
app.post('/api/ask-gemini', async (req, res) => {
    try {
        const { prompt } = req.body;
        if (!prompt) {
            return res.status(400).json({ error: 'Prompt is required' });
        }

        if (!apiKey) {
            return res.status(500).json({ error: 'GEMINI_API_KEY is not configured in environment variables' });
        }

        // Initialize GoogleGenerativeAI with a stable Gemini model.
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-3.7-flash' });

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const answer = response.text() || 'Maaf, saya tidak dapat merespons saat ini.';

        res.json({ answer: answer, text: answer });
    } catch (error) {
        console.error('Error in /api/ask-gemini:', error);
        res.status(500).json({ error: error.message });
    }
});

// Fallback to index.html for client-side routing
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`ChronoQuest OS is running at http://localhost:${PORT}`);
});
