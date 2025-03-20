console.log("✅ LinkedIn Auto Apply content script loaded");

let isRunning = false;
let stillApplying = false;
let fab = null; // Declare fab globally so it can be accessed from anywhere

window.addEventListener("load", () => {
  if (!window.location.hostname.includes("linkedin.com")) return;
  if (document.getElementById("autoApplyFab")) return;

  const linkedInJobsUrl = "https://www.linkedin.com/jobs/search/?f_AL=true&f_E=2%2C3%2C4&f_TPR=r86400&geoId=103644278&keywords=java%20full%20stack%20developer&origin=JOB_SEARCH_PAGE_JOB_FILTER&refresh=true";

  // Create the FAB
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
  
  // Add the image to the FAB
  const fabImage = document.createElement("img");
  fabImage.src = chrome.runtime.getURL("icons/ai_auto.png");
  fabImage.style.width = "180%";
  fabImage.style.height = "160%";
  fabImage.style.objectFit = "contain";
  fabImage.style.pointerEvents = "none"; // Ensure the image doesn't interfere with button clicks
  fabImage.style.paddingRight = "10px"; // Add padding to the right
  fabImage.style.paddingBottom="10px";
  fabImage.style.transform = "translateX(-8px) scale(1.2)";
  fab.appendChild(fabImage);
  
  document.body.appendChild(fab);

  let isDragging = false;
  let offsetY = 0;

  // Check if redirect is pending
  const isRedirectPending = localStorage.getItem("shouldStartAfterRedirect") === "true";
  if (window.location.href.includes("/jobs/")) {
    if (isRedirectPending) {
      localStorage.removeItem("shouldStartAfterRedirect");
    
      // Delay starting automation to ensure the page is fully loaded
      setTimeout(() => clickJobCardWithViewName(), 2000);
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
    
    const currentUrl = window.location.href;
    if (!currentUrl.includes("/jobs")) {
        // If not on jobs page, set flag and redirect
        localStorage.setItem("shouldStartAfterRedirect", "true");
        console.log("📍 Not on jobs page, redirecting to job search URL");
        window.location.href = linkedInJobsUrl;
    }  else {
        // Already on jobs page or subpage
        if (!isRunning) {
            console.log("🚀 Starting automation on jobs page");
            isRunning = true;
            updateFabUI();
            clickJobCardWithViewName();
        } else {
            console.log("⏹️ Stopping automation");
            isRunning = false;
            stillApplying = false; // Ensure stillApplying is also set to false
            updateFabUI();
        }
    }
 });
});

// Update the updateFabUI function as well
function updateFabUI() {
    if (!fab) return;
    
    if (isRunning) {
      fab.style.background = "linear-gradient(135deg, #F44336, #B71C1C)";
      fab.style.boxShadow = 
        "0 3px 10px rgba(244,67,54,0.3), " +
        "0 8px 20px rgba(0,0,0,0.15), " +
        "0 0 0 1px rgba(255,255,255,0.1), " +
        "inset 0 1px 0 rgba(255,255,255,0.2)";
    } else {
      fab.style.background = "linear-gradient(135deg, #1E88E5, #0D47A1)";
      fab.style.boxShadow = 
        "0 3px 10px rgba(0,119,181,0.3), " +
        "0 8px 20px rgba(0,0,0,0.15), " +
        "0 0 0 1px rgba(255,255,255,0.1), " +
        "inset 0 1px 0 rgba(255,255,255,0.2)";
    }
}

