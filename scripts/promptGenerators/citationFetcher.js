import axios from 'axios';

/**
 * Fetch up to 5 APA-style academic references using the OpenAlex API.
 * @param {string} topic - Topic to search for.
 * @returns {Promise<string[]>} - APA-style formatted references.
 */
async function fetchCitationsFromOpenAlex(topic) {
    if (!topic || topic.trim() === "") return [];

    try {
        const response = await axios.get('https://api.openalex.org/works', {
            params: {
                search: topic,
                per_page: 5,
                sort: 'relevance_score:desc'
            }
        });

        return response.data.results.map(work => {
            // Handle multiple authors
            const authors = work.authorships?.map(a => a.author.display_name) || ["Unknown Author"];
            const authorString = authors.length > 1 
                ? `${authors.slice(0, -1).join(", ")}, & ${authors[authors.length - 1]}`
                : authors[0];

            const year = work.publication_year || "n.d.";
            const title = work.title || "Untitled";
            const journal = work.host_venue?.display_name || "Unknown Journal";
            const doi = work.doi ? ` https://doi.org/${work.doi}` : "";

            return `${authorString} (${year}). ${title}. *${journal}*.${doi}`;
        });

    } catch (err) {
        console.error("Citation fetch error:", err.message);
        return [];
    }
}

export { fetchCitationsFromOpenAlex };
