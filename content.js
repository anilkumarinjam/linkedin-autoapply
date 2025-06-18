console.log("🔍 LinkedIn Auto Apply content script attempting to load on:", window.location.href);
let extensionIconClicked = false;
let isRunning = false;
let stillApplying = false;
let fab = null; // Declare fab globally so it can be accessed from anywhere
let stepCounter = 0;
let maxSteps = 10;
let consecutiveEmptySteps = 0;
let redirectionTimeout = null;
let notificationTimeout = null;
let jobTracker=null;
// First, create a reference to both images at the top of your file
const FAB_IMAGES = {
    default: chrome.runtime.getURL("icons/ai_auto.png"),
    running: chrome.runtime.getURL("icons/running.gif")
};

function checkIfShouldStop() {
    if (!isRunning) {
        console.log("⏹️ Stop signal received, interrupting automation");
        throw new Error("AUTOMATION_STOPPED");
    }
}
async function handleStop() {
    console.log("⏹️ Stopping automation");
    isRunning = false;
    stillApplying = false;
    updateFabUI();
    
    if (jobTracker) {
        // Sync stats before showing report
        await jobTracker.syncStatsOnStop();
        // Load latest stats
        const savedStats = localStorage.getItem(jobTracker.sessionKey);
        if (savedStats) {
            jobTracker.sessionStats = JSON.parse(savedStats);
        }
        jobTracker.showReport();
    }
    
    chrome.runtime.sendMessage({ action: "updateState", isRunning: false });
}

// Helper to get user settings from background (via messaging)
async function getUserSettings() {
    return new Promise((resolve) => {
        chrome.runtime.sendMessage({ action: "getUserSettings" }, (response) => {
            resolve(response?.userSettings || null);
        });
    });
}

// Add this helper function to check authentication
async function checkAuthentication() {
    try {
        const settings = await getUserSettings();
        if (!settings) {
            console.log("🔒 User not authenticated");
            showNotification("Please authenticate first", "warning");
            return false;
        }
        return true;
    } catch (error) {
        console.error("❌ Error checking authentication:", error);
        showNotification("Authentication error", "error");
        return false;
    }
}

// Add this function to create and show notifications
function showNotification(message, type = 'info', duration = 5000, isHTML = false) {
    // Remove existing notification if any
    const existingNotification = document.getElementById('linkedinAutoNotification');
    if (existingNotification) {
        existingNotification.remove();
    }
    
    if (notificationTimeout) {
        clearTimeout(notificationTimeout);
    }

    const notification = document.createElement('div');
    notification.id = 'linkedinAutoNotification';
    notification.style.position = 'fixed';
    notification.style.top = '20px';
    notification.style.right = '20px';
    notification.style.zIndex = '9999999';
    notification.style.transition = 'all 0.3s ease';
    notification.style.maxWidth = '400px';
    notification.style.minWidth = '300px';
    notification.style.boxShadow = '0 8px 32px rgba(0,0,0,0.2)';
    notification.style.backdropFilter = 'blur(8px)';

    if (isHTML) {
        notification.innerHTML = message;
    } else {
        notification.style.padding = '12px 24px';
        notification.style.borderRadius = '8px';
        notification.style.fontSize = '14px';
        notification.style.fontWeight = '500';
        notification.style.fontFamily = "'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
        notification.textContent = message;

        // Set style based on notification type
        switch (type) {
            case 'success':
                notification.style.background = 'linear-gradient(135deg, rgba(76, 175, 80, 0.95), rgba(56, 142, 60, 0.95))';
                notification.style.color = 'white';
                break;
            case 'error':
                notification.style.background = 'linear-gradient(135deg, rgba(244, 67, 54, 0.95), rgba(183, 28, 28, 0.95))';
                notification.style.color = 'white';
                break;
            case 'warning':
                notification.style.background = 'linear-gradient(135deg, rgba(255, 152, 0, 0.95), rgba(230, 81, 0, 0.95))';
                notification.style.color = 'white';
                break;
            default:
                notification.style.background = 'linear-gradient(135deg, rgba(33, 150, 243, 0.95), rgba(13, 71, 161, 0.95))';
                notification.style.color = 'white';
        }
    }

    document.body.appendChild(notification);

    notificationTimeout = setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => notification.remove(), 300);
    }, duration);
}

