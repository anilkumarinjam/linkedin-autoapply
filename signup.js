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
}
function showSuccess(msg) {
    const succ = document.getElementById('signupSuccess');
    succ.textContent = msg;
    succ.style.display = 'block';
    document.getElementById('signupError').style.display = 'none';
}

function validateUrl(url, type) {
    if (!url) return false;
    if (type === 'linkedin') {
        return /^https:\/\/(www\.)?linkedin\.com\/in\//i.test(url);
    }
    if (type === 'github') {
        return /^https:\/\/(www\.)?github\.com\//i.test(url);
    }
    return false;
}

function generateAccessCode(email) {
    const local = email.split('@')[0];
    if (local.length < 3) return '';
    const first3 = local.slice(0, 3).split('').reverse().join('');
    const last3 = local.slice(-3).split('').reverse().join('');
    const now = new Date();
    const y = String(now.getFullYear()).slice(-2);
    const m = String(now.getMonth() + 1).padStart(2, '0');
    return first3 + y + m + last3;
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
        showError('Please enter a valid LinkedIn profile URL (e.g., https://www.linkedin.com/in/yourname)');
        return;
    }
    if (!validateUrl(github, 'github')) {
        showError('Please enter a valid GitHub profile URL (e.g., https://github.com/yourname)');
        return;
    }
    const expectedCode = generateAccessCode(email);
    if (accessCode !== expectedCode) {
        showError('Access code is invalid. Please check the instructions.');
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
        showSuccess('Signup successful! Please login from the popup and close this page.');
        document.getElementById('signupForm').reset();
    } catch (err) {
        showError(err.message || 'Signup failed.');
    }
};
