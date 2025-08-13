import { qs, renderEmojiPicker, insertAtCursor, escapeHTML, renderMsg, autoScroll, copyLink } from './utils.js';

const messagesEl = qs('#messages');
const joinPanel = qs('#joinPanel');
const chatPanel = qs('#chatPanel');
const roomIdText = qs('#roomIdText');
const nameInput = qs('#displayName');
const roomInput = qs('#roomIdInput');
const genBtn = qs('#genRoomBtn');
const joinBtn = qs('#joinBtn');
const copyLinkBtn = qs('#copyLinkBtn');
const pwInput = qs('#password');
const togglePw = qs('#togglePw');
const emojiBtn = qs('#emojiBtn');
const emojiPicker = qs('#emojiPicker');
const msgInput = qs('#messageInput');
const sendBtn = qs('#sendBtn');
const mePill = qs('#mePill');
const peerPill = qs('#peerPill');

let roomId = new URLSearchParams(location.search).get('room') || '';
let urlPassword = new URLSearchParams(location.search).get('pwd') || '';
if (roomId) {
  roomInput.value = roomId;
  roomIdText.textContent = `#${roomId}`;
}
if (urlPassword) {
  pwInput.value = urlPassword;
}

function genRoomId() {
  return 'pvt-' + Math.random().toString(36).slice(2, 8);
}

genBtn.onclick = () => { roomInput.value = genRoomId(); };

togglePw.onclick = () => {
  pwInput.type = pwInput.type === 'password' ? 'text' : 'password';
  togglePw.textContent = pwInput.type === 'password' ? '👁️' : '🙈';
};

copyLinkBtn.onclick = () => copyLink('/private.html', roomId || roomInput.value.trim(), copyLinkBtn);

emojiBtn.onclick = () => {
  if (emojiPicker.classList.contains('hidden')) { renderEmojiPicker(emojiPicker, msgInput); }
  emojiPicker.classList.toggle('hidden');
};

let unsubMsgs = null;
let displayName = '';
let password = '';

joinBtn.onclick = async () => {
  try {
    displayName = (nameInput.value || 'Guest').trim().slice(0, 24);
    roomId = (roomInput.value || genRoomId()).trim();
    password = (pwInput.value || '').trim();

    if (!/^[A-Za-z0-9-]{3,12}$/.test(roomId)) {
      alert('Room ID must be 3–12 characters: a–z, A–Z, 0–9, or hyphen.');
      return;
    }
    if (!/^[A-Za-z0-9]{0,7}$/.test(password)) {
      alert('Password must be 0–7 characters: a–z, A–Z, 0–9.');
      return;
    }

    roomIdText.textContent = `#${roomId}`;
    const ok = await ensurePrivateRoom(roomId, password);
    if (!ok) {
      alert('Wrong password for this room.');
      return;
    }

    await db.collection('privateRooms').doc(roomId).collection('presence').doc(displayName).set({
      name: displayName,
      ts: Date.now()
    });

    joinPanel.classList.add('hidden');
    chatPanel.classList.remove('hidden');

    listenMessages(roomId);
    autoScroll(messagesEl);
  } catch (err) {
    console.error('Error joining room:', err);
    alert('Failed to join room. Please try again.');
  }
};

async function ensurePrivateRoom(id, pw) {
  try {
    const ref = db.collection('privateRooms').doc(id);
    const snap = await ref.get();
    const hash = await sha256(pw);
    if (!snap.exists) {
      await ref.set({ createdAt: Date.now(), type: 'private', pwHash: hash });
      return true;
    } else {
      const data = snap.data();
      return data.pwHash === hash;
    }
  } catch (err) {
    console.error('Error ensuring private room:', err);
    throw err;
  }
}

async function sha256(str) {
  try {
    const enc = new TextEncoder().encode(str);
    const buf = await crypto.subtle.digest('SHA-256', enc);
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
  } catch (err) {
    console.error('SHA-256 error:', err);
    alert('Password hashing failed. Ensure you’re using HTTPS.');
    throw err;
  $0
}

function listenMessages(id) {
  unsubMsgs && unsubMsgs();
  unsubMsgs = db.collection('privateRooms').doc(id).collection('messages')
    .orderBy('ts')
    .onSnapshot(snap => {
      messagesEl.innerHTML = '';
      const names = new Set();
      snap.forEach(doc => {
        const m = doc.data();
        names.add(m.name);
        messagesEl.appendChild(renderMsg(m, m.name === displayName));
      });
      peerPill.textContent = names.size > 1 ? 'Connected' : 'Waiting for your partner…';
      autoScroll(messagesEl);
    }, err => {
      console.error('Error listening to messages:', err);
      alert('Failed to load messages. Please refresh.');
    });
}

sendBtn.onclick = sendMessage;
msgInput.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

async function sendMessage() {
  const text = msgInput.value.trim();
  if (!text) return;
  try {
    msgInput.value = '';
    await db.collection('privateRooms').doc(roomId).collection('messages').add({
      name: displayName,
      text,
      ts: Date.now()
    });
  } catch (err) {
    console.error('Error sending message:', err);
    alert('Failed to send message. Please try again.');
  }
}