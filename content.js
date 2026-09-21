// Content script for Toggl YouTrack Extension Fixer
// Finds elements with class starting with "idLink__" and adds "idLink__ee62" class

function addIdLinkClass() {
  // Find all elements with class starting with "idLink__"
  const elements = document.querySelectorAll('[class^="idLink__"]');

  // Add the "idLink__ee62" class to each found element
  elements.forEach(element => {
    if (!element.classList.contains('idLink__ee62')) {
      element.classList.add('idLink__ee62');
      console.log('Added idLink__ee62 class to element:', element);
    }
  });

  console.log(`Processed ${elements.length} idLink elements`);
}

// Run immediately when script loads
addIdLinkClass();

// Also run when DOM changes (for dynamically loaded content)
const observer = new MutationObserver((mutations) => {
  let shouldProcess = false;

  mutations.forEach((mutation) => {
    if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
      // Check if any added nodes contain idLink elements
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          if (node.matches && node.matches('[class^="idLink__"]')) {
            shouldProcess = true;
          } else if (node.querySelector && node.querySelector('[class^="idLink__"]')) {
            shouldProcess = true;
          }
        }
      });
    }
  });

  if (shouldProcess) {
    addIdLinkClass();
  }
});

// Start observing DOM changes
observer.observe(document.body, {
  childList: true,
  subtree: true
});

console.log('Toggl YouTrack Extension Fixer loaded and monitoring for idLink elements');
// --- Sprint prev/next arrows on agile boards -------------------------------

const sprintCache = {}; // boardId -> Promise<{ currentSprint, sprints }>
let lastSprintUrl = '';
let rendering = false;
const TOKEN_KEY = 'tyf-youtrack-token';

function parseAgileUrl() {
  const m = location.pathname.match(/^\/agiles\/([\w-]+)(?:\/([\w-]+))?/);
  return m ? { boardId: m[1], sprintId: m[2] } : null;
}

function loadBoard(boardId) {
  sprintCache[boardId] ??= (async () => {
    const url = `/api/agiles/${boardId}?fields=currentSprint(id),sprints(id,name,start)`;
    // /api needs a bearer token (Hub auth, cookies are not accepted); ask once, keep in localStorage
    let token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      token = prompt('Toggl YouTrack Fixer: paste a YouTrack permanent token (Profile > Account Security > New token)');
      if (!token) throw new Error('no token');
      localStorage.setItem(TOKEN_KEY, token.trim());
    }
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token.trim()}` } });
    if (res.status === 401) localStorage.removeItem(TOKEN_KEY);
    if (!res.ok) throw new Error(`YouTrack API ${res.status} for ${url}`);
    const board = await res.json();
    // ponytail: sort by start date, undated sprints last; API order isn't documented
    board.sprints.sort((a, b) => (a.start ?? Infinity) - (b.start ?? Infinity));
    return board;
  })().catch(err => { delete sprintCache[boardId]; throw err; });
  return sprintCache[boardId];
}

function makeArrow(id, label, boardId, target) {
  const btn = document.createElement('button');
  btn.id = id;
  btn.className = 'tyf-sprint-arrow';
  btn.textContent = label;
  btn.title = target ? target.name : '';
  btn.disabled = !target;
  btn.style.cssText = 'margin:0 4px;cursor:pointer;background:none;border:none;color:inherit;font-size:18px;line-height:1';
  btn.onclick = () => location.assign(`/agiles/${boardId}/${target.id}`);
  return btn;
}

async function renderSprintArrows() {
  const agile = parseAgileUrl();
  const removeExisting = () => document.querySelectorAll('.tyf-sprint-arrow').forEach(el => el.remove());
  if (!agile) {
    removeExisting();
    return;
  }
  const board = await loadBoard(agile.boardId);
  const sprintId = agile.sprintId || board.currentSprint?.id;
  const idx = board.sprints.findIndex(s => s.id === sprintId);
  if (idx === -1) return;

  const anchor = document.querySelector('button.yt-agile-board__toolbar__sprint');
  if (!anchor) return; // toolbar not rendered yet, the interval retries
  removeExisting();
  anchor.before(makeArrow('tyf-sprint-prev', '‹', agile.boardId, board.sprints[idx - 1]));
  anchor.after(makeArrow('tyf-sprint-next', '›', agile.boardId, board.sprints[idx + 1]));
}

// YouTrack is an SPA and re-renders the toolbar; re-render on URL change or when arrows vanish
setInterval(() => {
  if (rendering) return;
  if (location.href !== lastSprintUrl || !document.getElementById('tyf-sprint-prev')) {
    lastSprintUrl = location.href;
    rendering = true;
    renderSprintArrows()
      .catch(err => console.warn('Sprint arrows:', err))
      .finally(() => { rendering = false; });
  }
}, 500);
