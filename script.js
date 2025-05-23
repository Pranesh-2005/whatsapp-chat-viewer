const fileInput = document.getElementById("fileInput");
const chatContainer = document.getElementById("chatContainer");
const themeToggle = document.getElementById("themeToggle");
const searchInput = document.getElementById("searchInput");
const senderFilter = document.getElementById("senderFilter");
const fromDate = document.getElementById("fromDate");
const toDate = document.getElementById("toDate");
const scrollBtn = document.getElementById("scrollBtn");
const fontSelector = document.getElementById("fontSelector");
const themeToggleMobile = document.getElementById("themeToggleMobile");
const starredToggle = document.getElementById("starredToggle");
const uploadLabel = document.getElementById("uploadLabel");
const filters = document.getElementById("filters");

// Floating search nav
const searchNavFloating = document.getElementById("searchNavFloating");
const searchNextBtnFloat = document.getElementById("searchNextBtnFloat");
const searchCancelBtnFloat = document.getElementById("searchCancelBtnFloat");

// Mobile controls
const starredToggleMobile = document.getElementById("starredToggleMobile");
const fromDateMobile = document.getElementById("fromDateMobile");
const toDateMobile = document.getElementById("toDateMobile");
const searchInputMobile = document.getElementById("searchInputMobile");

let allMessages = [];
let firstSender = "";
let secondSender = "";
let showStarredOnly = false;

let searchMatches = [];
let currentMatchIndex = 0;

// Theme toggle
themeToggle.onclick = () => document.body.classList.toggle("dark");
themeToggleMobile.onclick = () => document.body.classList.toggle("dark");
fontSelector.onchange = () => document.body.style.fontFamily = `${fontSelector.value}, sans-serif`;

// Scroll to latest
scrollBtn.onclick = () => {
  chatContainer.scrollTop = chatContainer.scrollHeight;
};

// Hide upload after file loaded, show filters
function handleFileUpload(file) {
  if (!file) return;
  if (!file.name.endsWith('.txt')) {
    alert("Please upload a .txt file only.");
    return;
  }
  const reader = new FileReader();
  reader.onload = e => {
    allMessages = parseChat(e.target.result);
    setDefaultSenders();
    updateSenderDropdown();
    displayMessages(allMessages);
    uploadLabel.style.opacity = 0;
    setTimeout(() => uploadLabel.style.display = "none", 400);
    filters.style.display = "flex";
  };
  reader.readAsText(file);
}

fileInput.addEventListener("change", e => handleFileUpload(e.target.files[0]));

// Only allow one file at a time
fileInput.setAttribute("multiple", false);
fileInput.setAttribute("accept", ".txt");

// Parse WhatsApp chat
function parseChat(text) {
  const lines = text.split(/\r?\n/);
  const chat = [];
  const regex = /^(\d{1,2}\/\d{1,2}\/\d{2,4}), (\d{1,2}:\d{2}(?:\s?[APMapm]{2})?) - ([^:]+): (.+)$/;

  lines.forEach(line => {
    const match = line.match(regex);
    if (match) {
      const [_, date, time, sender, message] = match;
      const dateTimeStr = `${date} ${time}`;
      const dateObj = new Date(dateTimeStr);
      if (!isNaN(dateObj)) {
        chat.push({ sender, message, date: dateObj, starred: false, reaction: null });
      }
    } else if (chat.length > 0) {
      chat[chat.length - 1].message += "\n" + line;
    }
  });

  return chat;
}

function setDefaultSenders() {
  const senders = [...new Set(allMessages.map(msg => msg.sender))];
  firstSender = senders[0] || "";
  secondSender = senders[1] || "";
}

function updateSenderDropdown() {
  const senders = [...new Set(allMessages.map(msg => msg.sender))].sort();
  senderFilter.innerHTML = '<option value="">👤 Default View</option>';
  senders.forEach(sender => {
    const option = document.createElement("option");
    option.value = sender;
    option.textContent = sender;
    senderFilter.appendChild(option);
  });
}

// Debounce for search input
function debounce(fn, delay) {
  let timeout;
  return function(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn.apply(this, args), delay);
  };
}

const debouncedDisplay = debounce(() => {
  displayMessages(allMessages);
  handleSearchNavigation();
}, 150);

searchInput.addEventListener("input", () => {
  debouncedDisplay();
});
senderFilter.addEventListener("input", debouncedDisplay);
fromDate.addEventListener("input", debouncedDisplay);
toDate.addEventListener("input", debouncedDisplay);

starredToggle.onclick = () => {
  showStarredOnly = !showStarredOnly;
  starredToggle.classList.toggle("active", showStarredOnly);
  if (starredToggleMobile) starredToggleMobile.classList.toggle("active", showStarredOnly);
  displayMessages(allMessages);
};

// --- Mobile controls sync ---
if (starredToggleMobile) {
  starredToggleMobile.onclick = () => {
    showStarredOnly = !showStarredOnly;
    starredToggle.classList.toggle("active", showStarredOnly);
    starredToggleMobile.classList.toggle("active", showStarredOnly);
    displayMessages(allMessages);
  };
}
if (fromDateMobile) fromDateMobile.oninput = () => { fromDate.value = fromDateMobile.value; displayMessages(allMessages); };
if (toDateMobile) toDateMobile.oninput = () => { toDate.value = toDateMobile.value; displayMessages(allMessages); };
if (searchInputMobile) searchInputMobile.oninput = () => { searchInput.value = searchInputMobile.value; displayMessages(allMessages); };

