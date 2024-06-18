import type {
  StateResponse,
  SignupBody,
} from "../rigsketball-signup-worker/src/api";
import { renderLoading, showLoading } from "./loading";

const getState = async (): Promise<StateResponse> => {
  const res = await fetch(API_URL + "/state");
  return await res.json();
};

window.addEventListener("load", async () => {
  let submitted = false;
  const loader = document.getElementById("loader") as HTMLDivElement;
  showLoading(loader, true);
  renderLoading(loader.querySelector("canvas") as HTMLCanvasElement);
  const nameField = document.getElementById("name") as HTMLInputElement;
  const emailField = document.getElementById("email") as HTMLInputElement;
  const phoneField = document.getElementById("phone") as HTMLInputElement;
  const datesContainer = document.getElementById("dates") as HTMLDivElement;
  const timesContainer = document.getElementById("times") as HTMLDivElement;
  const signupButton = document.getElementById("signup") as HTMLButtonElement;
  const error = document.getElementById("error") as HTMLDivElement;
  const success = document.getElementById("success") as HTMLDivElement;
  const full = document.getElementById("full") as HTMLDivElement;
  const secondRoundTime = document.getElementById(
    "second-round-time"
  ) as HTMLSpanElement;
  const thirdRoundTime = document.getElementById(
    "third-round-time"
  ) as HTMLSpanElement;
  const dates = datesContainer.querySelectorAll(
    "[data-date]"
  ) as NodeListOf<HTMLButtonElement>;
  const times = timesContainer.querySelectorAll(
    "[data-time]"
  ) as NodeListOf<HTMLButtonElement>;

  const state = await getState();

  const phoneNumber = () => {
    const entered = phoneField.value;
    const n = parseInt(entered.replace(/[^\d]+/g, ""), 10).toString();
    if (n.length >= 10) {
      return n;
    }
    return undefined;
  };

  const canSubmit = () => {
    const name = nameField.value;
    const email = emailField.value;
    return name && email && phoneNumber();
  };
  const setSubmitted = (s: boolean) => {
    submitted = s;
    nameField.toggleAttribute("disabled", submitted);
    emailField.toggleAttribute("disabled", submitted);
    phoneField.toggleAttribute("disabled", submitted);
  };

  const showError = (e: string) => {
    error.innerText = e;
    setSubmitted(false);
    error.classList.toggle("hidden", false);
  };
  const hideError = () => {
    error.classList.toggle("hidden", true);
  };
  const showSuccess = (e: string) => {
    success.innerText = e;
    success.classList.toggle("hidden", false);
    signupButton.classList.toggle("hidden", true);
  };

  let firstAvail = state.rounds.find((r) => !r.band1 || !r.band2);
  full.classList.toggle("hidden", !!firstAvail);
  document
    .querySelectorAll(".hide-when-full")
    .forEach((e) => e.classList.toggle("hidden", !firstAvail));
  if (!firstAvail) {
    return;
  }
  let selectedDate: HTMLButtonElement;
  let selectedTime: HTMLButtonElement;
  dates.forEach((d) => {
    if (d.dataset.date === firstAvail.date) {
      selectedDate = d;
    }
  });
  times.forEach((t, idx) => {
    if (t.dataset.time === firstAvail.time) {
      selectedTime = t;
    }
    const time = state.rounds[idx].time;
    t.dataset.time = time;
    t.innerText = time;
  });

  const update = () => {
    const fullTimes = new Set(
      state.rounds
        .filter(
          (r) => r.date === selectedDate!.dataset.date && r.band1 && r.band2
        )
        .map((r) => r.time)
    );
    console.log(state.rounds);
    console.log(fullTimes);
    dates.forEach((d) => {
      d.classList.toggle("bg-red", d == selectedDate);
      d.classList.toggle("text-white", d == selectedDate);
    });
    times.forEach((t) => {
      const disabled = fullTimes.has(t.dataset.time!);
      t.toggleAttribute("disabled", disabled);
      t.classList.toggle("bg-red", !disabled && t == selectedTime);
      t.classList.toggle("text-white", !disabled && t == selectedTime);
      t.classList.toggle("text-gray-400", disabled);
    });
    let selectedRound = state.rounds.find(
      (r) =>
        r.date == selectedDate!.dataset.date &&
        r.time == selectedTime!.dataset.time
    )!;
    if (!selectedRound) {
      alert(
        "Couldn't find selected round. Something might be wrong with this page..."
      );
      selectedRound = firstAvail;
    }
    const round2 = selectedRound.next;
    console.log("ROUND 2:", round2);
    secondRoundTime.innerText = round2!.time;
    const round3 = round2!.next;
    console.log("ROUND 3:", round2);
    thirdRoundTime.innerText = round3!.time;
    const disabled = !canSubmit();
    signupButton.classList.toggle("disabled", disabled);
    signupButton.classList.toggle("opacity-10", disabled);
  };
  update();

  nameField.addEventListener("input", () => {
    if (submitted) {
      return;
    }
    nameField.classList.toggle("ring-2", !nameField.value);
    update();
  });
  emailField.addEventListener("input", () => {
    if (submitted) {
      return;
    }
    emailField.classList.toggle("ring-2", !emailField.value);
    update();
  });
  phoneField.addEventListener("input", () => {
    if (submitted) {
      return;
    }
    phoneField.classList.toggle("ring-2", !phoneField.value);
    update();
  });

  datesContainer.addEventListener("click", (ev) => {
    if (submitted) {
      return;
    }
    const date = ev.target as HTMLButtonElement | undefined;
    if (date && date.dataset.date) {
      selectedDate = date;
      update();
    }
  });
  timesContainer.addEventListener("click", (ev) => {
    if (submitted) {
      return;
    }
    const time = ev.target as HTMLButtonElement | undefined;
    if (time && time.dataset.time) {
      selectedTime = time;
      update();
    }
  });
  timesContainer.addEventListener("click", (ev) => {
    if (submitted) {
      return;
    }
    const time = ev.target as HTMLButtonElement | undefined;
    if (time && time.dataset.time) {
      selectedTime = time;
      update();
    }
  });
  signupButton.addEventListener("click", async () => {
    if (submitted) {
      return;
    }
    setSubmitted(true);
    update();
    if (!canSubmit()) {
      return;
    }
    hideError();
    showLoading(loader, true);
    const signup: SignupBody = {
      name: nameField.value,
      email: emailField.value,
      phone: phoneNumber()!,
      date: selectedDate!.dataset.date!,
      time: selectedTime!.dataset.time!,
    };
    try {
      const r = await fetch(API_URL + "/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(signup),
      });
      showLoading(loader, false);
      if (!r.ok) {
        showError(await r.text());
      } else {
        showSuccess(
          "You're in! Copy these dates down and Bim will reach out with more details or any questions!"
        );
      }
    } catch (e) {
      showError(`SIGNUP FAILED: ${(e as Error)?.toString()}`);
    }
  });
  showLoading(loader, false);
});

if (DEV) {
  console.log("Dev Mode enabled");
  // ESBuild watch
  new EventSource("/esbuild").addEventListener("change", () =>
    location.reload()
  );
}
