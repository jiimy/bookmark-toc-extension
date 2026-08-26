// background.js
// 팝업에서 북마크 항목을 클릭하면, 새 탭으로 연 뒤 저장된 위치로 스크롤합니다.

chrome.runtime.onMessage.addListener((message) => {
  if (message && message.action === "openBookmark" && message.item) {
    openBookmark(message.item);
  }
});

function openBookmark(item) {
  chrome.tabs.create({ url: item.url, active: true }, (tab) => {
    if (!tab?.id) return;

    const tabId = tab.id;
    const listener = (updatedTabId, info) => {
      if (updatedTabId === tabId && info.status === "complete") {
        chrome.tabs.onUpdated.removeListener(listener);
        runScroll(tabId, item);
      }
    };
    chrome.tabs.onUpdated.addListener(listener);
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
