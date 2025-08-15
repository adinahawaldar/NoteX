const firebaseConfig = {
  apiKey: "AIzaSyBuDk0Eokz041OmOqecq9m555uIoESr8Fw",
  authDomain: "notex-6fdd6.firebaseapp.com",
  projectId: "notex-6fdd6",
  storageBucket: "notex-6fdd6.appspot.com",
  messagingSenderId: "34528695172",
  appId: "1:34528695172:web:d5f5f5810685ee71b683d1",
  measurementId: "G-89B0V6XQK9"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

db.enablePersistence().catch((err) => {
  console.warn("Offline persistence error:", err.code);
});


const addNoteForm = document.getElementById('addNoteForm');
const noteTitleInput = document.getElementById('noteTitleInput');
const noteContentInput = document.getElementById('noteContentInput');
const noteTagsInput = document.getElementById('noteTagsInput');
const notesList = document.getElementById('notesList');
const noNotesMsg = document.getElementById('noNotesMsg');
const searchInput = document.getElementById('searchInput');
const starToggle = document.getElementById('starToggle');
const folderSelect = document.getElementById('folderSelect');
const folderInput = document.getElementById('folderInput');
const templateSelect = document.getElementById('templateSelect');
const sortSelect = document.getElementById('sortSelect');
const settingsBtn = document.getElementById('settingsBtn');
const logoutBtn = document.getElementById('logoutBtn');
const backBtn = document.getElementById('backBtn');

const editModal = document.getElementById('editModal');
const editNoteTitleInput = document.getElementById('editNoteTitleInput');
const editNoteContentInput = document.getElementById('editNoteContentInput');
const editNoteTagsInput = document.getElementById('editNoteTagsInput');
const saveEditBtn = document.getElementById('saveEditBtn');
const cancelEditBtn = document.getElementById('cancelEditBtn');
const settingsModal = document.getElementById('settingsModal');
const noteSize = document.getElementById('noteSize');
const saveSettingsBtn = document.getElementById('saveSettingsBtn');
const cancelSettingsBtn = document.getElementById('cancelSettingsBtn');
const markdownMode = document.getElementById('markdownMode');

const editNoteColorInput = document.getElementById('editNoteColorInput');

const viewModal = document.createElement('div');
viewModal.id = 'viewModal';
viewModal.style.cssText = `
  display:none;position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.5);
  align-items:center;justify-content:center;padding:16px;
`;
viewModal.innerHTML = `
  <div id="viewModalDialog" style="background:#fff;max-width:800px;width:100%;max-height:85vh;overflow:auto;border-radius:12px;position:relative;padding:20px;">
    <button id="closeViewModal" aria-label="Close" style="position:absolute;top:10px;right:10px;border:none;border-radius:8px;padding:6px 10px;cursor:pointer;">✕</button>
    <h2 id="viewTitle" style="margin-top:0"></h2>
    <div id="viewContent" style="white-space:pre-wrap;line-height:1.5"></div>
    <div id="viewTags" style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap"></div>
  </div>
`;
document.body.appendChild(viewModal);
document.getElementById('closeViewModal').addEventListener('click', () => closeViewModal());
viewModal.addEventListener('click', (e) => {
  if (e.target === viewModal) closeViewModal();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeViewModal();
});
function openViewModal(note) {
  document.getElementById('viewTitle').textContent = note.title || 'Untitled';
  const contentEl = document.getElementById('viewContent');
  contentEl.innerHTML = markdownMode.checked ? simpleMarkdownToHtml(note.content || '') : (note.content || '');
  const tagWrap = document.getElementById('viewTags');
  tagWrap.innerHTML = '';
  (note.tags || []).forEach(t => {
    const s = document.createElement('span');
    s.textContent = t;
    s.style.cssText = 'font-size:12px;padding:4px 8px;border-radius:12px;background:#f1f1f1;';
    tagWrap.appendChild(s);
  });
  viewModal.style.display = 'flex';
}
function closeViewModal() {
  viewModal.style.display = 'none';
}

let user = null;
let notes = [];
let folders = [];
let editingNoteId = null;
let showOnlyStarred = false;

auth.onAuthStateChanged(u => {
  if (u) {
    user = u;
    db.collection('logins').add({
      uid: u.uid,
      email: u.email || 'Anonymous',
      loginAt: firebase.firestore.FieldValue.serverTimestamp()
    }).catch(console.error);

    loadNotes();
    loadFolders();
  } else {
    user = null;
    window.location.href = 'login.html';
  }
});


document.getElementById("hamburger").addEventListener("click", () => {
  document.getElementById("headerActions").classList.toggle("show");
});


function tsToDateSafe(ts) {
  try {
    if (!ts) return null;
    if (typeof ts.toDate === 'function') return ts.toDate();
    if (ts instanceof Date) return ts;
    if (typeof ts === 'number') return new Date(ts);
    const d = new Date(ts);
    return isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
}
function formatDate(date) {
  const d = tsToDateSafe(date) || date;
  if (!(d instanceof Date)) return '';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
}
function htmlFromMarkdownOrText(text) {
  return markdownMode.checked ? simpleMarkdownToHtml(text || '') : (text || '');
}
function plainTextFromMarkdown(text) {
  const tmp = document.createElement('div');
  tmp.innerHTML = simpleMarkdownToHtml(text || '');
  return (tmp.textContent || tmp.innerText || '').trim();
}
function previewText(note, maxLen = 180) {
  const raw = note.content || '';
  const plain = markdownMode.checked ? plainTextFromMarkdown(raw) : raw;
  if (plain.length <= maxLen) return plain;
  return plain.slice(0, maxLen).trim() + '...';
}

function loadNotes() {
  if (!user) return;

    const notesRef = db.collection('notes').doc(user.uid).collection('userNotes');


  notesRef
    .orderBy('createdAt', 'desc')
    .onSnapshot(snapshot => {
      notes = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        if (!data.deletedAt) {
          notes.push({ id: doc.id, ...data });
        }
      });
      renderNotes();
      updateStatistics();
    }, error => {
      console.error("Error loading notes:", error);
    });
}

