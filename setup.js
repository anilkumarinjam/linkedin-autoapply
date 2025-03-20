chrome.runtime.onInstalled.addListener(() => {
    // Store Supabase credentials securely
    chrome.storage.local.set({
        supabaseConfig: {
            URL: 'https://sjvpivdqdpixzvdrjoaf.supabase.co',
            ANON_KEY: 'your-anon-key'
        }
    }, () => {
        console.log('Supabase configuration stored');
    });
});