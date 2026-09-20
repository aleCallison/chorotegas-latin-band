(() => {
  const mascot = document.getElementById("hero-mascot");
  const bubble = document.getElementById("mascot-pop-message");
  const live = document.getElementById("mascot-live-message");

  if (!mascot || !bubble || !live) return;

  const messages = [
    "¡Hola! 👋 Bienvenido a Chorotegas.",
    "¡Somos arte, somos cultura! 🎶",
    "¡Qué alegría verte por aquí! 💚",
    "¡Nos vemos en el próximo ensayo! 🥁"
  ];

  let messageIndex = 0;
  let hideTimer = null;
  let animationTimer = null;

  function greet() {
    const message = messages[messageIndex];
    messageIndex = (messageIndex + 1) % messages.length;

    bubble.textContent = message;
    bubble.setAttribute("aria-hidden", "false");
    bubble.classList.add("is-visible");
    live.textContent = message;

    mascot.classList.remove("is-greeting");
    void mascot.offsetWidth;
    mascot.classList.add("is-greeting");

    clearTimeout(hideTimer);
    clearTimeout(animationTimer);

    animationTimer = setTimeout(() => {
      mascot.classList.remove("is-greeting");
    }, 850);

    hideTimer = setTimeout(() => {
      bubble.classList.remove("is-visible");
      bubble.setAttribute("aria-hidden", "true");
    }, 3600);
  }

  mascot.addEventListener("click", greet);

  // En computadoras también responde al pasar el mouse,
  // pero solo una vez hasta que el cursor salga.
  let hoverReady = true;

  mascot.addEventListener("mouseenter", () => {
    if (!hoverReady || window.matchMedia("(hover: none)").matches) return;
    hoverReady = false;
    greet();
  });

  mascot.addEventListener("mouseleave", () => {
    hoverReady = true;
  });
})();