window.addEventListener("load", () => {
    if (!window.location.hostname.includes("linkedin.com")){ console.log("Not on linkedin");return; } // Only run for LinkedIn domain
    console.log("On LinkedIn");
    if (document.getElementById("autoApplyFab")){ console.log("Found Fab");return; } // Ensure FAB is only created once
    console.log("creating the fab");
    const linkedInJobsUrl = "https://www.linkedin.com/jobs/search/?f_AL=true&f_E=2%2C3%2C4&f_TPR=r86400&geoId=103644278&keywords=java%20full%20stack%20developer&origin=JOB_SEARCH_PAGE_JOB_FILTER&refresh=true";
  
    // Create the FAB button
    fab = document.createElement("button");
    
    fab.id = "autoApplyFab";
    fab.style.position = "fixed";
    fab.style.right = "0px";
    fab.style.top = "400px";
    fab.style.width = "55px";
    fab.style.height = "55px";
    fab.style.padding = "10px";
    fab.style.background = "linear-gradient(135deg,rgb(128, 54, 231), #0D47A1)";
    fab.style.borderRadius = "4px";
    // Text styling
    fab.style.color = "#fff";
    fab.style.fontSize = "8px";
    fab.style.fontWeight = "600";
    fab.style.textShadow = "0px 1px 2px rgba(0,0,0,0.3)";
    fab.style.fontFamily = "Arial, sans-serif";
    fab.style.letterSpacing = "0.5px";
    fab.style.textAlign = "center";
    // Multiple shadow effects
    fab.style.boxShadow = 
      "0 3px 10px rgba(0,119,181,0.3), " + // Main shadow
      "0 8px 20px rgba(0,0,0,0.15), " +    // Outer shadow
      "0 0 0 1px rgba(255,255,255,0.1), " + // Border glow
      "inset 0 1px 0 rgba(255,255,255,0.2)"; // Inner highlight
    // Border and other styling
    fab.style.border = "none";
    fab.style.outline = "none";
    fab.style.zIndex = "100000";
    fab.style.cursor = "pointer";
    fab.style.transition = "all 0.3s ease";
    
    // Hover effect
    fab.addEventListener("mouseenter", () => {
      fab.style.transform = "translateY(-2px)";
      fab.style.boxShadow = 
        "0 5px 15px rgba(0,119,181,0.4), " +
        "0 10px 25px rgba(0,0,0,0.2), " +
        "0 0 0 1px rgba(255,255,255,0.1), " +
        "inset 0 1px 0 rgba(255,255,255,0.2)";
    });
    
    fab.addEventListener("mouseleave", () => {
      fab.style.transform = "translateY(0)";
      fab.style.boxShadow = 
        "0 3px 10px rgba(0,119,181,0.3), " +
        "0 8px 20px rgba(0,0,0,0.15), " +
        "0 0 0 1px rgba(255,255,255,0.1), " +
        "inset 0 1px 0 rgba(255,255,255,0.2)";
    });
  
    // Add image to FAB
    const fabImage = document.createElement("img");
    fabImage.src = FAB_IMAGES.default; // Set default image
    fabImage.style.width = "180%";
    fabImage.style.height = "160%";
    fabImage.style.objectFit = "contain";
    fabImage.style.pointerEvents = "none"; // Ensure the image doesn't interfere with button clicks
    fabImage.style.paddingRight = "7px"; // Add padding to the right
    fabImage.style.paddingBottom="10px";
    fabImage.style.transform = "translateX(-4px) scale(1.4)";
    fab.appendChild(fabImage);
    
    document.body.appendChild(fab);
  
    let isDragging = false;
    let offsetY = 0;
    
    const shouldStartAfterRedirect = localStorage.getItem("shouldStartAfterRedirect") === "true";
    if (shouldStartAfterRedirect && window.location.href.includes("/jobs/search")) {
        console.log("🔄 Detected post-redirect page load, starting automation...");
        localStorage.removeItem("shouldStartAfterRedirect");
        
        // Wait for the page to be fully ready
        setTimeout(async () => {
            try {
                const isAuthenticated = await getUserSettings() != null;
                if (isAuthenticated) {
                    console.log("🚀 Starting automation after redirect");
                    isRunning = true;
                    extensionIconClicked = true;
                    updateFabUI();
                    showNotification("Starting automation...", "success");
                    await startAutomation();
                }
            } catch (error) {
                console.error("Error starting automation:", error);
                showNotification("Failed to start automation", "error");
            }
        }, 3000);
    }
    
    fab.addEventListener("mousedown", (e) => {
      isDragging = true;
      offsetY = e.clientY - fab.getBoundingClientRect().top;
      e.preventDefault(); // Prevent text selection during drag
    });
  
    document.addEventListener("mousemove", (e) => {
      if (isDragging) {
        e.preventDefault();
        fab.style.top = (e.clientY - offsetY) + "px";
      }
    });
  
    document.addEventListener("mouseup", () => {
      isDragging = false;
    });
  
    fab.addEventListener("click", async (e) => {
        if (isDragging) return;
    
        try {
            const isAuthenticated = await checkAuthentication();
            if (!isAuthenticated) {
                console.log("🔒 User not authenticated, opening extension popup");
                chrome.runtime.sendMessage({ action: "openPopup" });
                return;
            }
    
            const currentUrl = window.location.href;
            if (!currentUrl.includes("/jobs/search/") && !currentUrl.includes("/jobs/collections/")) {
                console.log("📍 Not on jobs page or collections page, setting redirect flag and navigating...");
                localStorage.setItem("shouldStartAfterRedirect", "true");
                window.location.href = linkedInJobsUrl;
            } else {
                if (!isRunning) {
                    console.log("🚀 Starting automation from FAB");
                    isRunning = true;
                    updateFabUI();
    
                    // Initialize JobTracker only once at the start of session
                    if (!jobTracker) {
                        console.log("📊 Initializing new JobTracker session");
                        jobTracker = new JobTracker();
                        jobTracker.resetSessionStats(); // Reset session stats
                        await jobTracker.initialize(); // Fetch daily stats from DB once
                    }
    
                    chrome.runtime.sendMessage({ action: "updateState", isRunning: true });
                    startAutomation();
                } else {
                    await handleStop();
                }
            }
        } catch (error) {
            console.error("❌ Error in click handler:", error);
            showNotification("An error occurred", "error");
        }
    });
    
    // Add cleanup for navigation events
    window.addEventListener("beforeunload", () => {
        if (redirectionTimeout) {
            clearTimeout(redirectionTimeout);
        }
    });
  });
  

