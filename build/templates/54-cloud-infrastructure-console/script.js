document.getElementById("refresh").addEventListener("click", function () {
  this.textContent = "✓ Updated";

  setTimeout(() => {
    this.textContent = "↻ Refresh";
  }, 1200);
});