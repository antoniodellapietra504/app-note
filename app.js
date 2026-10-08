// Data structure: Note = { id: string, title: string, body: string, credentialId: string|null, updatedAt: number }

let notes = JSON.parse(localStorage.getItem('pixel_notes')) || [];
let currentNoteId = null;

// Helper to convert Uint8Array to base64 string and vice versa
function bufferToBase64(buffer) {
    return btoa(String.fromCharCode(...new Uint8Array(buffer)));
}
function base64ToBuffer(base64) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
}

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
const cancelPasswordBtn = document.getElementById('cancelPasswordBtn');
const submitPasswordBtn = document.getElementById('submitPasswordBtn');

// Set Password Modal
const setPasswordModal = document.getElementById('setPasswordModal');
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
        card.className = 'note-card' + (note.credentialId ? ' locked' : '');
        
        const title = document.createElement('h3');
        title.textContent = note.title || 'Nuova nota';
        card.appendChild(title);

        const preview = document.createElement('p');
        if (note.credentialId) {
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

    if (note.credentialId) {
        currentNoteId = id;
        passwordModal.classList.remove('hidden');
    } else {
        showNoteEditor(note);
    }
}

function showNoteEditor(note) {
    currentNoteId = note.id;
    noteTitle.value = note.title;
    noteBody.value = note.body;
    updateLockIcon(!!note.credentialId);
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
        credentialId: null,
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

// Biometric unlock logic
cancelPasswordBtn.addEventListener('click', () => {
    passwordModal.classList.add('hidden');
});

submitPasswordBtn.addEventListener('click', async () => {
    const note = notes.find(n => n.id === currentNoteId);
    if (!note || !note.credentialId) return;

    try {
        const rawIdBuffer = base64ToBuffer(note.credentialId);
        const options = {
            challenge: new Uint8Array(32),
            allowCredentials: [{
                id: rawIdBuffer,
                type: 'public-key',
                transports: ['internal'],
            }],
            userVerification: "required",
            timeout: 60000
        };

        await navigator.credentials.get({ publicKey: options });
        
        // Success
        passwordModal.classList.add('hidden');
        showNoteEditor(note);
    } catch (err) {
        console.error(err);
        alert('Autenticazione fallita! ' + err.message);
    }
});

// Set biometric protection logic
lockBtn.addEventListener('click', () => {
    const note = notes.find(n => n.id === currentNoteId);
    if (!note) return;
    
    if (note.credentialId) {
        removePasswordBtn.classList.remove('hidden');
    } else {
        removePasswordBtn.classList.add('hidden');
    }
    
    setPasswordModal.classList.remove('hidden');
});

cancelSetPasswordBtn.addEventListener('click', () => {
    setPasswordModal.classList.add('hidden');
});

savePasswordBtn.addEventListener('click', async () => {
    const note = notes.find(n => n.id === currentNoteId);
    if (!note) return;

    try {
        const options = {
            challenge: new Uint8Array(32),
            rp: { name: "Pixel Notes" },
            user: {
                id: new Uint8Array(16),
                name: "user",
                displayName: "Utente",
            },
            pubKeyCredParams: [{alg: -7, type: "public-key"}],
            authenticatorSelection: {
                authenticatorAttachment: "platform",
                userVerification: "required"
            },
            timeout: 60000,
            attestation: "none"
        };

        const credential = await navigator.credentials.create({ publicKey: options });
        
        // Save the rawId base64
        note.credentialId = bufferToBase64(credential.rawId);
        
        // Migrate old password prop out if it exists
        if(note.password) delete note.password;
        
        saveNotes();
        updateLockIcon(true);
        setPasswordModal.classList.add('hidden');
    } catch (err) {
        console.error(err);
        alert('Impossibile configurare la biometria: ' + err.message);
    }
});

removePasswordBtn.addEventListener('click', () => {
    const note = notes.find(n => n.id === currentNoteId);
    if (note) {
        note.credentialId = null;
        if(note.password) delete note.password;
        saveNotes();
        updateLockIcon(false);
    }
    setPasswordModal.classList.add('hidden');
});

// PWA Service Worker Registration
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').catch(err => {
            console.log('Service Worker registration failed', err);
        });
    });
}

// Initial render
renderNotes();
