// Initialize Supabase client using the global supabase object
const { createClient } = window.supabase;
const supabaseClient = createClient(
    window.SUPABASE_CONFIG.URL, 
    window.SUPABASE_CONFIG.ANON_KEY
);
function closePopupAndNotify(message, type = 'info') {
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
        chrome.tabs.sendMessage(tabs[0].id, {
            action: "showNotification",
            text: message,
            type: type
        });
        window.close();
    });
}
document.addEventListener("DOMContentLoaded", async () => {
    try {
        // Check for existing session
        const { data: { session }, error } = await supabaseClient.auth.getSession();
        if (error) throw error;
        
        if (session) {
            showControls();
            await loadUserSettings();
            await setupProfileManagement(); // Add this line
        }
        setupFormListeners();
        
    } catch (error) {
        console.error("Initialization error:", error);
        alert("Failed to initialize. Please try again.");
    }
});

// Update all supabase references to supabaseClient
function setupFormListeners() {
    // Form switching
    document.getElementById("showSignup")?.addEventListener("click", (e) => {
        e.preventDefault();
        document.getElementById("loginForm").style.display = "none";
        document.getElementById("signupForm").style.display = "block";
    });

    document.getElementById("showLogin")?.addEventListener("click", (e) => {
        e.preventDefault();
        document.getElementById("loginForm").style.display = "block";
        document.getElementById("signupForm").style.display = "none";
    });

    // Login handler
    document.getElementById("loginBtn")?.addEventListener("click", async () => {
        const email = document.getElementById("loginEmail").value;
        const password = document.getElementById("loginPassword").value;

        const { data, error } = await supabaseClient.auth.signInWithPassword({
            email,
            password
        });

        if (error) {
            alert(error.message);
        } else {
            showControls();
            await loadUserSettings();
        }
    });

    // Signup handler
    document.getElementById("signupBtn")?.addEventListener("click", async () => {
        try {
            const email = document.getElementById("signupEmail").value;
            const password = document.getElementById("signupPassword").value;
            const phoneNumber = document.getElementById("phoneNumber").value;
            const defaultAnswer = document.getElementById("defaultAnswer").value;

            // First sign up the user
            const { data: authData, error: authError } = await supabaseClient.auth.signUp({
                email,
                password
            });

            if (authError) throw authError;

            // Wait for session to be established
            const { data: { session }, error: sessionError } = await supabaseClient.auth.getSession();
            if (sessionError) throw sessionError;

            if (!session) {
                alert("Please check your email for verification link before logging in.");
                document.getElementById("loginForm").style.display = "block";
                document.getElementById("signupForm").style.display = "none";
                return;
            }

            // Now save user settings with the confirmed user ID
            const { error: settingsError } = await supabaseClient
                .from('user_settings')
                .insert([
                    {
                        user_id: session.user.id,
                        phone_number: phoneNumber,
                        default_answer: defaultAnswer
                    }
                ]);

            if (settingsError) throw settingsError;

            alert("Successfully signed up! Your settings have been saved.");
            document.getElementById("loginForm").style.display = "block";
            document.getElementById("signupForm").style.display = "none";

        } catch (error) {
            console.error("Signup error:", error);
            alert(error.message);
        }
    });

    updateStatus();
    document.getElementById("start")?.addEventListener("click", startAutomation);
    document.getElementById("stop")?.addEventListener("click", stopAutomation);
    
    // Check if we're on the jobs page
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
        const currentUrl = tabs[0].url;
        const startBtn = document.getElementById("start");
        const statusEl = document.getElementById("status");
        
        if (!currentUrl.includes("/jobs/search")) {
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

    // Helper for robust field filling or fallback to clipboard
    function robustFillOrClipboard(target, url, keywords) {
        chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
            chrome.scripting.executeScript({
                target: { tabId: tabs[0].id },
                func: (url, keywords) => {
                    // 1. Try direct input/textarea with label/placeholder
                    const matchField = (el) => {
                        const label = el.labels?.[0]?.innerText || "";
                        const placeholder = el.placeholder || "";
                        return keywords.some(k => new RegExp(k, 'i').test(label) || new RegExp(k, 'i').test(placeholder));
                    };
                    let filled = false;
                    const inputs = Array.from(document.querySelectorAll('input, textarea'));
                    for (const el of inputs) {
                        if (matchField(el)) {
                            el.value = url;
                            el.dispatchEvent(new Event('input', { bubbles: true }));
                            filled = true;
                        }
                    }
                    // 2. Try to find a nearby label/div with the keyword, then fill the next input
                    if (!filled) {
                        const allDivs = Array.from(document.querySelectorAll('div, label, span, p'));
                        for (const div of allDivs) {
                            if (keywords.some(k => new RegExp(k, 'i').test(div.innerText))) {
                                // Try next input sibling or input in parent
                                let input = div.nextElementSibling;
                                while (input && !(input.tagName === 'INPUT' || input.tagName === 'TEXTAREA')) {
                                    input = input.nextElementSibling;
                                }
                                if (!input) {
                                    input = div.parentElement && Array.from(div.parentElement.querySelectorAll('input, textarea')).find(i => !i.value);
                                }
                                if (input) {
                                    input.value = url;
                                    input.dispatchEvent(new Event('input', { bubbles: true }));
                                    filled = true;
                                    break;
                                }
                            }
                        }
                    }
                    // 3. Fallback: copy to clipboard
                    if (!filled) {
                        navigator.clipboard.writeText(url);
                        // Optionally, show a toast/notification
                    }
                },
                args: [url, target === 'linkedin' ? ["linkedin profile", "linkedin"] : ["github profile", "github"]]
            });
        });
    }
    // LinkedIn fill button handler
    document.getElementById("linkedinFillBtn")?.addEventListener("click", async () => {
        robustFillOrClipboard('linkedin', "https://www.linkedin.com/in/anilinjam");
    });
    // GitHub fill button handler
    document.getElementById("githubFillBtn")?.addEventListener("click", async () => {
        robustFillOrClipboard('github', "https://www.github.com/anilkumarinjam");
    });

}

