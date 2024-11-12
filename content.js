// content.js

document.getElementById("save").addEventListener("click", () => {
  alert('12');
  // let selectedElement = null;

  // // 클릭한 DOM을 저장
  // document.body.style.pointerEvents = "none";
  // document.body.addEventListener("click", (event) => {
  //   selectedElement = event.target;
  //   const selector = getElementSelector(selectedElement);
  //   const scrollTop = window.scrollY;

  //   // Background에 저장 요청
  //   chrome.runtime.sendMessage({
  //     action: "saveDomPosition",
  //     url: window.location.href,
  //     selector,
  //     scrollTop,
  //   });

  //   document.body.style.pointerEvents = ""; // 클릭 가능 상태 복구
  // });
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
