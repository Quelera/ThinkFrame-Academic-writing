// filepath: server.js
import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import { generateContentFromLLM } from './inference.js'; // Import the updated function

const app = express();
const port = process.env.PORT || 3000; // Use environment variable for port if available

app.use(cors());
app.use(express.json());

app.post('/generate', async (req, res) => {
    try {
        const { prompt, type } = req.body; // 'type' is 'title', 'concept', 'proposal' from frontend
        
        if (!prompt) { // 'type' might not be strictly needed by inference.js for this specific LLM endpoint
            return res.status(400).json({ 
                error: 'Prompt (text) is required' 
            });
        }
        if (!type) { // Though type is good for frontend to know what to expect
             return res.status(400).json({ error: 'Type of generation is required'});
        }

        // 'prompt' from req.body is the userPrompt for generateContentFromLLM
        // 'type' from req.body is passed along
        const llmResultText = await generateContentFromLLM(prompt, type); 

        // Construct response payload based on the original 'type' requested by frontend
        let responsePayload = {};
        if (type === 'title') {
            responsePayload.title = llmResultText;
        } else if (type === 'concept') { // Ensure frontend sends 'concept' as type
            responsePayload.concept = llmResultText;
        } else if (type === 'proposal') {
            responsePayload.proposal = llmResultText;
        } else {
            // Fallback if type is unknown, or if you have other types
            responsePayload.text = llmResultText; 
            console.warn(`[server.js] Unknown type received: ${type}, using 'text' key for response.`);
        }
        res.json(responsePayload);

    } catch (error) {
        console.error('[server.js] Generation error:', error.message);
        // Send a more generic error message to the client for security
        res.status(500).json({ error: error.message || 'Failed to generate content due to a server error.' });
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
    if (!process.env.HF_ACCESS_TOKEN) {
        console.warn("WARNING: HF_ACCESS_TOKEN environment variable is not set. LLM calls will fail.");
    }
});
