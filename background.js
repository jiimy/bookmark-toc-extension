// background.js

chrome.commands.onCommand.addListener((command) => {
  console.log("Command received: ", command);

  if (command === "saveDomPosition") {
    // F2 키로 DOM 위치 저장
    console.log("Saving DOM position...");
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      chrome.scripting.executeScript(
        {
          target: { tabId: tab.id },
          func: saveDomPosition, // DOM 위치를 저장하는 함수 호출
        },
        () => console.log("DOM position saved!")
      );
    });
  }

  if (command === "scrollToDomPosition") {
    // F3 키로 저장된 DOM 위치로 스크롤 이동
    console.log("Scrolling to saved DOM position...");
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      chrome.scripting.executeScript(
        {
          target: { tabId: tab.id },
          func: scrollToSavedDomPosition, // DOM 위치로 스크롤 이동하는 함수 호출
        },
        () => console.log("Scrolled to DOM position!")
      );
    });
  }
});

// DOM 위치 저장 함수
function saveDomPosition() {
  const url = window.location.href;
  const scrollTop = window.scrollY;
  const selector = document.querySelector(":hover"); // 현재 마우스가 올려진 요소를 선택

  chrome.storage.local.get(["domList"], function (result) {
    let domList = result.domList || [];
    domList.push({
      url,
      scrollTop,
      selector: selector ? selector.tagName : "",
    });
    chrome.storage.local.set({ domList });
  });
}

// DOM 위치로 스크롤 이동 함수
function scrollToSavedDomPosition() {
  chrome.storage.local.get(["domList"], function (result) {
    const domList = result.domList || [];
    const currentUrl = window.location.href;
    const dom = domList.find((item) => item.url === currentUrl);

    if (dom && dom.selector) {
      const element = document.querySelector(dom.selector);
      if (element) {
        element.scrollIntoView({ behavior: "smooth" });
        window.scrollTo(0, dom.scrollTop);
      }
    }
  });
}