// Update the updateFabUI function as well
function updateFabUI() {
    if (!fab) return;
    
    const fabImage = fab.querySelector('img');
    
    if (isRunning) {
        fab.style.background = "linear-gradient(135deg, #F44336, #B71C1C)";
        fab.style.boxShadow = 
            "0 3px 10px rgba(244,67,54,0.3), " +
            "0 8px 20px rgba(0,0,0,0.15), " +
            "0 0 0 1px rgba(255,255,255,0.1), " +
            "inset 0 1px 0 rgba(255,255,255,0.2)";
        // Change the image
        if (fabImage) {
            fabImage.src = FAB_IMAGES.running;
            fabImage.style.paddingRight = "12px";
            fabImage.style.transform = "translateX(-4px) scale(1.4)";
        }
    } else {
        fab.style.background = "linear-gradient(135deg,rgb(128, 54, 231), #0D47A1)";
        fab.style.boxShadow = 
            "0 3px 10px rgba(0,119,181,0.3), " +
            "0 8px 20px rgba(0,0,0,0.15), " +
            "0 0 0 1px rgba(255,255,255,0.1), " +
            "inset 0 1px 0 rgba(255,255,255,0.2)";
        // Change back to default image
        if (fabImage) {
            fabImage.style.width = "180%";
            fabImage.style.height = "160%";
            fabImage.style.objectFit = "contain";
            fabImage.style.pointerEvents = "none"; // Ensure the image doesn't interfere with button clicks
            fabImage.style.paddingRight = "7px"; // Add padding to the right
            fabImage.style.paddingBottom="10px";
            fabImage.style.transform = "translateX(-4px) scale(1.4)";
            fabImage.src = FAB_IMAGES.default;
        }
    }
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log("Message received in content script:", message);
    
    if (message.action === "start") {
        console.log(`🚀 Starting LinkedIn automation from ${message.source || 'FAB'}`);
        isRunning = true;
        extensionIconClicked = true;
        updateFabUI();
        showNotification("Starting automation...", "success");
        
        // Initialize JobTracker if not already initialized
        if (!jobTracker) {
            console.log("📊 Initializing new JobTracker session");
            jobTracker = new JobTracker();
            jobTracker.resetSessionStats();
            jobTracker.initialize().then(() => {
                startAutomation().catch(error => {
                    console.error("Error in automation:", error);
                    showNotification("Automation error: " + error.message, "error");
                });
            }).catch(error => {
                console.error("Error initializing JobTracker:", error);
                showNotification("Failed to initialize automation: " + error.message, "error");
            });
        } else {
            startAutomation().catch(error => {
                console.error("Error in automation:", error);
                showNotification("Automation error: " + error.message, "error");
            });
        }
        sendResponse({ status: "Automation started" });
    } else if (message.action === "stop") {
        handleStop().then(() => {
            sendResponse({ status: "Automation stopped" });
        });
        return true;
    } else if (message.action === "status") {
        sendResponse({ isRunning });
    } else if (message.action === "showNotification") {
        showNotification(message.text, message.type);
        sendResponse({ status: "Notification shown" });
    } else if (message.action === "generateReport") {
        if (jobTracker) {
            jobTracker.showReport();
        }
        sendResponse({ status: "Report generated" });
    }
    
    return true;
});
// Add reset function for application process
function resetApplicationState() {
    stepCounter = 0;
    consecutiveEmptySteps = 0;
    stillApplying = true;
}

// Update startAutomation to reset state before processing
async function startAutomation() {
    try {
        // Only check if JobTracker exists
        if (!jobTracker) {
            throw new Error("JobTracker not initialized");
        }

        resetApplicationState();
        checkIfShouldStop();       
        // Look for job cards with fh-webext-job-display attribute
        const jobCards = document.querySelectorAll('li[fh-webext-job-display]');
        checkIfShouldStop(); // Check if automation should stop after job cards are found
        
        console.log(`📝 Found ${jobCards.length} job cards on this page`);
        
        if (jobCards.length === 0) {
            console.log("❌ No job cards found. Moving to next page.");
            await handlePagination();
            return;
        }

        // Get the first job card
        const job = jobCards[0];
        checkIfShouldStop(); // Check if automation should stop before interacting with the job card
        
        try {
            // First scroll the job list to ensure the card is in view
            job.scrollIntoView({ behavior: 'smooth', block: 'center' });
            await delay(1000);
            checkIfShouldStop(); // Check if automation should stop after scrolling

            // Find and click the job title link within the card
            const jobLink = job.querySelector('a[data-control-name="job_card_title"]') || 
                           job.querySelector('.job-card-list__title') ||
                           job.querySelector('a[href*="/jobs/view/"]');

            if (!jobLink) {
                console.log("❌ Could not find job link in card, removing and moving to next");
                job.remove();
                await startAutomation();
                return;
            }

            // Click the job link
            console.log("🔍 Found job link, clicking...");
            jobLink.click();
            await delay(2000); // Wait for job details to load

            // Look for Easy Apply button
            const easyApplyButton = document.querySelector('button.jobs-apply-button');
            
            if (!easyApplyButton || !easyApplyButton.textContent.toLowerCase().includes('easy apply')) {
                console.log("❌ No Easy Apply button found or external job, moving to next job");
                job.remove();
                await startAutomation();
                return;
            }

            console.log("✅ Found Easy Apply button, clicking...");
            easyApplyButton.click();
            await delay(1000);

            // Process the application
            await processApplicationSteps();
            
            // Remove this job card and move to next job
            job.remove();
            await startAutomation();

        } catch (navigationError) {
            if (navigationError.message === "AUTOMATION_STOPPED") {
                return;
            }
            console.error("❌ Error navigating job:", navigationError);
            job.remove();
            await startAutomation();
        }
    } catch (error) {
        if (error.message === "Daily application limit reached") {
            console.log("🚫 Daily limit reached - stopping automation");
            isRunning = false;
            stillApplying = false;
            updateFabUI();
            chrome.runtime.sendMessage({ action: "updateState", isRunning: false });
            showNotification("Daily application limit reached. Try again tomorrow!", "warning");
            jobTracker.showReport();
            return;
        }
        if (error.message === "AUTOMATION_STOPPED") {
            console.log("🛑 Automation stopped successfully");
            return;
        }
        console.error("❌ Fatal error in automation:", error);
        isRunning = false;
        updateFabUI();
    }
}

