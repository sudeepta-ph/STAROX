const rangeButtons = document.querySelectorAll(".range-buttons button");

rangeButtons.forEach(button => {
  button.addEventListener("click", () => {
    rangeButtons.forEach(btn => btn.classList.remove("active"));
    button.classList.add("active");
  });
});

const filters = document.querySelectorAll(".filter");

filters.forEach(filter => {
  filter.addEventListener("click", () => {
    filters.forEach(item => item.classList.remove("active"));
    filter.classList.add("active");
  });
});

const alerts = document.querySelectorAll(".alert");

alerts.forEach(alert => {
  alert.addEventListener("click", () => {
    alert.style.opacity = "0.65";

    setTimeout(() => {
      alert.style.opacity = "1";
    }, 250);
  });
});

const statusDot = document.querySelector(".status-dot");

setInterval(() => {
  statusDot.style.opacity = statusDot.style.opacity === "0.35" ? "1" : "0.35";
}, 900);