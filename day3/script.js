let notes = [
  { id: 1, text: "Buy milk and bread", category: "personal" },
  { id: 2, text: "Finish the Day 3 assignment", category: "study" },
  { id: 3, text: "Email the project report to Grace", category: "work" },
  { id: 4, text: "Revise JavaScript arrays", category: "study" },
  { id: 5, text: "Call mum", category: "personal" },
];

function searchNotes(word) {
  const searchTerm = String(word).toLowerCase();
  return notes.filter((note) => note.text.toLowerCase().includes(searchTerm));
}

function longestNote() {
  if (notes.length === 0) {
    return null;
  }

  return notes.reduce((longest, note) => {
    return note.text.length > longest.text.length ? note : longest;
  });
}

function countByCategory() {
  const counts = { personal: 0, work: 0, study: 0 };

  for (const note of notes) {
    counts[note.category] += 1;
  }

  return counts;
}

function getSummary() {
  const counts = countByCategory();
  const noteWord = notes.length === 1 ? "note" : "notes";
  return `${notes.length} ${noteWord}: ${counts.personal} personal, ${counts.work} work, ${counts.study} study.`;
}

function isDuplicate(text) {
  const normalizedText = text.trim().toLowerCase();
  return notes.some((note) => note.text.trim().toLowerCase() === normalizedText);
}

function addNote(text, category) {
  const validCategories = ["personal", "work", "study"];

  if (typeof text !== "string" || text.trim().length < 1 || text.trim().length > 200) {
    console.log("Note was not added: text must be between 1 and 200 characters.");
    return false;
  }

  if (isDuplicate(text)) {
    console.log("Note was not added: a note with that text already exists.");
    return false;
  }

  if (!validCategories.includes(category)) {
    console.log("Note was not added: category must be personal, work or study.");
    return false;
  }

  const nextId = notes.length === 0 ? 1 : Math.max(...notes.map((note) => note.id)) + 1;
  notes.push({ id: nextId, text: text.trim(), category });
  console.log("Note added successfully.");
  return true;
}

const noteForm = document.querySelector("#note-form");
const noteText = document.querySelector("#note-text");
const noteCategory = document.querySelector("#note-category");
const formMessage = document.querySelector("#form-message");
const searchInput = document.querySelector("#search-input");
const notesList = document.querySelector("#notes-list");
const summary = document.querySelector("#summary");
const emptyState = document.querySelector("#empty-state");

function renderNotes() {
  const visibleNotes = searchNotes(searchInput.value);
  notesList.innerHTML = visibleNotes
    .map((note) => `<li class="note"><span>${escapeHtml(note.text)}</span><small>${escapeHtml(note.category)}</small></li>`)
    .join("");
  summary.textContent = getSummary();
  emptyState.hidden = visibleNotes.length > 0;
}

function escapeHtml(value) {
  return value.replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;",
  })[character]);
}

noteForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const added = addNote(noteText.value, noteCategory.value);
  formMessage.textContent = added ? "Note added." : "That note could not be added. Check the text and category.";
  formMessage.className = `form-message ${added ? "success" : "error"}`;

  if (added) {
    noteForm.reset();
    renderNotes();
  }
});

searchInput.addEventListener("input", renderNotes);
renderNotes();

console.log(searchNotes("DAY")); // Expected: [{ id: 2, text: "Finish the Day 3 assignment", category: "study" }]
console.log(searchNotes("holiday")); // Expected: []

const startingNotes = notes.map((note) => ({ ...note }));

console.log(longestNote()); // Expected: { id: 3, text: "Email the project report to Grace", category: "work" }
notes = [];
console.log(longestNote()); // Expected: null
notes = startingNotes.map((note) => ({ ...note }));

console.log(countByCategory()); // Expected: { personal: 2, work: 1, study: 2 }
notes = [{ id: 6, text: "One note", category: "personal" }];
console.log(countByCategory()); // Expected: { personal: 1, work: 0, study: 0 }
notes = startingNotes.map((note) => ({ ...note }));

console.log(getSummary()); // Expected: "5 notes: 2 personal, 1 work, 2 study."
notes = [{ id: 7, text: "Only note", category: "study" }];
console.log(getSummary()); // Expected: "1 note: 0 personal, 0 work, 1 study."
notes = startingNotes.map((note) => ({ ...note }));

console.log(isDuplicate("  buy MILK and bread  ")); // Expected: true
console.log(isDuplicate("Write project outline")); // Expected: false

console.log(addNote("Plan the weekend hike", "personal")); // Expected: true
console.log(addNote("  Plan the weekend hike  ", "personal")); // Expected: false
console.log(addNote("New note", "invalid")); // Expected: false
notes = startingNotes.map((note) => ({ ...note }));
