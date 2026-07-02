import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth.js";
import artworkRoutes from "./routes/artworks.js";
import cartRoutes from "./routes/cart.js";
import orderRoutes from "./routes/orders.js";
import artistRoutes from "./routes/artist.js";
import adminRoutes from "./routes/admin.js";
import addressRoutes from "./routes/addresses.js";

const app = express();
const PORT = Number(process.env.PORT) || 3001;

app.use(
  cors({
    origin: process.env.CLIENT_URL ?? "http://localhost:5173",
    credentials: true,
  })
);
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", service: "arteimpreso-api" });
});

app.use("/api/auth", authRoutes);
app.use("/api/artworks", artworkRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/artist", artistRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/addresses", addressRoutes);

app.listen(PORT, () => {
  console.log(`API escuchando en http://localhost:${PORT}`);
});
