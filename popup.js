document.getElementById("start").addEventListener("click", () => {
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
        try {
            // Send a message to the content script
            await chrome.tabs.sendMessage(tabs[0].id, { action: "start" });
            document.getElementById("status").innerText = "Running...";
        } catch (error) {
            console.error("Error:", error);
            document.getElementById("status").innerText = "Error: " + error.message;
        }
    });
});

document.getElementById("stop").addEventListener("click", () => {
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
        try {
            // Send a stop message to the content script
            await chrome.tabs.sendMessage(tabs[0].id, { action: "stop" });
            document.getElementById("status").innerText = "Stopped";
        } catch (error) {
            console.error("Error:", error);
        }
    });
});