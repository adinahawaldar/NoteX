// Fade-in animations
const fadeElements = document.querySelectorAll('.fade-in');
const observer = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
    }
  });
});
fadeElements.forEach(el => observer.observe(el));

const firebaseConfig = {
  apiKey: "AIzaSyBuDk0Eokz041OmOqecq9m555uIoESr8Fw",
  authDomain: "notex-6fdd6.firebaseapp.com",
  projectId: "notex-6fdd6",
  storageBucket: "notex-6fdd6.firebasestorage.app",
  messagingSenderId: "34528695172",
  appId: "1:34528695172:web:d5f5f5810685ee71b683d1",
  measurementId: "G-89B0V6XQK9"
};
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

function handleLoginOrRedirect() {
  const user = auth.currentUser;
  if (user) {
    window.location.href = "mynotes.html";
  } else {
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider)
      .then(() => window.location.href = "mynotes.html")
      .catch(err => {
        console.error("Login error:", err);
        alert("Login failed. Please try again.");
      });
  }
}

document.getElementById('loginBtn').addEventListener('click', (e) => {
  e.preventDefault();
  handleLoginOrRedirect();
});
document.getElementById('startNotesBtn').addEventListener('click', (e) => {
  e.preventDefault();
  handleLoginOrRedirect();
});

const accHeaders = document.querySelectorAll(".accordion-header");
accHeaders.forEach(header => {
  header.addEventListener("click", () => {
    header.classList.toggle("active");
    const content = header.nextElementSibling;
    if(content.style.maxHeight){
      content.style.maxHeight = null;
    } else {
      content.style.maxHeight = content.scrollHeight + "px";
    }
  });
});

const thoughts = [
  "Keep your ideas alive — write them down!",
  "Small steps every day lead to big results.",
  "Your notes are seeds for your future projects.",
  "Stay organized, stay ahead.",
  "Creativity loves clarity — jot it down!"
];

let currentIndex = 0;
const card = document.getElementById("thoughtCard");
const text = document.getElementById("thoughtText");

function showNextThought() {
  card.classList.add("rotate");
  
  setTimeout(() => {
    currentIndex = (currentIndex + 1) % thoughts.length;
    text.textContent = thoughts[currentIndex];
    card.classList.remove("rotate");
  }, 300); 
}

card.addEventListener("click", showNextThought);
card.addEventListener("mouseover", showNextThought);

