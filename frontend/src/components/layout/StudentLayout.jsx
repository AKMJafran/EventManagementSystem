import React from 'react';
import StudentSidebar from './StudentSidebar';
import StudentHeader from './StudentHeader';

export default function StudentLayout({ children, user }) {
  return (
    <div className="bg-background font-body text-on-surface antialiased min-h-screen text-on-surface">
      <StudentSidebar />
      <StudentHeader user={user} />
      <main className="pl-72 pt-20 min-h-screen">
        <div className="max-w-7xl mx-auto px-12 py-12">
          {children}
        </div>
        
        {/* Footer Overlay */}
        <footer className="mt-12 px-12 pb-12">
          <div className="border-t border-outline-variant/10 pt-8 flex flex-col md:flex-row justify-between items-center text-on-surface-variant text-[10px] uppercase tracking-widest font-bold">
            <p>© 2024 Scholastic Ledger University System</p>
            <div className="flex gap-8 mt-4 md:mt-0">
              <a href="#" className="hover:text-primary">Terms of Use</a>
              <a href="#" className="hover:text-primary">Privacy Policy</a>
              <a href="#" className="hover:text-primary">System Status</a>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}