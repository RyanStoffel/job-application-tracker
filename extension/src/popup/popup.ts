// Popup UI: email/password login form when logged out, or the current
// user's info + logout button when logged in.
import { login, ApiError } from "../shared/api";
import { getStoredAuth, setStoredAuth, clearStoredAuth } from "../shared/storage";

const app = document.getElementById("app");

function clear(el: HTMLElement): void {
  el.innerHTML = "";
}

function renderLoggedIn(user: { displayName: string; email: string }): void {
  if (!app) return;
  clear(app);

  const heading = document.createElement("h1");
  heading.textContent = "Job Application Tracker";

  const userRow = document.createElement("div");
  userRow.className = "user-row";

  const name = document.createElement("div");
  name.className = "user-name";
  name.textContent = user.displayName || user.email;

  const email = document.createElement("div");
  email.className = "user-email";
  email.textContent = user.email;

  userRow.append(name, email);

  const logoutBtn = document.createElement("button");
  logoutBtn.className = "secondary";
  logoutBtn.textContent = "Log out";
  logoutBtn.addEventListener("click", async () => {
    await clearStoredAuth();
    renderLoggedOut();
  });

  app.append(heading, userRow, logoutBtn);
}

function renderLoggedOut(): void {
  if (!app) return;
  clear(app);

  const heading = document.createElement("h1");
  heading.textContent = "Log in";

  const form = document.createElement("form");

  const errorBox = document.createElement("div");
  errorBox.className = "error";
  errorBox.style.display = "none";

  const emailLabel = document.createElement("label");
  emailLabel.textContent = "Email";
  const emailInput = document.createElement("input");
  emailInput.type = "email";
  emailInput.required = true;
  emailInput.autocomplete = "username";

  const passwordLabel = document.createElement("label");
  passwordLabel.textContent = "Password";
  const passwordInput = document.createElement("input");
  passwordInput.type = "password";
  passwordInput.required = true;
  passwordInput.autocomplete = "current-password";

  const fieldError = document.createElement("div");
  fieldError.className = "field-error";
  fieldError.style.display = "none";

  const submitBtn = document.createElement("button");
  submitBtn.type = "submit";
  submitBtn.textContent = "Log in";

  form.append(
    errorBox,
    emailLabel,
    emailInput,
    passwordLabel,
    passwordInput,
    fieldError,
    submitBtn,
  );
  app.append(heading, form);

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    errorBox.style.display = "none";
    fieldError.style.display = "none";
    submitBtn.disabled = true;
    submitBtn.textContent = "Logging in…";

    try {
      const { user, token } = await login(emailInput.value, passwordInput.value);
      await setStoredAuth({ user, token });
      renderLoggedIn(user);
    } catch (err) {
      if (err instanceof ApiError) {
        errorBox.textContent = err.message;
        errorBox.style.display = "block";
        if (err.errors) {
          fieldError.textContent = Object.values(err.errors).join(" ");
          fieldError.style.display = "block";
        }
      } else {
        errorBox.textContent = "Couldn't reach the server. Is the API running?";
        errorBox.style.display = "block";
      }
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Log in";
    }
  });
}

async function init(): Promise<void> {
  const auth = await getStoredAuth();
  if (auth) {
    renderLoggedIn(auth.user);
  } else {
    renderLoggedOut();
  }
}

init();
