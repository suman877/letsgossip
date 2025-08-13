<!-- This file is loaded by public.html and private.html AFTER the Firebase CDN scripts -->
<script>
// === Replace with YOUR config (you shared these earlier) ===
const firebaseConfig = {
  apiKey: "AIzaSyBRFbi_fvsfFypu7a79VYu46cfGrsy2guk",
  authDomain: "letsgossip-a561f.firebaseapp.com",
  projectId: "letsgossip-a561f",
  storageBucket: "letsgossip-a561f.firebasestorage.app",
  messagingSenderId: "1083395402947",
  appId: "1:1083395402947:web:87eb53c729f6cd51ea8676"
};
// === Init ===
firebase.initializeApp(firebaseConfig);
window.db = firebase.firestore();
</script>
