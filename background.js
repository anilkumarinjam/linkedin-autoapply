chrome.runtime.onInstalled.addListener(() => {
    console.log("🔵 LinkedIn Auto Apply Extension Installed!");
});

chrome.action.onClicked.addListener((tab) => {
    chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ["content.js"]
    });
});

// Background script to handle navigation and injection

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "navigateAndStart") {
        chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
            // Update the current tab's URL
            chrome.tabs.update(tabs[0].id, { url: message.url }, tab => {
                // Add a listener for when the page finishes loading
                chrome.tabs.onUpdated.addListener(function listener(tabId, changeInfo, updatedTab) {
                    if (tabId === tab.id && changeInfo.status === 'complete') {
                        // Remove the listener to avoid multiple executions
                        chrome.tabs.onUpdated.removeListener(listener);
                        
                        // Wait a bit for the content script to initialize
                        setTimeout(() => {
                            chrome.tabs.sendMessage(tab.id, { action: "start" });
                        }, 2000);
                    }
                });
            });
        });
        return true;
    }
});