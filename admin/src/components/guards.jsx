import { Navigate } from "react-router-dom";
import { useAuth } from "../auth";
import { Loading } from "./ui";
import Login from "../pages/Login";

/* حارس المصادقة: يعرض تحميلاً حتى الجاهزية، ثم يُحوّل غير المسجل إلى /login. */
export function Guard({ children }) {
  const { user, ready } = useAuth();
  if (!ready) return <Loading label="جارٍ التحقق…" />;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

/* بوابة الدخول: المسجل يُحوَّل للرئيسية، وإلا تُعرض صفحة الدخول. */
export function LoginGate() {
  const { user } = useAuth();
  if (user) return <Navigate to="/" replace />;
  return <Login />;
}

export function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-ink3 gap-3">
      <span className="font-brand text-6xl text-green">404</span>
      <span className="text-sm">الصفحة غير موجودة</span>
    </div>
  );
}
