// background.js
// 팝업에서 북마크 항목을 클릭하면, 해당 URL로 이동한 뒤 저장된 위치로 스크롤합니다.

chrome.runtime.onMessage.addListener((message) => {
  if (message && message.action === "openBookmark" && message.item) {
    openBookmark(message.item);
  }
});

function stripHash(url) {
  return (url || "").split("#")[0];
}

function openBookmark(item) {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs[0];
    if (!tab) return;

    const sameUrl = tab.url && stripHash(tab.url) === stripHash(item.url);

    if (sameUrl) {
      runScroll(tab.id, item);
      return;
    }

    chrome.tabs.update(tab.id, { url: item.url }, () => {
      const listener = (updatedTabId, info) => {
        if (updatedTabId === tab.id && info.status === "complete") {
          chrome.tabs.onUpdated.removeListener(listener);
          runScroll(tab.id, item);
        }
      };
      chrome.tabs.onUpdated.addListener(listener);
    });
  });
}

function runScroll(tabId, item) {
  chrome.scripting.executeScript({
    target: { tabId },
    func: scrollToTarget,
    args: [item.selector, item.scrollTop],
  });
}

// 대상 탭에서 실행되는 함수 (동적 로딩 대비 재시도)
function scrollToTarget(selector, scrollTop) {
  let attempts = 0;
  const maxAttempts = 20;

  const tryScroll = () => {
    attempts += 1;
    let el = null;
    if (selector) {
      try {
        el = document.querySelector(selector);
      } catch (e) {
        el = null;
      }
    }

    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      const prev = el.style.outline;
      el.style.outline = "2px solid #ff5a5a";
      el.style.outlineOffset = "-1px";
      setTimeout(() => {
        el.style.outline = prev;
        el.style.outlineOffset = "";
      }, 1500);
      return;
    }

    if (attempts < maxAttempts) {
      setTimeout(tryScroll, 150);
    } else if (typeof scrollTop === "number") {
      window.scrollTo({ top: scrollTop, behavior: "smooth" });
    }
  };

  tryScroll();
}
