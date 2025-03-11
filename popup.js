/* filepath: /Users/anilkumarinjam/Pictures/linkedin-autoapply/popup.js */
document.getElementById("start").addEventListener("click", () => {
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
        try {
            // Update UI immediately
            const statusEl = document.getElementById("status");
            const startBtn = document.getElementById("start");
            
            statusEl.innerText = "Running...";
            statusEl.style.color = "#0077b5";
            startBtn.disabled = true;
            
            // Send a message to the content script
            await chrome.tabs.sendMessage(tabs[0].id, { action: "start" });
        } catch (error) {
            console.error("Error:", error);
            document.getElementById("status").innerText = "Error: " + error.message;
            document.getElementById("status").style.color = "#e53935";
        }
    });
});

document.getElementById("stop").addEventListener("click", () => {
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
        try {
            // Update UI immediately
            const statusEl = document.getElementById("status");
            const startBtn = document.getElementById("start");
            
            statusEl.innerText = "Stopped";
            statusEl.style.color = "#e53935";
            startBtn.disabled = false;
            
            // Send a stop message to the content script
            await chrome.tabs.sendMessage(tabs[0].id, { action: "stop" });
        } catch (error) {
            console.error("Error:", error);
        }
    });
});

// Check if automation is already running when popup opens
chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
    try {
        const response = await chrome.tabs.sendMessage(tabs[0].id, { action: "status" });
        if (response && response.isRunning) {
            document.getElementById("status").innerText = "Running...";
            document.getElementById("status").style.color = "#0077b5";
            document.getElementById("start").disabled = true;
        }
    } catch (error) {
        // Content script might not be loaded yet, which is fine
    }
});