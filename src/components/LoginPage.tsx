import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Mail, 
  Lock, 
  Sparkles, 
  ArrowRight, 
  ShieldCheck, 
  Phone, 
  AlertCircle, 
  ChevronDown, 
  Search, 
  UserCheck,
  Eye,
  EyeOff
} from 'lucide-react';
// @ts-ignore
import laundryBg from '../assets/images/laundry_facility_bg_1783670124451.jpg';

interface LoginPageProps {
  onLoginSuccess: (user: { email: string; name: string; phone: string }) => void;
}

export const ALLOWED_USERS = [
  { email: 'akashsharma2035@gmail.com', name: 'Akash Sharma', phone: '9871596694' },
  { email: 'sanjeevnagriyaachalda@gmail.com', name: 'Sanjeev Kumar', phone: '7351075372' },
  { email: 's.surinder1993@gmail.com', name: 'Surinder Singh', phone: '9999508047' },
  { email: 'msumanku@gmail.com', name: 'Soumya Ranjan', phone: '7978317842' },
  { email: 'parasc188@gmail.com', name: 'Parash Nath Chaudhary', phone: '9007400280' },
  { email: 'djaiswalmarch88@gmail.com', name: 'Dharmendra Kumar', phone: '9560878291' },
  { email: 'aman.enterprises84@gmail.com', name: 'Amandeep', phone: '9873273427' },
  { email: 'rajeee0505@gmail.com', name: 'Mohan raj', phone: '8681868193' },
  { email: 'golugautam530@gmail.com', name: 'Golu Gautam', phone: '6392163774' },
  { email: 'atult3750@gmail.com', name: 'Atul', phone: '8840921885' }
];

