// admin.js - Admin page logic for LinkedIn Auto Apply

// Helper: get userSettings from chrome.storage.sync
function getUserSettings() {
    return new Promise((resolve) => {
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
            chrome.storage.sync.get(['userSettings'], (result) => {
                resolve(result.userSettings || null);
            });
        } else {
            resolve(null);
        }
    });
}

// Copied from signup.js
function generateAccessCode(email) {
    const local = email.split('@')[0];
    if (local.length < 3) return '';

    const reversedLast3 = local.slice(-3).split('').reverse();
    const [c1, c2, c3] = reversedLast3;

    const now = new Date();
    const y = String(now.getUTCFullYear()).slice(-2);
    const m = String(now.getUTCMonth() + 1).padStart(2, '0');
    const hour = now.getUTCHours();
    const minute = now.getUTCMinutes();
    const timeAdd = hour + minute;

    const code1 = `${y}${c1}${timeAdd}${c2}${m}${c3}`;
    const code2 = `${m}${c3}${timeAdd}${c2}${y}${c1}`;

    return [code1, code2];
}

function showAccessDenied() {
    document.getElementById('adminContent').style.display = 'none';
    document.getElementById('accessDenied').style.display = 'block';
}
function showAdminContent() {
    document.getElementById('adminContent').style.display = 'block';
    document.getElementById('accessDenied').style.display = 'none';
}

// Copy to clipboard utility (cross-platform)
async function copyToClipboard(text) {
    if (navigator.clipboard && window.isSecureContext) {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch (e) {
            // fallback below
        }
    }
    // fallback for older browsers
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'absolute';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();
    try {
        document.execCommand('copy');
        document.body.removeChild(textarea);
        return true;
    } catch (err) {
        document.body.removeChild(textarea);
        return false;
    }
}

window.addEventListener('DOMContentLoaded', async () => {
    const settings = await getUserSettings();
    if (!settings || settings.email !== 'anilkumarch.228@gmail.com') {
        showAccessDenied();
        return;
    }
    showAdminContent();
    // Handle form submission
    document.getElementById('accessCodeForm').onsubmit = function(e) {
        e.preventDefault();
        const email = document.getElementById('emailInput').value.trim();
        const resultDiv = document.getElementById('codesResult');
        resultDiv.textContent = '';
        if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
            resultDiv.textContent = 'Please enter a valid email address.';
            resultDiv.style.color = '#e53935';
            return;
        }
        const codes = generateAccessCode(email);
        if (codes.length === 0) {
            resultDiv.textContent = 'Email must have at least 3 characters before the @.';
            resultDiv.style.color = '#e53935';
            return;
        }
        // Output both codes with copy icons
        resultDiv.style.color = '#333';
        resultDiv.innerHTML = `<div>Access Codes for <b>${email}</b>:</div>
            <div class='code-row'><code id='code0'>${codes[0]}</code>
                <span class='copy-icon' title='Copy' data-code='${codes[0]}' tabindex='0' role='button' aria-label='Copy code 1'>
                    <svg class='copy-icon' viewBox='0 0 20 20'><rect x='5' y='7' width='9' height='9' rx='2' fill='none' stroke='currentColor' stroke-width='1.5'/><rect x='7' y='4' width='9' height='9' rx='2' fill='none' stroke='currentColor' stroke-width='1.5'/></svg>
                </span>
                <span class='copy-success' id='success0' style='display:none;'>Copied!</span>
            </div>
            <div class='code-row'><code id='code1'>${codes[1]}</code>
                <span class='copy-icon' title='Copy' data-code='${codes[1]}' tabindex='0' role='button' aria-label='Copy code 2'>
                    <svg class='copy-icon' viewBox='0 0 20 20'><rect x='5' y='7' width='9' height='9' rx='2' fill='none' stroke='currentColor' stroke-width='1.5'/><rect x='7' y='4' width='9' height='9' rx='2' fill='none' stroke='currentColor' stroke-width='1.5'/></svg>
                </span>
                <span class='copy-success' id='success1' style='display:none;'>Copied!</span>
            </div>`;
        // Add event listeners for copy icons
        Array.from(resultDiv.querySelectorAll('.copy-icon')).forEach((icon, idx) => {
            icon.addEventListener('click', async () => {
                const code = icon.getAttribute('data-code');
                const ok = await copyToClipboard(code);
                const successSpan = document.getElementById('success' + idx);
                if (ok && successSpan) {
                    successSpan.style.display = 'inline';
                    setTimeout(() => { successSpan.style.display = 'none'; }, 1200);
                }
            });
            // Keyboard accessibility
            icon.addEventListener('keydown', async (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    icon.click();
                }
            });
        });
    };
}); 