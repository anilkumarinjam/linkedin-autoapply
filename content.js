console.log("✅ LinkedIn Auto Apply content script loaded");

let isRunning = false;
let fab = null; // Declare fab globally so it can be accessed from anywhere

window.addEventListener("load", () => {
  if (!window.location.hostname.includes("linkedin.com")) return;
  if (document.getElementById("autoApplyFab")) return;

  const linkedInJobsUrl = "https://www.linkedin.com/jobs/search/?f_AL=true&f_E=2%2C3%2C4&f_TPR=r86400&geoId=103644278&keywords=java%20full%20stack%20developer&origin=JOB_SEARCH_PAGE_JOB_FILTER&refresh=true";

  // Create the FAB
  fab = document.createElement("button");
  fab.id = "autoApplyFab";
  fab.textContent = "Start AI AutoApply";
  fab.style.position = "fixed";
  fab.style.right = "0px";
  fab.style.top = "400px";
  fab.style.width = "55px";
  fab.style.height = "55px";
  fab.style.padding = "10px";
  fab.style.background = "linear-gradient(135deg, #1E88E5, #0D47A1)";
  fab.style.borderRadius = "2px";
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
  fab.style.zIndex = "9999";
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
  
  document.body.appendChild(fab);

  let isDragging = false;
  let offsetY = 0;

  // Check if redirect is pending
  const isRedirectPending = localStorage.getItem("shouldStartAfterRedirect") === "true";
  if (window.location.href.includes("/jobs/")) {
    if (isRedirectPending) {
      localStorage.removeItem("shouldStartAfterRedirect");
    
      // Delay starting automation to ensure the page is fully loaded
      setTimeout(() => clickFirstJobCardAndStart(true), 3000);
    }
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

  fab.addEventListener("click", (e) => {
    // Only handle click if we weren't dragging
    if (isDragging) return;
    
    if (!window.location.href.includes("/jobs/")) {
      // If not on jobs page, set flag and redirect
      localStorage.setItem("shouldStartAfterRedirect", "true");
      console.log("📍 Not on jobs page, redirecting to job search URL");
      window.location.href = linkedInJobsUrl;
    } else {
      // Already on jobs page
      if (!isRunning) {
        console.log("🚀 Starting automation on jobs page");
        clickFirstJobCardAndStart(false);
      } else {
        console.log("⏹️ Stopping automation");
        isRunning = false;
        updateFabUI();
      }
    }
  });
});

// Helper function to click first job card and start automation
async function clickFirstJobCardAndStart(afterRedirect) {
    console.log("🎯 Attempting to find and click the first job card");
    
    // Wait for the page to fully load and stabilize
    await delay(3000);
    
    // NEW APPROACH: Look specifically for elements with the exact class pattern you found
    console.log("Looking for job cards with specific LinkedIn classes...");
    
    // Function to find elements that contain all these class name fragments
    function findElementsWithClassPatterns(classPatterns) {
        const allElements = document.querySelectorAll('div, li');
        return Array.from(allElements).filter(el => {
            if (!el.className || typeof el.className !== 'string') return false;
            return classPatterns.every(pattern => el.className.includes(pattern));
        });
    }
    
    // Look for elements with these class patterns
    const jobCardClassPatterns = [
        "job-card-container",
        "job-card-list",
        "clickable"
    ];
    
    const jobCardsWithPattern = findElementsWithClassPatterns(jobCardClassPatterns);
    console.log(`Found ${jobCardsWithPattern.length} job cards with specific class patterns`);
    
    if (jobCardsWithPattern.length > 0) {
        console.log("✅ Found job card with exact pattern match!");
        const firstCard = jobCardsWithPattern[0];
        
        // Debug information
        console.log(`Selected job card classes: ${firstCard.className}`);
        console.log(`Dimensions: ${firstCard.offsetWidth}x${firstCard.offsetHeight}`);
        
        // Highlight it briefly
        const originalStyle = firstCard.getAttribute("style") || "";
        firstCard.setAttribute("style", `${originalStyle}; border: 3px solid red !important; background-color: rgba(255,255,0,0.2) !important;`);
        
        await delay(500); // Show highlight briefly
        firstCard.setAttribute("style", originalStyle);
        
        // Try to click it with our enhanced click method
        await clickJobCard(firstCard);
        return;
    }
    
    // FALLBACK 1: If specific pattern not found, look for any element with "job-card-container" class
    console.log("⚠️ Specific pattern not found, looking for any job-card-container");
    const simpleJobCards = document.querySelectorAll('div.job-card-container, li.job-card-container');
    
    if (simpleJobCards.length > 0) {
        console.log(`✅ Found ${simpleJobCards.length} elements with job-card-container class`);
        await clickJobCard(simpleJobCards[0]);
        return;
    }
    
    // FALLBACK 2: Use our original approach with multiple selectors
    console.log("⚠️ Job card container not found, trying original selectors");
    
    // Continue with your original code for finding left panel/job cards
    // ... existing code for finding left panel and job cards ...
    const leftPanelSelectors = [
      ".scaffold-layout__list",
      ".jobs-search-results-list",
      ".jobs-search-two-pane__results"
    ];
    
    let leftPanel = null;
    for (const selector of leftPanelSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        console.log(`✅ Found job list panel: ${selector}`);
        leftPanel = element;
        break;
      }
    }
    
    if (leftPanel) {
        // Found a left panel, now look for job cards in it
        const jobCardSelectors = [
          ".jobs-search-results__list-item", 
          ".job-card-container", 
          ".jobs-search-result-item",
          "li[data-occludable-job-id]"
        ];
        
        let foundCard = false;
        
        // Try each selector individually for better clarity
        for (const selector of jobCardSelectors) {
            const cards = leftPanel.querySelectorAll(selector);
            if (cards.length > 0) {
                console.log(`✅ Found job card with selector: ${selector}`);
                await clickJobCard(cards[0]);
                foundCard = true;
                break;
            }
        }
        
        if (!foundCard) {
            console.log("❌ No job cards found in left panel, starting automation anyway");
            isRunning = true;
            updateFabUI();
            startAutomation();
        }
    } else {
        // FALLBACK 3: Last resort - look for job cards anywhere on the page
        const allJobCardSelectors = [
            ".jobs-search-results__list-item",
            ".job-card-container", 
            ".jobs-search-result-item",
            ".occludable-update"
        ];
        
        let firstJobCard = null;
        for (const selector of allJobCardSelectors) {
            const cards = document.querySelectorAll(selector);
            if (cards.length > 0) {
                firstJobCard = cards[0];
                console.log(`✅ Found job card with selector: ${selector}`);
                break;
            }
        }
        
        if (firstJobCard) {
            await clickJobCard(firstJobCard);
        } else {
            console.log("❌ All attempts to find job cards failed. Starting automation anyway");
            isRunning = true;
            updateFabUI();
            startAutomation();
        }
    }
}

