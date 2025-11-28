// main.js

const API_URL = "http://localhost:3000";
const USER_KEY = "ecoisla_user";
const CART_PREFIX = "ecoisla_cart_";

// ======================
//   USUARIO (login / registro / sesión)
// ======================

function getCurrentUser() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function setCurrentUser(user) {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

function clearCurrentUser() {
  localStorage.removeItem(USER_KEY);
}

async function loginUser(email, password) {
  const res = await fetch(`${API_URL}/api/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || "Credenciales incorrectas");
  }

  setCurrentUser(data);
  return data;
}

async function registerUser(name, email, password) {
  const res = await fetch(`${API_URL}/api/users`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, password }),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || "Error registrando usuario");
  }

  setCurrentUser(data);
  return data;
}

function setupAuthForms() {
  const loginForm = document.getElementById("loginForm");
  const registerForm = document.getElementById("registerForm");
  const btnShowLogin = document.getElementById("btnShowLogin");
  const btnShowRegister = document.getElementById("btnShowRegister");
  const errorBox = document.getElementById("authError");

  if (!loginForm && !registerForm) return;

  function setMode(mode) {
    if (loginForm) loginForm.style.display = mode === "login" ? "" : "none";
    if (registerForm)
      registerForm.style.display = mode === "register" ? "" : "none";

    if (btnShowLogin) {
      btnShowLogin.classList.toggle("btn--primary", mode === "login");
      btnShowLogin.classList.toggle("btn--outline", mode !== "login");
    }
    if (btnShowRegister) {
      btnShowRegister.classList.toggle("btn--primary", mode === "register");
      btnShowRegister.classList.toggle("btn--outline", mode !== "register");
    }

    if (errorBox) errorBox.textContent = "";
  }

  if (btnShowLogin) {
    btnShowLogin.addEventListener("click", () => setMode("login"));
  }
  if (btnShowRegister) {
    btnShowRegister.addEventListener("click", () => setMode("register"));
  }

  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (errorBox) errorBox.textContent = "";

      const email = loginForm.email.value.trim();
      const password = loginForm.password.value.trim();
      if (!email || !password) return;

      try {
        await loginUser(email, password);
        window.location.href = "index.html";
      } catch (err) {
        console.error(err);
        if (errorBox) {
          errorBox.textContent =
            err.message ||
            "No se ha podido iniciar sesión. Inténtalo de nuevo.";
        }
      }
    });
  }

  if (registerForm) {
    registerForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (errorBox) errorBox.textContent = "";

      const name = registerForm.name.value.trim();
      const email = registerForm.email.value.trim();
      const password = registerForm.password.value.trim();
      if (!name || !email || !password) return;

      try {
        await registerUser(name, email, password);
        window.location.href = "index.html";
      } catch (err) {
        console.error(err);
        if (errorBox) {
          errorBox.textContent =
            err.message ||
            "No se ha podido registrar el usuario. Inténtalo de nuevo.";
        }
      }
    });
  }

  setMode("login");
}

function setupUserHeader() {
  const user = getCurrentUser();
  const userInfoEl = document.getElementById("userInfo");
  const loginBtn = document.getElementById("loginBtn");
  const logoutBtn = document.getElementById("logoutBtn");
  const producerNav = document.getElementById("producerNav");

  if (userInfoEl) {
    userInfoEl.textContent = user ? `Hola, ${user.name}` : "";
  }

  if (loginBtn) {
    loginBtn.style.display = user ? "none" : "";
    loginBtn.addEventListener("click", () => {
      window.location.href = "login.html";
    });
  }

  if (logoutBtn) {
    logoutBtn.style.display = user ? "" : "none";
    logoutBtn.addEventListener("click", () => {
      clearCurrentUser();
      window.location.reload();
    });
  }

  if (producerNav) {
    producerNav.style.display =
      user && user.role === "producer" ? "" : "none";
  }
}

// ======================
//   CARRITO (localStorage por usuario)
// ======================

function getCartKeyForCurrentUser() {
  const user = getCurrentUser();
  if (!user || !user.email) return null;
  return `${CART_PREFIX}${user.email}`;
}

function loadCart() {
  const key = getCartKeyForCurrentUser();
  if (!key) return [];
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveCart(cart) {
  const key = getCartKeyForCurrentUser();
  if (!key) return;
  localStorage.setItem(key, JSON.stringify(cart));
}

function updateCartCount() {
  const cartCountEl = document.getElementById("cartCount");
  if (!cartCountEl) return;

  const user = getCurrentUser();
  if (!user) {
    cartCountEl.textContent = "Carrito (0)";
    return;
  }

  const cart = loadCart();
  cartCountEl.textContent = `Carrito (${cart.length})`;
}

function addToCart(name) {
  const user = getCurrentUser();

  if (!user) {
    alert(
      "Para poder añadir productos al carrito es necesario iniciar sesión o registrarse."
    );
    return;
  }

  const cart = loadCart();
  cart.push({ name, addedAt: new Date().toISOString() });
  saveCart(cart);
  updateCartCount();
  alert(`Añadido al carrito: ${name}`);
}

function attachCartButtons() {
  const cartButtons = document.querySelectorAll(".add-to-cart");
  cartButtons.forEach((btn) => {
    if (btn.dataset.cartListenerAttached === "true") return;

    btn.addEventListener("click", () => {
      const name = btn.getAttribute("data-name") || "Producto";
      addToCart(name);
    });

    btn.dataset.cartListenerAttached = "true";
  });
}

// ======================
//   FILTRO PRODUCTOS FIJOS (catálogo estático)
// ======================

function setupFilters() {
  const categorySelect = document.getElementById("filterCategory");
  const originSelect = document.getElementById("filterOrigin");
  const gridStatic = document.getElementById("productsGridStatic");

  if (!categorySelect || !originSelect || !gridStatic) return;

  function applyFilters() {
    const category = categorySelect.value;
    const origin = originSelect.value;

    const cards = gridStatic.querySelectorAll(".producto");

    cards.forEach((card) => {
      const cardCategory = card.dataset.category;
      const cardOrigin = card.dataset.origin;

      const matchCategory =
        category === "Todos" || cardCategory === category;
      const matchOrigin = origin === "Todas" || cardOrigin === origin;

      card.style.display = matchCategory && matchOrigin ? "" : "none";
    });
  }

  categorySelect.addEventListener("change", applyFilters);
  originSelect.addEventListener("change", applyFilters);

  applyFilters();
}

// ======================
//   PRODUCTOS DESDE BD (vista pública)
// ======================

async function loadProductsFromDb() {
  const grid = document.getElementById("productsGridDb");
  if (!grid) return;

  try {
    const res = await fetch(`${API_URL}/api/products`);
    const products = await res.json();

    if (!Array.isArray(products)) return;

    grid.innerHTML = "";

    if (products.length === 0) {
      grid.innerHTML = "<p>No hay productos registrados todavía.</p>";
      return;
    }

    products.forEach((p) => {
      const article = document.createElement("article");
      article.className = "producto";

      const producerInfo = p.producerName
        ? `<p>Productor: ${p.producerName}</p>`
        : "";

      const imgSrc = p.imageUrl && p.imageUrl.trim()
        ? p.imageUrl
        : "img/producto-generico.png";

      article.innerHTML = `
        <img src="${imgSrc}" alt="${p.name}" />
        <h3>${p.name}</h3>
        <p>Origen: ${p.origin || "Canarias"}</p>
        ${producerInfo}
        <p class="producto__precio">${p.price.toFixed(2)} €/unidad</p>
        <button class="btn btn--small add-to-cart" data-name="${p.name}">Añadir al carrito</button>
      `;

      grid.appendChild(article);
    });

    attachCartButtons();
  } catch (err) {
    console.error("Error cargando productos desde BD", err);
  }
}

// ======================
//   PANEL PRODUCTOR (Área productor)
// ======================

async function loadAdminProducts() {
  const adminContainer = document.getElementById("producerProductsAdmin");
  if (!adminContainer) return;

  const user = getCurrentUser();
  if (!user || user.role !== "producer") {
    adminContainer.innerHTML =
      "<p>No tienes permisos para gestionar productos.</p>";
    return;
  }

  try {
    const res = await fetch(
      `${API_URL}/api/products?producerId=${encodeURIComponent(user.id)}`
    );
    const products = await res.json();

    if (!Array.isArray(products) || products.length === 0) {
      adminContainer.innerHTML =
        "<p>Aún no tienes productos registrados en la base de datos.</p>";
      return;
    }

    const rows = products
      .map(
        (p) => `
      <tr data-id="${p._id}">
        <td>${p.name}</td>
        <td>${p.origin || "-"}</td>
        <td>${p.price.toFixed(2)} €</td>
        <td>
          <button class="btn btn--small btn-edit-product">Editar</button>
          <button class="btn btn--small btn-delete-product">Eliminar</button>
        </td>
      </tr>
    `
      )
      .join("");

    adminContainer.innerHTML = `
      <table class="tabla-productos">
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Origen</th>
            <th>Precio</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    `;

    // Eliminar
    adminContainer
      .querySelectorAll(".btn-delete-product")
      .forEach((btn) => {
        btn.addEventListener("click", async () => {
          const tr = btn.closest("tr");
          const id = tr.dataset.id;
          if (!id) return;
          if (!confirm("¿Seguro que quieres eliminar este producto?")) return;

          try {
            const res = await fetch(`${API_URL}/api/products/${id}`, {
              method: "DELETE",
            });
            if (!res.ok && res.status !== 204) {
              alert("Error eliminando el producto");
              return;
            }
            await loadAdminProducts();
            await loadProductsFromDb();
          } catch (err) {
            console.error(err);
            alert("Error de conexión al eliminar");
          }
        });
      });

    // Editar
    adminContainer.querySelectorAll(".btn-edit-product").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const tr = btn.closest("tr");
        const id = tr.dataset.id;
        const nameCell = tr.children[0];
        const originCell = tr.children[1];
        const priceCell = tr.children[2];

        const currentName = nameCell.textContent;
        const currentOrigin =
          originCell.textContent === "-" ? "" : originCell.textContent;
        const currentPrice = parseFloat(
          priceCell.textContent.replace("€", "").replace(",", ".")
        );

        const newName = prompt("Nombre del producto:", currentName);
        if (!newName) return;
        const newOrigin = prompt("Origen:", currentOrigin);
        const newPriceStr = prompt(
          "Precio (€):",
          currentPrice.toString().replace(".", ",")
        );
        if (!newPriceStr) return;
        const newPrice = parseFloat(newPriceStr.replace(",", "."));
        if (Number.isNaN(newPrice)) {
          alert("Precio no válido");
          return;
        }

        try {
          const res = await fetch(`${API_URL}/api/products/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: newName,
              origin: newOrigin,
              price: newPrice,
            }),
          });

          if (!res.ok) {
            alert("Error actualizando el producto");
            return;
          }

          await loadAdminProducts();
          await loadProductsFromDb();
        } catch (err) {
          console.error(err);
          alert("Error de conexión al actualizar");
        }
      });
    });
  } catch (err) {
    console.error("Error cargando productos para productor", err);
  }
}

