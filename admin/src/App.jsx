import { useEffect } from "react";
import { HashRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "./auth";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Audios from "./pages/Audios";
import Categories from "./pages/Categories";
import Scholars from "./pages/Scholars";
import Series from "./pages/Series";
import ImportPage from "./pages/Import";
import Users from "./pages/Users";
import Announcements from "./pages/Announcements";
import Activity from "./pages/Activity";
import Settings from "./pages/Settings";
import { Loading } from "./components/ui";

function Guard({ children }) {
  const { user, ready } = useAuth();
  const location = useLocation();
  useEffect(() => {
    if (!ready) return;
    if (!user) window.location.hash = "#/login";
  }, [ready, user, location.pathname]);
  if (!ready) return <Loading label="جارٍ التحقق…" />;
  if (!user) return null;
  return children;
}

function LoginGate() {
  const { user } = useAuth();
  if (user) return <Navigate to="/" replace />;
  return <Login />;
}

function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-ink3 gap-3">
      <span className="font-brand text-6xl text-green">404</span>
      <span className="text-sm">الصفحة غير موجودة</span>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <HashRouter>
        <Routes>
          <Route path="/login" element={<LoginGate />} />
          <Route element={<Guard><Layout /></Guard>}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/audios" element={<Audios />} />
            <Route path="/categories" element={<Categories />} />
            <Route path="/scholars" element={<Scholars />} />
            <Route path="/series" element={<Series />} />
            <Route path="/import" element={<ImportPage />} />
            <Route path="/users" element={<Users />} />
            <Route path="/announcements" element={<Announcements />} />
            <Route path="/activity" element={<Activity />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </HashRouter>
    </AuthProvider>
  );
}
