document.addEventListener("DOMContentLoaded", () => {
  const summaryEl = document.getElementById("checkoutSummary");
  const finalizeBtn = document.getElementById("finalizeBtn");

  const checkout = JSON.parse(localStorage.getItem("ecoisla_checkout") || "{}");

  if (!checkout.cart || checkout.cart.length === 0) {
    summaryEl.innerHTML = "<p>No hay datos de pedido.</p>";
    return;
  }

  summaryEl.innerHTML = `
    <p><strong>Nombre:</strong> ${checkout.nombre}</p>
    <p><strong>Dirección:</strong> ${checkout.direccion}</p>
    <p><strong>Email:</strong> ${checkout.email}</p>
    <h3>Productos:</h3>
    <ul>${checkout.cart.map(item => `<li>${item.name}</li>`).join("")}</ul>
  `;

  finalizeBtn.addEventListener("click", () => {
    const key = getCartKeyForCurrentUser();
    if (key) localStorage.removeItem(key);
    localStorage.removeItem("ecoisla_checkout");

    window.location.href = "pago_finalizado.html";
  });
});
