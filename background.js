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
        const linkedInJobsUrl = "https://www.linkedin.com/jobs/search/?f_AL=true&f_E=2%2C3%2C4&f_TPR=r86400&geoId=103644278&keywords=java%20full%20stack%20developer&origin=JOB_SEARCH_PAGE_JOB_FILTER&refresh=true";
        
        // First navigate to the URL
        chrome.tabs.update({ url: linkedInJobsUrl }, (tab) => {
            // Wait for the page to fully load before sending the start message
            chrome.tabs.onUpdated.addListener(function listener(tabId, changeInfo, updatedTab) {
                if (tabId === tab.id && changeInfo.status === 'complete') {
                    // Remove the listener to avoid multiple executions
                    chrome.tabs.onUpdated.removeListener(listener);
                    
                    // Wait an additional moment to ensure content script is fully initialized
                    setTimeout(() => {
                        // Send the start message to the content script
                        chrome.tabs.sendMessage(tab.id, { action: "start" })
                            .catch(error => console.error("Error starting automation:", error));
                    }, 2000);
                }
            });
        });
        
        sendResponse({ status: "Navigation initiated" });
        return true;
    }
});