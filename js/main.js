// js/main.js

const API_URL = "http://localhost:3000";
const USER_KEY = "ecoisla_user";
const CART_PREFIX = "ecoisla_cart_";

// Productor -> isla (para fijar el origen automáticamente)
const PRODUCER_ISLANDS = {
  "Finca La Vega": "Gran Canaria",
  "AgroTierra Norte": "Tenerife",
  "EcoPlatanera La Palma": "La Palma",
  "Granja Costa Azul": "Fuerteventura",
};

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
  const deleteAccountBtn = document.getElementById("deleteAccountBtn");
  const producerNav = document.getElementById("producerNav");

  if (userInfoEl) {
    userInfoEl.textContent = user ? `Hola, ${user.name}` : "";
  }

  if (loginBtn) {
    loginBtn.style.display = user ? "none" : "";
    loginBtn.onclick = () => {
      window.location.href = "login.html";
    };
  }

  if (logoutBtn) {
    logoutBtn.style.display = user ? "" : "none";
    logoutBtn.onclick = () => {
      clearCurrentUser();
      window.location.reload();
    };
  }

  if (deleteAccountBtn) {
    deleteAccountBtn.style.display = user ? "" : "none";
    deleteAccountBtn.onclick = async () => {
      if (!user) return;
      const confirmDelete = confirm(
        "¿Seguro que quieres eliminar tu cuenta? Esta acción no se puede deshacer."
      );
      if (!confirmDelete) return;

      try {
        const res = await fetch(`${API_URL}/api/users/${user.id}`, {
          method: "DELETE",
        });

        if (!res.ok && res.status !== 204) {
          alert("Hubo un error eliminando la cuenta");
          return;
        }

        clearCurrentUser();
        alert("Tu cuenta ha sido eliminada correctamente.");
        window.location.href = "index.html";
      } catch (err) {
        console.error(err);
        alert("Error de conexión al eliminar la cuenta.");
      }
    };
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
    cartCountEl.innerHTML = `
      <img src="img/cart.jpg" alt="Carrito" class="cart-icon" />
      (0)
    `;
    return;
  }

  const cart = loadCart();
  const total = cart.reduce(
    (sum, item) => sum + (item.quantity || 1),
    0
  );

  cartCountEl.innerHTML = `
    <img src="img/cart.jpg" alt="Carrito" class="cart-icon" />
    (${total})
  `;
}

function showToast(message) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.classList.add("show");

  setTimeout(() => {
    toast.classList.remove("show");
  }, 2000);
}

// product: { name, price, unit, quantity, imageUrl }
function addToCart(product) {
  const user = getCurrentUser();

  if (!user) {
    showToast(`Añadido al carrito: ${item.name} (${item.quantity} ${item.unit})`);
    return;
  }

  const { name, price, unit, quantity, imageUrl } = product;
  const qty = quantity && quantity > 0 ? quantity : 1;

  const cart = loadCart();
  const existing = cart.find(
    (item) =>
      item.name === name &&
      (item.unit || "unidad") === (unit || "unidad")
  );

  if (existing) {
    existing.quantity = (existing.quantity || 1) + qty;
    if (!existing.imageUrl && imageUrl) {
      existing.imageUrl = imageUrl;
    }
  } else {
    cart.push({
      name,
      price: price || 0,
      unit: unit || "unidad",
      quantity: qty,
      imageUrl: imageUrl || "",
      addedAt: new Date().toISOString(),
    });
  }

  saveCart(cart);
  updateCartCount();

  const unitText =
    unit === "kg" ? "kg" : unit === "docena" ? "docenas" : "unid.";
  showToast(`Añadido al carrito: ${name} (${qty} ${unitText})`);
}

// ======================
//   TARJETAS DE PRODUCTO: cantidad + unidad
// ======================

