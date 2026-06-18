// Fester GitHub-Benutzername
const GITHUB_USERNAME = "Mkpb321";

// Hinweis: Sortierung erfolgt clientseitig, damit wir flexibel umschalten können.
const apiUrl = `https://api.github.com/users/${GITHUB_USERNAME}/repos?per_page=100&type=owner`;

const statusEl = document.getElementById("status");
const sitesListEl = document.getElementById("sitesList");
const searchInput = document.getElementById("searchInput");
const repoCountEl = document.getElementById("repoCount");
const sortToggleEl = document.getElementById("sortToggle");
const viewToggleEl = document.getElementById("viewToggle");

let allTools = [];

// LocalStorage Keys
const STORAGE_SORT_KEY = "tb_sort_mode"; // "created" | "updated" | "alpha"
const STORAGE_VIEW_KEY = "tb_view_mode"; // "list" | "tiles"

const SORT_CREATED = "created";
const SORT_UPDATED = "updated";
const SORT_ALPHA = "alpha";

const VIEW_LIST = "list";
const VIEW_TILES = "tiles";

const TOOL_TYPE_GITHUB = "github";
const TOOL_TYPE_EXTERNAL = "external";

function safeGetStorage(key) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSetStorage(key, value) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // ignore (private mode / disabled storage)
  }
}

function getSortMode() {
  const stored = safeGetStorage(STORAGE_SORT_KEY);
  if (stored === SORT_ALPHA) return SORT_ALPHA;
  if (stored === SORT_UPDATED) return SORT_UPDATED;
  return SORT_CREATED; // default
}

function getViewMode() {
  const stored = safeGetStorage(STORAGE_VIEW_KEY);
  return stored === VIEW_TILES ? VIEW_TILES : VIEW_LIST;
}

function setSortMode(mode) {
  safeSetStorage(STORAGE_SORT_KEY, mode);
}

function setViewMode(mode) {
  safeSetStorage(STORAGE_VIEW_KEY, mode);
}

function updateToggleLabels() {
  const sortMode = getSortMode();
  if (sortToggleEl) {
    if (sortMode === SORT_ALPHA) sortToggleEl.textContent = "Sort: A–Z";
    else if (sortMode === SORT_UPDATED) sortToggleEl.textContent = "Sort: Aktualisiert";
    else sortToggleEl.textContent = "Sort: Erstellt";

    // aria-pressed als "nicht-default" (alles außer 'created')
    sortToggleEl.setAttribute("aria-pressed", String(sortMode !== SORT_CREATED));
  }

  const viewMode = getViewMode();
  if (viewToggleEl) {
    viewToggleEl.textContent =
      viewMode === VIEW_TILES ? "Ansicht: Kacheln" : "Ansicht: Liste";
    viewToggleEl.setAttribute("aria-pressed", String(viewMode === VIEW_TILES));
  }
}

function applyViewMode() {
  const viewMode = getViewMode();
  sitesListEl.classList.toggle("sites-list--tiles", viewMode === VIEW_TILES);
}

// Einfaches Default-Icon (SVG als Data-URL)
const DEFAULT_FAVICON =
  "data:image/svg+xml;utf8," +
  "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'>" +
  "<rect width='32' height='32' rx='6' fill='%23020617'/>" +
  "<circle cx='16' cy='16' r='9' fill='%236366f1'/></svg>";

function toTimestamp(value) {
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : 0;
}

function trimTrailingSlash(value) {
  return String(value || "").replace(/\/$/, "");
}

function normalizeGithubRepo(repo) {
  const pagesUrl =
    repo.homepage && repo.homepage.trim().length > 0
      ? repo.homepage
      : `https://${GITHUB_USERNAME}.github.io/${repo.name}/`;

  return {
    id: `github-${repo.id || repo.name}`,
    type: TOOL_TYPE_GITHUB,
    name: repo.name,
    description: repo.description || "Keine Beschreibung.",
    url: pagesUrl,
    createdAt: repo.created_at,
    updatedAt: repo.updated_at,
    sourceLabel: "GitHub Pages",
    repoUrl: repo.html_url,
    language: repo.language || "-",
    stars: Number.isFinite(repo.stargazers_count) ? repo.stargazers_count : 0,
    iconCandidates: [
      `${trimTrailingSlash(pagesUrl)}/favicon.ico`,
      `${trimTrailingSlash(pagesUrl)}/icon/favicon.ico`
    ].filter(Boolean),
    searchableText: [repo.name, repo.description, "GitHub Pages", repo.language]
      .filter(Boolean)
      .join(" ")
  };
}

