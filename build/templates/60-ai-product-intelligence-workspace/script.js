const generateBtn = document.getElementById("generate");

generateBtn.addEventListener("click", () => {
  generateBtn.textContent = "Insight generated ✓";

  setTimeout(() => {
    generateBtn.textContent = "Generate insight";
  }, 1500);
});

document.querySelectorAll(".insight").forEach(item => {
  item.addEventListener("click", () => {
    item.style.borderColor = "#2a8af0";

    setTimeout(() => {
      item.style.borderColor = "#20252c";
    }, 700);
  });
});