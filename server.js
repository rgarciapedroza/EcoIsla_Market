// server.js

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcrypt");
const path = require("path");
const fs = require("fs");
const multer = require("multer");

const app = express();
const PORT = 3000;

// ===== MIDDLEWARES =====
app.use(cors());
app.use(express.json());

// servir imágenes estáticas (productos)
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/img", express.static(path.join(__dirname, "img")));

// asegurarnos de que existe la carpeta uploads
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

// ===== MULTER (SUBIDA DE IMÁGENES) =====
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname) || ".jpg";
    const base = path.basename(file.originalname, ext);
    cb(null, `${base}-${Date.now()}${ext}`);
  },
});

const upload = multer({ storage });

// ===== CONEXIÓN A MONGODB =====
const MONGO_URI = "mongodb://127.0.0.1:27017/ecoisla";

mongoose
  .connect(MONGO_URI)
  .then(async () => {
    console.log("✅ Conectado a MongoDB (ecoisla)");
    await seedInitialProducts(); // sembramos / sincronizamos productos base
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

    // unidad de precio: unidad, kg, docena, tarro, etc.
    unit: { type: String, default: "unidad" },

    // productor asociado
    producerId: { type: String, default: null },
    producerName: { type: String, default: "" },

    // ruta de imagen (puede ser /uploads/... o /img/...)
    imageUrl: { type: String, default: "" },
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

// ===============================
//   SEED: productos iniciales
//   (sincroniza por nombre, con unit y productor)
// ===============================
async function seedInitialProducts() {
  try {
    const initialProducts = [
      {
        name: "Naranjas ecológicas",
        origin: "Tenerife",
        price: 2.5,
        unit: "kg",
        producerName: "AgroTierra Norte",
        imageUrl: "/img/naranjas_ecologicas.png",
      },
      {
        name: "Plátanos ecológicos",
        origin: "La Palma",
        price: 2.8,
        unit: "kg",
        producerName: "EcoPlatanera La Palma",
        imageUrl: "/img/platanos_ecologicos.png",
      },
      {
        name: "Tomates de rama",
        origin: "Gran Canaria",
        price: 3.1,
        unit: "kg",
        producerName: "Finca La Vega",
        imageUrl: "/img/tomates_ecologicos.png",
      },
      {
        name: "Lechuga ecológica",
        origin: "Fuerteventura",
        price: 1.7,
        unit: "unidad",
        producerName: "Finca La Vega",
        imageUrl: "/img/lechuga_ecologica.png",
      },
      {
        name: "Huevos ecológicos (docena)",
        origin: "Gran Canaria",
        price: 3.6,
        unit: "docena",
        producerName: "Granja Costa Azul",
        imageUrl: "/img/huevos_ecologica.png",
      },
      {
        name: "Miel de floración canaria",
        origin: "La Palma",
        price: 6.9,
        unit: "tarro",
        producerName: "AgroTierra Norte",
        imageUrl: "/img/miel_ecologica.png",
      },
    ];

    for (const prod of initialProducts) {
      // si existe el productor, le asignamos su id
      let producerId = null;
      if (prod.producerName) {
        const user = await User.findOne({ name: prod.producerName });
        if (user) {
          producerId = user._id.toString();
        }
      }

      await Product.updateOne(
        { name: prod.name }, // buscamos por nombre
        {
          $set: {
            origin: prod.origin,
            price: prod.price,
            unit: prod.unit || "unidad",
            producerName: prod.producerName,
            producerId,
            imageUrl: prod.imageUrl,
          },
        },
        { upsert: true } // si no existe, lo crea
      );

      console.log(`🔁 Producto base sincronizado: ${prod.name}`);
    }

    console.log("✅ Productos iniciales sincronizados con la BD.");
  } catch (err) {
    console.error("❌ Error sincronizando productos iniciales:", err);
  }
}

// ===============================
//   Asignar productos a productor
//   según producerName == user.name
// ===============================
async function assignProductsToProducer(user) {
  if (user.role !== "producer") return;

  try {
    const result = await Product.updateMany(
      { producerName: user.name },
      {
        producerId: user._id.toString(),
        producerName: user.name,
      }
    );
    console.log(
      `🔗 Productos vinculados a productor ${user.name}: ${result.modifiedCount}`
    );
  } catch (err) {
    console.error("❌ Error asignando productos a productor:", err);
  }
}

// ===== RUTAS API =====

// --- PRODUCTOS ---

// GET /api/products → lista productos (todos o por productor)
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

// POST /api/products → crea producto (con imagen opcional)
app.post("/api/products", upload.single("image"), async (req, res) => {
  try {
    const { name, origin, price, producerId, producerName, unit } = req.body;

    if (!name || price == null) {
      return res
        .status(400)
        .json({ error: "Nombre y precio son obligatorios" });
    }

    let imageUrl = "";
    if (req.file) {
      imageUrl = `/uploads/${req.file.filename}`;
    }

    const product = new Product({
      name,
      origin: origin || "",
      price: parseFloat(price),
      unit: unit || "unidad",
      producerId: producerId || null,
      producerName: producerName || "",
      imageUrl,
    });

    const saved = await product.save();
    res.status(201).json(saved);
  } catch (err) {
    console.error("Error guardando producto:", err);
    res.status(500).json({ error: "Error guardando producto" });
  }
});

// PUT /api/products/:id → editar producto (solo datos básicos)
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
      { name, origin: origin || "", price: parseFloat(price) },
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

// POST /api/users → registro
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

// POST /api/login → login
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

    // vinculamos productos cuyo producerName coincide con el nombre del productor
    await assignProductsToProducer(user);

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

// DELETE /api/users/:id → eliminar cuenta de usuario
app.delete("/api/users/:id", async (req, res) => {
  try {
    const userId = req.params.id;

    const deletedUser = await User.findByIdAndDelete(userId);
    if (!deletedUser) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    // si era productor, borramos también sus productos
    if (deletedUser.role === "producer") {
      await Product.deleteMany({ producerId: userId });
    }

    res.status(204).end();
  } catch (err) {
    console.error("❌ Error eliminando usuario:", err);
    res.status(500).json({ error: "Error eliminando usuario" });
  }
});

// ===== ARRANCAR SERVIDOR =====
app.listen(PORT, () => {
  console.log(`🚀 EcoIsla API escuchando en http://localhost:${PORT}`);
});