// Update the handlePagination function
async function handlePagination() {
    // First try the numbered pagination
    const paginationItems = document.querySelectorAll('.artdeco-pagination__pages .artdeco-pagination__indicator');
    const activePage = Array.from(paginationItems).find(item => item.classList.contains('active'));
    
    if (activePage) {
        const nextPage = activePage.nextElementSibling;
        if (nextPage && nextPage.tagName === 'LI') {
            const nextButton = nextPage.querySelector('button');
            if (nextButton) {
                const priorUrl = window.location.href;
                console.log("✅ Found the next page button (numbered), clicking...");
                nextButton.click();
                await delay(5000);

                if (priorUrl === window.location.href) {
                    console.log("❌ Page navigation failed");
                    // Don't set isRunning = false here, try alternative method
                } else {
                    console.log("✅ Successfully navigated to next page");
                    await startAutomation();
                    return;
                }
            }
        }
    }
    
    // Try the arrow navigation button if numbered pagination failed or doesn't exist
    const nextArrowButton = document.querySelector('button[aria-label="Next"]') || 
                          document.querySelector('button[aria-label="View next page"]');
    
    if (nextArrowButton) {
        console.log("✅ Found next page arrow button, clicking...");
        const priorUrl = window.location.href;
        nextArrowButton.click();
        await delay(5000);

        if (priorUrl === window.location.href) {
            console.log("❌ Arrow navigation failed");
            isRunning = false;
        } else {
            console.log("✅ Successfully navigated to next page using arrow");
            await startAutomation();
            return;
        }
    } else {
        console.log("❌ No more pages to process - no pagination found");
        isRunning = false;
    }
}


// Helper function to wait for an element to appear
const waitForElement = (selector, timeout = 5000) => {
    return new Promise((resolve, reject) => {
        if (document.querySelector(selector)) {
            return resolve(document.querySelector(selector));
        }
        
        const observer = new MutationObserver(mutations => {
            if (document.querySelector(selector)) {
                observer.disconnect();
                resolve(document.querySelector(selector));
            }
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
        
        setTimeout(() => {
            observer.disconnect();
            resolve(null);
        }, timeout);
    });
};

// Helper function for delay
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));


// Helper to get Q&A pairs from background (via messaging)
async function getQAPairs() {
    return new Promise((resolve) => {
        chrome.runtime.sendMessage({ action: "getQAPairs" }, (response) => {
            resolve(response?.qaPairs || []);
        });
    });
}

// Helper to match a question (case-sensitive, full string)
function findQAPair(question, type) {
    return new Promise((resolve) => {
        chrome.runtime.sendMessage({ action: "getQAPairs" }, (response) => {
            const qaPairs = response?.qaPairs || [];
            const match = qaPairs.find(q => q.question === question && (!type || q.type === type));
            resolve(match ? match.answer : null);
        });
    });
}

// Helper to clean and deduplicate question text
function cleanQuestionText(raw) {
    if (!raw) return '';
    // Remove repeated sequences (e.g., "Q? Q? Required" -> "Q? Required")
    let parts = raw.split('?').map(s => s.trim()).filter(Boolean);
    let seen = new Set();
    let cleaned = [];
    for (let p of parts) {
        if (!seen.has(p.toLowerCase())) {
            cleaned.push(p);
            seen.add(p.toLowerCase());
        }
    }
    let result = cleaned.join('?');
    if (raw.endsWith('?')) result += '?';
    // Remove extra whitespace and duplicate 'Required'
    result = result.replace(/(Required)(\s*Required)+/gi, 'Required');
    return result.trim();
}

// Helper to add a new Q&A pair if not present, with answer and options, with deduplication
async function addQAPairIfMissing(question, type, answer, options) {
    if (!question || !type) return;
    question = cleanQuestionText(question);
    const qaPairs = await getQAPairs();
    // Deduplicate: ignore case, whitespace, and repeated text
    if (!qaPairs.some(q => cleanQuestionText(q.question).toLowerCase() === question.toLowerCase() && q.type === type)) {
        const newPair = { question, answer: answer || '', type };
        if (options && Array.isArray(options) && options.length > 0) {
            newPair.options = options;
        }
        qaPairs.push(newPair);
        await new Promise(resolve => {
            chrome.runtime.sendMessage({ action: "setQAPairs", qaPairs }, () => resolve());
        });
    }
}