function renderNotes() {
  let filteredNotes = notes;

  if (showOnlyStarred) {
    filteredNotes = filteredNotes.filter(n => n.starred);
  }

  const searchTerm = searchInput.value.trim().toLowerCase();
  if (searchTerm) {
    filteredNotes = filteredNotes.filter(n =>
      (n.title || '').toLowerCase().includes(searchTerm) ||
      (n.content || '').toLowerCase().includes(searchTerm) ||
      (n.tags || []).some(tag => tag.toLowerCase().includes(searchTerm))
    );
  }

  const sortValue = sortSelect.value;
  filteredNotes = sortNotes(filteredNotes, sortValue);

  notesList.innerHTML = '';

  if (filteredNotes.length === 0) {
    noNotesMsg.style.display = 'block';
    return;
  } else {
    noNotesMsg.style.display = 'none';
  }

  filteredNotes.forEach(note => {
    const noteCard = createNoteCard(note);
    notesList.appendChild(noteCard);
  });
}

function sortNotes(arr, sortValue) {
  const ms = (ts) => {
    if (!ts) return 0;
    if (typeof ts.toMillis === 'function') return ts.toMillis();
    const d = tsToDateSafe(ts);
    return d ? d.getTime() : 0;
  };
  switch(sortValue) {
    case 'newest':
      return [...arr].sort((a, b) => ms(b.createdAt) - ms(a.createdAt));
    case 'oldest':
      return [...arr].sort((a, b) => ms(a.createdAt) - ms(b.createdAt));
    case 'title':
      return [...arr].sort((a, b) => (a.title || '').localeCompare(b.title || ''));
    case 'starred':
      return [...arr].sort((a, b) => (b.starred ? 1 : 0) - (a.starred ? 1 : 0));
    default:
      return arr;
  }
}

