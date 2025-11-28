// server.js

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcrypt");

const app = express();
const PORT = 3000;

// ===== MIDDLEWARES =====
app.use(cors());
app.use(express.json());

// ===== CONEXIÓN A MONGODB =====
const MONGO_URI = "mongodb://127.0.0.1:27017/ecoisla";

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log("✅ Conectado a MongoDB (ecoisla)");
  })
  .catch((err) => {
    console.error("❌ Error conectando a MongoDB:", err.message);
  });

// ===== ESQUEMAS Y MODELOS =====

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    origin: { type: String, default: "" },
    price: { type: Number, required: true },
    producerId: { type: String, default: null },   // id del usuario productor
    producerName: { type: String, default: "" },   // nombre visible en catálogo
  },
  { timestamps: true }
);

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      enum: ["user", "producer"],
      default: "user",
    },
  },
  { timestamps: true }
);

const Product = mongoose.model("Product", productSchema);
const User = mongoose.model("User", userSchema);

// ===== RUTAS API =====

// --- PRODUCTOS ---

// GET /api/products → lista productos (todos o filtrados por productor)
app.get("/api/products", async (req, res) => {
  try {
    const filter = {};
    if (req.query.producerId) {
      filter.producerId = req.query.producerId;
    }

    const products = await Product.find(filter).sort({ createdAt: -1 });
    res.json(products);
  } catch (err) {
    console.error("Error obteniendo productos:", err);
    res.status(500).json({ error: "Error obteniendo productos" });
  }
});

// POST /api/products → crea un producto
app.post("/api/products", async (req, res) => {
  try {
    const { name, origin, price, producerId, producerName } = req.body;

    if (!name || price == null) {
      return res
        .status(400)
        .json({ error: "Nombre y precio son obligatorios" });
    }

    const product = new Product({
      name,
      origin: origin || "",
      price,
      producerId: producerId || null,
      producerName: producerName || "",
    });

    const saved = await product.save();
    res.status(201).json(saved);
  } catch (err) {
    console.error("Error guardando producto:", err);
    res.status(500).json({ error: "Error guardando producto" });
  }
});

// PUT /api/products/:id → editar producto
app.put("/api/products/:id", async (req, res) => {
  try {
    const { name, origin, price } = req.body;

    if (!name || price == null) {
      return res
        .status(400)
        .json({ error: "Nombre y precio son obligatorios" });
    }

    const updated = await Product.findByIdAndUpdate(
      req.params.id,
      { name, origin: origin || "", price },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ error: "Producto no encontrado" });
    }

    res.json(updated);
  } catch (err) {
    console.error("Error actualizando producto:", err);
    res.status(500).json({ error: "Error actualizando producto" });
  }
});

// DELETE /api/products/:id → eliminar producto
app.delete("/api/products/:id", async (req, res) => {
  try {
    const deleted = await Product.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: "Producto no encontrado" });
    }
    res.status(204).end();
  } catch (err) {
    console.error("Error eliminando producto:", err);
    res.status(500).json({ error: "Error eliminando producto" });
  }
});

// --- USUARIOS ---

// GET /api/users → listar usuarios (para pruebas)
app.get("/api/users", async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    const sanitized = users.map((u) => ({
      id: u._id,
      name: u.name,
      email: u.email,
      role: u.role,
      createdAt: u.createdAt,
    }));
    res.json(sanitized);
  } catch (err) {
    console.error("Error obteniendo usuarios:", err);
    res.status(500).json({ error: "Error obteniendo usuarios" });
  }
});

// POST /api/users → registro (usuario o productor)
app.post("/api/users", async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      return res
        .status(400)
        .json({ error: "Nombre, email y contraseña son obligatorios" });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ error: "Ese email ya está registrado" });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = new User({
      name,
      email,
      passwordHash,
      role: role || "user",
    });

    const saved = await user.save();

    res.status(201).json({
      id: saved._id,
      name: saved.name,
      email: saved.email,
      role: saved.role,
    });
  } catch (err) {
    console.error("Error registrando usuario:", err);
    res.status(500).json({ error: "Error interno" });
  }
});

// POST /api/login → login con email + contraseña
app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res
        .status(400)
        .json({ error: "Email o contraseña incorrectos" });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res
        .status(400)
        .json({ error: "Email o contraseña incorrectos" });
    }

    res.json({
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    });
  } catch (err) {
    console.error("Error en login:", err);
    res.status(500).json({ error: "Error interno" });
  }
});

// ===== ARRANCAR SERVIDOR =====
app.listen(PORT, () => {
  console.log(`🚀 EcoIsla API escuchando en http://localhost:${PORT}`);
});
