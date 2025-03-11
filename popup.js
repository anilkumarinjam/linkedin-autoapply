document.addEventListener("DOMContentLoaded", () => {
    // Update status initially
    updateStatus();
    
    // Set up button listeners
    document.getElementById("start").addEventListener("click", startAutomation);
    document.getElementById("stop").addEventListener("click", stopAutomation);
});

// Function to start automation
function startAutomation() {
    // Update UI immediately for better user feedback
    const statusEl = document.getElementById("status");
    const startBtn = document.getElementById("start");
    const stopBtn = document.getElementById("stop");
    
    statusEl.innerText = "Starting...";
    statusEl.style.color = "#0077b5";
    startBtn.disabled = true;
    stopBtn.disabled = false;
    
    // Send message to the background script to handle navigation and starting
    chrome.runtime.sendMessage({ action: "navigateAndStart" }, response => {
        console.log("Navigation response:", response);
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

// Function to check current status
function updateStatus() {
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
        if (tabs[0] && tabs[0].url.includes("linkedin.com")) {
            try {
                chrome.tabs.sendMessage(tabs[0].id, { action: "status" }, response => {
                    // If we get a response, update the UI accordingly
                    if (response && typeof response.isRunning !== 'undefined') {
                        const statusEl = document.getElementById("status");
                        const startBtn = document.getElementById("start");
                        const stopBtn = document.getElementById("stop");
                        
                        if (response.isRunning) {
                            statusEl.innerText = "Running";
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
            } catch (error) {
                console.log("Error checking status:", error);
                // This might happen if content script isn't loaded yet, which is fine
            }
        }
    });
}