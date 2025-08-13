document.addEventListener("DOMContentLoaded", () => {
  const urlParams = new URLSearchParams(window.location.search);
  const roomId = urlParams.get('room') || 'public_general';

  const messagesDiv = document.getElementById("messages");
  const input = document.getElementById("messageInput");
  const sendBtn = document.getElementById("sendBtn");

  const roomRef = db.collection("publicRooms").doc(roomId).collection("messages");

  roomRef.orderBy("ts").onSnapshot(snapshot => {
    messagesDiv.innerHTML = '';
    snapshot.forEach(doc => {
      const msg = doc.data();
      const div = document.createElement("div");
      div.textContent = msg.text;
      div.className = msg.sender==="me"?"myMsg":"otherMsg";
      messagesDiv.appendChild(div);
      messagesDiv.scrollTop = messagesDiv.scrollHeight;
    });
  });

  sendBtn.addEventListener("click", () => {
    const text = input.value.trim();
    if(!text) return;
    roomRef.add({ text, sender:"me", ts: Date.now() });
    input.value="";
  });
});