// Fill application form fields
async function fillApplicationForm() {
    console.log("📝 Filling application form...");
    const userSettings = await getUserSettings();
    if (!userSettings) {
        console.log("⚠️ No user settings found");
        return false;
    }
    // Get Q&A pairs from storage
    const qaPairs = await getQAPairs();
    // Get the active modal container to restrict our scope
    const modalContainer = document.querySelector('.jobs-easy-apply-content, .artdeco-modal__content, .ember-view');
    
    if (!modalContainer) {
        console.log("⚠️ No modal container found for form filling");
        return false; // Indicate failure to fill the form
    }
    
    try {
        // Handle text fields - restrict to modal
        const textInputs = modalContainer.querySelectorAll('input[type="text"]:not([value]), input[type="tel"]:not([value]), input[type="email"]:not([value])');
        for (const input of textInputs) {
            if (input.value.trim()) continue;
            let question = '';
            if (input.labels && input.labels[0]) question = input.labels[0].innerText.trim();
            else if (input.placeholder) question = input.placeholder.trim();
            else if (input.getAttribute('aria-label')) question = input.getAttribute('aria-label').trim();
            question = cleanQuestionText(question);
            let answer = null;
            if (question) {
                answer = qaPairs.find(q => cleanQuestionText(q.question) === question && q.type === 'blank');
                answer = answer ? answer.answer : null;
            }
            if (!answer) {
                const isPhoneField = input.id?.toLowerCase().includes('phone') || input.name?.toLowerCase().includes('phone') || input.placeholder?.toLowerCase().includes('phone');
                answer = isPhoneField ? userSettings.phone_number : userSettings.default_answer;
            }
            // Auto-add if missing, with answer used
            await addQAPairIfMissing(question, 'blank', answer || input.value || '');
            input.value = answer;
            input.dispatchEvent(new Event('input', { bubbles: true }));
            await delay(300);
        }
        // Handle dropdowns - restrict to modal
        const selects = modalContainer.querySelectorAll('select:not([value])');
        for (const select of selects) {
            if (select.options.length > 1) {
                let question = '';
                if (select.labels && select.labels[0]) question = select.labels[0].innerText.trim();
                else if (select.getAttribute('aria-label')) question = select.getAttribute('aria-label').trim();
                question = cleanQuestionText(question);
                let answer = null;
                if (question) {
                    answer = qaPairs.find(q => cleanQuestionText(q.question) === question && q.type === 'choice');
                    answer = answer ? answer.answer : null;
                }
                // Extract all options for storage
                const options = Array.from(select.options).map(opt => opt.text.trim()).filter(Boolean);
                if (answer) {
                    const option = Array.from(select.options).find(opt => opt.text.trim() === answer);
                    if (option) select.value = option.value;
                    else select.value = select.options[1].value;
                } else {
                    select.value = select.options[1].value;
                    answer = select.options[1].text.trim();
                }
                // Auto-add if missing, with answer used and options
                await addQAPairIfMissing(question, 'choice', answer, options);
                select.dispatchEvent(new Event('change', { bubbles: true }));
                await delay(300);
            }
        }
        // Handle radio buttons - restrict to modal
        const radioGroups = modalContainer.querySelectorAll('fieldset');
        for (const group of radioGroups) {
            const radios = group.querySelectorAll('input[type="radio"]');
            if (radios.length > 0 && !Array.from(radios).some(r => r.checked)) {
                // Only use legend as question, fallback to first label for first radio
                let question = group.querySelector('legend')?.innerText.trim();
                if (!question && radios[0]) {
                    const label = group.querySelector(`label[for='${radios[0].id}']`);
                    if (label) question = label.innerText.trim();
                }
                question = cleanQuestionText(question);
                let answer = null;
                if (question) {
                    answer = qaPairs.find(q => cleanQuestionText(q.question) === question && q.type === 'radio');
                    answer = answer ? answer.answer : null;
                }
                // Extract all options for storage
                const options = Array.from(radios).map(r => {
                    const label = group.querySelector(`label[for='${r.id}']`);
                    return label ? label.innerText.trim() : r.value;
                }).filter(Boolean);
                let radioToSelect = null;
                if (answer) {
                    radioToSelect = Array.from(radios).find(r => r.value === answer || r.id === answer);
                }
                if (!radioToSelect) {
                    radioToSelect = Array.from(radios).find(r => r.value.toLowerCase() === 'yes') || radios[0];
                }
                if (radioToSelect) {
                    radioToSelect.click();
                    answer = radioToSelect.value;
                }
                // Auto-add if missing, with answer used and options
                await addQAPairIfMissing(question, 'radio', answer, options);
                await delay(300);
            }
        }
        // Handle checkboxes - restrict to modal
        const checkboxes = modalContainer.querySelectorAll('input[type="checkbox"]:not(:checked)');
        for (const checkbox of checkboxes) {
            if (checkbox.checked || checkbox.name === "jobDetailsEasyApplyTopChoiceCheckbox") continue;
            let question = '';
            if (checkbox.labels && checkbox.labels[0]) question = checkbox.labels[0].innerText.trim();
            else if (checkbox.getAttribute('aria-label')) question = checkbox.getAttribute('aria-label').trim();
            question = cleanQuestionText(question);
            let answer = null;
            if (question) {
                answer = qaPairs.find(q => cleanQuestionText(q.question) === question && q.type === 'bool');
                answer = answer ? answer.answer : null;
            }
            if (answer && (answer === 'true' || answer === 'checked')) {
                checkbox.click();
            }
            // Auto-add if missing, with answer used (true/false)
            await addQAPairIfMissing(question, 'bool', answer || (checkbox.checked ? 'true' : 'false'));
            await delay(300);
        }
        console.log("✅ Form fields filled");
        return true; // Indicate success
    } catch (error) {
        console.error("❌ Error filling application form:", error);
        return false; // Indicate failure to fill the form
    }
}
async function discardApplication() {
    console.log("🚫 Discarding current application...");
    try {
        // First click the cancel button
        const cancelButton = document.querySelector('button[aria-label="Dismiss"]');
        if (cancelButton) {
            console.log("✅ Clicking cancel button");
            cancelButton.click();
            await delay(1000);
        }

        // Then click the discard button
        const discardButton = document.querySelector('button[data-control-name="discard_application_confirm_btn"]');
        if (discardButton) {
            console.log("✅ Clicking discard button");
            discardButton.click();
            await delay(1000);
        }
        
        console.log("✅ Application discarded successfully");
        return true;
    } catch (error) {
        console.error("❌ Error while discarding application:", error);
        return false;
    }
}

