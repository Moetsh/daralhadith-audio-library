/* حد أخطاء React: يمنع الشاشة الداكنة الفارغة ويعرض زر إصلاح ذاتي */
import { Component, type ReactNode } from "react";

interface Props {
  title: string;
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  private retry = () => this.setState({ error: null });

  private wipe = () => {
    try {
      const keys: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith("dh-")) keys.push(k);
      }
      keys.forEach((k) => localStorage.removeItem(k));
    } catch {}
    window.location.reload();
  };

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="h-full overflow-y-auto no-bar bg-app relative">
        <div className="relative px-6 pt-16 pb-10 max-w-lg mx-auto text-center">
          <div className="w-16 h-16 rounded-3xl soft-gold flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl c-gold font-black">!</span>
          </div>
          <h2 className="font-extrabold ink text-[1rem]">{this.props.title}</h2>
          <p className="ink-3 text-[0.75rem] font-bold mt-2 leading-relaxed" dir="ltr">
            {String(this.state.error.message || this.state.error)}
          </p>
          <div className="flex items-center justify-center gap-2 mt-5">
            <button
              onClick={this.retry}
              className="h-10 px-5 rounded-full bg-green text-[#f4ecd7] text-[0.78rem] font-extrabold active:scale-95 transition"
            >
              إعادة المحاولة
            </button>
            <button
              onClick={this.wipe}
              className="h-10 px-5 rounded-full surface bline border text-[0.78rem] font-extrabold ink-2 active:scale-95 transition"
            >
              مسح البيانات المحلية
            </button>
          </div>
        </div>
      </div>
    );
  }
}