function createNoteCard(note) {
  const noteCard = document.createElement('article');
  noteCard.classList.add('note-card');
  if (note.color) noteCard.style.backgroundColor = note.color;

  const noteHeader = document.createElement('div');
  noteHeader.className = 'note-header';

  const title = document.createElement('h4');
  title.textContent = note.title || 'Untitled';

  const actions = document.createElement('div');
  actions.classList.add('note-actions');

  const starBtn = createActionButton(note.starred ? '⭐' : '☆', note.starred ? 'Unstar Note' : 'Star Note', (e) => { e.stopPropagation(); toggleStar(note, !note.starred); });
  if (note.starred) starBtn.classList.add('starred');
  
  const pinBtn = createActionButton(note.pinned ? '📌' : '📍', note.pinned ? 'Unpin Note' : 'Pin Note', (e) => { e.stopPropagation(); togglePin(note, !note.pinned); });
  const editBtn = createActionButton('✏️', 'Edit Note', (e) => { e.stopPropagation(); openEditModal(note); });
  const deleteBtn = createActionButton('🗑️', 'Delete Note', (e) => { e.stopPropagation(); moveNoteToTrash(note); });

  actions.append(starBtn, pinBtn, editBtn, deleteBtn);
  noteHeader.append(title, actions);
  noteCard.appendChild(noteHeader);

  const content = document.createElement('p');
  const pv = previewText(note, 180);
  content.innerHTML = htmlFromMarkdownOrText(pv);
  content.style.display = '-webkit-box';
  content.style.webkitLineClamp = '3';
  content.style.webkitBoxOrient = 'vertical';
  content.style.overflow = 'hidden';
  noteCard.appendChild(content);

  if (note.tags?.length) {
    const tagsContainer = document.createElement('div');
    tagsContainer.className = 'note-tags';
    note.tags.forEach(tag => {
      const tagEl = document.createElement('span');
      tagEl.className = 'note-tag';
      tagEl.textContent = tag;
      tagsContainer.appendChild(tagEl);
    });
    noteCard.appendChild(tagsContainer);
  }

  if (note.reminderTimestamp) {
    const reminderBadge = document.createElement('div');
    reminderBadge.className = 'note-reminder';
    const date = note.reminderTimestamp.toDate?.() || new Date(note.reminderTimestamp);
    reminderBadge.textContent = `⏰ ${date.toLocaleString()}`;
    noteCard.appendChild(reminderBadge);
  }

  const metadata = document.createElement('div');
  metadata.className = 'note-metadata';

  const createdDate = document.createElement('small');
  if (note.createdAt?.toDate || note.createdAt instanceof Date) {
    createdDate.textContent = `Created: ${formatDate(note.createdAt)}`;
  }
  metadata.appendChild(createdDate);

  noteCard.appendChild(metadata);

  noteCard.addEventListener('click', () => openViewModal(note));

  return noteCard;
}

function createActionButton(icon, title, onClick) {
  const btn = document.createElement('button');
  btn.innerHTML = icon;
  btn.title = title;
  btn.addEventListener('click', onClick);
  return btn;
}


function updateStatistics() {
  const wordCountEl = document.getElementById('wordCount');
  const charCountEl = document.getElementById('charCount');
  const createdDateEl = document.getElementById('createdDate');
  const lastEditedEl = document.getElementById('lastEdited');
  const monthlyNotesEl = document.getElementById('monthlyNotes');
  const monthlyActiveDaysEl = document.getElementById('monthlyActiveDays'); 

  let totalWords = 0;
  let totalChars = 0;

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  let activeDaysSet = new Set();

  const monthlyNotes = notes.filter(note => {
    const d = tsToDateSafe(note.createdAt);
    return d && d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });

  notes.forEach(note => {
    if (note.content) {
      const words = note.content.split(/\s+/).filter(word => word.length > 0);
      totalWords += words.length;
      totalChars += note.content.length;
    }

    const createdDate = tsToDateSafe(note.createdAt);
    const updatedDate = tsToDateSafe(note.updatedAt);

    if (createdDate && createdDate.getMonth() === currentMonth && createdDate.getFullYear() === currentYear) {
      activeDaysSet.add(createdDate.getDate());
    }
    if (updatedDate && updatedDate.getMonth() === currentMonth && updatedDate.getFullYear() === currentYear) {
      activeDaysSet.add(updatedDate.getDate());
    }
  });

  const activeDays = activeDaysSet.size;

  if (wordCountEl) wordCountEl.textContent = totalWords.toLocaleString();
  if (charCountEl) charCountEl.textContent = totalChars.toLocaleString();
  if (monthlyNotesEl) monthlyNotesEl.textContent = monthlyNotes.length;
  if (monthlyActiveDaysEl) monthlyActiveDaysEl.textContent = activeDays; 

  const monthlyNotesBar = document.querySelector('#monthlyNotesBar');
  if (monthlyNotesBar) {
    const maxMonthlyNotes = 50; // Example target
    const notesPercent = Math.min((monthlyNotes.length / maxMonthlyNotes) * 100, 100);
    monthlyNotesBar.style.width = notesPercent + "%";
  }

  const monthlyActiveDaysBar = document.querySelector('#monthlyActiveDaysBar');
  if (monthlyActiveDaysBar) {
    const maxActiveDays = 31;
    const activeDaysPercent = Math.min((activeDays / maxActiveDays) * 100, 100);
    monthlyActiveDaysBar.style.width = activeDaysPercent + "%";
  }

  if (notes.length > 0) {
    const newest = [...notes].sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0))[0];
    if (createdDateEl && newest?.createdAt) {
      createdDateEl.textContent = formatDate(newest.createdAt);
    }

    const editedNotes = notes.filter(n => n.updatedAt);
    if (editedNotes.length > 0) {
      const sortedByEdit = [...editedNotes].sort((a, b) => (b.updatedAt?.toMillis?.() || 0) - (a.updatedAt?.toMillis?.() || 0));
      if (lastEditedEl && sortedByEdit[0]?.updatedAt) {
        lastEditedEl.textContent = formatDate(sortedByEdit[0].updatedAt);
      }
    } else if (newest?.createdAt && lastEditedEl) {
      lastEditedEl.textContent = formatDate(newest.createdAt);
    }
  }
}