function setupProducerPanel() {
  const panel = document.getElementById("producerPanel");
  if (!panel) return;

  const user = getCurrentUser();
  const info = document.getElementById("producerPanelInfo");
  const form = document.getElementById("addProductForm");
  const adminContainer = document.getElementById("producerProductsAdmin");

  if (!user) {
    if (info) {
      info.textContent =
        "Debes iniciar sesión como productor para gestionar tus productos.";
    }
    if (form) form.style.display = "none";
    if (adminContainer)
      adminContainer.innerHTML = "<p>No hay datos que mostrar.</p>";
    return;
  }

  if (user.role !== "producer") {
    if (info) {
      info.textContent =
        "Esta área está reservada a productores acreditados por EcoIsla Market.";
    }
    if (form) form.style.display = "none";
    if (adminContainer)
      adminContainer.innerHTML = "<p>No tienes permisos para esta sección.</p>";
    return;
  }

  if (info) {
    info.textContent =
      "Desde aquí puedes gestionar los productos que tienes en venta en EcoIsla Market.";
  }
  if (form) form.style.display = "";

  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      const user = getCurrentUser();
      if (!user) return;

      // FormData para poder incluir imagen
      const formData = new FormData(form);
      formData.append("producerId", user.id);
      formData.append("producerName", user.name);

      try {
        const res = await fetch(`${API_URL}/api/products`, {
          method: "POST",
          body: formData, // NO poner Content-Type, lo añade el navegador
        });

        const data = await res.json();

        if (!res.ok) {
          alert(data.error || "Error guardando producto");
          return;
        }

        form.reset();
        await loadAdminProducts();
        await loadProductsFromDb();
      } catch (err) {
        console.error(err);
        alert("Error de conexión al guardar producto");
      }
    });
  }

  loadAdminProducts();
}

// ======================
//   INICIO APP
// ======================

document.addEventListener("DOMContentLoaded", () => {
  const navToggle = document.getElementById("navToggle");
  const nav = document.querySelector(".nav");

  if (navToggle && nav) {
    navToggle.addEventListener("click", () => {
      nav.classList.toggle("nav--open");
    });
  }

  setupUserHeader();
  updateCartCount();
  attachCartButtons();
  setupFilters();
  loadProductsFromDb();
  setupProducerPanel();
  setupAuthForms();
});
