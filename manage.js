// manage.js - Q&A Manager for LinkedIn Auto Apply

const QNA_KEY = 'qaPairs';
const USER_KEY = 'userSettings';

const QNA_TYPES = [
  { key: 'radio', label: 'Radio' },
  { key: 'blank', label: 'Blank/Text' },
  { key: 'choice', label: 'Choices' },
  { key: 'bool', label: 'True/False' }
];

let qaPairs = [];
let userSettings = {};
let currentTab = 'radio';

function loadUserInfo() {
  chrome.runtime.sendMessage({ action: "getUserSettings" }, (response) => {
    userSettings = response?.userSettings || {};
    const infoDiv = document.getElementById('userInfo');
    infoDiv.innerHTML = `
      <b>Name:</b> ${userSettings.name || 'N/A'}<br>
      <b>Email:</b> ${userSettings.email || 'N/A'}<br>
      <b>Phone:</b> ${userSettings.phone_number || 'N/A'}<br>
      <b>Experience:</b> ${userSettings.default_answer || 'N/A'}<br>
      <span style='color:#888;font-size:12px;'>(Basic info is fixed after signup)</span>
    `;
  });
}

function loadQAPairs() {
  chrome.runtime.sendMessage({ action: "getQAPairs" }, (response) => {
    qaPairs = response?.qaPairs || [];
    renderQAPairs();
  });
}

function saveQAPairs() {
  chrome.runtime.sendMessage({ action: "setQAPairs", qaPairs }, () => {
    renderQAPairs();
  });
}

function renderQAPairs() {
  QNA_TYPES.forEach(type => {
    const section = document.getElementById(`section-${type.key}`);
    section.innerHTML = '';
    const filtered = qaPairs.filter(q => q.type === type.key);
    const ul = document.createElement('ul');
    ul.className = 'qna-list';
    filtered.forEach((pair, idx) => {
      const li = document.createElement('li');
      const span = document.createElement('span');
      span.innerHTML = `<b>Q:</b> ${pair.question} <br><b>A:</b> ${pair.answer}`;
      const actions = document.createElement('span');
      actions.className = 'qna-actions';
      const editBtn = document.createElement('button');
      editBtn.textContent = 'Edit';
      editBtn.addEventListener('click', () => window.editQAPair(type.key, idx));
      const deleteBtn = document.createElement('button');
      deleteBtn.textContent = 'Delete';
      deleteBtn.addEventListener('click', () => window.deleteQAPair(type.key, idx));
      actions.appendChild(editBtn);
      actions.appendChild(deleteBtn);
      li.appendChild(span);
      li.appendChild(actions);
      ul.appendChild(li);
    });
    section.appendChild(ul);
    // Add form to add new Q&A
    const form = document.createElement('form');
    form.className = 'qna-form';
    form.innerHTML = `
      <input type='text' placeholder='Question (case-sensitive)' required id='q-${type.key}'>
      <input type='text' placeholder='Answer' required id='a-${type.key}'>
      <button type='submit'>Add</button>
    `;
    form.onsubmit = (e) => {
      e.preventDefault();
      const q = document.getElementById(`q-${type.key}`).value.trim();
      const a = document.getElementById(`a-${type.key}`).value.trim();
      if (!q || !a) return;
      qaPairs.push({ question: q, answer: a, type: type.key });
      saveQAPairs();
      form.reset();
    };
    section.appendChild(form);
  });
}

window.editQAPair = function(type, idx) {
  // Always use the filtered list for the current type
  const filtered = qaPairs.filter(q => q.type === type);
  const pair = filtered[idx];
  if (!pair) return;
  // Only allow editing the answer, not the question
  const newA = prompt('Edit Answer:', pair.answer);
  if (newA === null) return;
  // Find the actual index in qaPairs by type and question (not answer)
  const realIdx = qaPairs.findIndex(q => q.type === type && q.question === pair.question);
  if (realIdx !== -1) {
    qaPairs[realIdx] = { ...qaPairs[realIdx], answer: newA };
    saveQAPairs();
    setTimeout(loadQAPairs, 100);
  }
};

window.deleteQAPair = function(type, idx) {
  if (!confirm('Delete this Q&A pair?')) return;
  const filtered = qaPairs.filter(q => q.type === type);
  const pair = filtered[idx];
  // Find the actual index in qaPairs by type and question (not answer)
  const realIdx = qaPairs.findIndex(q => q.type === type && q.question === pair.question);
  if (realIdx !== -1) {
    qaPairs.splice(realIdx, 1);
    saveQAPairs();
    // Reload after delete to update the UI and indices
    setTimeout(loadQAPairs, 100);
  }
};

function setupTabs() {
  QNA_TYPES.forEach(type => {
    document.getElementById(`tab-${type.key}`).onclick = () => {
      currentTab = type.key;
      QNA_TYPES.forEach(t => {
        document.getElementById(`tab-${t.key}`).classList.remove('active');
        document.getElementById(`section-${t.key}`).style.display = 'none';
      });
      document.getElementById(`tab-${type.key}`).classList.add('active');
      document.getElementById(`section-${type.key}`).style.display = 'block';
    };
  });
}

document.addEventListener('DOMContentLoaded', () => {
  loadUserInfo();
  loadQAPairs();
  setupTabs();
});
