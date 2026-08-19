const timeEl = document.querySelector(".live");

function updateTime() {
  const now = new Date();
  const time = now.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });

  timeEl.innerHTML = `<span></span> LIVE • ${time}`;
}

updateTime();
setInterval(updateTime, 1000);

document.querySelectorAll(".machine").forEach(machine => {
  machine.addEventListener("click", () => {
    machine.style.borderLeft = "3px solid #f59e0b";
    machine.style.paddingLeft = "10px";
  });
});