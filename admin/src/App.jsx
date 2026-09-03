import { HashRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./auth";
import Layout from "./components/Layout";
import { Guard, LoginGate, NotFound } from "./components/guards";
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
