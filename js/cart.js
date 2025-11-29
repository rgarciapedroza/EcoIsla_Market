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
    <ul class="cart-list">
      ${cart.map(item => {
        const price = item.price || 0;
        const qty = item.quantity || 1;
        total += price * qty;
        const img = item.imageUrl || "img/producto-generico.png";
        return `
          <li class="cart-item">
            <img src="${img}" alt="${item.name}" class="cart-item__img"/>
            <span>${item.name}</span>
            <span>Cantidad: ${qty}</span>
            <span>Subtotal: ${(price * qty).toFixed(2)} €</span>
          </li>
        `;
      }).join("")}
    </ul>
  `;

  cartTotalEl.textContent = `${total.toFixed(2)} €`;

  confirmBtn.addEventListener("click", () => {
    alert("Pedido confirmado. ¡Gracias por tu compra!");
    window.location.href = "pago.html";
  });
});
