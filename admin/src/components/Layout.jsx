import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../auth";
import {
  LayoutDashboard, Music2, FolderTree, GraduationCap, ListVideo,
  DownloadCloud, Users, Bell, Settings, History, LogOut,
} from "lucide-react";
import { cx } from "./ui";

const NAV = [
  { to: "/", label: "لوحة المعلومات", icon: LayoutDashboard, end: true },
  { to: "/audios", label: "الأشرطة", icon: Music2 },
  { to: "/categories", label: "التصنيفات", icon: FolderTree },
  { to: "/scholars", label: "العلماء", icon: GraduationCap },
  { to: "/series", label: "السلاسل", icon: ListVideo },
  { to: "/import", label: "استيراد من أرشيف", icon: DownloadCloud },
  { to: "/users", label: "المستخدمون", icon: Users },
  { to: "/announcements", label: "التنبيهات", icon: Bell },
  { to: "/activity", label: "سجل النشاط", icon: History },
  { to: "/settings", label: "الإعدادات", icon: Settings },
];

/* قائمة التنقل مشتركة بين الشريط الجانبي (سطح المكتب) وشريط الجوال. */
function NavMenu({ vertical }) {
  return NAV.map(({ to, label, icon: Icon, end }) => (
    <NavLink
      key={to}
      to={to}
      end={end}
      className={({ isActive }) =>
        cx(
          vertical
            ? "flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-bold transition"
            : "flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold whitespace-nowrap",
          isActive ? "bg-green text-white shadow-card" : vertical ? "text-ink2 hover:bg-bg2" : "text-ink2 bg-card"
        )
      }
    >
      <Icon size={vertical ? 18 : 14} />
      {label}
    </NavLink>
  ));
}

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const doLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen flex">
      <aside className="hidden lg:flex flex-col w-64 shrink-0 border-l border-line bg-card shadow-card sticky top-0 h-screen">
        <div className="px-5 py-5 border-b border-line flex items-center gap-3">
          <img src="/logo.png" alt="دار الحديث" className="w-10 h-10 rounded-xl object-cover shrink-0" />
          <div>
            <div className="font-brand text-green text-lg leading-tight">دار الحديث</div>
            <div className="text-[11px] text-ink3 font-bold">لوحة التحكم</div>
          </div>
        </div>
        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          <NavMenu vertical />
        </nav>
        <div className="p-3 border-t border-line">
          <div className="flex items-center gap-3 px-2 py-2">
            <div className="w-9 h-9 rounded-full bg-gold-soft text-gold2 flex items-center justify-center font-black">
              {(user?.name || "م")[0]}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold truncate">{user?.name}</div>
              <div className="text-[11px] text-ink3">{user?.email}</div>
            </div>
            <button
              title="خروج"
              onClick={doLogout}
              className="p-2 rounded-lg text-ink3 hover:bg-bg2 hover:text-danger"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="lg:hidden sticky top-0 z-40 bg-card border-b border-line px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="دار الحديث" className="w-8 h-8 rounded-lg object-cover shrink-0" />
            <span className="font-brand text-green">دار الحديث</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-ink2 hidden sm:block">{user?.name}</span>
            <button
              onClick={doLogout}
              className="p-2 rounded-lg text-ink3 hover:bg-bg2 hover:text-danger"
            >
              <LogOut size={16} />
            </button>
          </div>
        </header>
        <div className="lg:hidden sticky top-[57px] z-30 bg-bg border-b border-line overflow-x-auto no-bar">
          <div className="flex gap-1 px-3 py-2 min-w-max">
            <NavMenu />
          </div>
        </div>
        <main className="flex-1 p-4 md:p-7 max-w-[1400px] w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