function enhanceProductCards() {
  const cards = document.querySelectorAll(".producto");
  cards.forEach((card) => {
    if (card.dataset.qtyEnhanced === "true") return;

    const btn = card.querySelector(".add-to-cart");
    if (!btn) return;

    // --- averiguar precio y unidad ---
    const priceEl = card.querySelector(".producto__precio");
    let unit = card.dataset.unit || "";
    let price = card.dataset.price
      ? parseFloat(card.dataset.price)
      : NaN;

    if ((!unit || Number.isNaN(price)) && priceEl) {
      const text = priceEl.textContent || "";

      if (text.includes("/kg") || text.toLowerCase().includes("€/kg")) {
        unit = "kg";
      } else if (text.includes("/docena")) {
        unit = "docena";
      } else if (text.includes("/tarro")) {
        unit = "tarro";
      } else {
        unit = "unidad";
      }

      const numMatch = text.match(/[\d.,]+/);
      if (numMatch) {
        price = parseFloat(numMatch[0].replace(",", "."));
      }
    }

    if (!unit) unit = "unidad";
    if (!price || Number.isNaN(price)) price = 0;

    card.dataset.unit = unit;
    card.dataset.price = String(price);

    // --- crear input de cantidad ---
    const wrapper = document.createElement("div");
    wrapper.className = "producto__cantidad-wrapper";

    const label = document.createElement("label");
    label.className = "producto__cantidad-label";
    label.textContent = "Cantidad ";

    const input = document.createElement("input");
    input.type = "number";
    input.className = "producto__qty";

    if (unit === "kg") {
      input.min = "0.1";
      input.step = "0.1";
      input.value = "1";
    } else {
      input.min = "1";
      input.step = "1";
      input.value = "1";
    }

    const span = document.createElement("span");
    span.className = "producto__unidad-text";
    span.textContent =
      unit === "kg"
        ? "kg"
        : unit === "docena"
        ? "docenas"
        : unit === "tarro"
        ? "tarros"
        : "unid.";

    label.appendChild(input);
    label.appendChild(span);
    wrapper.appendChild(label);

    // lo metemos justo antes del botón
    btn.parentNode.insertBefore(wrapper, btn);

    card.dataset.qtyEnhanced = "true";
  });
}

function attachCartButtons() {
  const cartButtons = document.querySelectorAll(".add-to-cart");
  cartButtons.forEach((btn) => {
    if (btn.dataset.cartListenerAttached === "true") return;

    btn.addEventListener("click", () => {
      const card = btn.closest(".producto");

      const name =
        btn.getAttribute("data-name") ||
        (card && card.querySelector("h3")
          ? card.querySelector("h3").textContent
          : "Producto");

      let unit = "unidad";
      let price = 0;
      let quantity = 1;

      if (card) {
        unit = card.dataset.unit || "unidad";
        price = card.dataset.price
          ? parseFloat(card.dataset.price)
          : 0;

        const qtyInput = card.querySelector(".producto__qty");
        if (qtyInput) {
          const raw = parseFloat(
            String(qtyInput.value).replace(",", ".")
          );
          if (!Number.isNaN(raw) && raw > 0) {
            quantity = raw;
          } else {
            quantity = unit === "kg" ? 0.1 : 1;
          }
        }
      }

      let imageUrl = "";
      if (card) {
        const imgEl = card.querySelector("img");
        if (imgEl) {
          imageUrl = imgEl.getAttribute("src") || "";
        }
      }

      addToCart({ name, price, unit, quantity, imageUrl });
    });

    btn.dataset.cartListenerAttached = "true";
  });
}

// ======================
//   FILTRO PRODUCTOS FIJOS
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
//   PRODUCTOS DESDE BD + sincronizar catálogo fijo
// ======================

