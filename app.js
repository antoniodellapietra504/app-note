// Data structure: Note = { id: string, title: string, body: string, updatedAt: number }

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
const authScreen = document.getElementById('authScreen');
const mainApp = document.getElementById('mainApp');
const authBtn = document.getElementById('authBtn');
const authMessage = document.getElementById('authMessage');

const notesList = document.getElementById('notesList');
const addNoteBtn = document.getElementById('addNoteBtn');

const noteModal = document.getElementById('noteModal');
const noteTitle = document.getElementById('noteTitle');
const noteBody = document.getElementById('noteBody');
const closeNoteBtn = document.getElementById('closeModalBtn');
const saveNoteBtn = document.getElementById('saveNoteBtn');

// Auth State Check
const appCredentialId = localStorage.getItem('app_credential');

if (appCredentialId) {
    authMessage.textContent = "L'app è bloccata. Inserisci il PIN del telefono o usa la biometria per accedere alle tue note.";
    authBtn.textContent = "Sblocca App";
    authBtn.onclick = unlockApp;
} else {
    authMessage.textContent = "Questa app conterrà informazioni sensibili. Attiva la protezione tramite il PIN o la biometria del tuo telefono per continuare.";
    authBtn.textContent = "Configura Sicurezza";
    authBtn.onclick = setupAppSecurity;
}

async function setupAppSecurity() {
    try {
        const options = {
            challenge: new Uint8Array(32),
            rp: { name: "Pixel Notes" },
            user: {
                id: new Uint8Array(16),
                name: "proprietario",
                displayName: "Proprietario del dispositivo",
            },
            pubKeyCredParams: [{alg: -7, type: "public-key"}],
            authenticatorSelection: {
                authenticatorAttachment: "platform", // Forza l'uso di PIN/Biometria del dispositivo
                userVerification: "required"
            },
            timeout: 60000,
            attestation: "none"
        };

        const credential = await navigator.credentials.create({ publicKey: options });
        localStorage.setItem('app_credential', bufferToBase64(credential.rawId));
        
        // Successo, entra nell'app
        enterApp();
    } catch (err) {
        console.error(err);
        alert('Impossibile configurare la sicurezza. Assicurati che il tuo dispositivo abbia un PIN o un sistema biometrico impostato. (' + err.message + ')');
    }
}

async function unlockApp() {
    try {
        const rawIdBuffer = base64ToBuffer(appCredentialId);
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
        
        // Successo, entra nell'app
        enterApp();
    } catch (err) {
        console.error(err);
        alert('Autenticazione fallita! ' + err.message);
    }
}

function enterApp() {
    authScreen.classList.add('hidden');
    mainApp.classList.remove('hidden');
    renderNotes();
}

// --- LOGICA DELLE NOTE ---

function saveNotes() {
    localStorage.setItem('pixel_notes', JSON.stringify(notes));
}

function renderNotes() {
    notesList.innerHTML = '';
    // Pulisce le vecchie note che avevano un credentialId specifico (migrazione)
    notes = notes.map(n => {
        if(n.credentialId || n.password) {
            delete n.credentialId;
            delete n.password;
        }
        return n;
    });

    notes.sort((a, b) => b.updatedAt - a.updatedAt).forEach(note => {
        const card = document.createElement('div');
        card.className = 'note-card';
        
        const title = document.createElement('h3');
        title.textContent = note.title || 'Nuova nota';
        card.appendChild(title);

        const preview = document.createElement('p');
        preview.textContent = note.body || 'Nessun testo...';
        card.appendChild(preview);

        card.addEventListener('click', () => showNoteEditor(note));
        notesList.appendChild(card);
    });
}

function showNoteEditor(note) {
    currentNoteId = note.id;
    noteTitle.value = note.title;
    noteBody.value = note.body;
    noteModal.classList.remove('hidden');
}

addNoteBtn.addEventListener('click', () => {
    const newNote = {
        id: Date.now().toString(),
        title: '',
        body: '',
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

// PWA Service Worker Registration
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').catch(err => {
            console.log('Service Worker registration failed', err);
        });
    });
}
