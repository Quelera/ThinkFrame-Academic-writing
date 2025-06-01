/**
 * @file conceptPaperGenerator_simplified.js
 * @description Generates a long-form concept paper prompt (~7 A4 pages).
 */

/**
 * Generates a prompt for an LLM to draft a Concept Paper.
 *
 * @param {string} coreIdea - The main research idea/topic from the user.
 * @param {string} generatedTitle - The previously generated title.
 * @returns {string} A detailed prompt string for the LLM.
 */
export async function generateSimplifiedConceptPaperPrompt(coreIdea, generatedTitle) {
    if (!coreIdea || coreIdea.trim() === "") {
        return "Error: Core idea input is empty.";
    }
    if (!generatedTitle || generatedTitle.trim() === "") {
        return "Error: A generated title is required.";
    }
let citations;
    try {
        citations = await fetchCitationsFromOpenAlex(`${generatedTitle} ${coreIdea}`, 5);
        console.log('[conceptPaperGenerator] Successfully fetched citations:', citations.length);
    } catch (error) {
        console.error('[conceptPaperGenerator] Error fetching citations:', error);
        citations = [];
    }

    // Format citations for the prompt
    const citationString = citations.length > 0 
        ? "\n\nSuggested Citations to Include:\n" + citations.map(citation => 
            `- ${citation.title} (${citation.year}) by ${citation.authors.join(', ')}`
        ).join('\n')
        : "\n\nNote: Please include relevant academic citations from your knowledge base.";



    const primaryTitle = generatedTitle.split('\n')[0].trim();

    const prompt = `
You are an expert academic writer. Write a paper following in the format given below based on the given research title and predefined structure. 
Nothing added or removed, apart from following the structure outlined below and as well make it detailed in and academic and in paragraph format, unless specified.
You will use the provided "Core Idea" and "Provided Research Title" as the foundation for this paper.

**User's Core Idea/Research Focus:**
--- CORE IDEA START ---
${coreIdea}
--- CORE IDEA END ---

**Provided Research Title:**
"${primaryTitle}"

**Task: Generate the Research concept**

**RESEARCH CONCEPT STRUCTURE & SECTION DETAILS:**


---

**STRUCTURE & SECTION-BY-SECTION INSTRUCTIONS:**

### Title
- Use the "Provided Research Title" exactly: "${primaryTitle}"

### 1. Introduction (¾ to 1 page)
- Hook the reader with real-world relevance and urgency of the research.
- Define the context and importance of the subject area.
- State the general objective and research focus.
- Use 1–2 APA citations from existing literature.

### 1.1 Background (1 to 1½ pages)
- Provide historical context and development of the topic.
- Explain how previous work has led to the need for this research.
- Identify key concepts, theories, or technologies relevant to the topic.
- Show knowledge gaps or problems with existing work.
- Include at least 2–3 citations from reliable sources (APA style).

### 1.2 Statement of the Problem (¾ page)
- Clearly define the issue or condition the research seeks to address.
- Mention its magnitude (local/regional/global scale).
- Explain who is affected and how.
- End with a strong justification on why this study must be conducted.
- Use 1–2 supporting citations.

### 1.2 Statement of the Problem (1 page)
- Elaborate on what, who, why, and how of the research problem.
- Discuss scale (global/local) and real implications.
- Use 1–2 citations.

**1.3.1Main Objective:**  
Write one sentence beginning with:  
"The aim of this study is to..."

**1.3.2 Specific Objectives:**  
List specific goals, each starting with:  
i. To determine requirements for...  
ii. To design a system for ... based on the requirements  
iii To implement...  using a, b, c, for backend and .... for frontend OR To implement the system using ....
iv. To test the .... against the requirements.


### 1.4 Expected Outcomes (¾ page)
- Describe what the research will produce: system, framework, insight, dataset, etc.
- Explain expected academic, technical, or community benefits.
- Focus on outcomes relevant to Uganda or other target beneficiaries.

### References (at least 5 real references)
- Use APA 7th edition.
- Include only references cited in the body.
- Do not invent references. Use real academic sources (from OpenAlex or similar).

---

**Formatting Rules:**
- Use paragraphs only; avoid bullet points unless specified.
- Maintain academic tone and logical flow.
- Avoid bold, italics, or strong text in output.
- Write fluently in English.

**Important:**
Ensure the total concept paper is approximately **7 A4 pages (double-spaced, font size 12)** in length.
`.trim();
}

export default {
    generateSimplifiedConceptPaperPrompt
};
