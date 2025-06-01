// thinkframe-simplified/backend/server.js
import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import { generateContentFromLLM } from './inference.js';

// Load environment variables first
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// API Endpoint for content generation
app.post('/generate', async (req, res) => {
    try {
        const { prompt, type } = req.body;

        if (!prompt || !type) {
            return res.status(400).json({ error: 'Both prompt and type are required.' });
        }

        console.log(`[server.js] Processing ${type} generation request...`);
        const llmResultText = await generateContentFromLLM(prompt, type);

        let responsePayload = {};
        if (type === 'title') {
            responsePayload.title = llmResultText;
        } else if (type === 'concept') {
            responsePayload.concept = llmResultText;
        } else if (type === 'proposal') {
            responsePayload.proposal = llmResultText;
        } else {
            console.warn(`[server.js] Unknown type "${type}", using 'text' key.`);
            responsePayload.text = llmResultText;
        }
        
        res.json(responsePayload);

    } catch (error) {
        console.error(`[server.js] Generation error:`, error.message);
        res.status(500).json({ error: error.message });
    }
});

// Health check endpoint
app.get('/', (req, res) => {
    res.json({ status: 'ok', message: 'ThinkFrame Backend is running' });
});

// Start server
app.listen(port, () => {
    console.log('\n=== ThinkFrame Backend Server ===');
    console.log(`🚀 Server is running at: http://localhost:${port}`);
    
    // Verify environment variables
    const envStatus = {
        'HF_ACCESS_TOKEN': !!process.env.HF_ACCESS_TOKEN,
        'HF_ROUTER_URL': !!process.env.HF_ROUTER_URL,
        'DEEPSEEK_MODEL_NAME': !!process.env.DEEPSEEK_MODEL_NAME
    };
    
    const missingVars = Object.entries(envStatus)
        .filter(([_, isSet]) => !isSet)
        .map(([key]) => key);

    if (missingVars.length > 0) {
        console.error('❌ Missing environment variables:', missingVars.join(', '));
        console.error('Please check your .env file and restart the server.');
    } else {
        console.log('✅ All environment variables verified');
        console.log('💡 Server is ready to handle requests!\n');
    }
});