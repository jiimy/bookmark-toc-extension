// popup.js
const listEl = document.getElementById("domList");
const emptyEl = document.getElementById("empty");
const pickBtn = document.getElementById("pick");
const searchEl = document.getElementById("search");
const clearBtn = document.getElementById("clear");

let allItems = [];

function loadList() {
  chrome.storage.local.get({ domList: [] }, (result) => {
    allItems = result.domList || [];
    renderFiltered();
  });
}

function saveList(domList) {
  allItems = domList;
  chrome.storage.local.set({ domList });
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

pickBtn.addEventListener("click", activatePicker);
clearBtn.addEventListener("click", clearAll);
searchEl.addEventListener("input", renderFiltered);

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes.domList) {
    allItems = changes.domList.newValue || [];
    renderFiltered();
  }
});

loadList();
