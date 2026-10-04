const noteText = document.querySelector("#note-text");
const charCount = document.querySelector("#char-count");
const wordCount = document.querySelector("#word-count");
const clearButton = document.querySelector("#clear-btn");
const themeToggle = document.querySelector("#theme-toggle");

const DRAFT_STORAGE_KEY = "quicknotes-day4-draft";
const THEME_STORAGE_KEY = "quicknotes-day4-theme";

function updateCounts() {
  const text = noteText.value;
  const characterTotal = text.length;
  const wordTotal = text.trim() === "" ? 0 : text.trim().split(/\s+/).length;

  charCount.textContent = `${characterTotal} / 200 characters`;
  wordCount.textContent = `${wordTotal} words`;

  charCount.classList.toggle("warning", characterTotal > 180);
  charCount.classList.toggle("over", characterTotal > 200);
}

function clearNote() {
  noteText.value = "";
  localStorage.removeItem(DRAFT_STORAGE_KEY);
  updateCounts();
}

function updateThemeButton() {
  const isDark = document.body.classList.contains("dark");
  themeToggle.textContent = isDark ? "Light mode" : "Dark mode";
}

noteText.addEventListener("input", () => {
  updateCounts();
  localStorage.setItem(DRAFT_STORAGE_KEY, noteText.value);
});

clearButton.addEventListener("click", clearNote);

noteText.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    clearNote();
  }
});

themeToggle.addEventListener("click", () => {
  const isDark = document.body.classList.toggle("dark");
  localStorage.setItem(THEME_STORAGE_KEY, isDark ? "dark" : "light");
  updateThemeButton();
});

const savedDraft = localStorage.getItem(DRAFT_STORAGE_KEY);
if (savedDraft !== null) {
  noteText.value = savedDraft;
}

if (localStorage.getItem(THEME_STORAGE_KEY) === "dark") {
  document.body.classList.add("dark");
}

updateThemeButton();
updateCounts();
