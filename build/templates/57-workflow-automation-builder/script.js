const runBtn = document.getElementById("run");
const saveBtn = document.getElementById("save");

runBtn.addEventListener("click", () => {
  runBtn.textContent = "✓ Running...";
  setTimeout(() => {
    runBtn.textContent = "✓ Completed";
    setTimeout(() => runBtn.textContent = "▶ Run workflow", 1200);
  }, 900);
});

saveBtn.addEventListener("click", () => {
  saveBtn.textContent = "✓ Saved";
  setTimeout(() => saveBtn.textContent = "Save changes", 1200);
});