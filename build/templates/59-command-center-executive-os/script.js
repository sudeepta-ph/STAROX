const cards = document.querySelectorAll(".card");

cards.forEach(card => {
  card.addEventListener("click", () => {
    card.style.borderColor = "#e5e7eb";

    setTimeout(() => {
      card.style.borderColor = "#292929";
    }, 800);
  });
});