// --- Floating search navigation ---
function handleSearchNavigation() {
  // Remove previous active highlights
  document.querySelectorAll('.highlight.active').forEach(el => el.classList.remove('active'));
  if (searchMatches.length > 0) {
    const match = searchMatches[currentMatchIndex];
    const highlights = chatContainer.querySelectorAll('.highlight');
    if (highlights[match.matchIndex]) {
      highlights[match.matchIndex].classList.add('active');
      // Position floating nav
      const rect = highlights[match.matchIndex].getBoundingClientRect();
      searchNavFloating.style.display = "flex";
      searchNavFloating.style.top = `${window.scrollY + rect.top - 36}px`;
      searchNavFloating.style.left = `${window.scrollX + rect.right + 8}px`;
    }
  } else {
    searchNavFloating.style.display = "none";
  }
}

searchNextBtnFloat.onclick = () => {
  if (searchMatches.length > 0) {
    currentMatchIndex = (currentMatchIndex + 1) % searchMatches.length;
    scrollToCurrentMatch();
  }
};
searchCancelBtnFloat.onclick = () => {
  searchInput.value = "";
  if (searchInputMobile) searchInputMobile.value = "";
  searchNavFloating.style.display = "none";
  searchMatches = [];
  currentMatchIndex = 0;
  displayMessages(allMessages);
};

window.addEventListener("scroll", handleSearchNavigation);
window.addEventListener("resize", handleSearchNavigation);

function displayMessages(messages) {
  chatContainer.innerHTML = "";
  const keyword = searchInput.value.toLowerCase();
  const selected = senderFilter.value;
  let lastDate = "", matchCount = 0;

  searchMatches = [];
  currentMatchIndex = 0;

  const fragment = document.createDocumentFragment();

  messages.forEach((msg, i) => {
    if (showStarredOnly && !msg.starred) return;
    if (fromDate.value && msg.date < new Date(fromDate.value)) return;
    if (toDate.value && msg.date > new Date(toDate.value)) return;

    const msgDate = msg.date.toDateString();
    if (msgDate !== lastDate) {
      const dateDiv = document.createElement("div");
      dateDiv.className = "date-group";
      dateDiv.textContent = msgDate;
      fragment.appendChild(dateDiv);
      lastDate = msgDate;
    }

    const msgDiv = document.createElement("div");
    msgDiv.className = "message-container";

    const bubble = document.createElement("div");
    bubble.className = "message";

    if (selected) {
      bubble.classList.add(msg.sender === selected ? "right" : "left");
    } else {
      bubble.classList.add(msg.sender === firstSender ? "left" : "right");
    }

    const name = document.createElement("div");
    name.className = "sender";
    name.textContent = msg.sender;

    const text = document.createElement("div");
    if (keyword && keyword.trim() !== "") {
      const regex = new RegExp(`(${keyword})`, "gi");
      let match;
      let lastIndex = 0;
      let highlighted = "";
      let message = msg.message;
      let localMatches = [];
      while ((match = regex.exec(message)) !== null) {
        highlighted += message.slice(lastIndex, match.index);
        highlighted += `<mark class="highlight" data-match="${matchCount}">${match[1]}</mark>`;
        localMatches.push({ msgDiv, bubble, text, matchIndex: matchCount });
        lastIndex = match.index + match[1].length;
        matchCount++;
      }
      highlighted += message.slice(lastIndex);
      text.innerHTML = highlighted;
      if (localMatches.length) {
        searchMatches.push(...localMatches);
      }
    } else {
      text.textContent = msg.message;
    }

    const time = document.createElement("div");
    time.className = "timestamp";
    time.textContent = msg.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Emoji Reaction Bar
    const reactionBar = document.createElement("div");
    reactionBar.className = "reaction-bar";
    const emojis = ["👍", "😂", "😍", "😮", "😢", "🔥"];
    emojis.forEach(emoji => {
      const btn = document.createElement("button");
      btn.textContent = emoji;
      btn.className = "emoji-btn";
      btn.onclick = (e) => {
        e.stopPropagation();
        msg.reaction = emoji;
        displayMessages(messages);
      };
      reactionBar.appendChild(btn);
    });
    // Show selected reaction
    if (msg.reaction) {
      const selected = document.createElement("span");
      selected.textContent = msg.reaction;
      selected.className = "selected-reaction";
      reactionBar.appendChild(selected);
    }

    bubble.append(name, text, time, reactionBar);
    msgDiv.appendChild(bubble);
    fragment.appendChild(msgDiv);

    bubble.addEventListener("contextmenu", e => {
      e.preventDefault();
      showContextMenu(e.pageX, e.pageY, msg);
    });
  });

  chatContainer.appendChild(fragment);

  handleSearchNavigation();
}

function scrollToCurrentMatch() {
  handleSearchNavigation();
}

function showContextMenu(x, y, msg) {
  let menu = document.getElementById("contextMenu");
  if (!menu) {
    menu = document.createElement("div");
    menu.id = "contextMenu";
    menu.className = "context-menu";
    document.body.appendChild(menu);
  }
  menu.innerHTML = "";

  // Star/Unstar
  const starBtn = document.createElement("button");
  starBtn.textContent = msg.starred ? "Unstar" : "Star";
  starBtn.onclick = () => {
    msg.starred = !msg.starred;
    displayMessages(allMessages);
    menu.style.display = "none";
  };
  menu.appendChild(starBtn);

  // Copy to clipboard
  const copyBtn = document.createElement("button");
  copyBtn.textContent = "Copy";
  copyBtn.onclick = () => {
    navigator.clipboard.writeText(`${msg.sender}: ${msg.message}`);
    menu.style.display = "none";
  };
  menu.appendChild(copyBtn);

  menu.style.left = x + "px";
  menu.style.top = y + "px";
  menu.style.display = "flex";
}

document.addEventListener("click", () => {
  const menu = document.getElementById("contextMenu");
  if (menu) menu.style.display = "none";
});