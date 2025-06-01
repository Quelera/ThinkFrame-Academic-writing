import { generateTitlePrompt } from './promptGenerators/titleGenerator.js';
import { generateSimplifiedConceptPaperPrompt } from './promptGenerators/conceptPaperGenerator_simplified.js';
import { generateSimplifiedProposalPrompt } from './promptGenerators/proposalGenerator_simplified.js';
// --- MODULE LOAD PROMISE ---
// Ensure required modules are loaded before proceeding.
window.moduleLoadPromise = new Promise((resolve) => {
    const checkModules = () => {
        if (typeof marked !== 'undefined' && 
            typeof DOMPurify !== 'undefined' && 
            typeof window.jspdf !== 'undefined') {
            resolve();
        } else {
            setTimeout(checkModules, 50);
        }
    }
    checkModules();
});

// scripts/main.js - Simplified for direct sequential generation on index.html
// --- API COMMUNICATION ---
async function sendToBackend(prompt, type) {
    try {
        const response = await fetch('http://localhost:3000/generate', {
            method: 'POST',
            mode: 'cors',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                prompt,
                type
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Unknown error occurred' }));
            throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Backend request failed:', error);
        throw error;
    }
}

// --- GLOBAL APPLICATION STATE ---
// These are declared globally so they can be accessed by functions like window.handleTitleSelect
// which might be called from inline event handlers or other parts of the script.
window.appState = {
    coreIdea: null,
    generatedTitle: null,
    generatedConcept: null,
    generatedProposal: null,
    isProcessing: false,
    processedTitles: [] // Stores the list of generated titles for selection
};
window.selectedTitleIndex = -1; // Index of the currently selected title

document.addEventListener('DOMContentLoaded', () => {
    'use strict';
    // --- ELEMENTS ---
    const micButton = document.getElementById('micButton');
    const micIcon = micButton ? micButton.querySelector('i') : null;
    const micStatus = document.getElementById('micStatus');
    const transcriptText = document.getElementById('transcriptText');

    const genTitleBtn = document.getElementById('genTitleBtn');
    const genConceptBtn = document.getElementById('genConceptBtn');
    const genProposalBtn = document.getElementById('genProposalBtn');
    const clearAllBtn = document.getElementById('clearAllBtn');

    const titleOutputContainer = document.getElementById('titleOutputContainer');
    const titleOutputContent = document.getElementById('titleOutputContent'); // Used primarily for error messages
    const conceptOutputContainer = document.getElementById('conceptOutputContainer');
    const conceptOutputContent = document.getElementById('conceptOutputContent');
    const proposalOutputContainer = document.getElementById('proposalOutputContainer');
    const proposalOutputContent = document.getElementById('proposalOutputContent');

    const titlesList = document.getElementById('titlesList');
    const selectedTitleSection = document.getElementById('selectedTitleSection');
    const selectedTitleContent = document.getElementById('selectedTitleContent');

    // --- LOCAL STATE FOR SPEECH RECOGNITION ---
    let isRecording = false;
    let recognition = null;
    let finalTranscriptContent = ''; // Stores the accumulated transcript

    // --- HELPER FUNCTION: Update Generation Buttons State ---
    // Moved inside DOMContentLoaded to correctly reference button elements
    function updateGenerationButtonsState() {
        if (!genTitleBtn || !genConceptBtn || !genProposalBtn) {
            console.error('One or more generation buttons not found');
            return;
        }

        // Disable all buttons during processing
        if (window.appState.isProcessing) {
            genTitleBtn.disabled = true;
            genConceptBtn.disabled = true;
            genProposalBtn.disabled = true;
            [genTitleBtn, genConceptBtn, genProposalBtn].forEach(btn => {
                btn.classList.add('opacity-50', 'cursor-not-allowed');
                btn.classList.remove('hover:bg-blue-600');
            });
            return;
        }

        // Enable/disable buttons based on appState progression
        genTitleBtn.disabled = !window.appState.coreIdea;
        genConceptBtn.disabled = !window.appState.generatedTitle;
        genProposalBtn.disabled = !window.appState.generatedConcept;

        // Update button styles based on disabled state
        [genTitleBtn, genConceptBtn, genProposalBtn].forEach(btn => {
            if (btn.disabled) {
                btn.classList.add('opacity-50', 'cursor-not-allowed');
                btn.classList.remove('hover:bg-blue-600');
            } else {
                btn.classList.remove('opacity-50', 'cursor-not-allowed');
                btn.classList.add('hover:bg-blue-600');
            }
        });
    }

    // --- SPEECH RECOGNITION ---
    if (micButton && transcriptText) {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
            recognition.continuous = true;
            recognition.interimResults = true;
            recognition.lang = 'en-US';
            let currentCursorPosition = 0;

            recognition.onstart = () => {
                isRecording = true;
                micButton.classList.add('active');
                micIcon.className = 'fas fa-stop text-white text-4xl';
                micStatus.textContent = 'Listening...';
                currentCursorPosition = transcriptText.selectionStart;
                finalTranscriptContent = transcriptText.value; // Sync with current edits
            };
            recognition.onresult = (event) => {
                let interim_transcript = '';
                let local_final_segment = '';
                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    if (event.results[i].isFinal) local_final_segment += event.results[i][0].transcript;
                    else interim_transcript += event.results[i][0].transcript;
                }
                if (local_final_segment) {
                    const before = finalTranscriptContent.substring(0, currentCursorPosition);
                    const after = finalTranscriptContent.substring(currentCursorPosition);
                    finalTranscriptContent = before + local_final_segment + after;
                    currentCursorPosition += local_final_segment.length;
                }
                transcriptText.value = finalTranscriptContent + interim_transcript;
                transcriptText.selectionStart = transcriptText.selectionEnd = transcriptText.value.length;
            };
            recognition.onerror = (event) => {
                console.error('Speech error:', event.error);
                micStatus.textContent = 'Speech error. Try again.';
                resetMicVisuals();
                isRecording = false;
                updateGenerationButtonsState(); // Update buttons on error
            };
            recognition.onend = () => {
                isRecording = false;
                resetMicVisuals();
                micStatus.textContent = 'Tap mic to speak. Paused.';
                finalTranscriptContent = transcriptText.value; // Final sync
                window.appState.coreIdea = finalTranscriptContent.trim(); // Update appState
                updateGenerationButtonsState(); // Update buttons after recording ends
            };
        } else {
            if (micStatus) micStatus.textContent = 'Speech recognition not supported.';
            if (micButton) micButton.disabled = true;
        }

        micButton.addEventListener('click', () => {
            if (!recognition) return;
            if (!isRecording) {
                finalTranscriptContent = transcriptText.value;
                recognition.start();
            } else {
                recognition.stop();
            }
        });
        transcriptText.addEventListener('input', () => {
            // Only update appState.coreIdea from input if not currently recording
            if (!isRecording) {
                finalTranscriptContent = transcriptText.value;
                window.appState.coreIdea = finalTranscriptContent.trim();
                updateGenerationButtonsState(); // Update buttons on manual input
            }
        });
    }

    function resetMicVisuals() {
        if (micIcon) micIcon.className = 'fas fa-microphone text-white text-4xl';
        if (micButton) micButton.classList.remove('active');
    }

    // --- THEME MANAGEMENT ---
    const themeToggleBtn = document.getElementById('themeToggleBtn');
    const themeDropdownMenu = document.getElementById('themeDropdownMenu');
    const themeIcon = document.getElementById('themeIcon');

    function applyThemeVisuals(appliedTheme) {
        document.body.classList.remove('light-theme', 'dark-theme');
        document.body.classList.add(`${appliedTheme}-theme`);
        if (themeIcon) {
            themeIcon.className = `fas ${appliedTheme === 'dark' ? 'fa-moon' : 'fa-sun'} brand-text text-lg`;
        }
    }

    function updateThemeDropdownSelection(themePreference) {
        document.querySelectorAll('.theme-option').forEach(opt => {
            const isActive = opt.dataset.theme === themePreference;
            opt.classList.toggle('active', isActive);
            opt.setAttribute('aria-checked', isActive.toString());
        });
    }

    function setThemePreference(themePreference) {
        localStorage.setItem('theme', themePreference);
        let themeToApply;
        if (themePreference === 'system') {
            themeToApply = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        } else {
            themeToApply = themePreference;
        }
        applyThemeVisuals(themeToApply);
        updateThemeDropdownSelection(themePreference);
    }

    if (themeToggleBtn && themeDropdownMenu) {
        // Initialize theme and dropdown state
        const storedTheme = localStorage.getItem('theme');
        const initialThemePref = storedTheme || 'system';
        setThemePreference(initialThemePref);

        // Ensure dropdown is hidden initially
        themeDropdownMenu.classList.add('hidden'); // Ensure hidden by default
        themeDropdownMenu.classList.remove('active'); // Remove active if it was accidentally there

        // Theme toggle button click handler
        themeToggleBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            const isActive = themeDropdownMenu.classList.contains('active');

            // Close any other dropdowns/modals first
            if (howItWorksModal && !howItWorksModal.classList.contains('hidden')) {
                closeModal();
            }

            themeDropdownMenu.classList.toggle('active');
            themeDropdownMenu.classList.toggle('hidden'); // Toggle hidden class
            themeToggleBtn.setAttribute('aria-expanded', (!isActive).toString());
        });

        // Theme option click handlers
        const themeOptions = themeDropdownMenu.querySelectorAll('.theme-option');
        themeOptions.forEach(option => {
            option.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();
                const selectedTheme = option.dataset.theme;
                if (selectedTheme) {
                    setThemePreference(selectedTheme);
                    // Add a small delay before closing to show the selection
                    setTimeout(() => {
                        themeDropdownMenu.classList.remove('active');
                        themeDropdownMenu.classList.add('hidden'); // Hide dropdown
                        themeToggleBtn.setAttribute('aria-expanded', 'false');
                        themeToggleBtn.focus();
                    }, 150);
                }
            });
        });
    }

    // System theme change listener
    if (window.matchMedia) {
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
            if (localStorage.getItem('theme') === 'system') {
                const systemThemeToApply = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
                applyThemeVisuals(systemThemeToApply);
            }
        });
    }

    // --- HOW IT WORKS MODAL ---
    const howItWorksBtn = document.getElementById('howItWorks');
    const howItWorksModal = document.getElementById('howItWorksModal');
    const closeHowItWorksModal = document.getElementById('closeHowItWorksModal');

    // Ensure modal is hidden by default
    if (howItWorksModal) {
        howItWorksModal.classList.add('hidden');
    }

    function openModal(e) {
        if (e) e.preventDefault();
        if (howItWorksModal) {
            howItWorksModal.classList.remove('hidden');
            document.body.style.overflow = 'hidden'; // Prevent scrolling background
            if (closeHowItWorksModal) closeHowItWorksModal.focus();
        }
    }

    function closeModal(e) {
        if (e) e.preventDefault();
        if (howItWorksModal) {
            howItWorksModal.classList.add('hidden');
            document.body.style.overflow = ''; // Restore scrolling
            if (howItWorksBtn) howItWorksBtn.focus();
        }
    }

    if (howItWorksBtn) {
        howItWorksBtn.addEventListener('click', openModal);
    }

    if (closeHowItWorksModal) {
        closeHowItWorksModal.addEventListener('click', closeModal);
    }

    // --- GLOBAL EVENT LISTENERS ---
    document.addEventListener('click', (e) => {
        // Close theme dropdown if clicked outside
        if (themeDropdownMenu && themeDropdownMenu.classList.contains('active')) {
            if (!themeToggleBtn.contains(e.target) && !themeDropdownMenu.contains(e.target)) {
                themeDropdownMenu.classList.remove('active');
                themeDropdownMenu.classList.add('hidden'); // Hide dropdown
                themeToggleBtn.setAttribute('aria-expanded', 'false');
            }
        }
        // Close How It Works modal if clicked outside
        if (howItWorksModal && !howItWorksModal.classList.contains('hidden') && e.target === howItWorksModal) {
            closeModal();
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            // Close theme dropdown
            if (themeDropdownMenu && themeDropdownMenu.classList.contains('active')) {
                themeDropdownMenu.classList.remove('active');
                themeDropdownMenu.classList.add('hidden'); // Hide dropdown
                themeToggleBtn.setAttribute('aria-expanded', 'false');
                themeToggleBtn.focus();
            }
            // Close How It Works modal
            if (howItWorksModal && !howItWorksModal.classList.contains('hidden')) {
                closeModal();
            }
        }
    });

    // --- CONTENT FORMATTING AND DISPLAY ---
    let markedInstance;
    try {
        markedInstance = marked.marked || marked;
    } catch (error) {
        console.error('Error initializing marked:', error);
    }

    function formatContent(content) {
        if (!markedInstance) {
            console.error('Marked library not loaded');
            return content;
        }

        // Configure marked for better formatting
        markedInstance.setOptions({
            breaks: true,      // Convert \n to <br>
            gfm: true,        // Enable GitHub Flavored Markdown
            headerIds: false,  // Disable header IDs for cleaner output
            smartLists: true,  // Use smarter list behavior
            smartypants: true  // Use smart punctuation
        });

        // Pre-process content for better formatting
        content = content
            .replace(/\*\*(\d+\.\d+\s+[^*:]+):\*\*/g, (_, title) => `\n### ${title}:\n`)
            .replace(/\*\*([^*:]+):\*\*/g, (_, title) => `\n## ${title}:\n`)
            .replace(/# ([^#\n]+)/g, (_, title) => `\n# ${title}\n`)
            .replace(/\n---\n/g, '\n\n---\n\n')
            .replace(/^\s*[-*]\s+/gm, '* ');        // Convert to HTML using marked
        let html = markedInstance(content);

        // Post-process HTML for enhanced styling
        html = html
            .replace(/<h1[^>]*>/g, '<h1 class="text-3xl font-bold mb-4">')
            .replace(/<h2[^>]*>/g, '<h2 class="text-2xl font-bold mb-3">')
            .replace(/<h3[^>]*>/g, '<h3 class="text-xl font-bold mb-2">')
            .replace(/<p[^>]*>/g, '<p class="mb-4">')
            .replace(/<ul[^>]*>/g, '<ul class="list-disc pl-5 mb-4 space-y-2">')
            .replace(/<ol[^>]*>/g, '<ol class="list-decimal pl-5 mb-4 space-y-2">')
            .replace(/<li[^>]*>/g, '<li class="mb-1">');

        return html;
    }

    // Function to safely update content in the UI
    function updateOutputContent(rawContent, containerElement, contentElement) {
        if (!rawContent || !containerElement || !contentElement) {
            console.error('Missing arguments for updateOutputContent');
            return;
        }
    
        try {
            console.log('Updating output with content:', rawContent);
            const formattedHtml = formatContent(rawContent);
            console.log('Formatted HTML:', formattedHtml);
            const sanitizedHtml = DOMPurify.sanitize(formattedHtml);
    
            containerElement.classList.remove('hidden');
            contentElement.innerHTML = sanitizedHtml;
            containerElement.style.height = 'auto';
            containerElement.style.height = containerElement.scrollHeight + 'px';
        } catch (error) {
            console.error('Error updating content:', error);
            contentElement.innerHTML = '<p class="text-red-500">Error displaying content. Please try again.</p>';
        }
    }

    // --- EDIT FUNCTIONALITY ---
    function makeContentEditable(contentElement) {
        contentElement.setAttribute('contenteditable', 'true');
        contentElement.classList.add('editable-content');
        contentElement.style.minHeight = '200px';
        contentElement.style.padding = '1rem';
        contentElement.style.border = '1px solid #e5e7eb';
        contentElement.style.borderRadius = '0.375rem';
        contentElement.style.outline = 'none';
    }

    function setupEditButton(contentId) {
        const contentElement = document.getElementById(contentId);
        const container = contentElement.closest('.generated-output-container');
        const editBtn = document.createElement('button');
        editBtn.className = 'edit-btn btn-outline px-2 py-1 rounded';
        editBtn.innerHTML = '<i class="fas fa-edit mr-1"></i>Edit';
        
        editBtn.addEventListener('click', () => {
            const isEditing = contentElement.getAttribute('contenteditable') === 'true';
            if (!isEditing) {
                makeContentEditable(contentElement);
                editBtn.innerHTML = '<i class="fas fa-save mr-1"></i>Save';
            } else {
                contentElement.setAttribute('contenteditable', 'false');
                contentElement.classList.remove('editable-content');
                editBtn.innerHTML = '<i class="fas fa-edit mr-1"></i>Edit';
            }
        });

        // Insert edit button before the first button in the container
        const buttonsContainer = container.querySelector('.flex.gap-2');
        if (buttonsContainer) {
            buttonsContainer.insertBefore(editBtn, buttonsContainer.firstChild);
        }
    }

    // Setup edit buttons for concept and proposal content
    ['conceptOutputContent', 'proposalOutputContent'].forEach(setupEditButton);

    // Handle generation success (dispatcher)
    async function handleGenerationSuccess(type, responseData) {
        try {
            console.log(`Handling ${type} generation success:`, responseData);

            switch (type) {
                case 'title':
                    if (!responseData.title) {
                        throw new Error('No title content in response');
                    }
                    console.log('Processing title response:', responseData.title);
                    return await handleTitleGeneration(responseData.title);

                case 'concept':
                    return await handleConceptGeneration(responseData);

                case 'proposal':
                    if (!responseData.proposal) {
                        throw new Error('No proposal content in response');
                    }
                    window.appState.generatedProposal = responseData.proposal;
                    return await updateOutputContent(responseData.proposal, proposalOutputContainer, proposalOutputContent);

                default:
                    throw new Error(`Unknown generation type: ${type}`);
            }
        } catch (error) {
            console.error(`Error in generation success handler: ${error}`);
            throw error;
        }
    }

    // Helper functions for title handling
    function escapeHTML(str) {
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function createTitleListItem(title, index) {
        const escapedTitle = escapeHTML(title);
        return `
            <li class="p-3 border rounded mb-2 hover:bg-gray-50 transition-colors" data-title-index="${index}">
                <div class="font-medium text-lg">${escapedTitle}</div>
                <button
                    class="mt-2 px-3 py-1 text-sm border rounded hover:bg-blue-50 hover:border-blue-200 transition-colors select-title-btn"
                    data-index="${index}"
                >
                    Select This Title
                </button>
            </li>
        `;
    }

    function updateTitleSelection(titlesListElement, selectedIndex) {
        titlesListElement?.querySelectorAll('li').forEach((li, i) => {
            if (i === selectedIndex) {
                li.classList.add('border-blue-500', 'border-2');
                li.classList.remove('border');
            } else {
                li.classList.remove('border-blue-500', 'border-2');
                li.classList.add('border');
            }
        });
    }

    // Handle title generation - improved synchronization
    async function handleTitleGeneration(content) {
        // Clear previous state for titles
        titlesList.innerHTML = '';
        selectedTitleSection.classList.add('hidden');
        selectedTitleContent.textContent = '';
        titleOutputContent.innerHTML = ''; // Clear any previous error messages

        // Process titles
        let titles = content
            .split('\n')
            .map(t => t.trim())
            .filter(t => {
                // Enhanced filtering
                if (!t || t.length < 10) return false;
                if (t.toLowerCase().startsWith('title') || t.startsWith('-')) return false;
                return true;
            });

        // Cache titles in application state
        window.appState.processedTitles = titles; // Always update with the latest processed titles

        if (titles.length === 0) {
            titleOutputContent.innerHTML = '<p class="text-red-500 p-3">No valid titles generated. Please try again.</p>';
            titleOutputContainer.classList.remove('hidden'); // Show container for error message
            return;
        }

        try {
            // Update UI
            titleOutputContainer.classList.remove('hidden');
            const titlesHTML = titles.map((title, index) => createTitleListItem(title, index)).join('');
            titlesList.innerHTML = titlesHTML;

            // Add event listeners
            titlesList.querySelectorAll('.select-title-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    const index = parseInt(btn.dataset.index, 10);
                    if (!isNaN(index) && index >= 0 && index < titles.length) {
                        window.handleTitleSelect(index); // Use window.handleTitleSelect
                    }
                });
            });

            // Auto-select first title
            if (titles.length > 0) {
                window.handleTitleSelect(0); // Use window.handleTitleSelect
            }

        } catch (error) {
            console.error('Error in title generation:', error);
            titleOutputContent.innerHTML = '<p class="text-red-500 p-3">Error processing titles. Please try again.</p>';
            titleOutputContainer.classList.remove('hidden');
        }
    }

    // Handle concept generation
    async function handleConceptGeneration(responseData) {
        if (!responseData || !responseData.concept) {
            throw new Error('Invalid concept response received');
        }

        try {
            console.log('[DEBUG] Processing concept response:', responseData);
            window.appState.generatedConcept = responseData.concept;
            await updateOutputContent(responseData.concept, conceptOutputContainer, conceptOutputContent);
            
            // Enable proposal button
            if (genProposalBtn) {
                genProposalBtn.disabled = false;
                genProposalBtn.classList.remove('opacity-50', 'cursor-not-allowed');
            }
        } catch (error) {
            console.error('Error processing concept:', error);
            conceptOutputContent.innerHTML = '<p class="text-red-500">Error displaying concept. Please try again.</p>';
            throw error;
        }
    }

    // Handle title selection (global function as it's used in dynamically added elements)
    window.handleTitleSelect = function(index) {
        const titles = window.appState.processedTitles || [];

        // Validate title selection
        if (!titles || !titles[index]) {
            console.error('Invalid title selection');
            return;
        }

        const title = titles[index];

        if (selectedTitleSection && selectedTitleContent && genConceptBtn) {
            selectedTitleSection.classList.remove('hidden');
            selectedTitleContent.textContent = title;

            // Update app state
            window.appState.generatedTitle = title;
            updateGenerationButtonsState(); // Update buttons after title selection

            // Update visual selection
            updateTitleSelection(titlesList, index);
        }
    };

    // Get output elements based on generation type
    function getOutputElements(type) {
        switch (type) {
            case 'title':
                return {
                    container: titleOutputContainer,
                    content: titleOutputContent // Note: titleOutputContent is mainly for errors, titlesList for list
                };
            case 'concept':
                return {
                    container: conceptOutputContainer,
                    content: conceptOutputContent
                };
            case 'proposal':
                return {
                    container: proposalOutputContainer,
                    content: proposalOutputContent
                };
            default:
                throw new Error(`Unknown generation type: ${type}`);
        }
    }

    // Handle generation error
    function handleGenerationError(type, error) {
        const { container, content } = getOutputElements(type);

        console.error(`Error generating ${type}:`, error);
        const sanitizedErrorMessage = (error && error.message) ? DOMPurify.sanitize(error.message) : 'An unknown error occurred.';

        if (content && container) {
            content.innerHTML = `<p class="text-red-500 p-3">Error: ${sanitizedErrorMessage}</p>`;
            container.classList.remove('hidden');
        } else {
            console.error(`Cannot display error: Output elements for type "${type}" not found.`);
            alert(`An error occurred with ${type} generation, and its output area is missing. Error: ${sanitizedErrorMessage}`);
        }
    }

    // Main generation function
    const handleGeneration = async (button, type, promptFunction, ...promptArgs) => {
        let originalButtonHTML = '';
        try {
            window.appState.coreIdea = transcriptText.value.trim();
            if (!window.appState.coreIdea) {
                alert('Please provide your core ideas in the text area first.');
                transcriptText.focus();
                return;
            }

            if (button) {
                originalButtonHTML = button.innerHTML;
                button.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Generating...';
            }
            window.appState.isProcessing = true;
            updateGenerationButtonsState();// Update button states immediately

            const { container, content } = getOutputElements(type);
            if (!container || !content) {
                console.error(`Output container or content element for type "${type}" not found`);
                throw new Error('Required UI elements are missing');
            }

            // Clear previous outputs based on type (for subsequent runs)
            if (type === 'title') {
                titlesList.innerHTML = '';
                selectedTitleSection.classList.add('hidden');
                selectedTitleContent.textContent = '';
                window.appState.processedTitles = [];
                window.appState.generatedTitle = null;
                window.appState.generatedConcept = null;
                window.appState.generatedProposal = null;
                conceptOutputContainer.classList.add('hidden');
                conceptOutputContent.innerHTML = '';
                proposalOutputContainer.classList.add('hidden');
                proposalOutputContent.innerHTML = '';
            } else if (type === 'concept') {
                window.appState.generatedConcept = null;
                window.appState.generatedProposal = null;
                conceptOutputContainer.classList.add('hidden');
                conceptOutputContent.innerHTML = '';
                proposalOutputContainer.classList.add('hidden');
                proposalOutputContent.innerHTML = '';
            } else if (type === 'proposal') {
                window.appState.generatedProposal = null;
                proposalOutputContainer.classList.add('hidden');
                proposalOutputContent.innerHTML = '';
            }

            container.classList.remove('hidden');
            content.innerHTML = `
                <div class="text-center py-4"> 
                    <i class="fas fa-spinner fa-spin text-2xl"></i>
                    <p class="mt-2">Generating content...</p>
                </div>
            `;            // Wait for modules to load and validate promptFunction
            await window.moduleLoadPromise;
            if (typeof promptFunction !== 'function') {
                throw new Error(`Prompt generator function for ${type} is not properly loaded`);
            }            // Generate and validate prompt
            console.log(`[DEBUG] Generating ${type} prompt with args:`, promptArgs);
            
            let prompt = '';
            if (type === 'concept') {
                let generatedPrompt = await generateSimplifiedConceptPaperPrompt(promptArgs[0], promptArgs[1]);
                if (generatedPrompt) {
                    prompt = generatedPrompt.trim();
                } else {
                    prompt = `Generate a concept paper based on the core idea: "${promptArgs[0]}" and the title: "${promptArgs[1]}".`;
                }
            } else {
                prompt = await promptFunction(...promptArgs);
            }
            
            console.log(`[DEBUG] Generated ${type} prompt:`, prompt);
            
            const promptForLLM = prompt;
            
            const responseData = await sendToBackend(promptForLLM, type);
            await handleGenerationSuccess(type, responseData);

        } catch (error) {
            handleGenerationError(type, error);
        } finally {
            window.appState.isProcessing = false;
            if (button) button.innerHTML = originalButtonHTML;
            updateGenerationButtonsState(); // Ensure buttons are re-enabled or disabled correctly
        }
    };

    // Event listeners for generation buttons
    if (genTitleBtn) {
        genTitleBtn.addEventListener('click', async () => {
            try {
                const currentTranscriptText = transcriptText.value.trim();
                if (!currentTranscriptText) {
                    alert('Please provide your core ideas in the text area first.');
                    transcriptText.focus();
                    return;
                }
                await handleGeneration(
                    genTitleBtn,
                    'title',
                    generateTitlePrompt,
                    currentTranscriptText
                );
            } catch (error) {
                console.error('Error in title generation:', error);
                handleGenerationError('title', error);
            }
        });
    }    if (genConceptBtn) {
        genConceptBtn.addEventListener('click', async () => {
            try {
                const currentCoreIdea = window.appState.coreIdea || transcriptText.value.trim();
                const currentGeneratedTitle = window.appState.generatedTitle;

                if (!currentCoreIdea || !currentGeneratedTitle) {
                    alert('Please make sure you have entered your core idea and selected a title.');
                    return;
                }

                console.log('[DEBUG] Concept generation parameters:', {
                    coreIdea: currentCoreIdea,
                    title: currentGeneratedTitle
                });

                // Clear previous outputs
                window.appState.generatedConcept = null;
                window.appState.generatedProposal = null;
                
                await handleGeneration(
                    genConceptBtn,
                    'concept',
                    generateSimplifiedConceptPaperPrompt,
                    currentCoreIdea,
                    currentGeneratedTitle
                );
            } catch (error) {
                console.error('Error generating concept:', error);
                handleGenerationError('concept', error);
            }
        });
    }

    if (genProposalBtn) {
        genProposalBtn.addEventListener('click', () => {
            const currentCoreIdea = window.appState.coreIdea || transcriptText.value.trim();
            const currentGeneratedTitle = window.appState.generatedTitle;
            const currentGeneratedConcept = window.appState.generatedConcept;

            handleGeneration(genProposalBtn, 'proposal', generateSimplifiedProposalPrompt, currentCoreIdea, currentGeneratedTitle, currentGeneratedConcept);
        });
    }    // Remove fixed heights and enable full content display
    [titleOutputContainer, conceptOutputContainer, proposalOutputContainer].forEach(container => {
        if (container) {
            container.classList.add('output-container');
            container.style.maxHeight = 'none';
            container.style.height = 'auto';
            container.style.overflow = 'visible';
        }
    });    // --- AUTO-EXTEND CONTAINER HEIGHT FOR OUTPUT AREAS ---
    function setupContainer(container) {
        if (!container) return;
        
        container.classList.add('output-container');
        container.style.maxHeight = 'none';
        container.style.height = 'auto';
        container.style.overflow = 'visible';
        
        const content = container.querySelector('.output-content');
        if (content) {
            content.style.maxHeight = 'none';
            content.style.height = 'auto';
            content.style.overflow = 'visible';
        }
    }

    // Setup all containers
    setupContainer(titleOutputContainer);
    setupContainer(conceptOutputContainer);
    setupContainer(proposalOutputContainer);    function setupAutoResize(container) {
        if (!container) return;
        // Remove any fixed height so that the container can grow naturally
        container.style.height = 'auto';
        container.style.overflowY = 'visible';

        // Observe any changes in the container's content and adjust its height
        const observer = new MutationObserver(() => {
            // Reset and then adjust the height according to its content
            container.style.height = 'auto';
            container.style.height = container.scrollHeight + 'px';
        });
          observer.observe(container, { childList: true, subtree: true });
    }

    // Setup auto-resize for concept and proposal output containers
    setupAutoResize(conceptOutputContainer);
    setupAutoResize(proposalOutputContainer);

    // Also, when the window resizes, force a recalculation of the containers size
    window.addEventListener('resize', () => {
        [conceptOutputContainer, proposalOutputContainer].forEach(container => {
            if (container) {
                container.style.height = 'auto';
                container.style.height = container.scrollHeight + 'px';
            }
        });
    });
    // --- CLEAR ALL ---
    if (clearAllBtn) {
        clearAllBtn.addEventListener('click', () => {
            transcriptText.value = '';
            finalTranscriptContent = '';
            window.appState.coreIdea = null;
            window.appState.generatedTitle = null;
            window.appState.generatedConcept = null;
            window.appState.generatedProposal = null;
            window.appState.processedTitles = []; // Clear stored titles
            window.selectedTitleIndex = -1; // Reset selected index

            // Hide all output containers and clear their content
            titleOutputContainer.classList.add('hidden');
            titleOutputContent.textContent = '';
            titlesList.innerHTML = ''; // Clear titles list
            selectedTitleSection.classList.add('hidden');
            selectedTitleContent.textContent = '';

            conceptOutputContainer.classList.add('hidden');
            conceptOutputContent.innerHTML = '';
            proposalOutputContainer.classList.add('hidden');
            proposalOutputContent.innerHTML = '';

            if (isRecording && recognition) recognition.stop();
            micStatus.textContent = 'Tap mic to speak.';
            updateGenerationButtonsState(); // Update buttons after clearing
        });
    }
    // --- EXPORT BUTTONS FUNCTIONALITY FOR CONCEPT AND PROPOSAL ---    // Helper function to export text as a Word (.doc) file
    function exportTextAsDoc(filename, text) {
        const blob = new Blob(['\ufeff', text], { type: 'application/msword' });
        const url = URL.createObjectURL(blob);
        const downloadLink = document.createElement('a');
        downloadLink.href = url;
        downloadLink.download = filename;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
        URL.revokeObjectURL(url);
    }

    // Helper function to export text as a PDF file
    function exportTextAsPdf(filename, text) {
        const doc = new window.jspdf.jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        const margin = 20;
        const maxWidth = pageWidth - 2 * margin;
        
        doc.setFont("helvetica");
        doc.setFontSize(12);
        
        const lines = doc.splitTextToSize(text, maxWidth);
        let y = 20;
        
        lines.forEach(line => {
            if (y > doc.internal.pageSize.getHeight() - 20) {
                doc.addPage();
                y = 20;
            }
            doc.text(margin, y, line);
            y += 7;
        });
        
        doc.save(filename);
    }    // Generic export handler
    window.handleExport = function(targetElementId, format) {
        const contentElement = document.getElementById(targetElementId);
        if (!contentElement || !contentElement.textContent.trim()) {
            alert('No content available to export');
            return;
        }

        const text = contentElement.textContent;
        const timestamp = new Date().toISOString().slice(0,10);
        const filename = `thinkframe_${targetElementId}_${timestamp}`;

        try {
            if (format === 'doc') {
                exportTextAsDoc(`${filename}.doc`, text);
            } else if (format === 'pdf') {
                exportTextAsPdf(`${filename}.pdf`, text);
            }
        } catch (error) {
            console.error('Export failed:', error);
            alert('Export failed. Please try again.');
        }
    };    // Attach export event listeners
    document.querySelectorAll('.export-doc-btn, .export-pdf-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const format = btn.classList.contains('export-doc-btn') ? 'doc' : 'pdf';
            const container = btn.closest('.generated-output-container');
            const contentElement = container ? container.querySelector('.output-content') : null;
            if (contentElement && contentElement.id) {
                window.handleExport(contentElement.id, format);
            } else {
                console.error('Could not find output content element');
            }
        });
    });

    // Attach export event listeners to export buttons that should be placed near the copy buttons
    const exportConceptBtn = document.getElementById('exportConceptBtn');
    if (exportConceptBtn) {
        exportConceptBtn.addEventListener('click', () => {
            window.handleExport('conceptOutputContent', 'doc');
        });
    }

    const exportProposalBtn = document.getElementById('exportProposalBtn');
    if (exportProposalBtn) {
        exportProposalBtn.addEventListener('click', () => {
            window.handleExport('proposalOutputContent', 'pdf');
        });
    }
    // --- COPY BUTTONS ---    // Setup copy buttons
    document.querySelectorAll('.copy-btn-simple').forEach(button => {
        button.addEventListener('click', () => {
            const targetId = button.dataset.target;
            const contentElement = document.getElementById(targetId);
            if (contentElement && contentElement.textContent.trim()) {
                navigator.clipboard.writeText(contentElement.textContent)
                    .then(() => {
                        const originalHTML = button.innerHTML;
                        button.innerHTML = '<i class="fas fa-check mr-1"></i>Copied';
                        setTimeout(() => {
                            button.innerHTML = originalHTML;
                        }, 2000);
                    })
                    .catch(err => console.error('Copy failed:', err));
            }
        });
    });

    // Initial state of buttons when the page loads
    updateGenerationButtonsState();
});