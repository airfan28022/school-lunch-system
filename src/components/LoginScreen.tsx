import React, { useState } from 'react';
import { 
  Lock, 
  User, 
  Eye, 
  EyeOff, 
  ShieldCheck, 
  LogIn, 
  AlertCircle, 
  CheckCircle2, 
  UtensilsCrossed 
} from 'lucide-react';
import { FALLBACK_IMAGE_URL } from '../services/api';

interface LoginScreenProps {
  onLoginSuccess: (username: string) => void;
  logoUrl?: string;
  schoolName?: string;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  onLoginSuccess,
  logoUrl,
  schoolName = 'โรงเรียนอนุบาลและประถมศึกษาเทศบาลพัฒนา'
}) => {
  const [username, setUsername] = useState<string>('Admin');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [rememberMe, setRememberMe] = useState<boolean>(true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const cleanUsername = username.trim();
    const cleanPassword = password.trim();

    if (!cleanUsername) {
      setErrorMsg('กรุณากรอก ID / ชื่อผู้ใช้งาน');
      return;
    }

    if (!cleanPassword) {
      setErrorMsg('กรุณากรอกรหัสผ่าน (Password)');
      return;
    }

    setIsLoading(true);

    // ตรวจสอบชื่อผู้ใช้และรหัสผ่านตามเงื่อนไขที่กำหนด
    // ID: Admin (รองรับตัวพิมพ์เล็กและใหญ่เพื่อความสะดวกบนมือถือ)
    // Password: 1159551
    setTimeout(() => {
      if (cleanUsername.toLowerCase() === 'admin' && cleanPassword === '1159551') {
        try {
          const authData = {
            isAuthenticated: true,
            username: 'Admin',
            loginTime: new Date().toISOString(),
            rememberMe
          };
          if (rememberMe) {
            localStorage.setItem('school_lunch_auth', JSON.stringify(authData));
          } else {
            sessionStorage.setItem('school_lunch_auth', JSON.stringify(authData));
          }
        } catch (e) {
          console.warn('Storage save error:', e);
        }
        setIsLoading(false);
        onLoginSuccess('Admin');
      } else {
        setIsLoading(false);
        setErrorMsg('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง กรุณาตรวจสอบ ID และ Password');
      }
    }, 300);
  };

  const handleQuickFill = () => {
    setUsername('Admin');
    setPassword('1159551');
    setErrorMsg('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-500/10 via-amber-100/40 to-yellow-500/20 flex flex-col justify-center items-center p-4 select-none relative overflow-hidden font-sans">
      {/* Decorative Background Circles */}
      <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-amber-400/20 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-96 h-96 rounded-full bg-yellow-400/20 blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Main Card */}
        <div className="bg-white/95 backdrop-blur-md rounded-3xl border border-amber-300/80 shadow-xl overflow-hidden p-6 sm:p-8">
          
          {/* Logo & School Header */}
          <div className="flex flex-col items-center text-center mb-6">
            <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-br from-amber-400 to-yellow-300 p-1 shadow-md mb-3 flex items-center justify-center">
              <div className="w-full h-full bg-white rounded-xl overflow-hidden p-1 flex items-center justify-center">
                <img
                  src={logoUrl || FALLBACK_IMAGE_URL}
                  alt="ตราสัญลักษณ์โรงเรียน"
                  className="w-full h-full object-cover rounded-lg"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = FALLBACK_IMAGE_URL;
                  }}
                />
              </div>
              <div className="absolute -bottom-2 -right-2 w-7 h-7 bg-amber-500 text-slate-950 rounded-full flex items-center justify-center shadow-xs border-2 border-white">
                <UtensilsCrossed className="w-3.5 h-3.5" />
              </div>
            </div>

            <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 leading-tight">
              ระบบอาหารกลางวันโรงเรียน
            </h1>
            <p className="text-xs text-slate-600 font-semibold mt-1 max-w-xs">
              {schoolName}
            </p>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 mt-2.5 rounded-full bg-amber-100/80 text-amber-900 text-[11px] font-bold border border-amber-300/70">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-700" />
              <span>เข้าสู่ระบบเพื่อใช้งาน (ID & Password)</span>
            </div>
          </div>

          {/* Error Message Alert */}
          {errorMsg && (
            <div className="mb-4 p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-start gap-2 animate-shake">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <div className="flex-1 leading-relaxed">{errorMsg}</div>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username / ID */}
            <div>
              <label 
                htmlFor="input-login-id"
                className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5"
              >
                <User className="w-3.5 h-3.5 text-amber-600" />
                <span>ID / ชื่อผู้ใช้งาน (Username)</span>
              </label>
              <div className="relative">
                <input
                  id="input-login-id"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="เช่น Admin"
                  autoComplete="username"
                  className="w-full pl-3.5 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-amber-500 focus:border-amber-500 font-semibold text-slate-800 transition-all outline-hidden"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label 
                htmlFor="input-login-password"
                className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between"
              >
                <span className="flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-amber-600" />
                  <span>รหัสผ่าน (Password)</span>
                </span>
                <button
                  type="button"
                  onClick={handleQuickFill}
                  className="text-[11px] text-amber-700 hover:text-amber-800 font-bold underline cursor-pointer"
                  title="คลิกเพื่อเติม ID: Admin และ Password อัตโนมัติ"
                >
                  เติมรหัสอัตโนมัติ
                </button>
              </label>
              <div className="relative">
                <input
                  id="input-login-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="กรอกรหัสผ่าน"
                  autoComplete="current-password"
                  className="w-full pl-3.5 pr-10 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-amber-500 focus:border-amber-500 font-semibold text-slate-800 transition-all outline-hidden"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-1 cursor-pointer transition-colors"
                  aria-label={showPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Remember Me Checkbox */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 text-amber-600 rounded-md border-slate-300 focus:ring-amber-500 cursor-pointer"
                />
                <span className="text-xs font-medium text-slate-600">
                  จดจำการเข้าสู่ระบบบนอุปกรณ์นี้
                </span>
              </label>
            </div>

            {/* Submit Button */}
            <button
              id="btn-login-submit"
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 rounded-xl font-extrabold text-sm text-slate-950 bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-500 hover:from-amber-500 hover:to-yellow-600 active:scale-[0.99] shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70 mt-2"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  <span>กำลังตรวจสอบ...</span>
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>เข้าสู่ระบบ (Sign In)</span>
                </>
              )}
            </button>
          </form>

          {/* System Hint Footer */}
          <div className="mt-6 pt-4 border-t border-slate-100 flex flex-col items-center gap-1.5 text-center">
            <div className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>ซิงค์ข้อมูล Google Sheets & Drive เรียลไทม์ทุกอุปกรณ์</span>
            </div>
            <div className="text-[10px] text-slate-400 font-mono">
              รหัสเริ่มต้น: ID = <span className="font-bold text-slate-600">Admin</span> | Password = <span className="font-bold text-slate-600">1159551</span>
            </div>
          </div>
        </div>

        {/* Outer bottom copyright */}
        <p className="text-center text-[11px] text-slate-500 mt-4">
          ระบบบริหารจัดการอาหารกลางวันโรงเรียน &middot; ปลอดภัยและซิงค์คลาวด์สด
        </p>
      </div>
    </div>
  );
};
