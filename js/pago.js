// js/pago.js

document.addEventListener("DOMContentLoaded", () => {
  const totalEl = document.getElementById("paymentTotal");
  const form = document.getElementById("paymentForm");
  const errorBox = document.getElementById("paymentError");

  if (!form || !totalEl) return;

  // Calcular total leyendo el carrito actual
  const cart = loadCart();
  let total = 0;
  cart.forEach((item) => {
    const qty = item.quantity || 1;
    const price = item.price || 0;
    total += qty * price;
  });
  totalEl.textContent = `${total.toFixed(2)} €`;

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    errorBox.textContent = "";

    const cardName = form.cardName.value.trim();
    const cardNumberRaw = form.cardNumber.value.replace(/\s+/g, "");
    const cardExpiry = form.cardExpiry.value.trim();
    const cardCvv = form.cardCvv.value.trim();

    const errors = [];

    if (!cardName) {
      errors.push("Introduce el nombre del titular de la tarjeta.");
    }

    // 16 dígitos exactos
    if (!/^\d{16}$/.test(cardNumberRaw)) {
      errors.push("El número de tarjeta debe tener exactamente 16 dígitos.");
    }

    // Caducidad MM/AA
    if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(cardExpiry)) {
      errors.push("La fecha de caducidad debe tener el formato MM/AA (por ejemplo 08/27).");
    }

    // CVV 3 dígitos
    if (!/^\d{3}$/.test(cardCvv)) {
      errors.push("El CVV debe tener 3 dígitos.");
    }

    if (errors.length > 0) {
      errorBox.innerHTML = errors.map((e) => `<p>${e}</p>`).join("");
      return;
    }

    // Simulación de pago correcto
    alert("Pago realizado correctamente. ¡Gracias por tu compra!");

    // Vaciar carrito
    saveCart([]);
    updateCartCount();

    // Ir a pantalla de confirmación
    window.location.href = "pago_finalizado.html";
  });
});
