const loadUsersButton = document.querySelector("#load-users");
const filterInput = document.querySelector("#filter-input");
const status = document.querySelector("#status");
const usersList = document.querySelector("#users-list");

let users = [];

function renderUsers(list) {
  usersList.replaceChildren();

  if (list.length === 0) {
    if (filterInput.value.trim() !== "") {
      status.textContent = "No users match your filter.";
    }
    return;
  }

  for (const user of list) {
    const userItem = document.createElement("li");
    const name = document.createElement("h2");
    const email = document.createElement("p");
    const city = document.createElement("p");
    const company = document.createElement("p");

    name.textContent = user.name;
    email.textContent = `Email: ${user.email}`;
    city.textContent = `City: ${user.address.city}`;
    company.textContent = `Company: ${user.company.name}`;

    userItem.append(name, email, city, company);
    usersList.append(userItem);
  }

  status.textContent = `Showing ${list.length} user${list.length === 1 ? "" : "s"}.`;
}

async function loadUsers() {
  loadUsersButton.disabled = true;
  status.textContent = "Loading users...";

  try {
    const response = await fetch("https://jsonplaceholder.typicode.com/users");

    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}.`);
    }

    users = await response.json();
    renderUsers(users);
  } catch (error) {
    status.textContent = "Unable to load users. Please try again.";
    console.error("Could not load users:", error);
  } finally {
    loadUsersButton.disabled = false;
  }
}

filterInput.addEventListener("input", () => {
  const searchTerm = filterInput.value.trim().toLowerCase();
  const filteredUsers = users.filter((user) =>
    user.name.toLowerCase().includes(searchTerm),
  );

  renderUsers(filteredUsers);
});

loadUsersButton.addEventListener("click", loadUsers);
