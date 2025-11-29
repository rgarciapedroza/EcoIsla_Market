// cart.js
document.addEventListener("DOMContentLoaded", () => {
  const cartItemsEl = document.getElementById("cartItems");
  const form = document.getElementById("checkoutForm");

  const cart = loadCart(); 
  if (cart.length === 0) {
    cartItemsEl.innerHTML = "<p>Tu carrito está vacío.</p>";
  } else {
    cartItemsEl.innerHTML = `
      <ul>
        ${cart.map(item => `<li>${item.name}</li>`).join("")}
      </ul>
    `;
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const nombre = form.nombre.value.trim();
    const direccion = form.direccion.value.trim();
    const email = form.email.value.trim();

    if (!nombre || !direccion || !email) {
      alert("Por favor, completa todos los campos.");
      return;
    }

    localStorage.setItem("ecoisla_checkout", JSON.stringify({ nombre, direccion, email, cart }));

    window.location.href = "pago.html";
  });
});