// Keep your existing clickJobCard function
async function clickJobCard(jobCard) {
    console.log("🖱️ Attempting to click on job card");
    
    try {
        // Scroll to the card first
        console.log("Scrolling to job card...");
        jobCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
        await delay(1000);
        
        // First find all clickable elements inside the job card
        const clickableElements = jobCard.querySelectorAll('a, button, [role="button"]');
        console.log(`Found ${clickableElements.length} clickable elements inside the job card`);
        
        let clickSucceeded = false;
        
        // Try clicking any clickable elements inside first
        if (clickableElements.length > 0) {
            console.log("Attempting to click the first clickable element inside job card");
            try {
                clickableElements[0].click();
                clickSucceeded = true;
                console.log("✅ Successfully clicked element inside job card");
            } catch (err) {
                console.log("Failed to click element inside job card:", err);
            }
        }
        
        // If internal element click didn't work, try direct click on the job card
        if (!clickSucceeded) {
            console.log("Attempting direct click on job card");
            try {
                jobCard.click();
                clickSucceeded = true;
                console.log("✅ Successfully clicked job card directly");
            } catch (err) {
                console.log("Direct click failed:", err);
            }
        }
        
        // If direct click didn't work, try event dispatch
        if (!clickSucceeded) {
            console.log("Attempting click via event dispatch");
            try {
                const clickEvent = new MouseEvent('click', {
                    view: window,
                    bubbles: true,
                    cancelable: true
                });
                jobCard.dispatchEvent(clickEvent);
                clickSucceeded = true;
                console.log("✅ Successfully dispatched click event");
            } catch (err) {
                console.log("Event dispatch failed:", err);
            }
        }
        
        // Wait for job details to fully load
        console.log("Waiting for job details to load...");
        await delay(3000);
        
        // Check if job details are visible
        const jobDetails = document.querySelector('.jobs-unified-top-card__content-container, .jobs-details');
        console.log(`Job details visible: ${jobDetails ? '✅ Yes' : '❌ No'}`);
        
        // Now start automation
        console.log("Starting automation...");
        isRunning = true;
        updateFabUI();
        startAutomation();
    } catch (err) {
        console.error("❌ Error in clickJobCard function:", err);
        // Start automation anyway
        console.log("Starting automation despite errors...");
        isRunning = true;
        updateFabUI();
        startAutomation();
    }
}
  
  // Helper function to click on a job card
  async function clickJobCard(jobCard) {
    console.log("🖱️ Attempting to click on job card");
    
    try {
      // Scroll to the card first
      console.log("Scrolling to job card...");
      jobCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
      await delay(1000);
      
      // First find all clickable elements inside the job card
      const clickableElements = jobCard.querySelectorAll('a, button, [role="button"]');
      console.log(`Found ${clickableElements.length} clickable elements inside the job card`);
      
      let clickSucceeded = false;
      
      // Try clicking any clickable elements inside first
      if (clickableElements.length > 0) {
        console.log("Attempting to click the first clickable element inside job card");
        try {
          clickableElements[0].click();
          clickSucceeded = true;
          console.log("✅ Successfully clicked element inside job card");
        } catch (err) {
          console.log("Failed to click element inside job card:", err);
        }
      }
      
      // If internal element click didn't work, try direct click on the job card
      if (!clickSucceeded) {
        console.log("Attempting direct click on job card");
        try {
          jobCard.click();
          clickSucceeded = true;
          console.log("✅ Successfully clicked job card directly");
        } catch (err) {
          console.log("Direct click failed:", err);
        }
      }
      
      // If direct click didn't work, try event dispatch
      if (!clickSucceeded) {
        console.log("Attempting click via event dispatch");
        try {
          const clickEvent = new MouseEvent('click', {
            view: window,
            bubbles: true,
            cancelable: true
          });
          jobCard.dispatchEvent(clickEvent);
          clickSucceeded = true;
          console.log("✅ Successfully dispatched click event");
        } catch (err) {
          console.log("Event dispatch failed:", err);
        }
      }
      
      // Wait for job details to fully load
      console.log("Waiting for job details to load...");
      await delay(3000); // Increased wait time
      
      // Check if job details are visible
      const jobDetails = document.querySelector('.jobs-unified-top-card__content-container, .jobs-details');
      console.log(`Job details visible: ${jobDetails ? '✅ Yes' : '❌ No'}`);
      
      // Now start automation
      console.log("Starting automation...");
      isRunning = true;
      updateFabUI();
      startAutomation();
    } catch (err) {
      console.error("❌ Error in clickJobCard function:", err);
      // Start automation anyway
      console.log("Starting automation despite errors...");
      isRunning = true;
      updateFabUI();
      startAutomation();
    }
  }

