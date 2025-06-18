// signup.js - Handles signup logic for LinkedIn Auto Apply
const { createClient } = window.supabase;
const supabaseClient = createClient(
    window.SUPABASE_CONFIG.URL,
    window.SUPABASE_CONFIG.ANON_KEY
);

function showError(msg) {
    const err = document.getElementById('signupError');
    err.textContent = msg;
    err.style.display = 'block';
    document.getElementById('signupSuccess').style.display = 'none';
    // Hide modal if showing
    const modal = document.getElementById('successModal');
    if (modal) modal.remove();
}
function showSuccessModal() {
    // Remove any previous modal
    const old = document.getElementById('successModal');
    if (old) old.remove();
    const modal = document.createElement('div');
    modal.className = 'success-modal';
    modal.id = 'successModal';
    modal.innerHTML = `
      <div class="success-modal-content">
        <span class="success-check">
          <svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="32" fill="#4caf50" opacity="0.15"/><circle cx="32" cy="32" r="28" fill="#4caf50" opacity="0.18"/><path d="M20 34l8 8 16-18" fill="none" stroke="#4caf50" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"><animate attributeName="stroke-dasharray" from="0,40" to="40,0" dur="0.6s" fill="freeze"/></path></svg>
        </span>
        <div class="success-modal-message">Signup successful!</div>
        <div class="success-modal-note">Extension Logged in! Close this page and use the pop up to start applying.</div>
      </div>
    `;
    document.body.appendChild(modal);
}

function validateUrl(url, type) {
    if (!url) return false;
    if (type === 'linkedin') {
        return /^https:\/\/(www\.)?linkedin\.com\/in\/[A-Za-z0-9\-_%]+\/?$/.test(url);
    }
    if (type === 'github') {
        return /^https:\/\/(www\.)?github\.com\/[A-Za-z0-9\-_%]+\/?$/.test(url);
    }
    return false;
}

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

document.getElementById('signupForm').onsubmit = async function(e) {
    e.preventDefault();
    const name = document.getElementById('name').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const phone = document.getElementById('phoneNumber').value.trim();
    const exp = document.getElementById('defaultAnswer').value.trim();
    const linkedin = document.getElementById('linkedinUrl').value.trim();
    const github = document.getElementById('githubUrl').value.trim();
    const accessCode = document.getElementById('accessCode').value.trim();

    if (!name || !email || !password || !phone || !exp || !linkedin || !github || !accessCode) {
        showError('All fields are required.');
        return;
    }
    if (!validateUrl(linkedin, 'linkedin')) {
        showError('LinkedIn URL must be in the format: https://www.linkedin.com/in/username');
        return;
    }
    if (!validateUrl(github, 'github')) {
        showError('GitHub URL must be in the format: https://github.com/username');
        return;
    }
    const expectedCode = generateAccessCode(email);
    if (!expectedCode.includes(accessCode)) {
        showError('Access code is invalid. Please check with the team.');
        return;
    }
    // Sign up with Supabase
    try {
        const { data: authData, error: authError } = await supabaseClient.auth.signUp({ email, password });
        if (authError) throw authError;
        // Wait for session
        const { data: { session }, error: sessionError } = await supabaseClient.auth.getSession();
        if (sessionError) throw sessionError;
        if (!session) {
            showSuccess('Signup successful! Please check your email for verification, then login from the popup. You can close this page.');
            return;
        }
        // Insert user settings
        const { error: settingsError } = await supabaseClient
            .from('user_settings')
            .insert([{
                user_id: session.user.id,
                name,
                phone_number: phone,
                default_answer: exp,
                linkedin_url: linkedin,
                github_url: github
            }]);
        if (settingsError) throw settingsError;
        showSuccessModal();
        document.getElementById('signupForm').reset();
    } catch (err) {
        showError(err.message || 'Signup failed.');
    }
};
