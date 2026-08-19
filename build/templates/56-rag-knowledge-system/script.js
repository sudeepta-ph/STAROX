const search = document.getElementById("search");
const items = document.querySelectorAll(".source, .chunk");

search.addEventListener("input", () => {
  const value = search.value.toLowerCase();

  items.forEach(item => {
    item.style.display =
      item.textContent.toLowerCase().includes(value)
        ? ""
        : "none";
  });
});

document.getElementById("ask").addEventListener("click", function () {
  this.textContent = "Searching...";
  setTimeout(() => {
    this.textContent = "Ask";
  }, 1000);
});

document.getElementById("refresh").addEventListener("click", function () {
  this.textContent = "✓ Updated";
  setTimeout(() => {
    this.textContent = "↻ Refresh";
  }, 1200);
});