async function loadProductsFromDb() {
  const gridStatic = document.getElementById("productsGridStatic");
  const gridDb = document.getElementById("productsGridDb"); // solo para vaciar

  if (!gridStatic && !gridDb) return;

  // Vaciar la sección de abajo (ya no la usaremos)
  if (gridDb) {
    gridDb.innerHTML = "";
  }

  // Mapa: nombre en minúsculas -> tarjeta fija del catálogo superior
  const staticCardsByName = new Map();
  if (gridStatic) {
    gridStatic.querySelectorAll(".producto").forEach((card) => {
      const nameEl = card.querySelector("h3");
      if (!nameEl) return;
      const key = nameEl.textContent.trim().toLowerCase();
      staticCardsByName.set(key, card);
    });
  }

  try {
    const res = await fetch(`${API_URL}/api/products`);
    const products = await res.json();

    if (!Array.isArray(products)) return;

    products.forEach((p) => {
      const key = (p.name || "").trim().toLowerCase();
      const origin = p.origin || "Canarias";
      const unit = p.unit || "unidad";
      const unitLabel =
        unit === "kg"
          ? "kg"
          : unit === "docena"
          ? "docena"
          : unit === "tarro"
          ? "tarro"
          : "unidad";

      const priceNum =
        typeof p.price === "number"
          ? p.price
          : parseFloat(String(p.price).replace(",", ".")) || 0;

      const imgSrc =
        p.imageUrl && p.imageUrl.trim()
          ? p.imageUrl
          : "img/producto-generico.png";

      // 1) Si ya existe una tarjeta fija con ese nombre, la ACTUALIZAMOS
      if (staticCardsByName.has(key)) {
        const card = staticCardsByName.get(key);

        card.dataset.origin = origin;
        card.dataset.unit = unit;
        card.dataset.price = String(priceNum);

        const paragraphs = card.querySelectorAll("p");
        paragraphs.forEach((par) => {
          const text = (par.textContent || "").trim();
          if (text.startsWith("Origen:")) {
            par.textContent = `Origen: ${origin}`;
          } else if (text.startsWith("Productor:")) {
            if (p.producerName) {
              par.textContent = `Productor: ${p.producerName}`;
            } else {
              par.textContent = "";
            }
          }
        });

        const priceEl = card.querySelector(".producto__precio");
        if (priceEl) {
          priceEl.textContent = `${priceNum
            .toFixed(2)
            .replace(".", ",")} €/${unitLabel}`;
        }

        const imgEl = card.querySelector("img");
        if (imgEl && p.imageUrl) {
          imgEl.src = imgSrc;
        }
      } else {
        // 2) Si NO existe tarjeta fija, lo añadimos TAMBIÉN AL GRID DE ARRIBA
        if (!gridStatic) return;

        const article = document.createElement("article");
        article.className = "producto";

        article.dataset.origin = origin;
        // si quieres afinar, aquí podrías poner Verduras/Frutas según el nombre
        article.dataset.category = "Otros";
        article.dataset.unit = unit;
        article.dataset.price = String(priceNum);

        const producerInfo = p.producerName
          ? `<p><strong>Productor:</strong> ${p.producerName}</p>`
          : "";

        article.innerHTML = `
          <img src="${imgSrc}" alt="${p.name}" />
          <h3>${p.name}</h3>
          <p>Origen: ${origin}</p>
          ${producerInfo}
          <p class="producto__precio">${priceNum
            .toFixed(2)
            .replace(".", ",")} €/${unitLabel}</p>
          <button class="btn btn--small add-to-cart" data-name="${p.name}">
            Añadir al carrito
          </button>
        `;

        gridStatic.appendChild(article);
      }
    });

    // Añadimos controles de cantidad + carrito a todo lo que haya ahora en el grid
    enhanceProductCards();
    attachCartButtons();
  } catch (err) {
    console.error("Error cargando productos desde BD", err);
  }
}


