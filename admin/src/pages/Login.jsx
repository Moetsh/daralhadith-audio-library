import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth";
import { Button, Input, ErrorBox, Card, cx } from "../components/ui";
import { Lock, Mail } from "lucide-react";

export default function Login() {
  const { login, logout } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const u = await login(email, password);
      if (u.role !== "admin") {
        await logout();
        setError("هذا الحساب لا يملك صلاحيات مشرف");
        return;
      }
      navigate("/");
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-bg relative overflow-hidden">
      <div className="absolute inset-0 girih text-green opacity-[0.05]" />
      <div className="absolute -top-24 -left-24 w-72 h-72 rounded-full bg-gold-soft blur-3xl opacity-60 pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-72 h-72 rounded-full bg-green-soft blur-3xl opacity-60 pointer-events-none" />
      <Card className="relative w-full max-w-sm p-8 border-t-4 border-t-gold">
        <div className="flex flex-col items-center mb-6">
          <img src="/logo.png" alt="دار الحديث" className="w-14 h-14 rounded-2xl object-cover mb-3 shadow-card" />
          <h1 className="font-brand text-2xl text-green text-center">لوحة تحكم دار الحديث الصوتية</h1>
          <p className="text-ink3 text-xs mt-1">تسجيل دخول المشرفين</p>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <ErrorBox error={error} />
          <div className="relative">
            <Mail size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-ink3" />
            <Input
              dir="ltr"
              className={cx("pr-10 text-left")}
              placeholder="البريد الإلكتروني"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              required
            />
          </div>
          <div className="relative">
            <Lock size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-ink3" />
            <Input
              dir="ltr"
              className="pr-10 text-left"
              placeholder="كلمة المرور"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              required
            />
          </div>
          <Button type="submit" disabled={busy} className="w-full" size="lg">
            {busy ? "جارٍ الدخول…" : "دخول"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
