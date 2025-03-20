document.addEventListener("DOMContentLoaded", () => {
    // Update status initially
    updateStatus();
    
    // Set up button listeners
    document.getElementById("start").addEventListener("click", startAutomation);
    document.getElementById("stop").addEventListener("click", stopAutomation);
    
    // Check if we're on the jobs page
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
        const currentUrl = tabs[0].url;
        const startBtn = document.getElementById("start");
        const statusEl = document.getElementById("status");
        
        if (!currentUrl.includes("/jobs")) {
            statusEl.innerText = "Navigate to Jobs";
            statusEl.style.color = "#e53935";
            startBtn.addEventListener("click", () => {
                const linkedInJobsUrl = "https://www.linkedin.com/jobs/search/?f_AL=true&f_E=2%2C3%2C4&f_TPR=r86400&geoId=103644278&keywords=java%20full%20stack%20developer&origin=JOB_SEARCH_PAGE_JOB_FILTER&refresh=true";
                chrome.tabs.update({ url: linkedInJobsUrl });
            });
        } else {
            startBtn.addEventListener("click", startAutomation);
        }
    });
});

// Function to start automation
function startAutomation() {
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
        const currentUrl = tabs[0].url;
        
        if (!currentUrl.includes("/jobs")) {
            console.log("Not on jobs page, redirecting...");
            return;
        }
        
        // Update UI immediately for better user feedback
        const statusEl = document.getElementById("status");
        const startBtn = document.getElementById("start");
        const stopBtn = document.getElementById("stop");
        
        statusEl.innerText = "Starting...";
        statusEl.style.color = "#0077b5";
        startBtn.disabled = true;
        stopBtn.disabled = false;
        
        // Send start message directly to content script
        chrome.tabs.sendMessage(tabs[0].id, { action: "start" }, response => {
            console.log("Start response:", response);
        });
    });
}

// Function to stop automation
function stopAutomation() {
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
        chrome.tabs.sendMessage(tabs[0].id, { action: "stop" }, response => {
            console.log("Stop response:", response);
            
            const statusEl = document.getElementById("status");
            const startBtn = document.getElementById("start");
            const stopBtn = document.getElementById("stop");
            
            statusEl.innerText = "Stopped";
            statusEl.style.color = "#e53935";
            startBtn.disabled = false;
            stopBtn.disabled = true;
        });
    });
}

// Add listener for state updates from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "updateState") {
        const statusEl = document.getElementById("status");
        const startBtn = document.getElementById("start");
        const stopBtn = document.getElementById("stop");
        
        if (message.isRunning) {
            statusEl.innerText = "...Running";
            statusEl.style.color = "#0077b5";
            startBtn.disabled = true;
            stopBtn.disabled = false;
        } else {
            statusEl.innerText = "Ready";
            statusEl.style.color = "#4caf50";
            startBtn.disabled = false;
            stopBtn.disabled = true;
        }
    }
});

// Update the updateStatus function to handle errors better
function updateStatus() {
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
        if (tabs[0] && tabs[0].url.includes("linkedin.com")) {
            chrome.tabs.sendMessage(tabs[0].id, { action: "status" })
                .then(response => {
                    if (response && typeof response.isRunning !== 'undefined') {
                        const statusEl = document.getElementById("status");
                        const startBtn = document.getElementById("start");
                        const stopBtn = document.getElementById("stop");
                        
                        if (response.isRunning) {
                            statusEl.innerText = "...Running";
                            statusEl.style.color = "#0077b5";
                            startBtn.disabled = true;
                            stopBtn.disabled = false;
                        } else {
                            statusEl.innerText = "Ready";
                            statusEl.style.color = "#4caf50";
                            startBtn.disabled = false;
                            stopBtn.disabled = true;
                        }
                    }
                })
                .catch(error => {
                    console.log("Error checking status:", error);
                    // Handle the error gracefully
                    const statusEl = document.getElementById("status");
                    statusEl.innerText = "Ready";
                    statusEl.style.color = "#4caf50";
                });
        }
    });
}