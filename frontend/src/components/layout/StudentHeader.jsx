import React from 'react';
import { Link } from 'react-router-dom';

export default function StudentHeader({ user }) {
  return (
    <header className="fixed top-0 w-full z-50 bg-white/85 dark:bg-stone-900/85 backdrop-blur-xl shadow-[0_20px_40px_rgba(0,101,101,0.05)] pl-72">
      <div className="flex justify-between items-center px-12 h-20 w-full">
        <div className="flex items-center gap-12">
          <span className="text-2xl font-serif italic text-teal-800 dark:text-teal-200">Scholastic Ledger</span>
          <nav className="hidden lg:flex items-center gap-8">
            <a href="#" className="text-stone-500 dark:text-stone-400 font-sans text-sm hover:text-teal-600 dark:hover:text-teal-300 transition-all duration-300">Directory</a>
            <a href="#" className="text-stone-500 dark:text-stone-400 font-sans text-sm hover:text-teal-600 dark:hover:text-teal-300 transition-all duration-300">Calendar</a>
            <a href="#" className="text-stone-500 dark:text-stone-400 font-sans text-sm hover:text-teal-600 dark:hover:text-teal-300 transition-all duration-300">Archive</a>
          </nav>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="relative hidden md:block">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-xl">search</span>
            <input 
              type="text" 
              placeholder="Search archive..." 
              className="bg-surface-container border-none rounded-full py-2 pl-10 pr-4 text-sm w-64 focus:ring-2 focus:ring-primary focus:bg-white transition-all"
            />
          </div>
          
          <div className="flex items-center gap-4">
            <button className="p-2 text-on-surface-variant hover:text-primary transition-colors">
              <span className="material-symbols-outlined">notifications</span>
            </button>
            <div className="flex items-center gap-3 pl-4 border-l border-outline-variant/20">
              <div className="text-right">
                <p className="text-xs font-bold text-on-surface leading-none">{user?.name || 'Student'}</p>
                <p className="text-[10px] text-on-surface-variant">Student</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-surface-container-highest overflow-hidden">
                <img 
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuBAbUHWy-C6YrRfpg7H2Fs680hA-CAgZs_Wmimd0RgECSjY_530JpJhx0JDvPIlTk6tmh9enJekJsIwsJbFdNTGLgO3YL03KZh5ozknBOoHEdXxwv8jP2fh93dNFm2VV02NbRQQvc5oWTcp0VHxoHvszc8ToCxHOK2Pi7w191Tw2GajA_VnzqIC4cBoZAln7yVvBW5rxLUmnvVREB3mRzeTYobq9k61HvH0gnByM4KvnGWG-rFB4mbv9FXeL4iR1T_Wvy500tjisvrO" 
                  alt="Student Portrait" 
                  className="w-full h-full object-cover" 
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}