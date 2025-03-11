chrome.runtime.onInstalled.addListener(() => {
    console.log("🔵 LinkedIn Auto Apply Extension Installed!");
});

chrome.action.onClicked.addListener((tab) => {
    chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ["content.js"]
    });
});

// Keep service worker alive for messaging
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('Background received message:', message);
    return true;
});