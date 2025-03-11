console.log("✅ LinkedIn Auto Apply content script loaded");

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log("Message received:", message);
    
    if (message.action === "start") {
        console.log("🚀 Starting LinkedIn automation");
        startAutomation();
        sendResponse({ status: "Automation started" });
    } else if (message.action === "stop") {
        console.log("⏹️ Stopping LinkedIn automation");
        // Stop any ongoing processes
        window.location.reload();
        sendResponse({ status: "Automation stopped" });
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
    const radioGroups = modalContainer.querySelectorAll('fieldset');
    for (const group of radioGroups) {
        const radios = group.querySelectorAll('input[type="radio"]');
        if (radios.length > 0 && !Array.from(radios).some(r => r.checked)) {
            // Try to find "Yes" option first
            const yesOption = Array.from(radios).find(r => 
                r.value.toLowerCase() === "yes" || 
                r.id.toLowerCase().includes("yes")
            );
            
            if (yesOption) {
                yesOption.click();
            } else {
                radios[0].click();
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

async function startAutomation() {
    console.log("🚀 Starting LinkedIn automation");
    
    try {
        // Click the first unprocessed job card
        const jobCards = document.querySelectorAll(".job-card-container:not([data-processed])");
        if (jobCards.length > 0) {
            const job = jobCards[0];
            console.log("🖱️ Clicking job card");
            
            // Use more reliable clicking method
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
                
                // More robust Easy Apply button detection with error handling
                console.log("Looking for Easy Apply button...");
                let easyApplyBtn = null;
                
                try {
                    easyApplyBtn = document.querySelector("button.jobs-apply-button");
                } catch (e) {
                    console.log("Error finding apply button with first selector:", e);
                }
                
                if (!easyApplyBtn) {
                    try {
                        easyApplyBtn = document.querySelector('button[data-control-name="jobdetails_topcard_inapply"]');
                    } catch (e) {
                        console.log("Error finding apply button with second selector:", e);
                    }
                }
                
                if (!easyApplyBtn) {
                    // Last resort - find by text content
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
                    console.log("❌ No Easy Apply button found");
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
                
                job.setAttribute('data-processed', 'true');
                console.log("✅ Job card marked as processed");
                
            } catch (navigationError) {
                console.error("❌ Error during job navigation:", navigationError);
                job.setAttribute('data-processed', 'true'); // Mark as processed even if failed
            }
            
        } else {
            console.log("❌ No unprocessed job cards found. Try refreshing the page or searching for more jobs.");
        }
    } catch (error) {
        console.error("❌ Error during automation:", error);
    }
    
    // Schedule the next job after a delay
    setTimeout(() => {
        startAutomation();
    }, 5000);
}

async function processApplicationSteps() {
    console.log("⏩ Processing application steps...");
    
    let stillApplying = true;
    let stepCounter = 1;
    let consecutiveEmptySteps = 0;
    
    try {
        while (stillApplying && stepCounter <= 10) {
            console.log(`Step ${stepCounter}: Looking for action buttons...`);
            
            // Wait for any dialog content to load
            await delay(1500);
            
            try {
                // Look for action buttons with valid selectors - fixed syntax
                const submitButton = document.querySelector('button[aria-label="Submit application"], button[data-control-name="submit_application"], button[data-control-name="submit_resume"]');
                const doneButton = document.querySelector('button[aria-label="Done"], button[data-control-name="continue_unify"]');
                const reviewButton = document.querySelector('button[aria-label="Review your application"], button[data-control-name="review_application"]');
                const nextButton = document.querySelector('button[aria-label="Continue to next step"], button[data-control-name="continue_unify"]');
                
                // Check for success indicators using text content checks instead of invalid selectors
                const modalContents = document.querySelectorAll('.artdeco-modal__content');
                let successMessage = false;
                for (const content of modalContents) {
                    const text = content.textContent.toLowerCase();
                    if (text.includes('application submitted') || 
                        text.includes('successfully applied') || 
                        text.includes('your application was sent')) {
                        successMessage = true;
                        break;
                    }
                }
                
                if (successMessage) {
                    console.log("🎉 Application submitted successfully! Looking for Done button...");
                    
                    // Try to find and click the Done button
                    const allButtons = document.querySelectorAll('button');
                    const possibleDoneButtons = Array.from(allButtons).filter(b => {
                        const text = b.textContent.trim().toLowerCase();
                        return (text.includes('done') || text.includes('close') || text.includes('ok')) &&
                              b.offsetWidth > 0 && 
                              b.offsetHeight > 0;
                    });
                    
                    if (possibleDoneButtons.length > 0) {
                        console.log("✅ Found Done button, clicking to complete application");
                        try {
                            possibleDoneButtons[0].click();
                            stillApplying = false;
                            await delay(1000);
                            console.log("🏁 Application process completed successfully!");
                            return;
                        } catch (e) {
                            console.error("Error clicking done button:", e);
                        }
                    }
                }
                
                // Debug - list all buttons
                const allButtons = document.querySelectorAll('button');
                console.log("Available buttons:", Array.from(allButtons).map(b => ({
                    text: b.textContent.trim(),
                    label: b.getAttribute('aria-label'),
                    class: b.className
                })).slice(0, 5));
                
                // Special handling for first step (Contact Info)
                if (stepCounter === 1) {
                    console.log("⏭️ First step - skipping form fill, looking for Next button");
                    
                    // Try to find next button directly
                    let possibleNextButtons = [];
                    try {
                        possibleNextButtons = Array.from(allButtons).filter(b => {
                            const text = b.textContent.trim().toLowerCase();
                            return (text.includes('next') || text.includes('continue')) && 
                                  b.offsetWidth > 0 && 
                                  b.offsetHeight > 0;
                        });
                    } catch (e) {
                        console.log("Error filtering next buttons:", e);
                    }
                    
                    if (possibleNextButtons.length > 0) {
                        console.log("➡️ Found Next button on first step:", possibleNextButtons[0].textContent);
                        try {
                            possibleNextButtons[0].click();
                            stepCounter++;
                            consecutiveEmptySteps = 0;
                            await delay(2000);
                            continue;
                        } catch (e) {
                            console.error("Error clicking next button:", e);
                        }
                    }
                } else {
                    // For other steps, fill the form if needed
                    try {
                        const formElements = document.querySelectorAll('.jobs-easy-apply-form-section__input, .ember-text-field, .artdeco-text-input--input, .fb-dash-form-element');
                        if (formElements.length > 0) {
                            console.log(`📝 Found ${formElements.length} form elements, filling form...`);
                            await fillApplicationForm();
                            consecutiveEmptySteps = 0;
                        } else {
                            console.log("⚠️ No form elements detected");
                            consecutiveEmptySteps++;
                        }
                    } catch (e) {
                        console.error("Error filling form:", e);
                    }
                }
                
                // Process actions in order of importance
                if (submitButton) {
                    console.log("🎉 Found Submit button, clicking...");
                    try {
                        submitButton.click();
                        await delay(3000); // Wait longer for submission
                        stillApplying = false;
                    } catch (e) {
                        console.error("Error clicking submit button:", e);
                    }
                } else if (doneButton) {
                    console.log("✅ Found Done button, clicking...");
                    try {
                        doneButton.click();
                        stillApplying = false;
                        await delay(2000);
                    } catch (e) {
                        console.error("Error clicking done button:", e);
                    }
                } else if (reviewButton) {
                    console.log("📋 Found Review button, clicking...");
                    try {
                        reviewButton.click();
                        consecutiveEmptySteps = 0;
                        await delay(2000);
                    } catch (e) {
                        console.error("Error clicking review button:", e);
                    }
                } else if (nextButton) {
                    console.log("➡️ Found Next button, clicking...");
                    try {
                        nextButton.click();
                        stepCounter++;
                        consecutiveEmptySteps = 0;
                        await delay(2000);
                    } catch (e) {
                        console.error("Error clicking next button:", e);
                    }
                } else {
                    // Find buttons by text content - more reliable approach
                    let nextButtonByText = null;
                    let submitButtonByText = null;
                    let reviewButtonByText = null;
                    let doneButtonByText = null;
                    
                    for (const button of allButtons) {
                        if (!button.offsetWidth || !button.offsetHeight) continue; // Skip hidden buttons
                        
                        const buttonText = button.textContent.trim().toLowerCase();
                        if (!buttonText) continue; // Skip empty buttons
                        
                        if (buttonText.includes('submit') || buttonText.includes('apply')) {
                            submitButtonByText = button;
                            break; // Submit is highest priority
                        } else if (buttonText.includes('review')) {
                            reviewButtonByText = button;
                        } else if (buttonText.includes('next') || buttonText.includes('continue')) {
                            nextButtonByText = button;
                        } else if (buttonText.includes('done') || buttonText.includes('close') || buttonText.includes('ok')) {
                            doneButtonByText = button;
                        }
                    }
                    
                    // Click in order of priority
                    if (submitButtonByText) {
                        console.log("🎉 Found Submit button by text, clicking...");
                        submitButtonByText.click();
                        stillApplying = false;
                        await delay(2000);
                    } else if (doneButtonByText) {
                        console.log("✅ Found Done button by text, clicking...");
                        doneButtonByText.click();
                        stillApplying = false;
                        await delay(2000);
                    } else if (reviewButtonByText) {
                        console.log("📋 Found Review button by text, clicking...");
                        reviewButtonByText.click();
                        consecutiveEmptySteps = 0;
                        await delay(2000);
                    } else if (nextButtonByText) {
                        console.log("➡️ Found Next button by text, clicking...");
                        nextButtonByText.click();
                        stepCounter++;
                        consecutiveEmptySteps = 0;
                        await delay(2000);
                    } else {
                        console.log("⛔ No viable buttons found");
                        consecutiveEmptySteps++;
                    }
                }
                
                // If we've had multiple steps with no progress, exit the loop
                if (consecutiveEmptySteps >= 3) {
                    console.log("⚠️ No progress detected for 3 consecutive steps, assuming application is complete");
                    stillApplying = false;
                }
                
            } catch (stepError) {
                console.error(`❌ Error in application step ${stepCounter}:`, stepError);
                consecutiveEmptySteps++;
                
                if (consecutiveEmptySteps >= 3) {
                    console.log("⚠️ Multiple errors encountered, exiting application process");
                    stillApplying = false;
                }
            }
        }
    } catch (processError) {
        console.error("❌ Error in application process:", processError);
    }
    
    console.log("✅ Application process completed");
}