async function processApplicationSteps() {
    console.log("⏩ Processing application steps...");
    try {
        while (stillApplying && stepCounter <= maxSteps) {
            checkIfShouldStop(); // Check if automation should stop before each step
            
            console.log(`Step ${stepCounter}: Looking for action buttons...`);
            
            // Wait for any dialog content to load
            await delay(1000);
            
            try {
                checkIfShouldStop(); // Check if automation should stop inside try block
                
                // Check for success message or completion indicators
                const successIndicators = [
                    "application submitted",
                    "thank you for applying",
                    "your application was sent",
                    "we've received your application"
                ];
                
                const dialogText = document.querySelector('.artdeco-modal__content')?.textContent.toLowerCase() || '';
                const isCompleted = successIndicators.some(text => dialogText.includes(text));
                
                if (isCompleted) {
                    console.log("🎉 Application completion message detected!");
                    await jobTracker.incrementJobCount('success');
                    stillApplying = false;
                    
                    // Try to close any remaining dialogs
                    try {
                        const closeButtons = document.querySelectorAll('button[aria-label="Dismiss"], button.artdeco-modal__dismiss, button[data-control-name="cancel_application_confirm_btn"]');
                        if (closeButtons.length > 0) {
                            console.log(`Found ${closeButtons.length} close buttons, clicking the first one`);
                            closeButtons[0].click();
                        }
                        await delay(1000);
                    } catch (e) {
                        console.log("Error closing success dialog:", e);
                    }
                    
                    console.log("✅ Application process completed");
                    break;
                }
                
                // Look for action buttons with valid selectors
                const submitButton = document.querySelector('button[aria-label="Submit application"], button[data-control-name="submit_application"], button[data-control-name="submit_resume"]');
                const doneButton = document.querySelector('button[class="artdeco-button artdeco-button--2 artdeco-button--primary ember-view mlA block"]');
                const reviewButton = document.querySelector('button[aria-label="Review your application"], button[data-control-name="review_application"]');
                const nextButton = document.querySelector('button[aria-label="Continue to next step"], button[data-control-name="continue_unify"], button.artdeco-button--primary');
                const cancel = document.querySelector('button[aria-label="Dismiss"]');
                const discard = document.querySelector('button[data-control-name="discard_application_confirm_btn"]');
                
                // Check if this is the first step with a "Review" or similar button
                const isFirstStep = stepCounter === 1;
                if (isFirstStep) {
                    console.log("⏭️ First step - skipping form fill, looking for Next button");
                    
                    // In first step, prioritize finding any primary button
                    const primaryButtons = Array.from(document.querySelectorAll('button.artdeco-button--primary'));
                    const nextOrSubmitBtn = primaryButtons.find(btn => {
                        const text = btn.textContent.trim().toLowerCase();
                        return text.includes('next') || text.includes('submit') || text.includes('apply') || text.includes('continue');
                    });
                    
                    if (nextOrSubmitBtn) {
                        console.log(`Found primary button with text: "${nextOrSubmitBtn.textContent.trim()}"`);
                        nextOrSubmitBtn.click();
                        await delay(1500);
                        stepCounter++;
                        continue;
                    }
                }
                
                // Check if form filling is needed
                const needsFormFilling = true; // Placeholder, replace with actual logic
                if (needsFormFilling) {
                    const formFilled = await fillApplicationForm();
                    checkIfShouldStop(); // Check if automation should stop after form filling
                    
                    if (!formFilled) {
                        console.log("❌ Form filling failed, discarding application");
                        await discardApplication();
                        await jobTracker.incrementJobCount('failed');
                        stillApplying = false;
                        break;
                    }
                }
                
                // Add checks before button clicks
                if (submitButton) {
                    checkIfShouldStop(); // Check if automation should stop before clicking the submit button
                    console.log("✅ Found Submit button, clicking...");
                    submitButton.click();
                    stillApplying = false;
                    await delay(2000);
                    
                    // Close any success dialogs
                    try {
                        const closeButtons = document.querySelectorAll('button[aria-label="Dismiss"], button.artdeco-modal__dismiss');
                        if (closeButtons.length > 0) {
                            closeButtons[0].click();
                        }
                    } catch (e) {
                        console.log("Error closing dialog:", e);
                    }
                    
                    console.log("✅ Application process completed");
                    await jobTracker.incrementJobCount('success');
                    break;
                }
                
                // Handle other buttons
                if (doneButton) {
                    console.log("✅ Found Done button, clicking...");
                    doneButton.click();
                    stillApplying = false;
                    await delay(2000);
                    console.log("✅ Application process completed");
                    await jobTracker.incrementJobCount('success');
                    break;
                }
                else if (reviewButton) {
                    console.log("✅ Found Review button, clicking...");
                    reviewButton.click();
                    await delay(1500); // Wait for the review page to load
                }
                else if (nextButton) {
                    console.log("✅ Found Next button, clicking...");
                    nextButton.click();
                    await delay(1500);
                }
                
                // Last resort: look for any button with next/continue/submit in the text
                if (!submitButton && !doneButton && !reviewButton && !nextButton) {
                    console.log("⚠️ No standard buttons found, looking for buttons by text content");
                    
                    const actionButtonTexts = ["next", "continue", "review", "submit"];
                    const actionButton = Array.from(document.querySelectorAll('button')).find(btn => {
                        const text = btn.textContent.trim().toLowerCase();
                        return actionButtonTexts.some(actionText => text.includes(actionText));
                    });
                    
                    if (actionButton) {
                        console.log(`✅ Found button with action text: "${actionButton.textContent.trim()}", clicking...`);
                        actionButton.click();
                    } else {
                        console.log("⚠️ No action buttons found by text in this step");
                        consecutiveEmptySteps++;
                        
                        if (consecutiveEmptySteps >= 3) {
                            console.log("❌ Too many consecutive steps without buttons, discarding application");
                            await discardApplication();
                            await jobTracker.incrementJobCount('failed');
                            stillApplying = false;
                            break;
                        }
                    }
                } else {
                    consecutiveEmptySteps = 0; // Reset counter when we successfully find a button
                }
                
                stepCounter++;
                await delay(1500);
                
            } catch (stepError) {
                if (stepError.message === "AUTOMATION_STOPPED") {
                    // Clean up any open dialogs
                    try {
                        const closeButtons = document.querySelectorAll('button[aria-label="Dismiss"], button.artdeco-modal__dismiss');
                        if (closeButtons.length > 0) {
                            closeButtons[0].click();
                        }
                    } catch (e) { /* ignore */ }
                    return;
                }
                console.log(`❌ Error in application step ${stepCounter}:`, stepError);
                stepCounter++;
                
               // For too many steps with errors:
                if (stepCounter > 8) {
                    console.log("❌ Too many steps with errors, discarding application");
                    await discardApplication();
                    await jobTracker.incrementJobCount('failed');
                    stillApplying = false;
                    break;
                }
            }
        }
        
        // If we exited the loop because we hit max steps, try to close any open dialogs
        if (stepCounter > maxSteps) {
            console.log("⚠️ Reached maximum steps without completing application, discarding");
            await jobTracker.incrementJobCount('failed');
            await discardApplication();
        }
        
        // console.log("✅ Application process completed");
        // await jobTracker.incrementJobCount('success');
        
    } catch (processError) {
        if (processError.message === "AUTOMATION_STOPPED") {
            return;
        }
        console.error("❌ Fatal error in application process:", processError);
        await jobTracker.incrementJobCount('failed');
        // Try to close any open dialogs on error
        try {
            const closeButtons = document.querySelectorAll('button[aria-label="Dismiss"], button.artdeco-modal__dismiss');
            if (closeButtons.length > 0) {
                closeButtons[0].click();
            }
        } catch (e) { /* ignore */ }
    }
}

