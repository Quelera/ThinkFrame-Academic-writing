/**
 * @file proposalGenerator_simplified.js
 * @description Generates a full-length research proposal prompt (~16–20 A4 pages).
 */

/**
 * Generate a full academic research proposal from a concept paper.
 * @param {string} coreIdea - The main research idea/topic.
 * @param {string} generatedTitle - The previously generated title.
 * @param {string} generatedConceptPaper - The previously generated concept paper text.
 * @returns {string} A detailed prompt string for the LLM.
 */
export function generateSimplifiedProposalPrompt(coreIdea, generatedTitle, generatedConceptPaper) {
    if (!coreIdea) return "Error: Core idea is missing.";
    if (!generatedTitle) return "Error: Title is missing.";
    if (!generatedConceptPaper) return "Error: Concept Paper is missing.";

    const primaryTitle = generatedTitle.split('\n')[0].trim();

    return `
You are an expert academic writer. Using the provided CONCEPT PAPER, write a **detailed research proposal** of **16 to 20 pages A4 size**, ready for university-level submission.
The proposal should be structured and formatted according to academic standards. The content should be coherent and relevant to the provided core idea. The proposal must be well-organized, with clear headings and subheadings.
The proposal should be written in a formal, academic tone, suitable for submission to a scholarly journal or conference. It should demonstrate a deep understanding of the research topic and its significance.
You will use the provided "Core Idea," "Generated Title," and the "Existing Concept Paper" as the foundation.


**Core Idea:**
--- CORE IDEA START ---
${coreIdea}
--- CORE IDEA END ---

**Generated Title:** "${primaryTitle}"

**Existing Concept Paper (to be expanded upon):**
--- CONCEPT PAPER START ---
${generatedConceptPaper}
--- CONCEPT PAPER END ---

**Task: Generate the Research Proposal**

**RESEARCH PROPOSAL STRUCTURE & SECTION DETAILS:**

### Title
- Use the title from the concept paper as-is.

---

### 1. Introduction 
- Reintroduce the topic with a fresh hook.
- Provide real-world context, motivation, and scholarly background.
- End with a research aim or question.
- Include 2 citations minimum.

### 1.1 Background 
- Present historical development, current status of research in the domain.
- Explain theories, technologies, or frameworks that relate.
- Clearly define where gaps or contradictions lie.
- Use 3–4 citations minimum.

### 1.2 Statement of the Problem 
- Elaborate on what, who, why, and how of the research problem. but should be made in paragraph format.
- Define the problem in detail, including:
- Discuss scale (global/local) and real implications.
.

### 1.3 Objectives of the study
-Follow this exact structure:

**1.3.1Main Objective:**  
Write one sentence beginning with:  
"The aim of this study is to..."

**1.3.2 Specific Objectives:**  
List specific goals, each starting with:  
i. To determine requirements for...  
ii. To design a system for ... based on the requirements  
iii To implement...  using a, b, c, for backend and .... for frontend OR To implement the system using ....  
iv. To test the .... against the requirements.

### 1.4 Research Scope 
- **1.4.1 System Scope**: Boundaries, functionalities, exclusions.
- **1.4.2 Geographical Scope**: Where the research/system applies (e.g., Uganda).

### 1.5 Justification
- Provide rationale: academic, social, technical, or policy relevance.
- Explain how the research will contribute to knowledge, practice, or policy.


---

### 2. Literature Review 
Break down the review as follows:
- **2.1 Introduction**
- Briefly introduce the literature review, its purpose, and how it relates to the research problem.
- **2.2 Historical Context**
- **2.3 Current Trends**
- **2.4 Supporting Frameworks**
- Discuss relevant theories, models, or frameworks that support your research.

- **2.5 Related Systems** 
  - At least 4 Existing Systems, each with own subsection: describe, evaluate, gaps)
  -- Discuss how these systems relate to your research and their limitations.
- **2.5.1 Limitations of Existing Systems**
- Discuss limitations of existing systems, focusing on gaps that your research will address.
- **2.6 Ugandan Context**
- Use 6–8 real citations.

---

### 3. Methodology 
Subsections:
- **3.1 Introduction**
-Briefly the section, by briefly talking about what the parts down are all about
- **3.2 Potential Methodologies**
   - Discuss SDLC, Prototyping, Agile, Scrum in details
   -Each methofology should be discussed in its own subsection. 
   -Discuss and discard the ones that are not suitable for the project.
   -From the discussed methodologies, choose one that is most suitable for the project.
- **3.3 Adopted Methodology**
   - Describe the chosen methodology in detail. and explain why and how it will be used. 
   - Discuss the phases involved in the chosen methodology, such as planning, Gathering requirements, design, Development, and testing. Each phase explained in details, depending on the methodology chosen.

---

### References
- Minimum 10 scholarly sources in APA 7th format.
- All must be cited in the body text.
- Do not fabricate sources, use citationFetcher.

---

**FORMATTING RULES:**
- Use paragraph format only (no bullets unless specifically asked).
- No bold or strong text.
- Academic, well-structured English throughout.**.

Begin writing the full proposal now.
`.trim();
}

export default {
    generateSimplifiedProposalPrompt
};
