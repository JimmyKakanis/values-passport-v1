import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { LayoutDashboard, PenTool, Menu, X, Trophy, BarChart2, Building2, LogOut, ShieldAlert, BrainCircuit, Calendar, Shield, Settings, Archive } from 'lucide-react';
import { Dashboard } from './components/Dashboard';
import { TeacherConsole } from './components/TeacherConsole';
import { AdminConsole } from './components/AdminConsole';
import { Achievements } from './components/Achievements';
import { Leaderboard } from './components/Leaderboard';
import { ValuesLearning } from './components/ValuesLearning';
import { StudentPlanner } from './components/StudentPlanner';
import { Login } from './components/Login';
import { SCHOOL_LOGO_URL, SCHOOL_EMAIL_DOMAIN } from './constants';
import { auth } from './firebaseConfig';
import { 
  onAuthStateChanged, 
  signOut 
} from 'firebase/auth';
import {
  getStudentByEmail,
  getAllTeachers,
  initializeData,
  addStudent,
  isArchivedStudentEmail,
} from './services/dataService';
import { Logo } from './components/Logo';
import { StudentDetailView } from './components/StudentDetailView';
import { NotificationProvider, NotificationController } from './components/NotificationSystem';
import { UserRole } from './types';

import { TeacherCorner } from './components/TeacherCorner/TeacherCorner';
import { FeedbackPage } from './components/FeedbackPage';
import { SettingsPage } from './components/SettingsPage';

