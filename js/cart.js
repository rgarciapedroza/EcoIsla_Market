document.addEventListener("DOMContentLoaded", () => {
  const cartItemsEl = document.getElementById("cartItems");
  const cartTotalEl = document.getElementById("cartTotal");
  const confirmBtn = document.getElementById("confirmOrderBtn");

  const cart = loadCart();

  if (cart.length === 0) {
    cartItemsEl.innerHTML = "<p>Tu carrito está vacío.</p>";
    cartTotalEl.textContent = "0 €";
    confirmBtn.style.display = "none";
    return;
  }

  let total = 0;
  cartItemsEl.innerHTML = `
  <div class="grid grid--productos">
    ${cart.map(item => {
      const qty = item.quantity || 1;
      const price = item.price || 0;
      const subtotal = price * qty;
      return `
        <article class="producto">
          <img src="${item.imageUrl}" alt="${item.name}" />
          <h3>${item.name}</h3>
          <p>Cantidad: ${qty}</p>
          <p class="producto__precio">Subtotal: ${subtotal.toFixed(2)} €</p>
        </article>
      `;
    }).join("")}
  </div>
`;


  cartTotalEl.textContent = `${total.toFixed(2)} €`;

  confirmBtn.addEventListener("click", () => {
    alert("Pedido confirmado. ¡Gracias por tu compra!");
    window.location.href = "pago.html";
  });
});
