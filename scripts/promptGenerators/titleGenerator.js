/**
 * @file titleGenerator.js
 * @description Generates a prompt for an LLM to create academic titles.
 */

/**
 * Generates a prompt for an LLM to create academic titles.
 *
 * @param {string} coreIdea - The main research idea, topic, or abstract draft from the user.
 * @returns {string} A detailed prompt string for the LLM.
 */
export function generateTitlePrompt(coreIdea) {
    if (!coreIdea || coreIdea.trim() === "") {
        return "Error: Core idea input is empty. Cannot generate titles.";
    }

    const prompt = `
You are an AI assistant tasked with generating academic research titles based on a provided core idea.

**Core Principles for Title Generation:**
1.  **Engaging:** The title should attract the reader's attention and pique their interest.
2.  **Concise:** Use the fewest possible words while ensuring the title is highly descriptive. Eliminate all unnecessary words.
3.  **Descriptive:** The title must accurately reflect the main subject, scope, and essence of the investigation. It should provide a clear, general understanding of the research.
4.  **Clarity (Avoid Obscurity):** Do not use highly specialized technical jargon or rarely-used abbreviations unless they are fundamental to the topic and widely understood within the target academic field. Prioritize clarity for a broader relevant audience.

**User's Core Idea/Research Focus:**
--- INPUT START ---
${coreIdea}
--- INPUT END ---

**Task:**
Based on the user's input above and adhering to ALL the core principles listed, generate 3 to 5 distinct and effective academic titles.

**Output Format:**
-   Present the generated titles as a list.
-   Each title should be on a new line.
-   Do NOT number the titles.
-   Do NOT add any introductory or concluding remarks, just the list of titles.

**Example of Desired Output (each title on a new line):**
Exploring the Impact of Quantum Computing on Financial Modeling
Cybersecurity Challenges in IoT-Enabled Healthcare Systems
A Machine Learning Approach to Early Wildfire Detection

If you are configured to return a JSON response, the "title" field should contain a single string with each title separated by a newline character, or an array of title strings. For this application, distinct titles separated by newlines in a single string is the preferred format for the 'title' field.
`;
    return prompt.trim();
}