// Update the updateFabUI function as well
function updateFabUI() {
    if (!fab) return;
    
    if (isRunning) {
      fab.textContent = "STOP";
      fab.style.background = "linear-gradient(135deg, #F44336, #B71C1C)";
      fab.style.boxShadow = 
        "0 3px 10px rgba(244,67,54,0.3), " +
        "0 8px 20px rgba(0,0,0,0.15), " +
        "0 0 0 1px rgba(255,255,255,0.1), " +
        "inset 0 1px 0 rgba(255,255,255,0.2)";
    } else {
      fab.textContent = "Start AI AutoApply";
      fab.style.background = "linear-gradient(135deg, #1E88E5, #0D47A1)";
      fab.style.boxShadow = 
        "0 3px 10px rgba(0,119,181,0.3), " +
        "0 8px 20px rgba(0,0,0,0.15), " +
        "0 0 0 1px rgba(255,255,255,0.1), " +
        "inset 0 1px 0 rgba(255,255,255,0.2)";
    }
  }

// Rest of the code remains unchanged

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log("Message received:", message);
    
    if (message.action === "start") {
        console.log("🚀 Starting LinkedIn automation");
        isRunning = true;
        startAutomation();
        sendResponse({ status: "Automation started" });
    } else if (message.action === "stop") {
        console.log("⏹️ Stopping LinkedIn automation");
        isRunning = false;
        // Stop any ongoing processes
        window.location.reload();
        sendResponse({ status: "Automation stopped" });
    } else if (message.action === "status") {
        // Report current status
        sendResponse({ isRunning });
    }
    
    return true; // Indicates async response
});

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

