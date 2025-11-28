// main.js
document.addEventListener("DOMContentLoaded", () => {
    // Menú móvil
    const navToggle = document.getElementById("navToggle");
    const nav = document.querySelector(".nav");
  
    if (navToggle && nav) {
      navToggle.addEventListener("click", () => {
        nav.classList.toggle("nav--open");
      });
    }
  
    // Carrito muy sencillo con localStorage (solo cuenta de productos)
    const CART_KEY = "ecoisla_cart";
    const cartCountEl = document.getElementById("cartCount");
  
    function loadCart() {
      try {
        const stored = localStorage.getItem(CART_KEY);
        return stored ? JSON.parse(stored) : [];
      } catch {
        return [];
      }
    }
  
    function saveCart(cart) {
      localStorage.setItem(CART_KEY, JSON.stringify(cart));
    }
  
    function updateCartCount() {
      const cart = loadCart();
      if (cartCountEl) {
        cartCountEl.textContent = `Carrito (${cart.length})`;
      }
    }
  
    function addToCart(name) {
      const cart = loadCart();
      cart.push({ name, addedAt: new Date().toISOString() });
      saveCart(cart);
      updateCartCount();
      alert(`Añadido al carrito: ${name}`);
    }
  
    // Botones de "Añadir al carrito"
    const cartButtons = document.querySelectorAll(".add-to-cart");
    cartButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        const name = btn.getAttribute("data-name") || "Producto";
        addToCart(name);
      });
    });
  
    // Actualizar contador al cargar la página
    updateCartCount();
  });
  