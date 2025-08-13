const qs = sel => document.querySelector(sel);
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
if (roomId) {
  roomInput.value = roomId;
  roomIdText.textContent = `#${roomId}`;
}

function genRoomId(){
  return 'pvt-' + Math.random().toString(36).slice(2, 8);
}
genBtn.onclick = () => { roomInput.value = genRoomId(); };

togglePw.onclick = ()=>{
  pwInput.type = pwInput.type === 'password' ? 'text' : 'password';
};

copyLinkBtn.onclick = async () => {
  const url = `${location.origin}${location.pathname.replace('private.html','')}private.html?room=${encodeURIComponent(roomId || roomInput.value.trim())}`;
  await navigator.clipboard.writeText(url);
  copyLinkBtn.textContent = 'Copied!';
  setTimeout(()=>copyLinkBtn.textContent='Copy Link',1200);
};

// Emoji picker
const EMOJIS = '😀😁😂🤣😅😊😍😘🤩🥳🤔🤨😐😴🤯😎😇😈😻🙌👏👍👎🙏💪🔥✨💖💔🎉🎶⚡✅❌🇮🇳'.split('');
function renderEmojiPicker(){
  emojiPicker.innerHTML = '';
  EMOJIS.forEach(e=>{
    const b = document.createElement('button');
    b.textContent = e;
    b.onclick = ()=>{ insertAtCursor(msgInput, e); emojiPicker.classList.add('hidden'); msgInput.focus(); };
    emojiPicker.appendChild(b);
  });
}
function insertAtCursor(el, text){
  const start = el.selectionStart, end = el.selectionEnd, val = el.value;
  el.value = val.slice(0,start) + text + val.slice(end);
  el.selectionStart = el.selectionEnd = start + text.length;
}
emojiBtn.onclick = () => {
  if (emojiPicker.classList.contains('hidden')) { renderEmojiPicker(); }
  emojiPicker.classList.toggle('hidden');
};

let unsubMsgs = null;
let displayName = '';
let password = '';

joinBtn.onclick = async () => {
  displayName = (nameInput.value || 'Guest').trim().slice(0,24);
  roomId = (roomInput.value || genRoomId()).trim();
  password = (pwInput.value || '').trim();

  if (!/^[A-Za-z0-9]{1,7}$/.test(password)){
    alert('Password must be 1–7 characters: a–z, A–Z, 0–9.');
    return;
  }

  roomIdText.textContent = `#${roomId}`;
  const ok = await ensurePrivateRoom(roomId, password);
  if (!ok){ alert('Wrong password for this room.'); return; }

  // presence
  await db.collection('privateRooms').doc(roomId).collection('presence').doc(displayName).set({
    name: displayName, ts: Date.now()
  });

  joinPanel.classList.add('hidden');
  chatPanel.classList.remove('hidden');

  listenMessages(roomId);
  autoScroll();
};

async function ensurePrivateRoom(id, pw){
  const ref = db.collection('privateRooms').doc(id);
  const snap = await ref.get();
  const hash = await sha256(pw);
  if (!snap.exists){
    await ref.set({ createdAt: Date.now(), type:'private', pwHash: hash });
    return true;
  }else{
    const data = snap.data();
    return data.pwHash === hash;
  }
}

async function sha256(str){
  const enc = new TextEncoder().encode(str);
  const buf = await crypto.subtle.digest('SHA-256', enc);
  return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,'0')).join('');
}

function listenMessages(id){
  unsubMsgs && unsubMsgs();
  unsubMsgs = db.collection('privateRooms').doc(id).collection('messages')
    .orderBy('ts')
    .onSnapshot(snap=>{
      messagesEl.innerHTML = '';
      const names = new Set();
      snap.forEach(doc=>{
        const m = doc.data();
        names.add(m.name);
        messagesEl.appendChild(renderMsg(m, m.name===displayName));
      });
      peerPill.textContent = names.size > 1 ? 'Connected' : 'Waiting for your partner…';
      autoScroll();
    });
}

function renderMsg(m, isMe){
  const li = document.createElement('li');
  li.className = 'msg' + (isMe ? ' me' : '');
  li.innerHTML = `${escapeHTML(m.text)}<div class="meta">${escapeHTML(m.name)} • ${new Date(m.ts).toLocaleTimeString()}</div>`;
  return li;
}
function escapeHTML(str){
  return (str || '').replace(/[&<>"']/g, s=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[s]));
}

sendBtn.onclick = sendMessage;
msgInput.addEventListener('keydown', e=>{
  if (e.key==='Enter' && !e.shiftKey){ e.preventDefault(); sendMessage(); }
});

async function sendMessage(){
  const text = msgInput.value.trim();
  if (!text) return;
  msgInput.value = '';
  await db.collection('privateRooms').doc(roomId).collection('messages').add({
    name: displayName,
    text,
    ts: Date.now()
  });
}

function autoScroll(){ messagesEl.scrollTop = messagesEl.scrollHeight; }
