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
                src="https://i.ibb.co/CxGJXN7/logo.png" 
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
      <div className="flex-1 flex flex-col min-w-0 pb-16 lg:pb-0">
        <header className="h-20 bg-white border-b border-[#e0e0d5] flex items-center justify-between px-4 sm:px-8 shrink-0">
          <button 
            className="lg:hidden p-2 -ml-2 text-stone-500 hover:bg-stone-100 rounded-md"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="w-6 h-6" />
          </button>
          
          <div className="flex-1 flex justify-end gap-3 items-center">
            {!isFirebaseConfigured && (
              <div className="flex items-center text-[10px] font-bold uppercase tracking-widest bg-[#fcfaf7] border border-[#ecece0] text-stone-500 px-4 py-2 rounded-full font-sans">
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

        <main className="flex-1 overflow-auto p-4 sm:p-8">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>

      {isLoginModalOpen && (
        <LoginModal onClose={() => setIsLoginModalOpen(false)} />
      )}
    </div>
  );
}
