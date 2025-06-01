import dotenv from 'dotenv';
import { InferenceClient } from "@huggingface/inference";
import { fetchCitationsFromOpenAlex } from '../scripts/promptGenerators/citationFetcher.js';
// Configure dotenv before accessing process.env
dotenv.config();

const HUGGING_FACE_API_TOKEN = process.env.HF_ACCESS_TOKEN;
const MODEL_NAME = process.env.DEEPSEEK_MODEL_NAME || "deepseek-ai/DeepSeek-V3-0324";

/**
 * Generates content using the specified LLM via the Hugging Face Inference API.
 * @param {string} userPrompt - The detailed prompt for the LLM.
 * @param {string} type - The type of content being generated (e.g., 'title', 'concept', 'proposal').
 * @returns {Promise<string>} The generated text content from the LLM.
 */
export async function generateContentFromLLM(userPrompt, type) {
    if (!HUGGING_FACE_API_TOKEN) {
        console.error("CRITICAL: Hugging Face Access Token (HF_ACCESS_TOKEN) is not set in .env");
        throw new Error("Server configuration error: Missing API token.");
    }
    if (!MODEL_NAME) {
        console.error("CRITICAL: Model Name (DEEPSEEK_MODEL_NAME) is not set in .env");
        throw new Error("Server configuration error: Missing Model Name.");
    }
    if (!userPrompt) {
        throw new Error("User prompt cannot be empty.");
    }

    try {
        console.log(`[inference.js] Initializing client for ${type} generation...`);
        const client = new InferenceClient(HUGGING_FACE_API_TOKEN);

        console.log(`[inference.js] Sending request to model: ${MODEL_NAME}`);
        const chatCompletion = await client.chatCompletion({
            provider: "nebius", // This is the inference provider
            model: MODEL_NAME,
            messages: [
                {
                    role: "system",
                    content: "You are a helpful academic writing assistant. Provide clear, concise, and well-structured responses."
                },
                {
                    role: "user",
                    content: userPrompt
                }
            ]
        });

        if (!chatCompletion.choices?.[0]?.message?.content) {
            console.error("[inference.js] Unexpected response format:", chatCompletion);
            throw new Error("Unexpected response format from LLM API.");
        }

        return chatCompletion.choices[0].message.content.trim();

    } catch (error) {
        console.error("[inference.js] Error during LLM call:", error);
        throw error;
    }
}