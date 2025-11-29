// js/cart.js

document.addEventListener("DOMContentLoaded", () => {
  const cartItemsEl = document.getElementById("cartItems");
  const cartTotalEl = document.getElementById("cartTotal");
  const confirmBtn = document.getElementById("confirmOrderBtn");

  if (!cartItemsEl || !cartTotalEl || !confirmBtn) {
    return;
  }

  function renderCart() {
    const cart = loadCart();

    if (!cart || cart.length === 0) {
      cartItemsEl.innerHTML = "<p>Tu carrito está vacío.</p>";
      cartTotalEl.textContent = "0.00 €";
      confirmBtn.style.display = "none";
      return;
    }

    confirmBtn.style.display = "";

    let total = 0;

    const cardsHtml = cart
      .map((item, index) => {
        const qty = item.quantity || 1;
        const price = item.price || 0;
        const unit = item.unit || "unidad";
        const unitLabel =
          unit === "kg"
            ? "kg"
            : unit === "docena"
            ? "docena"
            : unit === "tarro"
            ? "tarro"
            : "unidad";

        const subtotal = price * qty;
        total += subtotal;

        const imgSrc =
          item.imageUrl && item.imageUrl.trim()
            ? item.imageUrl
            : "img/producto-generico.png";

        return `
        <article class="producto carrito__item">
          <img src="${imgSrc}" alt="${item.name}" />
          <h3>${item.name}</h3>
          <p>Cantidad: ${qty} ${unitLabel}</p>
          <p class="producto__precio">Subtotal: ${subtotal.toFixed(2)} €</p>
          <button class="btn btn--small btn--outline carrito__remove" data-index="${index}">
            Eliminar
          </button>
        </article>
      `;
      })
      .join("");

    cartItemsEl.innerHTML = `
      <div class="grid grid--productos">
        ${cardsHtml}
      </div>
    `;

    cartTotalEl.textContent = `${total.toFixed(2)} €`;

    // eventos eliminar
    cartItemsEl.querySelectorAll(".carrito__remove").forEach((btn) => {
      btn.addEventListener("click", () => {
        const idx = parseInt(btn.dataset.index, 10);
        if (Number.isNaN(idx)) return;

        const cart = loadCart();
        cart.splice(idx, 1);
        saveCart(cart);
        updateCartCount();
        renderCart();
      });
    });
  }

  renderCart();

  // 👉 ahora llevamos a la pasarela de pago
  confirmBtn.addEventListener("click", () => {
    window.location.href = "pago.html";
  });
});