// Add to content.js
class JobTracker {
    constructor() {
        this.sessionKey = 'linkedinAutoApply_currentSession';
        this.dailyKey = `linkedinAutoApply_${new Date().toISOString().split('T')[0]}`;
        
        // Try to load existing daily stats first
        const existingDailyStats = localStorage.getItem(this.dailyKey);
        if (existingDailyStats) {
            console.log("📊 Loading existing daily stats:", JSON.parse(existingDailyStats));
        }
        
        // Initialize session stats
        const savedStats = localStorage.getItem(this.sessionKey);
        this.sessionStats = savedStats ? JSON.parse(savedStats) : {
            totalAttempted: 0,
            successfullyApplied: 0,
            failed: 0,
            skipped: 0
        };
        
        this.dailyLimit = 100; // Default, will be updated from DB
    }

    async initialize() {
        try {
            // Always fetch latest settings from DB
            const settings = await getUserSettings();
            if (!settings) throw new Error("No user settings found");
    
            // Update daily limit from DB
            this.dailyLimit = settings.daily_limit || 100;
            
            // Initialize daily stats from DB count
            const dailyStats = {
                appliedCount: settings.daily_count || 0,
                lastUpdated: new Date().toISOString()
            };
            
            // Always update localStorage with DB values
            localStorage.setItem(this.dailyKey, JSON.stringify(dailyStats));
            console.log("✅ Initialized daily stats from DB:", dailyStats);
    
            // Check if limit already reached
            if (dailyStats.appliedCount >= this.dailyLimit) {
                console.log("🚫 Daily limit reached:", dailyStats.appliedCount);
                throw new Error("Daily application limit reached");
            }
    
        } catch (error) {
            console.error("Error initializing JobTracker:", error);
            throw error;
        }
    }

