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
    <span><b>Name:</b> ${userSettings.name || 'N/A'}</span>&nbsp;&nbsp;
    <span><b>Email:</b> ${userSettings.email || 'N/A'}</span>&nbsp;&nbsp;
    <span><b>Phone:</b> ${userSettings.phone_number || 'N/A'}</span>&nbsp;&nbsp;
    <span><b>Experience:</b> ${userSettings.default_answer || 'N/A'} Yrs</span><br>
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
      const qSpan = document.createElement('span');
      qSpan.innerHTML = `<b>Q:</b> ${pair.question}`;
      li.appendChild(qSpan);
      // --- Inline answer editing ---
      let answerField, originalValue = pair.answer;
      let saveBtn;
      if (type.key === 'radio') {
        // Try to extract options from answer (comma separated) or fallback
        let options = [];
        if (pair.options && Array.isArray(pair.options)) {
          options = pair.options;
        } else if (typeof pair.answer === 'string' && pair.answer.includes(',')) {
          options = pair.answer.split(',').map(s => s.trim());
        } else {
          options = [pair.answer, 'Option 2', 'Option 3'];
        }
        answerField = document.createElement('div');
        options.forEach(opt => {
          const radio = document.createElement('input');
          radio.type = 'radio';
          radio.name = `radio-${type.key}-${idx}`;
          radio.value = opt;
          radio.checked = pair.answer === opt;
          radio.addEventListener('change', () => {
            saveBtn.disabled = (opt === originalValue);
          });
          const label = document.createElement('label');
          label.style.marginRight = '12px';
          label.appendChild(radio);
          label.appendChild(document.createTextNode(opt));
          answerField.appendChild(label);
        });
      } else if (type.key === 'choice') {
        // Show as select dropdown
        let options = [];
        if (pair.options && Array.isArray(pair.options)) {
          options = pair.options;
        } else if (typeof pair.answer === 'string' && pair.answer.includes(',')) {
          options = pair.answer.split(',').map(s => s.trim());
        } else {
          options = [pair.answer, 'Option 2', 'Option 3'];
        }
        answerField = document.createElement('select');
        options.forEach(opt => {
          const option = document.createElement('option');
          option.value = opt;
          option.textContent = opt;
          if (pair.answer === opt) option.selected = true;
          answerField.appendChild(option);
        });
        answerField.addEventListener('change', () => {
          saveBtn.disabled = (answerField.value === originalValue);
        });
      } else if (type.key === 'bool') {
        // Show as True/False radio
        answerField = document.createElement('div');
        ['true', 'false'].forEach(val => {
          const radio = document.createElement('input');
          radio.type = 'radio';
          radio.name = `bool-${type.key}-${idx}`;
          radio.value = val;
          radio.checked = String(pair.answer) === val;
          radio.addEventListener('change', () => {
            saveBtn.disabled = (val === String(originalValue));
          });
          const label = document.createElement('label');
          label.style.marginRight = '12px';
          label.appendChild(radio);
          label.appendChild(document.createTextNode(val.charAt(0).toUpperCase() + val.slice(1)));
          answerField.appendChild(label);
        });
      } else {
        // Blank/Text: show as input
        answerField = document.createElement('input');
        answerField.type = 'text';
        answerField.value = pair.answer;
        answerField.style.minWidth = '120px';
        answerField.addEventListener('input', () => {
          saveBtn.disabled = (answerField.value === originalValue);
        });
      }
      answerField.style.marginLeft = '12px';
      li.appendChild(answerField);
      // --- Actions: Save (update) and Delete (X) ---
      const actions = document.createElement('span');
      actions.className = 'qna-actions';
      // Save/Update icon (floppy disk)
      saveBtn = document.createElement('button');
      saveBtn.innerHTML = '<svg width="18" height="18" viewBox="0 0 20 20" fill="none"><rect x="3" y="3" width="14" height="14" rx="2" fill="#bdbdbd"/><path d="M7 3v4h6V3" stroke="#fff" stroke-width="1.2"/><rect x="7" y="11" width="6" height="4" rx="1" fill="#fff"/></svg>';
      saveBtn.title = 'Save';
      saveBtn.disabled = true;
      saveBtn.style.opacity = 0.5;
      saveBtn.addEventListener('click', () => {
        let newValue;
        if (type.key === 'radio' || type.key === 'bool') {
          const checked = answerField.querySelector('input[type="radio"]:checked');
          newValue = checked ? checked.value : pair.answer;
        } else if (type.key === 'choice') {
          newValue = answerField.value;
        } else {
          newValue = answerField.value;
        }
        if (newValue !== originalValue) {
          // Update in qaPairs
          const realIdx = qaPairs.findIndex(q => q.type === type.key && q.question === pair.question);
          if (realIdx !== -1) {
            qaPairs[realIdx].answer = newValue;
            saveQAPairs();
          }
        }
      });
      // Enable/disable save button visually
      saveBtn.addEventListener('mouseenter', () => {
        if (!saveBtn.disabled) saveBtn.style.opacity = 1;
      });
      saveBtn.addEventListener('mouseleave', () => {
        saveBtn.style.opacity = saveBtn.disabled ? 0.5 : 1;
      });
      // Enable visually when not disabled
      answerField.addEventListener && answerField.addEventListener('input', () => {
        saveBtn.disabled = (answerField.value === originalValue);
        saveBtn.style.opacity = saveBtn.disabled ? 0.5 : 1;
      });
      actions.appendChild(saveBtn);
      // Delete (X) icon
      const deleteBtn = document.createElement('button');
      deleteBtn.innerHTML = '<svg width="18" height="18" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="9" fill="#e53935"/><path d="M7 7l6 6M13 7l-6 6" stroke="#fff" stroke-width="1.5"/></svg>';
      deleteBtn.title = 'Delete';
      deleteBtn.addEventListener('click', () => window.deleteQAPair(type.key, idx));
      actions.appendChild(deleteBtn);
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
