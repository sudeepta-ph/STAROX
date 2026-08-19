function updateClock(){
  const el=document.getElementById("clock");
  if(el) el.textContent=new Date().toLocaleTimeString([],{
    hour:"2-digit",minute:"2-digit",second:"2-digit"
  });
}

function refreshData(){
  const button=document.querySelector(".header-actions button");
  button.textContent="✓ Updated";
  setTimeout(()=>button.textContent="↻ Refresh",1200);
}

function showMessage(){
  alert("Staff roster is up to date. Coverage: 96%.");
}

updateClock();
setInterval(updateClock,1000);