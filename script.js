let modeText = document.getElementById("mode");

chrome.storage.sync.get("mode", ({ mode }) => {
  // changeColor.style.backgroundColor = color;
});

// window.addEventListener("keydown", (e) => console.log(e))


// TODO:  f2로 모드 토글 
window.addEventListener("keydown", async (e) => {
  console.log(e);
  let [tab] = await chrome.tabs.query({
    active: true, currentWindow: true
  });
  console.log('tab', tab);
  if (e == 'f2') {
    modeText.innerHTML('모드 on');
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: setPageBackgroundColor,
    });
  }
});

function setPageBackgroundColor() {
  console.log('발생');
  var Target = document.querySelector("body");

  Target.addEventListener('mouseover', function(event) {
    event.target.style.outline = '1px solid red';
  });
  Target.addEventListener('mouseout', function(event) {
    event.target.style.outline = '';
  });
}
function test () {
  console.log('test 함수');
}