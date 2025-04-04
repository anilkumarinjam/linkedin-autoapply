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
    else if (message.action === "updateDailyCount") {
        (async () => {
            try {
                // Get daily stats from the sender tab
                const [{ result: dailyStats }] = await chrome.scripting.executeScript({
                    target: { tabId: sender.tab.id },
                    func: () => {
                        const today = new Date().toISOString().split('T')[0];
                        const key = `linkedinAutoApply_${today}`;
                        const stats = localStorage.getItem(key);
                        return stats ? JSON.parse(stats) : null;
                    }
                });

                if (!dailyStats) {
                    throw new Error("No daily stats found in localStorage");
                }

                debugLog('Retrieved daily stats from localStorage:', dailyStats);
                console.log("Sending Daily Count to update", dailyStats.appliedCount);
                const result = await updateUserDailyCount(
                    dailyStats.appliedCount,
                    new Date().toISOString().split('T')[0]
                );

                sendResponse({ success: true, data: result });
            } catch (error) {
                console.error("❌ Error updating daily count:", error);
                sendResponse({ success: false, error: error.message });
            }
        })();
        return true; // Keep message channel open
    }
});

async function updateUserDailyCount(count, date) {
    try {
        debugLog('Starting daily count update:', { count, date });
        
        // Get user settings from storage
        const { userSettings } = await chrome.storage.sync.get(['userSettings']);
        debugLog('Retrieved user settings:', userSettings);
        
        if (!userSettings?.user_id) {
            throw new Error("No user settings found");
        }

        // Get auth token from storage
        const { authToken } = await chrome.storage.sync.get(['authToken']);
        if (!authToken) {
            throw new Error("No auth token found");
        }

        // Set auth header for this request
        supabaseClient.auth.setSession({
            access_token: authToken,
            refresh_token: null
        });

        debugLog('Attempting to update count:', count);

        // Use upsert instead of update
        const { error: updateError } = await supabaseClient
            .from('user_settings')
            .update({
                daily_count: count,
                last_apply_date: date,
                updated_at: new Date().toISOString()
            })
            .eq('user_id', userSettings.user_id);

        if (updateError) {
            debugLog('Upsert error:', updateError);
            throw updateError;
        }

        return { success: true };

    } catch (error) {
        console.error("❌ Error in updateUserDailyCount:", error);
        throw error;
    }
}