// Fester GitHub-Benutzername
const GITHUB_USERNAME = "Mkpb321";

const apiUrl = `https://api.github.com/users/${GITHUB_USERNAME}/repos?per_page=100&type=owner&sort=updated`;

const statusEl = document.getElementById("status");
const sitesListEl = document.getElementById("sitesList");
const searchInput = document.getElementById("searchInput");
const repoCountEl = document.getElementById("repoCount");

let allPagesRepos = [];

// Einfaches Default-Icon (SVG als Data-URL)
const DEFAULT_FAVICON =
  "data:image/svg+xml;utf8," +
  "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'>" +
  "<rect width='32' height='32' rx='6' fill='%23020617'/>" +
  "<circle cx='16' cy='16' r='9' fill='%236366f1'/></svg>";

// -------------------- Daten laden --------------------
async function fetchRepos() {
  try {
    statusEl.textContent = "Lädt…";

    const response = await fetch(apiUrl);

    if (!response.ok) {
      throw new Error(`GitHub API Fehler: ${response.status}`);
    }

    const repos = await response.json();

    const mainPagesRepoName = `${GITHUB_USERNAME.toLowerCase()}.github.io`;

    // Nur Repos mit GitHub Pages, ohne das Haupt-Repo
    const pagesRepos = repos.filter(
      (repo) =>
        repo.has_pages &&
        repo.name &&
        repo.name.toLowerCase() !== mainPagesRepoName
    );

    // 🔥 Alphabetisch sortieren
    pagesRepos.sort((a, b) => a.name.localeCompare(b.name));

    allPagesRepos = pagesRepos;

    if (pagesRepos.length === 0) {
      statusEl.className = "status status--info";
      statusEl.textContent = "Keine Seiten gefunden.";
      repoCountEl.textContent = "0";
      sitesListEl.innerHTML = "";
      return;
    }

    statusEl.style.display = "none";
    renderSites(pagesRepos);
  } catch (error) {
    console.error(error);
    statusEl.className = "status status--error";
    statusEl.textContent = "Fehler beim Laden.";
  }
}

// -------------------- Listeneintrag erstellen --------------------
function createSiteItem(repo) {
  const li = document.createElement("li");
  li.className = "site-item";

  const pagesUrl =
    repo.homepage && repo.homepage.trim().length > 0
      ? repo.homepage
      : `https://${GITHUB_USERNAME}.github.io/${repo.name}/`;

  const link = document.createElement("a");
  link.className = "site-link";
  link.href = pagesUrl;

  const iconWrapper = document.createElement("div");
  iconWrapper.className = "site-icon";

  const favicon = document.createElement("img");
  favicon.className = "site-favicon";
  favicon.alt = "";
  favicon.loading = "lazy";
  favicon.referrerPolicy = "no-referrer";

  const baseUrl = pagesUrl.replace(/\/$/, "");
  const primaryFavicon = baseUrl + "/favicon.ico";
  const secondaryFavicon = baseUrl + "/icon/favicon.ico";

  let triedSecondary = false;

  favicon.onerror = () => {
    if (!triedSecondary) {
      triedSecondary = true;
      favicon.src = secondaryFavicon;
    } else {
      favicon.onerror = null;
      favicon.src = DEFAULT_FAVICON;
    }
  };

  favicon.src = primaryFavicon;

  iconWrapper.appendChild(favicon);

  const content = document.createElement("div");
  content.className = "site-content";

  const title = document.createElement("div");
  title.className = "site-title";
  title.textContent = repo.name;

  const desc = document.createElement("div");
  desc.className = "site-desc";
  desc.textContent = repo.description || "Keine Beschreibung.";

  const meta = document.createElement("div");
  meta.className = "site-meta";

  const updated = document.createElement("span");
  const updatedDate = new Date(repo.updated_at);
  updated.textContent = updatedDate.toLocaleDateString();

  // GitHub-Projektordner-Link direkt nach dem Datum (ohne nested <a>)
  const githubLink = document.createElement("span");
  githubLink.className = "repo-link";
  githubLink.textContent = "GitHub";
  githubLink.title = "Projektordner auf GitHub öffnen";
  githubLink.setAttribute("role", "link");
  githubLink.tabIndex = 0;

  const githubUrl = repo.html_url;

  const openGithub = (event) => {
    event.preventDefault();
    event.stopPropagation();
    window.open(githubUrl, "_blank", "noopener");
  };

  githubLink.addEventListener("click", openGithub);
  githubLink.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      openGithub(event);
    }
  });

  const language = document.createElement("span");
  language.textContent = repo.language || "-";

  const stars = document.createElement("span");
  stars.textContent = `★ ${repo.stargazers_count}`;

  meta.appendChild(updated);
  meta.appendChild(githubLink);
  meta.appendChild(language);
  meta.appendChild(stars);

  content.appendChild(title);
  content.appendChild(desc);
  content.appendChild(meta);

  link.appendChild(iconWrapper);
  link.appendChild(content);

  li.appendChild(link);
  return li;
}

function renderSites(repos) {
  sitesListEl.innerHTML = "";
  repos.forEach((repo) => {
    const item = createSiteItem(repo);
    sitesListEl.appendChild(item);
  });

  repoCountEl.textContent = String(repos.length);
}

// -------------------- Suche / Filter --------------------
function setupSearch() {
  if (!searchInput) return;

  searchInput.addEventListener("input", () => {
    const query = searchInput.value.toLowerCase().trim();

    if (!query) {
      renderSites(allPagesRepos);
      statusEl.style.display = "none";
      return;
    }

    const filtered = allPagesRepos.filter((repo) => {
      const name = repo.name?.toLowerCase() || "";
      const description = repo.description?.toLowerCase() || "";
      return name.includes(query) || description.includes(query);
    });

    renderSites(filtered);

    if (filtered.length === 0) {
      statusEl.style.display = "block";
      statusEl.className = "status status--info";
      statusEl.textContent = "Keine Treffer.";
    } else {
      statusEl.style.display = "none";
    }
  });
}

// -------------------- Init --------------------
document.addEventListener("DOMContentLoaded", () => {
  setupSearch();
  fetchRepos();
});
// neuer code weil änderungen nicht angezeigt
