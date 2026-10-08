// Data structure: Note = { id: string, title: string, body: string, password: string|null, updatedAt: number }

let notes = JSON.parse(localStorage.getItem('pixel_notes')) || [];
let currentNoteId = null;

// DOM Elements
const notesList = document.getElementById('notesList');
const addNoteBtn = document.getElementById('addNoteBtn');

// Note Modal
const noteModal = document.getElementById('noteModal');
const noteTitle = document.getElementById('noteTitle');
const noteBody = document.getElementById('noteBody');
const closeNoteBtn = document.getElementById('closeModalBtn');
const saveNoteBtn = document.getElementById('saveNoteBtn');
const lockBtn = document.getElementById('lockBtn');

// Password Unlock Modal
const passwordModal = document.getElementById('passwordModal');
const passwordInput = document.getElementById('passwordInput');
const cancelPasswordBtn = document.getElementById('cancelPasswordBtn');
const submitPasswordBtn = document.getElementById('submitPasswordBtn');

// Set Password Modal
const setPasswordModal = document.getElementById('setPasswordModal');
const newPasswordInput = document.getElementById('newPasswordInput');
const cancelSetPasswordBtn = document.getElementById('cancelSetPasswordBtn');
const savePasswordBtn = document.getElementById('savePasswordBtn');
const removePasswordBtn = document.getElementById('removePasswordBtn');

function saveNotes() {
    localStorage.setItem('pixel_notes', JSON.stringify(notes));
}

function renderNotes() {
    notesList.innerHTML = '';
    notes.sort((a, b) => b.updatedAt - a.updatedAt).forEach(note => {
        const card = document.createElement('div');
        card.className = 'note-card' + (note.password ? ' locked' : '');
        
        const title = document.createElement('h3');
        title.textContent = note.title || 'Nuova nota';
        card.appendChild(title);

        const preview = document.createElement('p');
        if (note.password) {
            preview.textContent = '••••••••';
            const lockIcon = document.createElement('div');
            lockIcon.className = 'lock-icon';
            lockIcon.textContent = '🔒';
            card.appendChild(lockIcon);
        } else {
            preview.textContent = note.body || 'Nessun testo...';
        }
        card.appendChild(preview);

        card.addEventListener('click', () => openNote(note.id));
        notesList.appendChild(card);
    });
}

function openNote(id) {
    const note = notes.find(n => n.id === id);
    if (!note) return;

    if (note.password) {
        currentNoteId = id;
        passwordInput.value = '';
        passwordModal.classList.remove('hidden');
        setTimeout(() => passwordInput.focus(), 100);
    } else {
        showNoteEditor(note);
    }
}

function showNoteEditor(note) {
    currentNoteId = note.id;
    noteTitle.value = note.title;
    noteBody.value = note.body;
    updateLockIcon(!!note.password);
    noteModal.classList.remove('hidden');
}

function updateLockIcon(isLocked) {
    lockBtn.textContent = isLocked ? '🔒' : '🔓';
}

addNoteBtn.addEventListener('click', () => {
    const newNote = {
        id: Date.now().toString(),
        title: '',
        body: '',
        password: null,
        updatedAt: Date.now()
    };
    notes.push(newNote);
    saveNotes();
    renderNotes();
    showNoteEditor(newNote);
});

closeNoteBtn.addEventListener('click', () => {
    saveCurrentNote();
    noteModal.classList.add('hidden');
    renderNotes();
});

saveNoteBtn.addEventListener('click', () => {
    saveCurrentNote();
    noteModal.classList.add('hidden');
    renderNotes();
});

function saveCurrentNote() {
    if (!currentNoteId) return;
    const note = notes.find(n => n.id === currentNoteId);
    if (note) {
        note.title = noteTitle.value;
        note.body = noteBody.value;
        note.updatedAt = Date.now();
        saveNotes();
    }
}

// Password unlock logic
cancelPasswordBtn.addEventListener('click', () => {
    passwordModal.classList.add('hidden');
});

submitPasswordBtn.addEventListener('click', () => {
    const note = notes.find(n => n.id === currentNoteId);
    if (note && note.password === passwordInput.value) {
        passwordModal.classList.add('hidden');
        showNoteEditor(note);
    } else {
        alert('Password errata!');
        passwordInput.value = '';
    }
});

// Set password logic
lockBtn.addEventListener('click', () => {
    const note = notes.find(n => n.id === currentNoteId);
    if (!note) return;
    
    newPasswordInput.value = note.password || '';
    if (note.password) {
        removePasswordBtn.classList.remove('hidden');
    } else {
        removePasswordBtn.classList.add('hidden');
    }
    
    setPasswordModal.classList.remove('hidden');
});

cancelSetPasswordBtn.addEventListener('click', () => {
    setPasswordModal.classList.add('hidden');
});

savePasswordBtn.addEventListener('click', () => {
    const pwd = newPasswordInput.value.trim();
    if (pwd === '') {
        alert('Inserisci una password valida');
        return;
    }
    const note = notes.find(n => n.id === currentNoteId);
    if (note) {
        note.password = pwd;
        saveNotes();
        updateLockIcon(true);
    }
    setPasswordModal.classList.add('hidden');
});

removePasswordBtn.addEventListener('click', () => {
    const note = notes.find(n => n.id === currentNoteId);
    if (note) {
        note.password = null;
        saveNotes();
        updateLockIcon(false);
    }
    setPasswordModal.classList.add('hidden');
});

// PWA Service Worker Registration
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').then(reg => {
            console.log('Service Worker registered', reg);
        }).catch(err => {
            console.log('Service Worker registration failed', err);
        });
    });
}

// Initial render
renderNotes();