// Layout Component
const Layout: React.FC<{ 
  children: React.ReactNode, 
  userRole: UserRole, 
  onLogout: () => void
}> = ({ children, userRole, onLogout }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [imgError, setImgError] = useState(false);
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path ? 'bg-emerald-900 text-white shadow-md' : 'text-emerald-100 hover:bg-emerald-700 hover:text-white';

  const leaderboardNavActive =
    location.pathname === '/leaderboard' || location.pathname.startsWith('/leaderboard/');

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans relative">
      {/* Navigation */}
      <nav className="bg-emerald-800 text-white shadow-lg sticky top-0 z-50 border-b-4 border-yellow-400">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-between h-20">
            <div className="flex items-center gap-4">
              <div className="bg-white p-2 rounded-full shadow-md overflow-hidden h-14 w-14 flex items-center justify-center">
                 {/* Use Logo URL or fallback to Book icon (Passport) */}
                 {SCHOOL_LOGO_URL && !imgError ? (
                   <img 
                    src={SCHOOL_LOGO_URL} 
                    alt="School Logo" 
                    className="h-full w-full object-contain" 
                    onError={() => setImgError(true)}
                   />
                 ) : (
                   <Logo className="text-emerald-800" />
                 )}
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-xl tracking-tight leading-none text-white">Sathya Sai College</span>
                <span className="text-xs text-emerald-200 font-medium uppercase tracking-wider">Values Passport</span>
              </div>
            </div>

            {/* Desktop Menu */}
            <div className="hidden md:flex items-center space-x-2">
              {userRole === 'STUDENT' && (
                <>
                  <Link to="/" className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${isActive('/')}`}>
                    <LayoutDashboard size={18} /> My Passport
                  </Link>
                  <Link to="/learning" className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${isActive('/learning')}`}>
                    <BrainCircuit size={18} /> Values Lab
                  </Link>
                  <Link to="/planner" className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${isActive('/planner')}`}>
                    <Calendar size={18} /> My Planner
                  </Link>
                  <Link to="/achievements" className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${isActive('/achievements')}`}>
                    <Trophy size={18} /> Achievements
                  </Link>
                </>
              )}
              
              <Link to="/leaderboard" className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${leaderboardNavActive ? 'bg-emerald-900 text-white shadow-md' : 'text-emerald-100 hover:bg-emerald-700 hover:text-white'}`}>
                {userRole === 'STUDENT' ? (
                  <>
                    <Building2 size={18} /> School
                  </>
                ) : (
                  <>
                    <BarChart2 size={18} /> Students
                  </>
                )}
              </Link>

              {(userRole === 'TEACHER' || userRole === 'ADMIN') && (
                <>
                  <Link to="/values-development" className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${isActive('/values-development')}`}>
                    <BrainCircuit size={18} /> Values Development
                  </Link>
                  <Link to="/teacher" className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${isActive('/teacher')}`}>
                    <PenTool size={18} /> Teacher Console
                  </Link>
                </>
              )}

              {userRole === 'ADMIN' && (
                <Link to="/admin" className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${isActive('/admin')}`}>
                   <Shield size={18} /> Admin Console
                </Link>
              )}
              
              <div className="h-6 w-px bg-emerald-600 mx-2"></div>

              <Link
                to="/settings"
                className={`p-2 rounded-lg transition-colors flex items-center justify-center ${
                  location.pathname === '/settings'
                    ? 'bg-emerald-900 text-white shadow-md'
                    : 'text-emerald-200 hover:text-white hover:bg-emerald-700'
                }`}
                title="Settings"
                aria-label="Settings"
              >
                <Settings size={20} />
              </Link>
              <button 
                onClick={onLogout}
                className="px-3 py-2 text-emerald-200 hover:text-white hover:bg-emerald-700 rounded-lg transition-colors flex items-center gap-2"
                title="Sign Out"
                aria-label="Sign out"
              >
                <LogOut size={18} />
              </button>
            </div>

            {/* Mobile: settings + menu */}
            <div className="md:hidden flex items-center gap-1">
              <Link
                to="/settings"
                onClick={() => setIsMobileMenuOpen(false)}
                className={`p-2.5 rounded-lg transition-colors ${
                  location.pathname === '/settings'
                    ? 'bg-emerald-900 text-white'
                    : 'text-emerald-100 hover:text-white hover:bg-emerald-700'
                }`}
                title="Settings"
                aria-label="Settings"
              >
                <Settings size={24} />
              </Link>
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="text-emerald-100 hover:text-white focus:outline-none p-1"
                aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
              >
                {isMobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="absolute top-20 left-0 w-full bg-emerald-900 shadow-xl border-t border-emerald-700 z-50 md:hidden px-2 pt-2 pb-3 space-y-1 sm:px-3">
            {userRole === 'STUDENT' && (
              <>
                <Link 
                  to="/" 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`block px-3 py-3 rounded-md text-base font-bold flex items-center gap-3 ${isActive('/')}`}
                >
                  <LayoutDashboard size={20} /> My Passport
                </Link>
                <Link 
                  to="/learning" 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`block px-3 py-3 rounded-md text-base font-bold flex items-center gap-3 ${isActive('/learning')}`}
                >
                  <BrainCircuit size={20} /> Values Lab
                </Link>
                <Link 
                  to="/planner" 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`block px-3 py-3 rounded-md text-base font-bold flex items-center gap-3 ${isActive('/planner')}`}
                >
                  <Calendar size={20} /> My Planner
                </Link>
                <Link 
                  to="/achievements" 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`block px-3 py-3 rounded-md text-base font-bold flex items-center gap-3 ${isActive('/achievements')}`}
                >
                  <Trophy size={20} /> Achievements
                </Link>
              </>
            )}
            <Link 
              to="/leaderboard" 
              onClick={() => setIsMobileMenuOpen(false)}
              className={`block px-3 py-3 rounded-md text-base font-bold flex items-center gap-3 ${leaderboardNavActive ? 'bg-emerald-900 text-white shadow-md' : 'text-emerald-100 hover:bg-emerald-700 hover:text-white'}`}
            >
              {userRole === 'STUDENT' ? (
                <>
                  <Building2 size={20} /> School
                </>
              ) : (
                <>
                  <BarChart2 size={20} /> Students
                </>
              )}
            </Link>
            {(userRole === 'TEACHER' || userRole === 'ADMIN') && (
              <>
                <Link 
                  to="/teacher" 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`block px-3 py-3 rounded-md text-base font-bold flex items-center gap-3 ${isActive('/teacher')}`}
                >
                  <PenTool size={20} /> Teacher Console
                </Link>
              </>
            )}
            {userRole === 'ADMIN' && (
              <Link 
                to="/admin" 
                onClick={() => setIsMobileMenuOpen(false)}
                className={`block px-3 py-3 rounded-md text-base font-bold flex items-center gap-3 ${isActive('/admin')}`}
              >
                <Shield size={20} /> Admin Console
              </Link>
            )}
            <div className="h-px bg-emerald-800 my-2"></div>
            <button 
              onClick={onLogout}
              className="w-full text-left block px-3 py-3 rounded-md text-base font-bold flex items-center gap-3 text-red-200 hover:bg-red-900/50"
            >
              <LogOut size={20} /> Sign Out
            </button>
          </div>
        )}
      </nav>

      {/* Main Content */}
      <main className="flex-grow">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t-4 border-emerald-800 py-8 mt-12">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-blue-900 font-medium text-sm">
            &copy; 2024 Sathya Sai College - Positive Behaviour System
          </p>
          <div className="flex justify-center flex-wrap gap-4 mt-4 text-xs font-bold text-emerald-700 uppercase tracking-widest">
             <span>Truth</span> &bull; <span>Love</span> &bull; <span>Peace</span> &bull; <span>Right Conduct</span> &bull; <span>Non-Violence</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