export function LoginPage({ onLoginSuccess }: LoginPageProps) {
  const [selectedUser, setSelectedUser] = useState<typeof ALLOWED_USERS[0] | null>(null);
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  // Custom dropdown state
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedUser) {
      setError('Please select your registered Email ID first.');
      return;
    }

    if (!password.trim()) {
      setError('Please enter your password (10-digit mobile number).');
      return;
    }

    setLoading(true);

    // Simulate safe premium verification delay
    setTimeout(() => {
      const cleanPassword = password.trim().replace(/\D/g, '');

      if (selectedUser.phone.replace(/\D/g, '') === cleanPassword) {
        onLoginSuccess(selectedUser);
      } else {
        setError('Incorrect Password (Mobile Number). Please enter your correct registered 10-digit mobile number.');
      }
      setLoading(false);
    }, 850);
  };

  const filteredUsers = ALLOWED_USERS.filter(user => 
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#070b12] text-slate-800 flex flex-col justify-center items-center p-4 relative overflow-hidden font-sans">
      
      {/* 1. Immersive Laundry Room Background Asset */}
      <div className="absolute inset-0 z-0">
        <img 
          src={laundryBg} 
          alt="Orgaearth Premium Facility" 
          className="w-full h-full object-cover filter brightness-[0.6] saturate-[1.25] contrast-[1.05]"
        />
        {/* Soft elegant vignette */}
        <div className="absolute inset-0 bg-gradient-to-tr from-slate-950/40 via-transparent to-slate-950/30" />
      </div>

      {/* 2. Beautiful Neon Blue & Green Glowing Waves passing behind & around card */}
      <div className="absolute inset-0 z-1 pointer-events-none overflow-hidden">
        {/* Dynamic Wave Line 1 */}
        <svg className="absolute w-[180%] h-full left-[-40%] top-[-10%] opacity-45 animate-pulse duration-[8000ms]" viewBox="0 0 1440 800" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M-100,450 C300,550 500,200 900,400 C1300,600 1500,300 1800,500" stroke="url(#wave-grad-blue)" strokeWidth="6" strokeLinecap="round" className="filter blur-[1px]" />
          <path d="M-100,458 C300,558 500,208 900,408 C1300,608 1500,308 1800,508" stroke="url(#wave-grad-green)" strokeWidth="2" strokeLinecap="round" />
          <defs>
            <linearGradient id="wave-grad-blue" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#039BE5" stopOpacity="0" />
              <stop offset="30%" stopColor="#039BE5" stopOpacity="0.8" />
              <stop offset="70%" stopColor="#82C341" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#82C341" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="wave-grad-green" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#82C341" stopOpacity="0" />
              <stop offset="40%" stopColor="#82C341" stopOpacity="0.9" />
              <stop offset="80%" stopColor="#039BE5" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#039BE5" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>

        {/* Dynamic Wave Line 2 (Cross wave) */}
        <svg className="absolute w-[160%] h-full right-[-30%] bottom-[-15%] opacity-35" viewBox="0 0 1440 800" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M1600,600 C1200,400 900,700 500,500 C100,300 -100,500 -300,400" stroke="url(#wave-grad-blue)" strokeWidth="4" />
        </svg>

        {/* Ambient background blur orbs */}
        <div className="absolute top-[25%] left-[20%] w-72 h-72 bg-[#039BE5]/25 rounded-full blur-[130px] animate-pulse duration-[6000ms]" />
        <div className="absolute bottom-[20%] right-[15%] w-80 h-80 bg-[#82C341]/20 rounded-full blur-[140px] animate-pulse duration-[9000ms]" />
      </div>

      {/* 3. Main Glassmorphism Authentication Card Container */}
      <div className="w-full max-w-[435px] relative z-10 px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 35 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.65, type: 'spring', bounce: 0.15 }}
          className="bg-white/88 backdrop-blur-[24px] border border-white/70 rounded-[36px] p-8 md:p-9 shadow-[0_25px_60px_rgba(0,0,0,0.5),0_0_40px_rgba(3,155,229,0.12)] relative overflow-hidden"
        >
          
          {/* Aesthetically aligned brand logo header in horizontal row format as shown in image */}
          <div className="flex items-center justify-center gap-3.5 mb-6 pt-1 select-none">
            {/* Elegant Brand Logo with Leaves & Water Drops */}
            <div className="relative w-14 h-14 shrink-0 flex items-center justify-center">
              <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_2px_5px_rgba(3,155,229,0.2)]" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Green Leaves on Left side (matching the uploaded image) */}
                <path d="M40,55 C30,45 14,18 14,18 C14,18 38,25 45,38 C50,48 44,52 40,55 Z" fill="#82C341" />
                <path d="M34,59 C28,51 14,33 14,33 C14,33 30,37 35,47 C39,55 35,58 34,59 Z" fill="#82C341" opacity="0.8" />
                <path d="M28,68 C22,60 10,45 10,45 C10,45 24,49 28,57 C32,65 28,67 28,68 Z" fill="#82C341" opacity="0.65" />
                
                {/* Blue Water drop curves on Right side */}
                <path d="M48,51 C54,41 70,21 70,21 C70,21 65,41 54,48 C45,54 43,46 48,51 Z" fill="#039BE5" />
                <path d="M51,62 C58,53 74,38 74,38 C74,38 70,54 59,60 C50,65 48,58 51,62 Z" fill="#0288D1" />
                <path d="M54,73 C61,64 77,49 77,49 C77,49 73,65 62,71 C53,76 51,69 54,73 Z" fill="#0056b3" />
                
                <circle cx="44" cy="52" r="4" fill="#0056b3" />
              </svg>
            </div>

            {/* Typography Pairing matched exactly with image: ORGA (green) EARTH (blue) with LAUNDRY SOLUTIONS below */}
            <div className="text-left flex flex-col justify-center">
              <h1 className="text-2xl md:text-3xl font-black tracking-normal leading-none flex items-center">
                <span className="text-[#82C341]">ORGA</span>
                <span className="text-[#039BE5]">EARTH</span>
              </h1>
              <p className="text-[9.5px] text-slate-500 font-extrabold tracking-[0.16em] uppercase mt-1 leading-none font-sans">
                LAUNDRY SOLUTIONS
              </p>
            </div>
          </div>

          {/* Welcome Text Header */}
          <div className="text-center mb-7">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Welcome Back!</h2>
            <p className="text-xs text-slate-450 mt-1">Sign in to continue to your dashboard</p>
          </div>

          {/* Security & Verification Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Email Address custom selection dropdown */}
            <div className="relative" ref={dropdownRef}>
              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1.5 ml-1 font-mono">
                Username or Email
              </label>
              
              <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full px-4 py-3.5 bg-slate-50/70 border text-left rounded-xl transition-all duration-300 flex items-center justify-between outline-none ${
                  isOpen 
                    ? 'border-[#039BE5] bg-white shadow-[0_0_15px_rgba(3,155,229,0.1)] ring-1 ring-[#039BE5]' 
                    : 'border-slate-200/90 hover:border-slate-350 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Mail className={`w-[18px] h-[18px] shrink-0 transition-colors ${selectedUser ? 'text-[#039BE5]' : 'text-slate-400'}`} />
                  <span className={`text-sm truncate font-medium ${selectedUser ? 'text-slate-800' : 'text-slate-400'}`}>
                    {selectedUser ? `${selectedUser.name} (${selectedUser.email})` : 'Select your registered email'}
                  </span>
                </div>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-300 ${isOpen ? 'rotate-180 text-[#039BE5]' : ''}`} />
              </button>

              {/* Highly interactive animated select panel */}
              <AnimatePresence>
                {isOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.98 }}
                    animate={{ opacity: 1, y: 4, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.98 }}
                    transition={{ duration: 0.2 }}
                    className="absolute left-0 right-0 z-50 mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-[0_15px_45px_rgba(16,24,40,0.25)] overflow-hidden"
                  >
                    {/* Filter and search employee list */}
                    <div className="p-3 border-b border-slate-100 flex items-center gap-2 bg-slate-50">
                      <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <input
                        type="text"
                        placeholder="Search by name or email..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="bg-transparent text-xs text-slate-800 placeholder:text-slate-400 outline-none w-full font-medium"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>

                    {/* Filtered items lists */}
                    <div className="max-h-48 overflow-y-auto pr-0.5 py-1 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
                      {filteredUsers.length > 0 ? (
                        filteredUsers.map((user) => (
                          <button
                            key={user.email}
                            type="button"
                            onClick={() => {
                              setSelectedUser(user);
                              setIsOpen(false);
                              setError(null);
                            }}
                            className={`w-full px-4 py-2.5 text-left hover:bg-slate-50 transition-all flex items-center justify-between border-b border-slate-100/50 last:border-0 group cursor-pointer ${
                              selectedUser?.email === user.email ? 'bg-[#039BE5]/5 text-slate-900 font-semibold' : 'text-slate-600'
                            }`}
                          >
                            <div className="min-w-0 pr-2">
                              <p className="text-xs font-bold text-slate-800 group-hover:text-slate-950 transition-colors">
                                {user.name}
                              </p>
                              <p className="text-[10px] text-slate-450 truncate mt-0.5">
                                {user.email}
                              </p>
                            </div>
                            {selectedUser?.email === user.email && (
                              <UserCheck className="w-4 h-4 text-[#039BE5] shrink-0" />
                            )}
                          </button>
                        ))
                      ) : (
                        <div className="p-4 text-center text-xs text-slate-400 font-medium">
                          No matching email ID found.
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Password input box - typing mandatory */}
            <div>
              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1.5 ml-1 font-mono">
                Password (10-Digit Mobile Number)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-[18px] h-[18px]" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value.replace(/\D/g, ''));
                    setError(null);
                  }}
                  placeholder="Enter 10-digit phone number"
                  maxLength={10}
                  className="w-full pl-11 pr-12 py-3.5 bg-slate-50/70 border border-slate-200/90 focus:border-[#039BE5] focus:bg-white rounded-xl focus:ring-1 focus:ring-[#039BE5] outline-none transition-all placeholder:text-slate-400 font-bold tracking-[0.2em] text-slate-800 text-sm"
                />
                
                {/* Password visibility eyes toggle */}
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 outline-none cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                </button>
              </div>
            </div>

            {/* Remember Me and Forgot password inline items */}
            <div className="flex items-center justify-between text-xs pt-1 px-0.5">
              <label className="flex items-center gap-2 text-slate-500 font-medium cursor-pointer select-none">
                <input 
                  type="checkbox" 
                  defaultChecked 
                  className="rounded border-slate-300 text-[#039BE5] focus:ring-[#039BE5] w-3.5 h-3.5 cursor-pointer" 
                />
                Remember me
              </label>
              <button 
                type="button" 
                onClick={() => alert("Registered Password is your 10-digit mobile number. Please check the directories or contact your supervisor if you have forgotten it.")} 
                className="text-[#039BE5] hover:text-[#0288D1] hover:underline font-semibold transition-all cursor-pointer"
              >
                Forgot Password?
              </button>
            </div>

            {/* Error alerts section */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-rose-600 text-xs flex items-start gap-2.5 shadow-sm mt-2"
                >
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
                  <span className="font-semibold leading-relaxed">{error}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Login blue submit button exactly as mockup */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-4 py-3.5 px-5 bg-gradient-to-r from-[#039BE5] to-[#0288D1] hover:from-[#0288D1] hover:to-[#0056b3] text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-blue-500/10 cursor-pointer flex items-center justify-center gap-2 uppercase tracking-wider relative overflow-hidden group disabled:opacity-60 disabled:cursor-not-allowed select-none active:scale-[0.98]"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  Login
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          {/* Aesthetic Divider layout */}
          <div className="flex items-center justify-center gap-3 text-[11px] text-slate-400 font-medium my-6 select-none">
            <div className="h-[1px] bg-slate-200/80 flex-1" />
            <span>or</span>
            <div className="h-[1px] bg-slate-200/80 flex-1" />
          </div>

          {/* Trust/Feature Icons Row */}
          <div className="grid grid-cols-3 gap-2.5 pt-0.5">
            <div className="text-center flex flex-col items-center">
              <div className="p-2.5 bg-[#039BE5]/5 rounded-2xl border border-[#039BE5]/10 mb-1.5 flex items-center justify-center">
                <ShieldCheck className="w-4.5 h-4.5 text-[#039BE5]" />
              </div>
              <span className="text-[10px] font-extrabold text-[#101b33] block">Secure</span>
              <span className="text-[8.5px] text-slate-450 block leading-none mt-0.5">100% Safe</span>
            </div>
            
            <div className="text-center flex flex-col items-center">
              <div className="p-2.5 bg-[#82C341]/5 rounded-2xl border border-[#82C341]/10 mb-1.5 flex items-center justify-center">
                <Sparkles className="w-4.5 h-4.5 text-[#82C341]" />
              </div>
              <span className="text-[10px] font-extrabold text-[#101b33] block">Reliable</span>
              <span className="text-[8.5px] text-slate-450 block leading-none mt-0.5">Real-Time Data</span>
            </div>
            
            <div className="text-center flex flex-col items-center">
              <div className="p-2.5 bg-indigo-50 rounded-2xl border border-indigo-100/50 mb-1.5 flex items-center justify-center">
                <UserCheck className="w-4.5 h-4.5 text-indigo-500" />
              </div>
              <span className="text-[10px] font-extrabold text-[#101b33] block">Efficient</span>
              <span className="text-[8.5px] text-slate-450 block leading-none mt-0.5">Smart Workflow</span>
            </div>
          </div>

          {/* Footer copyright directly on container */}
          <p className="text-[9.5px] text-slate-400 font-semibold text-center mt-7 select-none">
            © 2026 Orgaearth. All rights reserved.
          </p>

        </motion.div>

        {/* Developed By Alok Tiwari Label */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.6 }}
          className="text-center mt-6 select-none"
        >
          <p className="text-xs font-black tracking-[0.25em] text-white/95 uppercase drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] flex items-center justify-center gap-1.5 font-sans">
            Developed by <span className="text-[#82C341]">Alok</span> <span className="text-[#039BE5]">Tiwari</span>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
