const variant = document.getElementById("variant");
const liveButton = document.getElementById("liveButton");
const themeBtn = document.getElementById("themeBtn");

variant.addEventListener("change", () => {
  liveButton.className = "btn " + variant.value;
});

themeBtn.addEventListener("click", () => {
  document.body.classList.toggle("preview-mode");
  themeBtn.textContent =
    document.body.classList.contains("preview-mode")
      ? "Exit preview"
      : "Preview";
});