async function clickJobCardWithViewName() {
    console.log("🎯 Attempting to find and click the first job card with fh-webext-job-display='true'");
    
    // Wait for the page to fully load and stabilize
    await delay(3000);
    
    // Find the first job card with the 'fh-webext-job-display="true"' attribute
    const jobCards = document.querySelectorAll('li[fh-webext-job-display="true"]');
    
    if (jobCards.length > 0) {
        console.log("✅ Found job card with fh-webext-job-display='true'");
        const firstCard = jobCards[0];
        
        // Highlight it briefly for debugging
        const originalStyle = firstCard.getAttribute("style") || "";
        firstCard.setAttribute("style", `${originalStyle}; border: 3px solid red !important; background-color: rgba(255,255,0,0.2) !important;`);
        
        await delay(500); // Show highlight briefly
        firstCard.setAttribute("style", originalStyle);
        
        // Click the job card
        await clickJobCard(firstCard);
        return;
    } else {
        console.log("❌ No job cards with fh-webext-job-display='true' found. Checking for job cards with data-view-name='job card'.");
        
        // Find the first job card with the 'data-view-name="job card"' attribute
        const jobCardsWithViewName = document.querySelectorAll('[data-view-name="job-card"]');
        
        if (jobCardsWithViewName.length > 0) {
            console.log("✅ Found job card with data-view-name='job-card'");
            const firstCard = jobCardsWithViewName[0];
            
            // Highlight it briefly for debugging
            const originalStyle = firstCard.getAttribute("style") || "";
            firstCard.setAttribute("style", `${originalStyle}; border: 3px solid red !important; background-color: rgba(255,255,0,0.2) !important;`);
            
            await delay(500); // Show highlight briefly
            firstCard.setAttribute("style", originalStyle);
            
            // Click the job card
            await clickJobCard(firstCard);
            return;
        } else {
            console.log("❌ No job cards with data-view-name='job-card' found. Starting automation anyway.");
            // Proceed with automation if no job cards are found
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
            } catch (err) {
                console.log("Event dispatch failed:", err);
            }
        }
        
        // Wait for job details to fully load with a timeout
        console.log("Waiting for job details to load...");
        const jobDetails = await waitForElement('.jobs-unified-top-card__content-container, .jobs-details', 5000);
        console.log(`Job details visible: ${jobDetails ? '✅ Yes' : '❌ No'}`);
        
        if (!jobDetails) {
            throw new Error("Job details did not load in time");
        }
        
        // Now start automation
        console.log("Starting automation...");
        isRunning = true;
        updateFabUI();
        startAutomation();
    } catch (err) {
        console.error("❌ Error in clickJobCard function:", err);
        // Retry clicking the job card if it failed
        console.log("Retrying to click the job card...");
        await delay(2000);
        await clickJobCard(jobCard);
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
        stillApplying = false; // Ensure stillApplying is also set to false
        updateFabUI();
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


// Fill application form fields
async function fillApplicationForm() {
    console.log("📝 Filling application form...");
    
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
            if (checkbox.name !== "jobDetailsEasyApplyTopChoiceCheckbox") {
                checkbox.click();
                await delay(300);
            }
        }
        
        console.log("✅ Form fields filled");
        return true; // Indicate success
    } catch (error) {
        console.error("❌ Error filling application form:", error);
        return false; // Indicate failure to fill the form
    }
}

async function processApplicationSteps() {
    console.log("⏩ Processing application steps...");
    
    stillApplying = true;
    let stepCounter = 1;
    let consecutiveEmptySteps = 0;
    const maxSteps = 15; // Increased to handle longer applications
    
    try {
        while (stillApplying && stepCounter <= maxSteps) {
            console.log(`Step ${stepCounter}: Looking for action buttons...`);
            
            // Wait for any dialog content to load
            await delay(1000);
            
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
                
                // Fill out the form fields regardless of which button is present
                const formFilled = await fillApplicationForm();
                if (!formFilled) {
                    console.log("❌ Form filling failed, ending process");
                    stillApplying = false;
                    
                    // Click cancel and discard buttons
                    if (cancel) {
                        cancel.click();
                        await delay(1000);
                    }
                    if (discard) {
                        discard.click();
                        await delay(1000);
                    }
                    
                    break;
                }
                
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
            console.log("❌ No unprocessed job cards found. Moving to next page.");
            await handlePagination();
            return;
        }

        const job = jobCards[0];
        console.log("🖱️ Clicking job card");

        try {
            // Mark the job card as processed
            job.setAttribute('data-processed', 'true');
            
            job.scrollIntoView({ behavior: 'smooth', block: 'center' });
            await delay(1000);
            
            // Click the job card
            try {
                job.click();
            } catch (clickError) {
                console.log("Direct click failed, trying alternative method");
                const clickEvent = new MouseEvent('click', {
                    view: window,
                    bubbles: true,
                    cancelable: true
                });
                job.dispatchEvent(clickEvent);
            }
            
            // Wait for job details to load
            await delay(2000);

            // Look for Easy Apply button
            const easyApplyButton = document.querySelector('button.jobs-apply-button');
            
            if (!easyApplyButton || !easyApplyButton.textContent.toLowerCase().includes('easy apply')) {
                console.log("❌ No Easy Apply button found or external job, moving to next job");
                // Recursively call startAutomation to process the next job
                await startAutomation();
                return;
            }

            console.log("✅ Found Easy Apply button, clicking...");
            easyApplyButton.click();
            await delay(1000);

            // Process the application
            await processApplicationSteps();
            
            // Move to next job after processing
            await startAutomation();

        } catch (navigationError) {
            console.error("❌ Error navigating job:", navigationError);
            // Move to next job even if there's an error
            await startAutomation();
        }
    } catch (error) {
        console.error("❌ Fatal error in automation:", error);
        isRunning = false;
    }
}

// Helper function to handle pagination
async function handlePagination() {
    const paginationItems = document.querySelectorAll('.artdeco-pagination__pages .artdeco-pagination__indicator');
    const activePage = Array.from(paginationItems).find(item => item.classList.contains('active'));
    
    if (activePage) {
        const nextPage = activePage.nextElementSibling;
        if (nextPage && nextPage.tagName === 'LI') {
            const nextButton = nextPage.querySelector('button');
            if (nextButton) {
                const priorUrl = window.location.href;
                console.log("✅ Found the next page button, clicking...");
                nextButton.click();
                await delay(5000);

                if (priorUrl === window.location.href) {
                    console.log("❌ Page navigation failed");
                    isRunning = false;
                } else {
                    console.log("✅ Successfully navigated to next page");
                    await startAutomation();
                }
                return;
            }
        }
    }
    
    console.log("❌ No more pages to process");
    isRunning = false;
}