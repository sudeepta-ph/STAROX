const search = document.getElementById("search");
const items = document.querySelectorAll(".child");

search.addEventListener("input", () => {
  const value = search.value.toLowerCase();

  items.forEach(item => {
    item.style.display =
      item.textContent.toLowerCase().includes(value)
        ? "block"
        : "none";
  });
});

document.getElementById("refresh").addEventListener("click", function () {
  this.textContent = "✓";
  setTimeout(() => this.textContent = "↻", 1000);
});