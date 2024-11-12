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

document.addEventListener("DOMContentLoaded", function () {
  document.getElementById("save").addEventListener("click", () => {
    alert("11");
    chrome.tabs.executeScript(
      null,
      {
        code: "alert('13');",
      },
      function () {
        // window.close();
        alert("12");
      }
    );

    let selectedElement = null;
    document.body.style.pointerEvents = "none";

    // 모든 DOM 요소에 마우스 올리기 이벤트 추가
    document.body.addEventListener("mouseover", (event) => {
      const targetElement = event.target;

      // 아웃라인 추가: 요소 위에 마우스가 있을 때
      targetElement.style.outline = "2px solid red";
    });

    // 마우스가 요소에서 떠날 때 아웃라인 제거
    document.body.addEventListener("mouseout", (event) => {
      const targetElement = event.target;

      // 마우스가 요소 밖으로 나가면 아웃라인 제거
      targetElement.style.outline = "";
    });

    // 클릭한 DOM의 스크롤 높이를 알기
    document.body.addEventListener("click", (event) => {
      const targetElement = event.target;

      // 클릭한 DOM의 scrollTop을 알기
      const scrollTop = targetElement.scrollTop;
      console.log(`Clicked element's scrollTop: ${scrollTop}`);

      // 스크롤 위치를 알 때 추가로 행동을 하거나, 다른 처리도 가능
    });
  });
});
