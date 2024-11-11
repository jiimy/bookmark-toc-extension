// 저장된 DOM 목록 불러오기
chrome.storage.local.get("domList", (result) => {
  const domList = result.domList || [];
  const ul = document.getElementById("domList");
  ul.innerHTML = ""; // 기존 항목 초기화

  domList.forEach((item, index) => {
    const li = document.createElement("li");
    li.textContent = `${item.url} - ${item.selector}`;
    const deleteButton = document.createElement("button");
    deleteButton.textContent = "Delete";
    deleteButton.onclick = () => {
      domList.splice(index, 1);
      chrome.storage.local.set({ domList });
      li.remove();
    };
    li.appendChild(deleteButton);
    ul.appendChild(li);
  });
});