// Access Denied Component
const AccessDenied: React.FC<{ onLogout: () => void, email: string }> = ({ onLogout, email }) => (
  <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
    <div className="bg-white max-w-md w-full p-8 rounded-xl shadow-xl text-center border-t-8 border-red-500">
       <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
         <ShieldAlert className="w-10 h-10 text-red-600" />
       </div>
       <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Restricted</h1>
       <p className="text-gray-600 mb-6">
         The account <strong>{email}</strong> is not authorized to access the Sathya Sai Values Passport.
       </p>
       <div className="bg-yellow-50 p-4 rounded-lg text-sm text-yellow-800 mb-8 border border-yellow-200">
         Please log in with your school-issued email address ending in <strong>@{SCHOOL_EMAIL_DOMAIN}</strong>.
       </div>
       <button 
         onClick={onLogout}
         className="w-full bg-gray-900 text-white font-bold py-3 rounded-lg hover:bg-gray-800 transition-colors"
       >
         Back to Login
       </button>
    </div>
  </div>
);

const ArchivedAccountMessage: React.FC<{ onLogout: () => void; email: string }> = ({
  onLogout,
  email,
}) => (
  <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
    <div className="bg-white max-w-md w-full p-8 rounded-xl shadow-xl text-center border-t-8 border-amber-500">
      <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
        <Archive className="w-10 h-10 text-amber-700" />
      </div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Account archived</h1>
      <p className="text-gray-600 mb-6">
        The student account for <strong>{email}</strong> has been archived and cannot access the Values
        Passport. Contact the school if you believe this is a mistake.
      </p>
      <button
        onClick={onLogout}
        className="w-full bg-gray-900 text-white font-bold py-3 rounded-lg hover:bg-gray-800 transition-colors"
      >
        Back to Login
      </button>
    </div>
  </div>
);