    async incrementJobCount(status) {
        try {
            // Update session stats
            this.sessionStats.totalAttempted++;
            
            // Get current daily stats
            const dailyStats = JSON.parse(localStorage.getItem(this.dailyKey)) || {
                appliedCount: 0,
                lastUpdated: new Date().toISOString()
            };
    
            switch (status) {
                case 'success':
                    this.sessionStats.successfullyApplied++;
                    // Update daily count
                    dailyStats.appliedCount++;
                    dailyStats.lastUpdated = new Date().toISOString();
                    
                    // Save updated daily stats
                    localStorage.setItem(this.dailyKey, JSON.stringify(dailyStats));
                    
                    if (dailyStats.appliedCount >= this.dailyLimit) {
                        throw new Error("Daily application limit reached");
                    }
                    break;
                case 'failed':
                    this.sessionStats.failed++;
                    break;
                case 'skipped':
                    this.sessionStats.skipped++;
                    break;
            }
    
            // Save session stats
            localStorage.setItem(this.sessionKey, JSON.stringify(this.sessionStats));
            console.log("📊 Updated session stats:", this.sessionStats);
            console.log("📊 Updated daily stats:", dailyStats);
    
        } catch (error) {
            console.error("Error incrementing job count:", error);
            throw error;
        }
    }
    
    async syncStatsOnStop() {
        try {
            if (this.sessionStats.successfullyApplied > 0) {
                console.log("🔄 Syncing stats with DB");
                
                let retries = 3;
                while (retries > 0) {
                    try {
                        const response = await chrome.runtime.sendMessage({ 
                            action: "updateDailyCount"
                        });
                        
                        if (response?.success) {
                            console.log("✅ Successfully synced final stats to DB");
                            break;
                        }
                        retries--;
                    } catch (error) {
                        console.error("Error syncing with DB:", error);
                        retries--;
                        if (retries > 0) await delay(1000);
                    }
                }
            } else {
                console.log("ℹ️ No successful applications to sync");
            }
        } catch (error) {
            console.error("Error in syncStatsOnStop:", error);
        }
    }

    resetSessionStats() {
        this.sessionStats = {
            totalAttempted: 0,
            successfullyApplied: 0,
            failed: 0,
            skipped: 0
        };
        localStorage.setItem(this.sessionKey, JSON.stringify(this.sessionStats));
    }

    generateReport() {
        const dailyStats = JSON.parse(localStorage.getItem(this.dailyKey));
        
        return {
            sessionStats: this.sessionStats,
            dailyStats: {
                appliedToday: dailyStats?.appliedCount || 0,
                remainingToday: Math.max(0, this.dailyLimit - (dailyStats?.appliedCount || 0))
            },
            dailyLimit: this.dailyLimit
        };
    }

    showReport() {
        const report = this.generateReport();
        const htmlContent = `
            <div style="
                font-family: 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                padding: 16px 20px;
                border-radius: 12px;
                background: linear-gradient(135deg, rgba(79, 55, 211, 0.95), rgba(13, 71, 161, 0.95));
                color: white;
                box-shadow: 0 8px 32px rgba(0,0,0,0.2);
                border: 1px solid rgba(255,255,255,0.18);
                backdrop-filter: blur(8px);
            ">
                <div style="
                    font-size: 18px;
                    font-weight: 600;
                    margin-bottom: 15px;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                ">
                    🤖 <span style="
                        background: linear-gradient(90deg, #fff, #e0e0e0);
                        -webkit-background-clip: text;
                        color: transparent;
                    ">LinkedIn Auto Apply Report</span>
                </div>
    
                <div style="
                    background: rgba(255,255,255,0.1);
                    border-radius: 8px;
                    padding: 12px;
                    margin-bottom: 12px;
                ">
                    <div style="font-size: 16px; font-weight: 600; margin-bottom: 8px;">📊 Session Statistics</div>
                    <div style="display: grid; grid-template-columns: auto auto; gap: 8px;">
                        <div>Total Attempted:</div>
                        <div style="font-weight: 500;">${report.sessionStats.totalAttempted}</div>
                        <div>Successfully Applied:</div>
                        <div style="font-weight: 500; color: #4CAF50;">${report.sessionStats.successfullyApplied}</div>
                        <div>Failed Applications:</div>
                        <div style="font-weight: 500; color: #FF5252;">${report.sessionStats.failed}</div>
                        <div>Skipped Jobs:</div>
                        <div style="font-weight: 500; color: #FFC107;">${report.sessionStats.skipped}</div>
                    </div>
                </div>
    
                <div style="
                    background: rgba(255,255,255,0.1);
                    border-radius: 8px;
                    padding: 12px;
                ">
                    <div style="font-size: 16px; font-weight: 600; margin-bottom: 8px;">📅 Daily Progress</div>
                    <div style="display: grid; grid-template-columns: auto auto; gap: 8px;">
                        <div>Applied Today:</div>
                        <div style="font-weight: 500;">${report.dailyStats.appliedToday}</div>
                        <div>Remaining Today:</div>
                        <div style="font-weight: 500; color: #81D4FA;">${report.dailyStats.remainingToday}</div>
                        <div>Daily Limit:</div>
                        <div style="font-weight: 500; color: #FFB74D;">${report.dailyLimit}</div>
                    </div>
                </div>
            </div>
        `;
    
        showNotification(htmlContent, "info", 10000, true);
    }
}