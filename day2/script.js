const storageKey = "quicknotes-notes";
const defaultNotes = ["Revise HTML forms", "Push my code to GitHub"];
const noteForm = document.querySelector("#note-form");
const noteInput = document.querySelector("#note-input");
const notesList = document.querySelector("#notes-list");
const noteCount = document.querySelector("#note-count");

function getNotes() {
  try {
    const savedNotes = localStorage.getItem(storageKey);
    return savedNotes ? JSON.parse(savedNotes) : defaultNotes;
  } catch {
    return defaultNotes;
  }
}

function saveNotes(notes) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(notes));
  } catch {
  }
}

function renderNotes(notes) {
  notesList.replaceChildren();

  notes.forEach((noteText) => {
    const note = document.createElement("li");
    note.className = "note";
    note.textContent = noteText;
    notesList.append(note);
  });

  const noteWord = notes.length === 1 ? "note" : "notes";
  noteCount.textContent = `You have ${notes.length} ${noteWord}.`;
}

let notes = getNotes();
renderNotes(notes);

noteForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const newNote = noteInput.value.trim();
  if (!newNote) {
    noteInput.focus();
    return;
  }

  notes = [...notes, newNote];
  saveNotes(notes);
  renderNotes(notes);
  noteForm.reset();
  noteInput.focus();
});
