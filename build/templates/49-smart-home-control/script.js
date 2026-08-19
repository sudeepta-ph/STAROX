const switches = document.querySelectorAll(".switch input");
const lightCount = document.getElementById("lightCount");

function updateLights() {
  let count = 0;

  switches.forEach((item) => {
    if (item.checked) count++;
  });

  lightCount.textContent = count + " On";
}

switches.forEach((item) => {
  item.addEventListener("change", updateLights);
});

updateLights();