// ...the rest of your code (startAutomation, fillApplicationForm, etc.)...

// Fill application form fields
async function fillApplicationForm() {
    console.log("📝 Filling application form...");
    
    // Get the active modal container to restrict our scope
    const modalContainer = document.querySelector('.jobs-easy-apply-content, .artdeco-modal__content, .ember-view');
    
    if (!modalContainer) {
        console.log("⚠️ No modal container found for form filling");
        return;
    }
    
    // Handle text fields - restrict to modal
    const textInputs = modalContainer.querySelectorAll('input[type="text"]:not([value]), input[type="tel"]:not([value]), input[type="email"]:not([value])');
    for (const input of textInputs) {
        input.value = input.type === "tel" ? "9363918085" : "5";
        input.dispatchEvent(new Event('input', { bubbles: true }));
        await delay(300);
    }
    
    // Handle textareas - restrict to modal
    const textareas = modalContainer.querySelectorAll('textarea:not([value])');
    for (const textarea of textareas) {
        textarea.value = "5";
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
        await delay(300);
    }
    
    // Handle dropdowns - restrict to modal
    const selects = modalContainer.querySelectorAll('select:not([value])');
    for (const select of selects) {
        if (select.options.length > 1) {
            select.value = select.options[1].value;
            select.dispatchEvent(new Event('change', { bubbles: true }));
            await delay(300);
        }
    }
    
    // Handle radio buttons - restrict to modal
// Handle radio buttons - restrict to modal
const radioGroups = modalContainer.querySelectorAll('fieldset');
for (const group of radioGroups) {
    const radios = group.querySelectorAll('input[type="radio"]');
    if (radios.length > 0 && !Array.from(radios).some(r => r.checked)) {
        // Get the question text to check for sponsorship
        const questionText = group.textContent.toLowerCase() || '';
        const isSponsorship = questionText.includes('sponsor') || 
                              questionText.includes('sponsorship') || 
                              questionText.includes('work authorization') ||
                              questionText.includes('visa');
        
        if (isSponsorship) {
            // For sponsorship questions, try to find "No" option
            console.log("📝 Sponsorship question detected, selecting No");
            const noOption = Array.from(radios).find(r => 
                r.value.toLowerCase() === "no" || 
                r.id.toLowerCase().includes("no")
            );
            
            if (noOption) {
                noOption.click();
            } else {
                // If can't find explicit "No", choose the last option
                // (often "No" is the second option)
                radios[radios.length - 1].click();
            }
        } else {
            // For all other questions, try to find "Yes" option
            console.log("📝 Standard question, selecting Yes");
            const yesOption = Array.from(radios).find(r => 
                r.value.toLowerCase() === "yes" || 
                r.id.toLowerCase().includes("yes")
            );
            
            if (yesOption) {
                yesOption.click();
            } else {
                // If can't find explicit "Yes", choose the first option
                radios[0].click();
            }
        }
        
        await delay(300);
    }
}
    
    // Handle checkboxes - restrict to modal
    const checkboxes = modalContainer.querySelectorAll('input[type="checkbox"]:not(:checked)');
    for (const checkbox of checkboxes) {
        checkbox.click();
        await delay(300);
    }
    
    console.log("✅ Form fields filled");
}

