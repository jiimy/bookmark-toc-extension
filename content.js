// content.js
// F2(또는 팝업의 "요소 선택" 버튼)로 요소 선택 모드에 진입합니다.
// 요소에 마우스를 올리면 하이라이트되고, 클릭하면 현재 URL/선택자/스크롤 위치를 저장합니다.

const HIGHLIGHT_STYLE = "2px solid #4f8cff";
const OVERLAY_ID = "__bookmark_toc_banner__";

let picking = false;
let hovered = null;
let hoveredPrevOutline = "";

function startPicking() {
  if (picking) return;
  picking = true;
  showBanner("요소를 클릭해 북마크에 저장하세요 · ESC 취소");
  document.addEventListener("mouseover", onMouseOver, true);
  document.addEventListener("mouseout", onMouseOut, true);
  document.addEventListener("click", onClick, true);
  document.addEventListener("keydown", onKeyDownWhilePicking, true);
}

function stopPicking() {
  if (!picking) return;
  picking = false;
  clearHover();
  document.removeEventListener("mouseover", onMouseOver, true);
  document.removeEventListener("mouseout", onMouseOut, true);
  document.removeEventListener("click", onClick, true);
  document.removeEventListener("keydown", onKeyDownWhilePicking, true);
  hideBanner();
}

function isOwnUi(el) {
  return el && el.id === OVERLAY_ID;
}

function onMouseOver(event) {
  const el = event.target;
  if (isOwnUi(el)) return;
  clearHover();
  hovered = el;
  hoveredPrevOutline = el.style.outline;
  el.style.outline = HIGHLIGHT_STYLE;
  el.style.outlineOffset = "-1px";
}

function onMouseOut() {
  clearHover();
}

function clearHover() {
  if (hovered) {
    hovered.style.outline = hoveredPrevOutline;
    hovered.style.outlineOffset = "";
    hovered = null;
    hoveredPrevOutline = "";
  }
}

function onClick(event) {
  const el = event.target;
  if (isOwnUi(el)) return;
  event.preventDefault();
  event.stopPropagation();
  saveTarget(el);
  stopPicking();
  showToast("북마크에 저장되었습니다");
}

function onKeyDownWhilePicking(event) {
  if (event.key === "Escape") {
    event.preventDefault();
    event.stopPropagation();
    stopPicking();
    showToast("취소되었습니다");
  }
}

function saveTarget(el) {
  const item = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    url: location.href,
    title: document.title || location.href,
    selector: getElementSelector(el),
    scrollTop: Math.round(window.scrollY),
    label: getLabel(el),
    description: "",
    createdAt: Date.now(),
  };

  chrome.storage.local.get({ domList: [] }, (result) => {
    const domList = result.domList || [];
    domList.push(item);
    chrome.storage.local.set({ domList });
  });
}

function getLabel(el) {
  const text = (el.textContent || "").replace(/\s+/g, " ").trim();
  if (text) return text.slice(0, 60);
  return `<${el.tagName.toLowerCase()}>`;
}

// 페이지 내에서 요소를 다시 찾기 위한 CSS 선택자 생성
function getElementSelector(element) {
  if (element.id) return `#${CSS.escape(element.id)}`;

  const path = [];
  let el = element;
  while (el && el.nodeType === Node.ELEMENT_NODE && el !== document.body) {
    let selector = el.nodeName.toLowerCase();
    if (el.id) {
      selector = `#${CSS.escape(el.id)}`;
      path.unshift(selector);
      return path.join(" > ");
    }
    const parent = el.parentNode;
    if (parent) {
      const siblings = Array.from(parent.children);
      const index = siblings.indexOf(el) + 1;
      selector += `:nth-child(${index})`;
    }
    path.unshift(selector);
    el = parent;
  }
  return path.length ? `body > ${path.join(" > ")}` : "body";
}

// ---- 안내 배너 / 토스트 (인라인 스타일로 페이지 CSS 영향 최소화) ----
function showBanner(text) {
  hideBanner();
  const banner = document.createElement("div");
  banner.id = OVERLAY_ID;
  banner.textContent = text;
  Object.assign(banner.style, {
    position: "fixed",
    top: "12px",
    left: "50%",
    transform: "translateX(-50%)",
    zIndex: "2147483647",
    background: "#1f2937",
    color: "#fff",
    padding: "8px 16px",
    borderRadius: "999px",
    fontSize: "13px",
    fontFamily: "system-ui, sans-serif",
    boxShadow: "0 4px 16px rgba(0,0,0,0.25)",
    pointerEvents: "none",
  });
  document.documentElement.appendChild(banner);
}

function hideBanner() {
  const banner = document.getElementById(OVERLAY_ID);
  if (banner) banner.remove();
}

function showToast(text) {
  const toast = document.createElement("div");
  toast.textContent = text;
  Object.assign(toast.style, {
    position: "fixed",
    bottom: "20px",
    left: "50%",
    transform: "translateX(-50%)",
    zIndex: "2147483647",
    background: "#10b981",
    color: "#fff",
    padding: "10px 18px",
    borderRadius: "8px",
    fontSize: "13px",
    fontFamily: "system-ui, sans-serif",
    boxShadow: "0 4px 16px rgba(0,0,0,0.25)",
    pointerEvents: "none",
    transition: "opacity 0.3s",
  });
  document.documentElement.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = "0";
    setTimeout(() => toast.remove(), 300);
  }, 1200);
}

// ---- 진입점 ----
document.addEventListener(
  "keydown",
  (event) => {
    if (event.key === "F2") {
      event.preventDefault();
      if (picking) stopPicking();
      else startPicking();
    }
  },
  true,
);

chrome.runtime.onMessage.addListener((message) => {
  if (message && message.action === "startPicking") {
    startPicking();
  }
});
