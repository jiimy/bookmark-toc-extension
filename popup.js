// popup.js
// 저장된 DOM 북마크 목록을 렌더링하고, 이동/설명편집/삭제를 처리합니다.

const listEl = document.getElementById("domList");
const emptyEl = document.getElementById("empty");
const pickBtn = document.getElementById("pick");

function loadList() {
  chrome.storage.local.get({ domList: [] }, (result) => {
    render(result.domList || []);
  });
}

function saveList(domList) {
  chrome.storage.local.set({ domList });
}

function render(domList) {
  listEl.innerHTML = "";
  emptyEl.hidden = domList.length > 0;

  domList.forEach((item) => {
    listEl.appendChild(createCard(item, domList));
  });
}

function createCard(item, domList) {
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
    saveList(domList);
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
    const next = domList.filter((it) => it.id !== item.id);
    saveList(next);
    render(next);
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

// "요소 선택" 버튼: 활성 탭의 콘텐츠 스크립트에 선택 모드를 요청합니다.
function activatePicker() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs[0];
    if (!tab) return;

    chrome.tabs.sendMessage(tab.id, { action: "startPicking" }, () => {
      if (chrome.runtime.lastError) {
        // 콘텐츠 스크립트가 아직 주입되지 않은 탭이면 주입 후 재시도
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

pickBtn.addEventListener("click", activatePicker);

// 팝업이 열려 있는 동안 저장 내용이 바뀌면 목록 갱신
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes.domList) {
    render(changes.domList.newValue || []);
  }
});

loadList();