function normalizeExternalTool(tool, index) {
  const url = tool.url || "";
  const iconCandidates = [
    tool.iconUrl,
    `${trimTrailingSlash(url)}/favicon.ico`,
    `${trimTrailingSlash(url)}/icon/favicon.ico`
  ].filter(Boolean);

  const name = tool.name || `Externes Tool ${index + 1}`;
  const description = tool.description || "Extern gehostetes Tool.";
  const sourceLabel = tool.hostLabel || "Extern";

  return {
    id: `external-${tool.id || index}`,
    type: TOOL_TYPE_EXTERNAL,
    name,
    description,
    url,
    createdAt: tool.createdAt || tool.created_at || tool.updatedAt || tool.updated_at || "",
    updatedAt: tool.updatedAt || tool.updated_at || tool.createdAt || tool.created_at || "",
    sourceLabel,
    repoUrl: "",
    language: sourceLabel,
    stars: null,
    iconCandidates,
    searchableText: [
      name,
      description,
      sourceLabel,
      ...(Array.isArray(tool.searchTerms) ? tool.searchTerms : [])
    ]
      .filter(Boolean)
      .join(" ")
  };
}

function getExternalTools() {
  const configuredTools = Array.isArray(window.TOOLBOX_EXTERNAL_TOOLS)
    ? window.TOOLBOX_EXTERNAL_TOOLS
    : [];

  return configuredTools
    .filter((tool) => tool && tool.url)
    .map((tool, index) => normalizeExternalTool(tool, index));
}

// -------------------- Sortieren / Filtern --------------------
function sortTools(tools, sortMode) {
  const sorted = [...tools];

  if (sortMode === SORT_ALPHA) {
    sorted.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    return sorted;
  }

  if (sortMode === SORT_UPDATED) {
    // updatedAt (neueste zuerst)
    sorted.sort((a, b) => toTimestamp(b.updatedAt) - toTimestamp(a.updatedAt));
    return sorted;
  }

  // Default: createdAt (neueste zuerst)
  sorted.sort((a, b) => toTimestamp(b.createdAt) - toTimestamp(a.createdAt));

  return sorted;
}

function getFilteredTools() {
  const query = searchInput?.value?.toLowerCase().trim() || "";
  if (!query) return allTools;

  return allTools.filter((tool) => {
    const searchableText = tool.searchableText?.toLowerCase() || "";
    return searchableText.includes(query);
  });
}

function renderCurrent() {
  const filtered = getFilteredTools();
  const sorted = sortTools(filtered, getSortMode());

  renderSites(sorted);

  if (searchInput?.value?.toLowerCase().trim()) {
    if (sorted.length === 0) {
      statusEl.style.display = "block";
      statusEl.className = "status status--info";
      statusEl.textContent = "Keine Treffer.";
    } else {
      statusEl.style.display = "none";
    }
  }
}

// -------------------- Daten laden --------------------
async function fetchRepos() {
  const externalTools = getExternalTools();

  try {
    statusEl.style.display = "block";
    statusEl.className = "status status--info";
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

    const githubTools = pagesRepos.map(normalizeGithubRepo);
    allTools = [...githubTools, ...externalTools];

    if (allTools.length === 0) {
      statusEl.className = "status status--info";
      statusEl.textContent = "Keine Tools gefunden.";
      repoCountEl.textContent = "0 Tools";
      sitesListEl.innerHTML = "";
      return;
    }

    statusEl.style.display = "none";
    renderCurrent();
  } catch (error) {
    console.error(error);

    allTools = externalTools;

    if (allTools.length > 0) {
      renderCurrent();
      statusEl.style.display = "block";
      statusEl.className = "status status--info";
      statusEl.textContent = "GitHub konnte nicht geladen werden. Externe Tools werden angezeigt.";
      return;
    }

    statusEl.className = "status status--error";
    statusEl.textContent = "Fehler beim Laden.";
    repoCountEl.textContent = "0 Tools";
    sitesListEl.innerHTML = "";
  }
}

// -------------------- Listeneintrag erstellen --------------------
function applyFaviconFallback(favicon, iconCandidates) {
  const candidates = [...iconCandidates, DEFAULT_FAVICON];
  let currentIndex = 0;

  favicon.onerror = () => {
    currentIndex += 1;
    favicon.src = candidates[currentIndex] || DEFAULT_FAVICON;

    if (favicon.src === DEFAULT_FAVICON) {
      favicon.onerror = null;
    }
  };

  favicon.src = candidates[currentIndex] || DEFAULT_FAVICON;
}

