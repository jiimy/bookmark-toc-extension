// popup.js
const listEl = document.getElementById("domList");
const emptyEl = document.getElementById("empty");
const pickBtn = document.getElementById("pick");
const searchEl = document.getElementById("search");
const clearBtn = document.getElementById("clear");
const shortcutDisplay = document.getElementById("shortcutDisplay");
const changeShortcutBtn = document.getElementById("changeShortcut");
const pickKeyLabel = document.getElementById("pickKeyLabel");
const hintKey = document.getElementById("hintKey");

const DEFAULT_SHORTCUT = {
  key: "F2",
  code: "F2",
  ctrl: false,
  alt: false,
  shift: false,
  meta: false,
};

let allItems = [];
let capturing = false;

function sortNewestFirst(list) {
  return list.slice().sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
}

function loadList() {
  chrome.storage.local.get({ domList: [] }, (result) => {
    allItems = sortNewestFirst(result.domList || []);
    renderFiltered();
  });
}

function saveList(domList) {
  allItems = sortNewestFirst(domList);
  chrome.storage.local.set({ domList: allItems });
}

function renderFiltered() {
  const q = searchEl.value.trim().toLowerCase();
  const items = q ? allItems.filter((item) => matches(item, q)) : allItems;
  render(items);
}

function matches(item, q) {
  return [item.label, item.title, item.url, item.description]
    .filter(Boolean)
    .some((field) => field.toLowerCase().includes(q));
}

function render(items) {
  listEl.innerHTML = "";
  emptyEl.hidden = items.length > 0;
  if (items.length === 0) {
    emptyEl.textContent = allItems.length
      ? "검색 결과가 없습니다."
      : "저장된 북마크가 없습니다.";
  }

  items.forEach((item) => {
    listEl.appendChild(createCard(item));
  });
}

function createCard(item) {
  const li = document.createElement("li");
  li.className = "card";

  const label = document.createElement("div");
  label.className = "card-label";
  label.textContent = item.label || item.title || item.url;
  label.title = "클릭하면 해당 위치로 이동합니다";
  label.addEventListener("click", () => openBookmark(item));

  const url = document.createElement("div");
  url.className = "card-url";
  url.textContent = item.title || item.url;
  url.title = item.url;

  const desc = document.createElement("textarea");
  desc.className = "card-desc";
  desc.placeholder = "설명 추가...";
  desc.value = item.description || "";
  desc.addEventListener("change", () => {
    item.description = desc.value;
    saveList(allItems);
  });

  const actions = document.createElement("div");
  actions.className = "card-actions";

  const goBtn = document.createElement("button");
  goBtn.className = "action-btn go-btn";
  goBtn.textContent = "이동";
  goBtn.addEventListener("click", () => openBookmark(item));

  const deleteBtn = document.createElement("button");
  deleteBtn.className = "action-btn delete-btn";
  deleteBtn.textContent = "삭제";
  deleteBtn.addEventListener("click", () => {
    const next = allItems.filter((it) => it.id !== item.id);
    saveList(next);
    renderFiltered();
  });

  actions.appendChild(goBtn);
  actions.appendChild(deleteBtn);

  li.appendChild(label);
  li.appendChild(url);
  li.appendChild(desc);
  li.appendChild(actions);
  return li;
}

function openBookmark(item) {
  chrome.runtime.sendMessage({ action: "openBookmark", item });
  window.close();
}

function activatePicker() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs[0];
    if (!tab) return;

    chrome.tabs.sendMessage(tab.id, { action: "startPicking" }, () => {
      if (chrome.runtime.lastError) {
        chrome.scripting.executeScript(
          { target: { tabId: tab.id }, files: ["content.js"] },
          () => {
            chrome.tabs.sendMessage(tab.id, { action: "startPicking" }, () => {
              void chrome.runtime.lastError;
              window.close();
            });
          },
        );
      } else {
        window.close();
      }
    });
  });
}

function clearAll() {
  if (allItems.length === 0) return;
  if (!confirm("저장된 북마크를 모두 삭제할까요?")) return;
  saveList([]);
  renderFiltered();
}

// ---- 단축키 설정 ----
function codeLabel(code) {
  if (!code) return "";
  if (code.startsWith("Key")) return code.slice(3); // KeyF -> F
  if (code.startsWith("Digit")) return code.slice(5); // Digit1 -> 1
  if (code.startsWith("Numpad")) return "Num " + code.slice(6);
  const map = {
    Space: "Space",
    Escape: "Esc",
    ArrowUp: "↑",
    ArrowDown: "↓",
    ArrowLeft: "←",
    ArrowRight: "→",
    Comma: ",",
    Period: ".",
    Slash: "/",
    Backquote: "`",
    Minus: "-",
    Equal: "=",
    Semicolon: ";",
    Quote: "'",
    BracketLeft: "[",
    BracketRight: "]",
    Backslash: "\\",
  };
  return map[code] || code;
}

function formatShortcut(sc) {
  const parts = [];
  if (sc.ctrl) parts.push("Ctrl");
  if (sc.alt) parts.push("Alt");
  if (sc.shift) parts.push("Shift");
  if (sc.meta) parts.push("Meta");
  const main = sc.code
    ? codeLabel(sc.code)
    : sc.key.length === 1
      ? sc.key.toUpperCase()
      : sc.key;
  parts.push(main);
  return parts.join(" + ");
}

function applyShortcutLabel(sc) {
  const text = formatShortcut(sc);
  shortcutDisplay.textContent = text;
  pickKeyLabel.textContent = text;
  hintKey.textContent = text;
}

function loadShortcut() {
  chrome.storage.local.get({ pickShortcut: DEFAULT_SHORTCUT }, (result) => {
    applyShortcutLabel(result.pickShortcut || DEFAULT_SHORTCUT);
  });
}

function startCapture() {
  if (capturing) return;
  capturing = true;
  shortcutDisplay.textContent = "키 입력...";
  shortcutDisplay.classList.add("capturing");
  changeShortcutBtn.textContent = "취소";
  document.addEventListener("keydown", onCaptureKey, true);
}

function stopCapture() {
  capturing = false;
  shortcutDisplay.classList.remove("capturing");
  changeShortcutBtn.textContent = "변경";
  document.removeEventListener("keydown", onCaptureKey, true);
}

function onCaptureKey(event) {
  event.preventDefault();
  event.stopPropagation();

  // 수식 키(Ctrl/Alt/Shift/Meta)만 누른 경우는 조합 대기
  if (["Control", "Alt", "Shift", "Meta"].includes(event.key)) return;

  if (event.key === "Escape") {
    stopCapture();
    loadShortcut();
    return;
  }

  const sc = {
    key: event.key,
    code: event.code,
    ctrl: event.ctrlKey,
    alt: event.altKey,
    shift: event.shiftKey,
    meta: event.metaKey,
  };
  chrome.storage.local.set({ pickShortcut: sc });
  applyShortcutLabel(sc);
  stopCapture();
}

pickBtn.addEventListener("click", activatePicker);
clearBtn.addEventListener("click", clearAll);
searchEl.addEventListener("input", renderFiltered);
changeShortcutBtn.addEventListener("click", () => {
  if (capturing) {
    stopCapture();
    loadShortcut();
  } else {
    startCapture();
  }
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes.domList) {
    allItems = sortNewestFirst(changes.domList.newValue || []);
    renderFiltered();
  }
});

loadShortcut();
loadList();
