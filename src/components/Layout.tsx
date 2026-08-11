import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Home as HomeIcon,
  CalendarDays, 
  UsersRound, 
  BookOpen, 
  ArchiveRestore,
  Image as ImageIcon,
  Menu,
  X,
  Map,
  History,
  Users,
  HeartHandshake,
  LogOut,
  LogIn,
  ShieldCheck,
  Info
} from 'lucide-react';
import { cn } from '../lib/utils';
import { isFirebaseConfigured } from '../lib/firebase';
import { useAuth } from '../lib/auth';
import { LoginModal } from './LoginModal';

const navItems = [
  { name: 'Home', path: '/', icon: HomeIcon },
  { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { name: 'Programs', path: '/programs', icon: CalendarDays },
  { name: 'Kohhran Committee', path: '/elders', icon: UsersRound },
  { name: 'Upa Bial', path: '/upa-bial', icon: Map },
  { name: 'Directory', path: '/directory', icon: BookOpen },
  { name: 'Committee', path: '/committee', icon: Users },
  { name: 'Fellowship', path: '/fellowship', icon: HeartHandshake },
  { name: 'Archive', path: '/archive', icon: History },
  { name: 'Records', path: '/records', icon: ArchiveRestore },
  { name: 'Gallery', path: '/gallery', icon: ImageIcon },
  { name: 'About Us', path: '/about', icon: Info },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const location = useLocation();
  const { user, profile, isAdmin, logout } = useAuth();

  const [visitorCount, setVisitorCount] = useState(() => {
    const saved = localStorage.getItem('bethlehem_visitor_count');
    const baseCount = saved ? parseInt(saved, 10) : 1284;
    return isNaN(baseCount) ? 1284 : baseCount;
  });

  React.useEffect(() => {
    // Increment visitor count once per session
    if (!sessionStorage.getItem('bethlehem_visited_session')) {
      sessionStorage.setItem('bethlehem_visited_session', 'true');
      setVisitorCount(prev => {
        const next = prev + 1;
        localStorage.setItem('bethlehem_visitor_count', next.toString());
        return next;
      });
    }
  }, []);

  return (
    <div className="min-h-screen bg-[#f5f5f0] text-[#2d2d2a] font-serif flex">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-20 bg-gray-900/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-30 w-64 bg-[#5A5A40] text-white border-r border-[#5A5A40] transform transition-transform duration-300 lg:translate-x-0 lg:static lg:inset-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex items-center justify-between h-20 px-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-transparent flex items-center justify-center overflow-hidden">
              <img 
                src="/logo.png" 
                alt="Bethlehem Kohhran Logo" 
                className="w-full h-full object-contain rounded-full mix-blend-screen scale-105" 
              />
            </div>
            <div>
              <span className="text-lg font-semibold tracking-tight uppercase block leading-tight">Bethlehem</span>
              <span className="text-[10px] uppercase tracking-[0.2em] opacity-80 font-sans block leading-none mt-1">Kohhran</span>
            </div>
          </div>
          <button className="lg:hidden" onClick={() => setSidebarOpen(false)}>
            <X className="w-5 h-5 text-white/70" />
          </button>
        </div>
        <nav className="p-4 space-y-1 font-sans">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.name}
                to={item.path}
                className={cn(
                  "flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-colors uppercase tracking-widest",
                  isActive 
                    ? "bg-white/20 text-white" 
                    : "text-white/70 hover:bg-white/10 hover:text-white"
                )}
                onClick={() => setSidebarOpen(false)}
              >
                <Icon className={cn("w-5 h-5 mr-3 shrink-0", isActive ? "text-white" : "text-white/70")} />
                {item.name}
              </Link>
            );
          })}
          {isAdmin && (
            <Link
              to="/users"
              className={cn(
                "flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-colors uppercase tracking-widest mt-4 border border-white/10",
                location.pathname === '/users'
                  ? "bg-amber-500/20 text-amber-300" 
                  : "text-amber-200/70 hover:bg-amber-500/10 hover:text-amber-300"
              )}
              onClick={() => setSidebarOpen(false)}
            >
              <ShieldCheck className={cn("w-5 h-5 mr-3 shrink-0", location.pathname === '/users' ? "text-amber-300" : "text-amber-200/70")} />
              Users
            </Link>
          )}
        </nav>
        <div className="absolute bottom-0 w-full p-6 border-t border-white/10 font-sans">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center italic font-serif">
               {profile ? profile.fullName.charAt(0).toUpperCase() : (user ? user.email?.charAt(0).toUpperCase() : 'G')}
             </div>
             <div>
               <p className="text-xs font-semibold uppercase tracking-widest">
                 {isAdmin ? 'Admin' : (user ? 'User' : 'Guest')}
               </p>
               <p className="text-[10px] opacity-70 truncate w-32">
                 {profile ? profile.fullName : (user ? user.email : 'Not signed in')}
               </p>
             </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 pb-16 lg:pb-0 relative bg-[#fcfaf7]">
        {/* Background Banners */}
        <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden opacity-40 flex justify-center items-center">
          {/* Desktop Banner (md and up) */}
          <img 
            src="/KOHHRAN.jpg" 
            alt="" 
            className="hidden md:block w-full h-full object-cover object-center"
          />
          {/* Mobile Banner (below md) */}
          <img 
            src="/BETHLEHEM.jpg" 
            alt="" 
            className="block md:hidden w-full h-full object-cover object-center"
          />
        </div>

        <header className="relative z-10 h-16 bg-white/80 backdrop-blur-md border-b border-[#e0e0d5] flex items-center justify-between px-4 sm:px-8 shrink-0">
          <button 
            className="lg:hidden p-2 -ml-2 text-stone-500 hover:bg-stone-100 rounded-md flex items-center gap-2"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="w-6 h-6" />
            <span className="text-xs font-bold uppercase tracking-widest text-[#5A5A40]">Menu</span>
          </button>
          
          <div className="flex-1 flex justify-end gap-3 items-center">
            {!isFirebaseConfigured && (
              <div className="flex items-center text-[10px] font-bold uppercase tracking-widest bg-[#fcfaf7] border border-[#ecece0] text-stone-500 px-3.5 py-1.5 rounded-full font-sans">
                <span className="w-2 h-2 rounded-full bg-amber-500 mr-2 animate-pulse"></span>
                Preview Mode
              </div>
            )}
            
            {user ? (
              <button 
                onClick={() => logout()}
                className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest bg-stone-100 hover:bg-stone-200 text-stone-600 px-4 py-2 rounded-full font-sans transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sign Out
              </button>
            ) : (
              <button 
                onClick={() => setIsLoginModalOpen(true)}
                className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest bg-[#5A5A40] hover:bg-[#4a4a35] text-white px-4 py-2 rounded-full font-sans transition-colors"
              >
                <LogIn className="w-3.5 h-3.5" />
                Sign In
              </button>
            )}
          </div>
        </header>

        <main className="relative z-10 flex-1 overflow-auto p-4 sm:p-8 flex flex-col">
          <div className="max-w-7xl mx-auto w-full flex-1">
            {children}
          </div>
          <footer className="mt-8 pt-6 pb-2 border-t border-[#e0e0d5]/50 flex flex-col items-center gap-4 text-xs text-stone-500 font-medium">
            <div className="flex items-center gap-10">
              <a 
                href="https://www.facebook.com/share/1LSKRfoNbs/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-[#1877F2] transition-colors p-2 rounded-full hover:bg-[#1877F2]/10"
                aria-label="Facebook"
              >
                <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path fillRule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" clipRule="evenodd" />
                </svg>
              </a>
              <a 
                href="https://www.instagram.com/bethlehemkohhran?igsh=NzRqNjN2dzZnbWc3" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-[#E4405F] transition-colors p-2 rounded-full hover:bg-[#E4405F]/10"
                aria-label="Instagram"
              >
                <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path fillRule="evenodd" d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z" clipRule="evenodd" />
                </svg>
              </a>
            </div>
            
            <div className="flex flex-col items-center gap-1.5 font-sans">
              <span className="text-[10px] uppercase tracking-widest text-stone-500 font-bold">
                Site Visitors
              </span>
              <div className="inline-flex items-center overflow-hidden rounded-md border border-[#ecece0] text-[11px] font-bold shadow-sm">
                <span className="bg-stone-700 text-white px-2.5 py-1 uppercase tracking-wider text-[9px]">visitors</span>
                <span className="bg-[#5A5A40] text-white px-2.5 py-1">{visitorCount.toLocaleString()}</span>
              </div>
            </div>

            <div className="mt-2">
              Powered by <a href="https://wa.me/9612447703" target="_blank" rel="noopener noreferrer" className="text-[#5A5A40] hover:underline font-bold">MegaBits</a>
            </div>
          </footer>
        </main>
      </div>

      {isLoginModalOpen && (
        <LoginModal onClose={() => setIsLoginModalOpen(false)} />
      )}
    </div>
  );
}