// ======================
//   PANEL PRODUCTOR
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

    if (!res.ok) {
      throw new Error("Error HTTP " + res.status);
    }

    const products = await res.json();

    if (!Array.isArray(products) || products.length === 0) {
      adminContainer.innerHTML =
        "<p>Aún no tienes productos registrados en la base de datos.</p>";
      return;
    }

    const rows = products
      .map((p) => {
        const priceNum =
          typeof p.price === "number"
            ? p.price
            : parseFloat(String(p.price).replace(",", ".")) || 0;

        const unit = p.unit || "unidad";
        const unitLabel =
          unit === "kg"
            ? "kg"
            : unit === "docena"
            ? "docena"
            : unit === "tarro"
            ? "tarro"
            : "unidad";

        return `
      <tr data-id="${p._id}">
        <td>${p.name}</td>
        <td>${p.origin || "-"}</td>
        <td>${priceNum.toFixed(2)} €/${unitLabel}</td>
        <td>
          <button class="btn btn--small btn-edit-product">Editar</button>
          <button class="btn btn--small btn-delete-product">Eliminar</button>
        </td>
      </tr>
    `;
      })
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

    // Editar (nombre, origen, precio)
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
          priceCell.textContent
            .replace("€", "")
            .replace("/", "")
            .replace("kg", "")
            .replace("docena", "")
            .replace("tarro", "")
            .replace("unidad", "")
            .replace(",", ".")
        );

        const newName = prompt("Nombre del producto:", currentName);
        if (!newName) return;
        const newOrigin = prompt("Origen:", currentOrigin);
        const newPriceStr = prompt(
          "Precio (€):",
          isNaN(currentPrice)
            ? ""
            : currentPrice.toString().replace(".", ",")
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
    adminContainer.innerHTML =
      "<p>Se ha producido un error cargando tus productos.</p>";
  }
}

function setupProducerPanel() {
  const panel = document.getElementById("producerPanel");
  if (!panel) return;

  const user = getCurrentUser();
  const info = document.getElementById("producerPanelInfo");
  const form = document.getElementById("addProductForm");
  const adminContainer = document.getElementById("producerProductsAdmin");

  const producerIslandInput = document.getElementById("producerIsland");
  const originHiddenInput = document.getElementById("originInput");

  const producerIsland =
    user && PRODUCER_ISLANDS[user.name]
      ? PRODUCER_ISLANDS[user.name]
      : "Canarias";

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
      adminContainer.innerHTML =
        "<p>No tienes permisos para esta sección.</p>";
    return;
  }

  if (producerIslandInput) {
    producerIslandInput.value = producerIsland;
  }
  if (originHiddenInput) {
    originHiddenInput.value = producerIsland;
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

      const formData = new FormData(form);

      formData.set("origin", producerIsland);
      formData.append("producerId", user.id);
      formData.append("producerName", user.name);

      try {
        const res = await fetch(`${API_URL}/api/products`, {
          method: "POST",
          body: formData,
        });

        const data = await res.json();

        if (!res.ok) {
          alert(data.error || "Error guardando producto");
          return;
        }

        form.reset();
        if (producerIslandInput) {
          producerIslandInput.value = producerIsland;
        }
        if (originHiddenInput) {
          originHiddenInput.value = producerIsland;
        }

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

  const cartCountEl = document.getElementById("cartCount");
  if (cartCountEl) {
    cartCountEl.style.cursor = "pointer";
    cartCountEl.addEventListener("click", (e) => {
      e.preventDefault();
      window.location.href = "carrito.html";
    });
  }

  enhanceProductCards();
  attachCartButtons();
  setupFilters();
  loadProductsFromDb();
  setupProducerPanel();
  setupAuthForms();

  // ======================
  //   FORMULARIO DE CONTACTO
  // ======================
  const contactForm = document.querySelector(".contacto-layout .form");
  if (contactForm) {
    contactForm.addEventListener("submit", (e) => {
      e.preventDefault();
      alert("Consulta enviada. Será respondida con la mayor brevedad.");
      contactForm.reset();
    });
  }
});