async function getUserSettings() {
    return new Promise((resolve) => {
        chrome.storage.sync.get(['userSettings'], (result) => {
            resolve(result.userSettings || null);
        });
    });
}

async function loadUserSettings() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) return;

    // Store auth token for background script
    chrome.storage.sync.set({ authToken: session.access_token });

    const { data, error } = await supabaseClient
        .from('user_settings')
        .select('*')
        .eq('user_id', session.user.id)
        .single();

    if (error) {
        console.error("Error loading settings:", error);
        return;
    }
    // Store settings in chrome.storage for content script access
    chrome.storage.sync.set({ userSettings: data });
}

function showControls() {
    document.getElementById("authContainer").style.display = "none";
    document.getElementById("controls").style.display = "block";
}

// Function to start automation
async function startAutomation() {
    try {
        // Check authentication first
        const isAuthenticated = await checkAuthentication();
        if (!isAuthenticated) {
            console.log("🔒 User not authenticated");
            showNotification("Please authenticate first", "warning");
            return;
        }

        chrome.tabs.query({ active: true, currentWindow: true }, async tabs => {
            const currentUrl = tabs[0].url;
            const linkedInJobsUrl = "https://www.linkedin.com/jobs/search/?f_AL=true&f_E=2%2C3%2C4&f_TPR=r86400&geoId=103644278&keywords=java%20full%20stack%20developer&origin=JOB_SEARCH_PAGE_JOB_FILTER&refresh=true";
            
            if (!currentUrl.includes("/jobs/search/")) {
                console.log("📍 Not on jobs page, setting redirect flag and navigating...");
                localStorage.setItem("shouldStartAfterRedirect", "true");
                window.location.href = linkedInJobsUrl;
            } else {
                console.log("🚀 Starting automation from popup");
                chrome.tabs.sendMessage(tabs[0].id, { 
                    action: "start",
                    source: "popup" // Add source to differentiate from FAB
                });
                closePopupAndNotify("Starting automation...", "success");
            }
        });
    } catch (error) {
        console.error("❌ Error in startAutomation:", error);
        closePopupAndNotify("Failed to start automation: " + error.message, "error");
    }
}

// Function to stop automation
function stopAutomation() {
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
        chrome.tabs.sendMessage(tabs[0].id, { action: "stop" });
        chrome.tabs.sendMessage(tabs[0].id, { action: "generateReport" });
        closePopupAndNotify("Stopping automation...", "warning");
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


// Add these functions after your existing code

async function setupProfileManagement() {
    const toggleBtn = document.getElementById('toggleProfile');
    const profileForm = document.getElementById('profileForm');
    const saveBtn = document.getElementById('saveProfile');
    const signOutBtn = document.getElementById('signOut');

    // Load current settings
    const settings = await loadUserSettings();
    const userSettings = await getUserSettings();
    if (userSettings) {
        document.getElementById('updatePhone').value = userSettings.phone_number || '';
        document.getElementById('updateAnswer').value = userSettings.default_answer || '';
    }

    // Toggle profile form
    toggleBtn?.addEventListener('click', () => {
        profileForm.style.display = profileForm.style.display === 'none' ? 'block' : 'none';
    });

    // Save profile changes
    saveBtn?.addEventListener('click', async () => {
        try {
            const { data: { session } } = await supabaseClient.auth.getSession();
            if (!session) throw new Error('No session found');

            const phoneNumber = document.getElementById('updatePhone').value;
            const defaultAnswer = document.getElementById('updateAnswer').value;

            // First check if settings exist
            const { data: existingSettings } = await supabaseClient
                .from('user_settings')
                .select('*')
                .eq('user_id', session.user.id)
                .single();

            let result;
            if (existingSettings) {
                // Update existing settings
                result = await supabaseClient
                    .from('user_settings')
                    .update({
                        phone_number: phoneNumber,
                        default_answer: defaultAnswer
                    })
                    .eq('user_id', session.user.id);
            } else {
                // Insert new settings
                result = await supabaseClient
                    .from('user_settings')
                    .insert([{
                        user_id: session.user.id,
                        phone_number: phoneNumber,
                        default_answer: defaultAnswer
                    }]);
            }

            if (result.error) throw result.error;
            
            alert('Settings updated successfully!');
            profileForm.style.display = 'none';
            
            // Update chrome storage
            chrome.storage.sync.set({ 
                userSettings: { 
                    phone_number: phoneNumber, 
                    default_answer: defaultAnswer 
                }
            });
            closePopupAndNotify("Settings saved successfully!", "success");
        } catch (error) {
            closePopupAndNotify("Failed to save settings: " + error.message, "error");
        }
    });

    // Handle sign out
    // Also clear the token on sign out
    signOutBtn?.addEventListener('click', async () => {
        try {
            const { error } = await supabaseClient.auth.signOut();
            if (error) throw error;
            chrome.storage.sync.remove(['userSettings', 'authToken']); // Remove both
            document.getElementById('authContainer').style.display = 'block';
            document.getElementById('controls').style.display = 'none';
            closePopupAndNotify("Signed out successfully", "info");
        } catch (error) {
            closePopupAndNotify("Failed to sign out: " + error.message, "error");
        }
    });
}