function createMetaLink(label, title, url) {
  const metaLink = document.createElement("span");
  metaLink.className = "repo-link";
  metaLink.textContent = label;
  metaLink.title = title;
  metaLink.setAttribute("role", "link");
  metaLink.tabIndex = 0;

  const openLink = (event) => {
    event.preventDefault();
    event.stopPropagation();
    window.open(url, "_blank", "noopener");
  };

  metaLink.addEventListener("click", openLink);
  metaLink.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      openLink(event);
    }
  });

  return metaLink;
}

function createSiteItem(tool) {
  const li = document.createElement("li");
  li.className = `site-item site-item--${tool.type}`;

  const link = document.createElement("a");
  link.className = "site-link";
  link.href = tool.url;

  const iconWrapper = document.createElement("div");
  iconWrapper.className = "site-icon";

  const favicon = document.createElement("img");
  favicon.className = "site-favicon";
  favicon.alt = "";
  favicon.loading = "lazy";
  favicon.referrerPolicy = "no-referrer";

  applyFaviconFallback(favicon, tool.iconCandidates || []);

  iconWrapper.appendChild(favicon);

  const content = document.createElement("div");
  content.className = "site-content";

  const title = document.createElement("div");
  title.className = "site-title";
  title.textContent = tool.name;

  const desc = document.createElement("div");
  desc.className = "site-desc";
  desc.textContent = tool.description;

  const meta = document.createElement("div");
  meta.className = "site-meta";

  const updated = document.createElement("span");
  const updatedTimestamp = toTimestamp(tool.updatedAt);
  updated.textContent = updatedTimestamp
    ? new Date(updatedTimestamp).toLocaleDateString()
    : "Ohne Datum";

  const source = document.createElement("span");
  source.className = "source-badge";
  source.textContent = tool.sourceLabel;

  meta.appendChild(updated);
  meta.appendChild(source);

  if (tool.type === TOOL_TYPE_GITHUB && tool.repoUrl) {
    meta.appendChild(
      createMetaLink("GitHub", "Projektordner auf GitHub öffnen", tool.repoUrl)
    );
  }

  const language = document.createElement("span");
  language.textContent = tool.language || "-";
  meta.appendChild(language);

  if (tool.type === TOOL_TYPE_GITHUB) {
    const stars = document.createElement("span");
    stars.textContent = `★ ${tool.stars}`;
    meta.appendChild(stars);
  }

  content.appendChild(title);
  content.appendChild(desc);
  content.appendChild(meta);

  link.appendChild(iconWrapper);
  link.appendChild(content);

  li.appendChild(link);
  return li;
}

function renderSites(tools) {
  sitesListEl.innerHTML = "";
  tools.forEach((tool) => {
    const item = createSiteItem(tool);
    sitesListEl.appendChild(item);
  });

  repoCountEl.textContent = `${tools.length} Tools`;
}

// -------------------- Suche / Filter --------------------
function setupSearch() {
  if (!searchInput) return;

  searchInput.addEventListener("input", () => {
    renderCurrent();
  });
}

function setupToggles() {
  if (sortToggleEl) {
    sortToggleEl.addEventListener("click", () => {
      // Zyklus: created -> updated -> alpha -> created
      const current = getSortMode();
      let next = SORT_CREATED;
      if (current === SORT_CREATED) next = SORT_UPDATED;
      else if (current === SORT_UPDATED) next = SORT_ALPHA;
      else next = SORT_CREATED;

      setSortMode(next);
      updateToggleLabels();
      renderCurrent();
    });
  }

  if (viewToggleEl) {
    viewToggleEl.addEventListener("click", () => {
      const next = getViewMode() === VIEW_LIST ? VIEW_TILES : VIEW_LIST;
      setViewMode(next);
      updateToggleLabels();
      applyViewMode();
      // Kein erneutes Render nötig, CSS übernimmt die Ansicht
    });
  }
}

// -------------------- Init --------------------
document.addEventListener("DOMContentLoaded", () => {
  // Default: Liste + erstellt (falls noch nichts gespeichert ist)
  updateToggleLabels();
  applyViewMode();

  setupSearch();
  setupToggles();
  fetchRepos();
});
