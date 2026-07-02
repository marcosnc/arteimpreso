import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout";
import HomePage from "./pages/HomePage";
import ArtworkPage from "./pages/ArtworkPage";
import CartPage from "./pages/CartPage";
import CheckoutPage from "./pages/CheckoutPage";
import OrdersPage from "./pages/OrdersPage";
import OrderDetailPage from "./pages/OrderDetailPage";
import LoginPage from "./pages/LoginPage";
import ArtistPage from "./pages/ArtistPage";
import AdminPage from "./pages/AdminPage";
import { useAuth } from "./context/AuthContext";

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="container">Cargando...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function RoleRoute({
  roles,
  children,
}: {
  roles: string[];
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  if (loading) return <div className="container">Cargando...</div>;
  if (!user || !roles.includes(user.role))
    return <Navigate to="/" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="obra/:id" element={<ArtworkPage />} />
        <Route path="login" element={<LoginPage />} />
        <Route
          path="carrito"
          element={
            <PrivateRoute>
              <CartPage />
            </PrivateRoute>
          }
        />
        <Route
          path="checkout"
          element={
            <PrivateRoute>
              <CheckoutPage />
            </PrivateRoute>
          }
        />
        <Route
          path="mis-compras"
          element={
            <PrivateRoute>
              <OrdersPage />
            </PrivateRoute>
          }
        />
        <Route
          path="pedido/:id"
          element={
            <PrivateRoute>
              <OrderDetailPage />
            </PrivateRoute>
          }
        />
        <Route
          path="artista"
          element={
            <RoleRoute roles={["ARTIST"]}>
              <ArtistPage />
            </RoleRoute>
          }
        />
        <Route
          path="admin"
          element={
            <RoleRoute roles={["ADMIN"]}>
              <AdminPage />
            </RoleRoute>
          }
        />
      </Route>
    </Routes>
  );
}
