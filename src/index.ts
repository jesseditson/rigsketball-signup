window.addEventListener("load", () => {
  const nameField = document.getElementById("name") as HTMLInputElement;
  const emailField = document.getElementById("email") as HTMLInputElement;
  const datesContainer = document.getElementById("dates") as HTMLDivElement;
  const timesContainer = document.getElementById("times") as HTMLDivElement;
  const dates = datesContainer.querySelectorAll("[data-date]");
  const times = timesContainer.querySelectorAll("[data-time]");

  nameField.addEventListener("input", () => {
    console.log(nameField.value);
    nameField.classList.toggle("ring-2", !nameField.value);
  });
  emailField.addEventListener("input", () => {
    emailField.classList.toggle("ring-2", !emailField.value);
  });

  datesContainer.addEventListener("click", (ev) => {
    const date = ev.target as HTMLButtonElement | undefined;
    if (date && date.dataset.date) {
      dates.forEach((d) => {
        d.classList.toggle("bg-red", d == date);
        d.classList.toggle("text-white", d == date);
      });
    }
  });
  timesContainer.addEventListener("click", (ev) => {
    const time = ev.target as HTMLButtonElement | undefined;
    if (time && time.dataset.time) {
      times.forEach((t) => {
        t.classList.toggle("bg-red", t == time);
        t.classList.toggle("text-white", t == time);
      });
    }
  });
});

if (DEV) {
  console.log("Dev Mode enabled");
  // ESBuild watch
  new EventSource("/esbuild").addEventListener("change", () =>
    location.reload()
  );
}