addNoteForm.addEventListener('submit', async e => {
  e.preventDefault();
  if (!user) return alert('Please login first!');

  const title = noteTitleInput.value.trim();
  const content = noteContentInput.value.trim();
  let tags = [];
  if (noteTagsInput?.value && noteTagsInput.value.trim()) {
    tags = noteTagsInput.value.split(',').map(t => t.trim()).filter(Boolean);
  }

  const color = document.getElementById('noteColorInput')?.value || '#ffffffff';
  const folder = folderInput.value.trim();

  if (!title && !content) return alert('Note cannot be empty.');

  const newNote = {
    title,
    content,
    tags,
    starred: false,
    pinned: false,
    color,
    folder: folder || 'Uncategorized',
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    ownerUid: user.uid,
    ownerEmail: user.email || 'Anonymous',
  };

  try {
    await db.collection('notes')
      .doc(user.uid)
      .collection('userNotes')
      .add(newNote);
    addNoteForm.reset();
  } catch (err) {
    console.error('Error adding note:', err);
    alert('Failed to save note. Try again.');
  }
});

function toggleStar(note, starStatus) {
  if (!user) return;

  db.collection('notes')
    .doc(user.uid) 
    .collection('userNotes')
    .doc(note.id)
    .update({ starred: starStatus })
    .catch(console.error);
}


function togglePin(note, pinStatus) {
  if (!user) return;
  db.collection('notes')
    .doc(user.uid)
    .collection('userNotes')
    .doc(note.id)
    .update({ pinned: pinStatus })
    .catch(console.error);
}

function moveNoteToTrash(note) {
  if (!user) return;
  if (confirm('Are you sure you want to delete this note?')) {
    db.collection('notes')
      .doc(user.uid)
      .collection('userNotes')
      .doc(note.id)
      .update({
        deletedAt: firebase.firestore.FieldValue.serverTimestamp()
      })
      .catch(console.error);
  }
}

// Edit Modal Functions
function openEditModal(note) {
  editingNoteId = note.id;
  editNoteTitleInput.value = note.title || '';
  editNoteContentInput.value = note.content || '';
  if (editNoteTagsInput) {
    editNoteTagsInput.value = (note.tags || []).join(', ');
  }
  if (editNoteColorInput) {
    editNoteColorInput.value = note.color || '#ffffffff';
  }
  editModal.setAttribute('aria-hidden', 'false');
  editModal.classList.add('show');
  editNoteTitleInput.focus();
}

function closeEditModal() {
  editModal.classList.remove('show');
  editModal.setAttribute('aria-hidden', 'true');
  editingNoteId = null;
}

saveEditBtn.addEventListener('click', () => {
  const updatedTitle = editNoteTitleInput.value.trim();
  const updatedContent = editNoteContentInput.value.trim();
  let updatedTags = [];
  if (editNoteTagsInput?.value && editNoteTagsInput.value.trim()) {
    updatedTags = editNoteTagsInput.value.split(',').map(t => t.trim()).filter(Boolean);
  }
  const updatedColor = editNoteColorInput ? editNoteColorInput.value : '#ffffffff';

  if (!updatedTitle && !updatedContent) {
    alert('Note cannot be empty!');
    return;
  }

  db.collection('notes')
    .doc(user.uid)
    .collection('userNotes')
    .doc(editingNoteId)
    .update({
      title: updatedTitle,
      content: updatedContent,
      tags: updatedTags,
      color: updatedColor,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    })
    .then(closeEditModal)
    .catch(console.error);
});

cancelEditBtn.addEventListener('click', closeEditModal);
editModal.addEventListener('click', e => {
  if (e.target === editModal) closeEditModal();
});

