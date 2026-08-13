import { Routes, Route } from "react-router-dom";
import { useAuth } from "./lib/AuthContext";
import { Navbar } from "./components/Navbar";
import { ProtectedRoute } from "./components/ProtectedRoute";

import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import ReportItem from "./pages/ReportItem";
import ItemDetail from "./pages/ItemDetail";
import AdminPanel from "./pages/AdminPanel";
import Profile from "./pages/Profile";

export default function App() {
  const { session } = useAuth();

  return (
    <div className="min-h-screen">
      {session && <Navbar />}
      <Routes>
  <Route path="/login" element={<Login />} />
  <Route path="/signup" element={<Signup />} />

  <Route
    path="/"
    element={
      <ProtectedRoute>
        <Dashboard />
      </ProtectedRoute>
    }
  />

  {/* Profile */}
  <Route
    path="/profile"
    element={
      <ProtectedRoute>
        <Profile />
      </ProtectedRoute>
    }
  />

  <Route
    path="/report"
    element={
      <ProtectedRoute>
        <ReportItem />
      </ProtectedRoute>
    }
  />

  <Route
    path="/items/:id"
    element={
      <ProtectedRoute>
        <ItemDetail />
      </ProtectedRoute>
    }
  />

  <Route
    path="/admin"
    element={
      <ProtectedRoute requireAdmin>
        <AdminPanel />
      </ProtectedRoute>
    }
  />
</Routes>
    </div>
  );
}
