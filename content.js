// content.js
// F2(또는 팝업의 "요소 선택" 버튼)로 요소 선택 모드에 진입합니다.
// 요소에 마우스를 올리면 하이라이트되고, 클릭하면 현재 URL/선택자/스크롤 위치를 저장합니다.

const HIGHLIGHT_STYLE = "2px solid #4f8cff";
const OVERLAY_ID = "__bookmark_toc_banner__";
const DEFAULT_SHORTCUT = {
  key: "F2",
  code: "F2",
  ctrl: false,
  alt: false,
  shift: false,
  meta: false,
};

let picking = false;
let hovered = null;
let hoveredPrevOutline = "";
let pickShortcut = DEFAULT_SHORTCUT;

// 확장 컨텍스트가 살아있는지 확인 (재로드 후 남은 orphan 스크립트 대비)
function extensionValid() {
  try {
    return Boolean(chrome.runtime && chrome.runtime.id && chrome.storage);
  } catch (e) {
    return false;
  }
}

function safeStorage() {
  return extensionValid() ? chrome.storage.local : null;
}

if (safeStorage()) {
  chrome.storage.local.get({ pickShortcut: DEFAULT_SHORTCUT }, (result) => {
    if (chrome.runtime.lastError) return;
    if (result.pickShortcut) pickShortcut = result.pickShortcut;
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && changes.pickShortcut) {
      pickShortcut = changes.pickShortcut.newValue || DEFAULT_SHORTCUT;
    }
  });
}

function matchesShortcut(event, sc) {
  if (!sc) return false;
  // code(물리 키) 우선 매칭, 없으면 legacy key 매칭
  const keyMatch = sc.code
    ? event.code === sc.code
    : sc.key && event.key.toLowerCase() === sc.key.toLowerCase();
  if (!keyMatch) return false;
  return (
    !!sc.ctrl === event.ctrlKey &&
    !!sc.alt === event.altKey &&
    !!sc.shift === event.shiftKey &&
    !!sc.meta === event.metaKey
  );
}

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

// style 속성을 가진 실제 요소인지 확인 (텍스트/특수 노드 방어)
function isStyleable(el) {
  return Boolean(el && el.nodeType === Node.ELEMENT_NODE && el.style);
}

function onMouseOver(event) {
  const el = event.target;
  if (isOwnUi(el) || !isStyleable(el)) return;
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
  if (hovered && isStyleable(hovered)) {
    hovered.style.outline = hoveredPrevOutline;
    hovered.style.outlineOffset = "";
  }
  hovered = null;
  hoveredPrevOutline = "";
}

function onClick(event) {
  const el = event.target;
  if (isOwnUi(el)) return;
  event.preventDefault();
  event.stopPropagation();
  saveTarget(el);
  stopPicking();
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
  const storage = safeStorage();
  if (!storage) {
    showToast("확장 재로드됨 · 페이지를 새로고침하세요");
    return;
  }

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

  storage.get({ domList: [] }, (result) => {
    if (chrome.runtime.lastError) {
      showToast("저장 실패 · 페이지를 새로고침하세요");
      return;
    }
    const domList = result.domList || [];
    domList.push(item);
    domList.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    storage.set({ domList }, () => {
      if (chrome.runtime.lastError) {
        showToast("저장 실패 · 페이지를 새로고침하세요");
        return;
      }
      showToast("북마크에 저장되었습니다");
    });
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
    if (matchesShortcut(event, pickShortcut)) {
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