async function processApplicationSteps() {
    console.log("⏩ Processing application steps...");
    
    let stillApplying = true;
    let stepCounter = 1;
    let consecutiveEmptySteps = 0;
    const maxSteps = 15; // Increased to handle longer applications
    
    try {
        while (stillApplying && stepCounter <= maxSteps) {
            console.log(`Step ${stepCounter}: Looking for action buttons...`);
            
            // Wait for any dialog content to load
            await delay(1500);
            
            try {
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
                const doneButton = document.querySelector('button.artdeco-button--primary:not([aria-label="Cancel"])');
                const reviewButton = document.querySelector('button[aria-label="Review your application"], button[data-control-name="review_application"]');
                const nextButton = document.querySelector('button[aria-label="Continue to next step"], button[data-control-name="continue_unify"], button.artdeco-button--primary');
                
                // Check if this is the first step with a "Review" or similar button
                const isFirstStep = stepCounter === 1;
                if (isFirstStep) {
                    console.log("Available buttons:", document.querySelectorAll('button.artdeco-button'));
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
                
                // Fill out the form fields regardless of which button is present
                await fillApplicationForm();
                
                // Now try to find buttons by text content if selectors failed
                const allButtons = document.querySelectorAll('button');
                let buttonFound = false;
                
                // Check for submit button by text
                if (!submitButton) {
                    const submitByText = Array.from(allButtons).find(btn => {
                        const text = btn.textContent.trim().toLowerCase();
                        return text === 'submit' || text === 'submit application' || text.includes('submit application');
                    });
                    
                    if (submitByText) {
                        console.log("🎉 Found Submit button by text, clicking...");
                        submitByText.click();
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
                        break;
                    }
                }
                
                // Check for the most common button patterns
                if (submitButton) {
                    console.log("✅ Found Submit button, clicking...");
                    submitButton.click();
                    stillApplying = false;
                    await delay(2000);
                    
                    // Try to close any remaining dialogs
                    const closeButtons = document.querySelectorAll('button[aria-label="Dismiss"], button.artdeco-modal__dismiss');
                    if (closeButtons.length > 0) {
                        closeButtons[0].click();
                    }
                    
                    console.log("✅ Application process completed");
                    break;
                }
                else if (doneButton) {
                    console.log("✅ Found Done button, clicking...");
                    doneButton.click();
                    stillApplying = false;
                    await delay(2000);
                    console.log("✅ Application process completed");
                    break;
                }
                else if (reviewButton) {
                    console.log("✅ Found Review button, clicking...");
                    reviewButton.click();
                    buttonFound = true;
                }
                else if (nextButton) {
                    console.log("✅ Found Next button, clicking...");
                    nextButton.click();
                    buttonFound = true;
                }
                
                if (!buttonFound) {
                    // Last resort: look for any button with next/continue/submit in the text
                    console.log("⚠️ No standard buttons found, looking for buttons by text content");
                    
                    const actionButtonTexts = ["next", "continue", "review", "submit"];
                    const actionButton = Array.from(allButtons).find(btn => {
                        const text = btn.textContent.trim().toLowerCase();
                        return actionButtonTexts.some(actionText => text.includes(actionText));
                    });
                    
                    if (actionButton) {
                        console.log(`✅ Found button with action text: "${actionButton.textContent.trim()}", clicking...`);
                        actionButton.click();
                        buttonFound = true;
                    } else {
                        console.log("⚠️ No action buttons found by text in this step");
                        consecutiveEmptySteps++;
                        
                        if (consecutiveEmptySteps >= 3) {
                            console.log("❌ Too many consecutive steps without buttons, ending process");
                            // Attempt to close any open dialogs before giving up
                            const closeButtons = document.querySelectorAll('button[aria-label="Dismiss"], button.artdeco-modal__dismiss');
                            if (closeButtons.length > 0) {
                                closeButtons[0].click();
                            }
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
                console.log(`❌ Error in application step ${stepCounter}:`, stepError);
                stepCounter++;
                
                // Try to continue despite errors
                if (stepCounter > 8) {
                    console.log("❌ Too many steps with errors, ending process");
                    
                    // Try to close any open dialogs before giving up
                    try {
                        const closeButtons = document.querySelectorAll('button[aria-label="Dismiss"], button.artdeco-modal__dismiss');
                        if (closeButtons.length > 0) {
                            closeButtons[0].click();
                        }
                    } catch (e) { /* ignore */ }
                    
                    stillApplying = false;
                }
            }
        }
        
        // If we exited the loop because we hit max steps, try to close any open dialogs
        if (stepCounter > maxSteps) {
            console.log("⚠️ Reached maximum steps without completing application");
            const closeButtons = document.querySelectorAll('button[aria-label="Dismiss"], button.artdeco-modal__dismiss');
            if (closeButtons.length > 0) {
                closeButtons[0].click();
            }
        }
        
        console.log("✅ Application process completed");
        
    } catch (processError) {
        console.error("❌ Fatal error in application process:", processError);
        
        // Try to close any open dialogs on error
        try {
            const closeButtons = document.querySelectorAll('button[aria-label="Dismiss"], button.artdeco-modal__dismiss');
            if (closeButtons.length > 0) {
                closeButtons[0].click();
            }
        } catch (e) { /* ignore */ }
    }
}

// Fix for startAutomation to properly handle external jobs and move to the next job
async function startAutomation() {
    if (!isRunning) {
        console.log("⏹️ Automation is stopped, exiting...");
        return;
    }
    console.log("🚀 Starting LinkedIn automation");
    
    try {
        // Click the first unprocessed job card
        const jobCards = document.querySelectorAll(".job-card-container:not([data-processed])");
        
        if (jobCards.length === 0) {
            console.log("❌ No unprocessed job cards found. Try refreshing the page or searching for more jobs.");
            return; // Exit to avoid infinite loop with no jobs
        }
        
        const job = jobCards[0];
        console.log("🖱️ Clicking job card");
        
        try {
            job.scrollIntoView({ behavior: 'smooth', block: 'center' });
            await delay(1000);
            
            // Try multiple click approaches
            try {
                job.click();
            } catch (clickError) {
                console.log("Direct click failed, trying alternative methods");
                
                // Alternative click method
                const clickEvent = new MouseEvent('click', {
                    view: window,
                    bubbles: true,
                    cancelable: true
                });
                job.dispatchEvent(clickEvent);
            }
            
            // Wait for job details to load
            await delay(2000);
            
            // Check if this is an external application first
            const externalApplyIndicators = [
                // Check for "Apply" button without "Easy"
                () => {
                    const applyButtons = document.querySelectorAll('button');
                    return Array.from(applyButtons).some(btn => {
                        const text = btn.textContent.trim().toLowerCase();
                        return text === 'apply' && !text.includes('easy');
                    });
                },
                // Check for text indicating external application
                () => {
                    const jobDetails = document.querySelector('.jobs-unified-top-card, .jobs-details');
                    return jobDetails && jobDetails.textContent.toLowerCase().includes('apply on company website');
                },
                // Check for "Apply on company site" button
                () => {
                    const buttons = document.querySelectorAll('a, button');
                    return Array.from(buttons).some(btn => {
                        const text = btn.textContent.trim().toLowerCase();
                        return text.includes('apply on company') || text.includes('company site');
                    });
                }
            ];
            
            // Check if any external indicators are found
            let isExternalJob = false;
            for (const check of externalApplyIndicators) {
                try {
                    if (check()) {
                        isExternalJob = true;
                        break;
                    }
                } catch (e) {
                    console.log("Error checking external indicator:", e);
                }
            }
            
            if (isExternalJob) {
                console.log("🔄 External application detected, skipping this job");
                job.setAttribute('data-processed', 'true');
                
                // Set a short timeout to allow the UI to update before continuing
                setTimeout(() => {
                    startAutomation(); // Move to next job immediately
                }, 1000);
                return;
            }
            
            // More robust Easy Apply button detection with error handling
            console.log("Looking for Easy Apply button...");
            let easyApplyBtn = null;
            
            // Try different selectors to find the Easy Apply button
            const easyApplySelectors = [
                "button.jobs-apply-button",
                'button[data-control-name="jobdetails_topcard_inapply"]',
                'button.artdeco-button--primary'
            ];
            
            for (const selector of easyApplySelectors) {
                try {
                    const btn = document.querySelector(selector);
                    if (btn && btn.textContent.toLowerCase().includes("easy apply")) {
                        easyApplyBtn = btn;
                        break;
                    }
                } catch (e) {
                    console.log(`Error finding apply button with selector ${selector}:`, e);
                }
            }
            
            // Last resort - find by text content
            if (!easyApplyBtn) {
                try {
                    const allButtons = document.querySelectorAll('button');
                    easyApplyBtn = Array.from(allButtons).find(b => 
                        b.textContent.trim().toLowerCase().includes('easy apply')
                    );
                } catch (e) {
                    console.log("Error finding apply button with text content:", e);
                }
            }
            
            if (easyApplyBtn) {
                console.log("🖱️ Found and clicking Easy Apply button");
                
                try {
                    easyApplyBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    await delay(1000);
                    easyApplyBtn.click();
                    
                    // Wait for application modal to appear
                    await delay(2000);
                    
                    // Process immediately - don't check for specific dialog class
                    console.log("📄 Starting application process...");
                    await processApplicationSteps();
                } catch (buttonClickError) {
                    console.error("❌ Error clicking Easy Apply button:", buttonClickError);
                }
            } else {
                console.log("❌ No Easy Apply button found, marking as processed and moving on");
                // Log available buttons for debugging
                try {
                    const allButtons = document.querySelectorAll('button');
                    console.log(`Available buttons (${allButtons.length}):`);
                    Array.from(allButtons).slice(0, 10).forEach((b, i) => {
                        console.log(`Button ${i}: "${b.textContent.trim()}" class="${b.className}"`);
                    });
                } catch (e) {
                    console.log("Error listing buttons:", e);
                }
            }
            
            // Mark this job as processed whether we successfully applied or not
            job.setAttribute('data-processed', 'true');
            console.log("✅ Job card marked as processed");
            
        } catch (navigationError) {
            console.error("❌ Error during job navigation:", navigationError);
            job.setAttribute('data-processed', 'true'); // Mark as processed even if failed
        }
    } catch (error) {
        console.error("❌ Error during automation:", error);
    }
    
    // Schedule the next job after a delay, but only if running
    if (isRunning) {
        setTimeout(() => {
            startAutomation();
        }, 3000); // Reduced delay to make the process faster
    } else {
        console.log("⏹️ Automation stopped, not scheduling next job");
    }
}