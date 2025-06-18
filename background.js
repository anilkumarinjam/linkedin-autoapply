import { createClient } from 'https://esm.sh/@supabase/supabase-js'

// Initialize Supabase client
const supabaseClient = createClient(
    'https://sjvpivdqdpixzvdrjoaf.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNqdnBpdmRxZHBpeHp2ZHJqb2FmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI0NDc3NjUsImV4cCI6MjA1ODAyMzc2NX0.CJqAUNlN4aZnCsEiGIHKZT1TZMbQ5N68LjmQ-FxR7rY'
);

// Debug logging helper
const debugLog = (message, data = '') => {
    console.log(`[Background] ${message}`, data);
};
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
            chrome.tabs.update(tabs[0].id, { url: message.url }, tab => {
                chrome.tabs.onUpdated.addListener(function listener(tabId, changeInfo, updatedTab) {
                    if (tabId === tab.id && changeInfo.status === 'complete') {
                        chrome.tabs.onUpdated.removeListener(listener);
                        setTimeout(() => {
                            chrome.tabs.sendMessage(tab.id, { action: "start" });
                        }, 2000);
                    }
                });
            });
        });
        return true;
    }
    // --- Q&A and User Settings Storage Messaging ---
    if (message.action === "getQAPairs") {
        chrome.storage.sync.get(['qaPairs'], (result) => {
            sendResponse({ qaPairs: result.qaPairs || [] });
        });
        return true;
    }
    if (message.action === "setQAPairs") {
        chrome.storage.sync.set({ qaPairs: message.qaPairs }, () => {
            sendResponse({ success: true });
        });
        return true;
    }
    if (message.action === "getUserSettings") {
        chrome.storage.sync.get(['userSettings'], (result) => {
            sendResponse({ userSettings: result.userSettings || null });
        });
        return true;
    }
    if (message.action === "setUserSettings") {
        chrome.storage.sync.set({ userSettings: message.userSettings }, () => {
            sendResponse({ success: true });
        });
        return true;
    }
});