function loadFolders() {
  if (!user) return;
  
  db.collection('notes')
    .doc(user.uid)
    .collection('folders')
    .onSnapshot(snapshot => {
      folders = [];
      if (folderSelect) {
        folderSelect.innerHTML = '<option value="all">All Folders</option>';
      }
      
      snapshot.forEach(doc => {
        folders.push(doc.data().name);
        if (folderSelect) {
          const option = document.createElement('option');
          option.value = doc.data().name;
          option.textContent = doc.data().name;
          folderSelect.appendChild(option);
        }
      });
      
      const folderSuggestions = document.getElementById('folderSuggestions');
      if (folderSuggestions) {
        folderSuggestions.innerHTML = '';
        folders.forEach(folder => {
          const option = document.createElement('option');
          option.value = folder;
          folderSuggestions.appendChild(option);
        });
      }
    });
}

folderInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter' && folderInput.value.trim()) {
    e.preventDefault();
    const folderName = folderInput.value.trim();
    
    if (!folders.includes(folderName)) {
      db.collection('notes')
        .doc(user.uid)
        .collection('folders')
        .add({ name: folderName })
        .catch(console.error);
    }
    folderInput.value = '';
  }
});

templateSelect.addEventListener('change', (e) => {
  if (e.target.value === 'blank') return;
  
  let templateContent = '';
  const today = new Date();
  const formattedDate = formatDate(today);

  switch(e.target.value) {
    case 'daily':
      templateContent = `# ${formattedDate}\n\n## Highlights\n- \n\n## Challenges\n- \n\n## Tomorrow's Goals\n1. `;
      break;
    case 'meeting':
      templateContent = `# Meeting Title\n\n**Date:** ${formattedDate}\n**Attendees:** \n\n## Agenda\n1. \n\n## Decisions\n- \n\n## Action Items\n- [ ] `;
      break;
    case 'recipe':
      templateContent = `# Recipe Name\n\n**Prep Time:** \n**Cook Time:** \n**Servings:** \n\n## Ingredients\n- \n\n## Instructions\n1. `;
      break;
  }
  
  noteContentInput.value = templateContent;
  templateSelect.value = 'blank';
});

settingsBtn.addEventListener('click', () => {
  settingsModal.setAttribute('aria-hidden', 'false');
  settingsModal.classList.add('show');
});

cancelSettingsBtn.addEventListener('click', closeSettingsModal);
settingsModal.addEventListener('click', e => {
  if (e.target === settingsModal) closeSettingsModal();
});

function closeSettingsModal() {
  settingsModal.classList.remove('show');
  settingsModal.setAttribute('aria-hidden', 'true');
}

saveSettingsBtn.addEventListener('click', () => {
  const settings = {
    noteSize: noteSize.value,
    markdownMode: markdownMode.checked
  };
  
  document.body.classList.remove('note-size-small', 'note-size-medium', 'note-size-large');
  document.body.classList.add(`note-size-${settings.noteSize}`);
  
  if (user) {
    db.collection('notes')
      .doc(user.uid)
      .collection('settings')
      .doc('preferences')
      .set(settings)
      .catch(console.error);
  }
  
  closeSettingsModal();
});

function simpleMarkdownToHtml(text) {
  if (!text) return '';
  text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  text = text.replace(/\*(.+?)\*/g, '<em>$1</em>');
  text = text.replace(/(?:^|\n)- (.+)/g, '<ul><li>$1</li></ul>');
  return text.replace(/\n/g, '<br>');
}

markdownMode.addEventListener('change', (e) => {
  localStorage.setItem('markdownMode', e.target.checked);
  renderNotes();
});

if (localStorage.getItem('markdownMode') === 'true') {
  markdownMode.checked = true;
}

searchInput.addEventListener('input', renderNotes);
starToggle.addEventListener('click', () => {
  showOnlyStarred = !showOnlyStarred;
  starToggle.setAttribute('aria-pressed', showOnlyStarred.toString());
  renderNotes();
});
sortSelect.addEventListener('change', renderNotes);

if (backBtn) {
  backBtn.addEventListener('click', () => {
    window.location.href = 'index.html';
  });
}

if (logoutBtn) {
  logoutBtn.addEventListener('click', () => {
    auth.signOut()
      .then(() => {
        window.location.href = 'index.html';
      })
      .catch(console.error);
  });
}

const offlineIndicator = document.getElementById('offlineIndicator');
window.addEventListener('online', () => {
  if (offlineIndicator) offlineIndicator.style.display = 'none';
});
window.addEventListener('offline', () => {
  if (offlineIndicator) offlineIndicator.style.display = 'block';
});
