// content.js

document.addEventListener("keydown", (e) => {
  // F2: DOM 선택 및 저장
  // if (e.key === "Ctrl+Shift+A") {
  if (keys[16] && keys[17] && keys[49]) {
    let selectedElement = null;

    // 클릭한 DOM을 저장
    document.body.style.pointerEvents = "none";
    document.body.addEventListener("click", (event) => {
      selectedElement = event.target;
      const selector = getElementSelector(selectedElement);
      const scrollTop = window.scrollY;

      // Background에 저장 요청
      chrome.runtime.sendMessage({
        action: "saveDomPosition",
        url: window.location.href,
        selector,
        scrollTop,
      });

      document.body.style.pointerEvents = ""; // 클릭 가능 상태 복구
    });
  }

  // F3: 저장된 DOM 위치로 스크롤 이동
  // if (e.key === "Ctrl+Shift+S") {
  if (keys[16] && keys[17] && keys[50]) {
    chrome.runtime.sendMessage(
      { action: "scrollToDomPosition", url: window.location.href },
      (response) => {
        if (response.success) {
          const element = document.querySelector(response.selector);
          if (element) {
            element.scrollIntoView({ behavior: "smooth" });
            window.scrollTo(0, response.scrollTop);
          }
        }
      }
    );
  }
});

// 유니크한 선택자 가져오는 함수
function getElementSelector(element) {
  const path = [];
  while (element.nodeType === Node.ELEMENT_NODE) {
    let selector = element.nodeName.toLowerCase();
    if (element.id) {
      selector += `#${element.id}`;
      break;
    } else {
      const siblings = Array.from(element.parentNode.children);
      const index = siblings.indexOf(element) + 1;
      selector += `:nth-child(${index})`;
    }
    path.unshift(selector);
    element = element.parentNode;
  }
  return path.join(" > ");
}