const App: React.FC = () => {
  const [user, setUser] = useState<any | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [studentId, setStudentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthorizedDomain, setIsAuthorizedDomain] = useState(true);
  const [archivedStudentAccount, setArchivedStudentAccount] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setLoading(true);
      if (currentUser && currentUser.email) {
        // 1. Check Domain Security
        if (!currentUser.email.endsWith(SCHOOL_EMAIL_DOMAIN)) {
           setIsAuthorizedDomain(false);
           setUser(currentUser);
           setLoading(false);
           return;
        }
        setIsAuthorizedDomain(true);

        // Initialize Data
        await initializeData();

        // 2. Check Role Priority: Check TEACHER list first
        // If they are explicitly in the teacher list, give them teacher access.
        const teachers = await getAllTeachers();
        const teacher = teachers.find(t => t.email.toLowerCase() === currentUser.email?.toLowerCase());
        
        // HARDCODED BOOTSTRAP FOR SUPER ADMIN
        if (currentUser.email.toLowerCase() === 'j.kakanis@sathyasai.nsw.edu.au') {
             setArchivedStudentAccount(false);
             setUserRole('ADMIN');
             setStudentId(null);
        } else if (teacher) {
             // Known Teacher
             setArchivedStudentAccount(false);
             setUserRole(teacher.role || 'TEACHER');
             setStudentId(null);
        } else {
             // 3. Everyone else is assumed to be a STUDENT
             if (isArchivedStudentEmail(currentUser.email)) {
                setArchivedStudentAccount(true);
                setUserRole(null);
                setStudentId(null);
             } else {
                setArchivedStudentAccount(false);
                const student = getStudentByEmail(currentUser.email);

                if (student) {
                  setUserRole('STUDENT');
                  setStudentId(student.id);
                } else {
                // 4. New User (Not in Teacher list, Not in Student list) -> Auto-provision as STUDENT
                console.log("New user detected. Auto-provisioning as Student:", currentUser.email);
                
                const newName = currentUser.displayName || currentUser.email?.split('@')[0] || 'New Student';
                
                // Create a new student record automatically
                try {
                    const newStudent = await addStudent({
                        name: newName,
                        email: currentUser.email,
                        grade: 'Year 7', // Default value - can be changed in Admin Console
                        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${newName.replace(' ', '')}&backgroundColor=b6e3f4`
                    });

                    if (newStudent) {
                        setUserRole('STUDENT');
                        setStudentId(newStudent.id);
                    } else {
                        console.error("Failed to auto-provision student");
                        setUserRole('STUDENT');
                    }
                } catch (e) {
                    console.error("Auto-provision error", e);
                    setUserRole('STUDENT');
                }
                }
             }
        }
        setUser(currentUser);
      } else {
        setUser(null);
        setUserRole(null);
        setStudentId(null);
        setIsAuthorizedDomain(true);
        setArchivedStudentAccount(false);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleLogout = () => {
    signOut(auth);
  };

  if (loading) {
    return <div className="min-h-screen bg-emerald-900 flex items-center justify-center text-white font-bold text-xl gap-3">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
      Loading...
    </div>;
  }

  if (!user) {
    return <Login />;
  }

  if (!isAuthorizedDomain && user.email) {
    return <AccessDenied onLogout={handleLogout} email={user.email} />;
  }

  if (archivedStudentAccount && user.email) {
    return <ArchivedAccountMessage onLogout={handleLogout} email={user.email} />;
  }

  return (
    <NotificationProvider>
      <NotificationController studentId={studentId} />
      <Router>
        <Layout 
          userRole={userRole!} 
          onLogout={handleLogout}
        >
        <Routes>
          {userRole === 'STUDENT' && studentId ? (
             <>
               <Route path="/" element={<Dashboard studentId={studentId} />} />
               <Route path="/learning" element={<ValuesLearning studentId={studentId} />} />
               <Route path="/planner" element={<StudentPlanner studentId={studentId} />} />
               <Route path="/achievements" element={<Achievements studentId={studentId} />} />
               {/* Redirect teacher routes to home */}
               <Route path="/teacher" element={<Navigate to="/" />} />
             </>
          ) : userRole === 'ADMIN' ? (
             <>
               <Route path="/admin" element={<AdminConsole />} />
               <Route path="/teacher" element={<TeacherConsole />} />
               <Route path="/values-development" element={<TeacherCorner />} />
               <Route path="/student/:id" element={<StudentDetailView />} />
               <Route path="/" element={<Navigate to="/admin" />} />
             </>
          ) : userRole === 'TEACHER' ? (
            // TEACHER ROUTES
            <>
               <Route path="/teacher" element={<TeacherConsole />} />
               {/* Separate route for Values Development now */}
               <Route path="/values-development" element={<TeacherCorner />} /> 
               {/* Redirect root to teacher console for teachers */}
               <Route path="/" element={<Navigate to="/teacher" />} />
               
               {/* Teacher viewing a student's details */}
               <Route path="/student/:id" element={<StudentDetailView />} />
               
               {/* Regular achievements route redirects to console for teachers */}
               <Route path="/achievements" element={<Navigate to="/teacher" />} />
            </>
          ) : (
            <Route path="*" element={<div className="p-8 text-center bg-white m-4 rounded-lg shadow">Account setup in progress... If this persists, please contact support.</div>} />
          )}
          
          {/* Shared Route - Leaderboard needs userRole to determine behavior */}
          <Route
            path="/leaderboard/*"
            element={<Leaderboard userRole={userRole} studentId={userRole === 'STUDENT' ? studentId : null} />}
          />
          <Route path="/feedback" element={<FeedbackPage userRole={userRole!} />} />
          <Route path="/email-notifications" element={<Navigate to="/settings" replace />} />
          <Route
            path="/settings"
            element={
              <SettingsPage
                preferenceRole={userRole === 'STUDENT' ? 'STUDENT' : 'TEACHER'}
                studentId={userRole === 'STUDENT' ? studentId : null}
                userRole={userRole!}
              />
            }
          />
          
        </Routes>
      </Layout>
      </Router>
    </NotificationProvider>
  );
};

export default App;