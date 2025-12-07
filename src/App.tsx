import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Link, useLocation, Navigate, useParams } from 'react-router-dom';
import { LayoutDashboard, PenTool, Menu, X, Book, Trophy, BarChart2, LogOut, ShieldAlert, Key, Check, BrainCircuit } from 'lucide-react';
import { Dashboard } from './components/Dashboard';
import { TeacherConsole } from './components/TeacherConsole';
import { Achievements } from './components/Achievements';
import { Leaderboard } from './components/Leaderboard';
import { ValuesLearning } from './components/ValuesLearning';
import { Login } from './components/Login';
import { SCHOOL_LOGO_URL, SCHOOL_EMAIL_DOMAIN } from './constants';
import { auth } from './firebaseConfig';
import * as firebaseAuth from 'firebase/auth';
import { getStudentByEmail } from './services/dataService';

// Layout Component
const Layout: React.FC<{ 
  children: React.ReactNode, 
  userRole: 'STUDENT' | 'TEACHER', 
  onLogout: () => void,
  onChangePassword: () => void 
}> = ({ children, userRole, onLogout, onChangePassword }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [imgError, setImgError] = useState(false);
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path ? 'bg-emerald-900 text-white shadow-md' : 'text-emerald-100 hover:bg-emerald-700 hover:text-white';

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans relative">
      {/* Navigation */}
      <nav className="bg-emerald-800 text-white shadow-lg sticky top-0 z-50 border-b-4 border-yellow-400">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-between h-20">
            <div className="flex items-center gap-4">
              <div className="bg-white p-1 rounded-full shadow-md overflow-hidden h-12 w-12 flex items-center justify-center">
                 {/* Use Logo URL or fallback to Book icon (Passport) */}
                 {SCHOOL_LOGO_URL && !imgError ? (
                   <img 
                    src={SCHOOL_LOGO_URL} 
                    alt="School Logo" 
                    className="h-full w-full object-contain" 
                    onError={() => setImgError(true)}
                   />
                 ) : (
                   <Book size={24} className="text-emerald-800" fill="currentColor" />
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
                    <LayoutDashboard size={18} /> Student View
                  </Link>
                  <Link to="/learning" className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${isActive('/learning')}`}>
                    <BrainCircuit size={18} /> Values Lab
                  </Link>
                  <Link to="/achievements" className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${isActive('/achievements')}`}>
                    <Trophy size={18} /> Achievements
                  </Link>
                </>
              )}
              
              <Link to="/leaderboard" className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${isActive('/leaderboard')}`}>
                <BarChart2 size={18} /> Leaderboard
              </Link>
              
              {userRole === 'TEACHER' && (
                <Link to="/teacher" className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${isActive('/teacher')}`}>
                  <PenTool size={18} /> Teacher Console
                </Link>
              )}
              
              <div className="h-6 w-px bg-emerald-600 mx-2"></div>

              <button 
                onClick={onChangePassword}
                className="px-3 py-2 text-emerald-200 hover:text-white hover:bg-emerald-700 rounded-lg transition-colors flex items-center gap-2"
                title="Change Password"
              >
                <Key size={18} />
              </button>

              <button 
                onClick={onLogout}
                className="px-3 py-2 text-emerald-200 hover:text-white hover:bg-emerald-700 rounded-lg transition-colors flex items-center gap-2"
                title="Sign Out"
              >
                <LogOut size={18} />
              </button>
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden flex items-center">
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="text-emerald-100 hover:text-white focus:outline-none"
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
                  <LayoutDashboard size={20} /> Student View
                </Link>
                <Link 
                  to="/learning" 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`block px-3 py-3 rounded-md text-base font-bold flex items-center gap-3 ${isActive('/learning')}`}
                >
                  <BrainCircuit size={20} /> Values Lab
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
              className={`block px-3 py-3 rounded-md text-base font-bold flex items-center gap-3 ${isActive('/leaderboard')}`}
            >
              <BarChart2 size={20} /> Leaderboard
            </Link>
            {userRole === 'TEACHER' && (
              <Link 
                to="/teacher" 
                onClick={() => setIsMobileMenuOpen(false)}
                className={`block px-3 py-3 rounded-md text-base font-bold flex items-center gap-3 ${isActive('/teacher')}`}
              >
                <PenTool size={20} /> Teacher Console
              </Link>
            )}
            <div className="h-px bg-emerald-800 my-2"></div>
            <button 
              onClick={() => { onChangePassword(); setIsMobileMenuOpen(false); }}
              className="w-full text-left block px-3 py-3 rounded-md text-base font-bold flex items-center gap-3 text-emerald-200 hover:bg-emerald-800"
            >
              <Key size={20} /> Change Password
            </button>
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

// Change Password Modal
const ChangePasswordModal: React.FC<{ isOpen: boolean, onClose: () => void }> = ({ isOpen, onClose }) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      if (auth.currentUser) {
        await firebaseAuth.updatePassword(auth.currentUser, newPassword);
        setSuccess(true);
        setTimeout(() => {
          onClose();
          setSuccess(false);
          setNewPassword('');
          setConfirmPassword('');
        }, 2000);
      }
    } catch (err) {
      setError('Failed to update password. You may need to sign out and sign in again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden">
        <div className="bg-emerald-800 p-4 text-white flex justify-between items-center">
          <h3 className="font-bold flex items-center gap-2"><Key size={20} /> Change Password</h3>
          <button onClick={onClose}><X size={20} /></button>
        </div>
        
        {success ? (
          <div className="p-8 text-center text-green-600">
             <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
               <Check size={32} />
             </div>
             <h4 className="font-bold text-lg">Password Updated!</h4>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {error && <div className="bg-red-50 text-red-600 p-3 rounded text-sm">{error}</div>}
            
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">New Password</label>
              <input 
                type="password" 
                className="w-full p-2 border border-gray-300 rounded"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Confirm New Password</label>
              <input 
                type="password" 
                className="w-full p-2 border border-gray-300 rounded"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-emerald-600 text-white font-bold py-2 rounded hover:bg-emerald-700 disabled:bg-gray-400"
            >
              {loading ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

// Wrapper for Student Achievements Route for Teachers
const StudentAchievementsRoute = () => {
  const { id } = useParams();
  if (!id) return <Navigate to="/leaderboard" />;
  return <Achievements studentId={id} isTeacherView={true} />;
};

const App: React.FC = () => {
  const [user, setUser] = useState<any | null>(null);
  const [userRole, setUserRole] = useState<'STUDENT' | 'TEACHER' | null>(null);
  const [studentId, setStudentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthorizedDomain, setIsAuthorizedDomain] = useState(true);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = firebaseAuth.onAuthStateChanged(auth, (currentUser) => {
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

        // 2. Check Role (Student vs Teacher)
        const student = getStudentByEmail(currentUser.email);
        
        if (student) {
          setUserRole('STUDENT');
          setStudentId(student.id);
        } else {
          // If not in student list, assume Teacher
          setUserRole('TEACHER');
          setStudentId(null);
        }
        setUser(currentUser);
      } else {
        setUser(null);
        setUserRole(null);
        setStudentId(null);
        setIsAuthorizedDomain(true);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleLogout = () => {
    firebaseAuth.signOut(auth);
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

  return (
    <Router>
      <Layout 
        userRole={userRole!} 
        onLogout={handleLogout}
        onChangePassword={() => setIsChangePasswordOpen(true)}
      >
        <Routes>
          {userRole === 'STUDENT' && studentId ? (
             <>
               <Route path="/" element={<Dashboard studentId={studentId} />} />
               <Route path="/learning" element={<ValuesLearning />} />
               <Route path="/achievements" element={<Achievements studentId={studentId} />} />
               {/* Redirect teacher routes to home */}
               <Route path="/teacher" element={<Navigate to="/" />} />
             </>
          ) : (
            // TEACHER ROUTES
            <>
               <Route path="/teacher" element={<TeacherConsole />} />
               {/* Redirect root to teacher console for teachers */}
               <Route path="/" element={<Navigate to="/teacher" />} />
               
               {/* Teacher viewing a student's achievements */}
               <Route path="/student-achievements/:id" element={<StudentAchievementsRoute />} />
               
               {/* Regular achievements route redirects to console for teachers */}
               <Route path="/achievements" element={<Navigate to="/teacher" />} />
            </>
          )}
          
          {/* Shared Route - Leaderboard needs userRole to determine behavior */}
          <Route path="/leaderboard" element={<Leaderboard userRole={userRole} />} />
          
        </Routes>
      </Layout>
      <ChangePasswordModal 
        isOpen={isChangePasswordOpen} 
        onClose={() => setIsChangePasswordOpen(false)} 
      />
    </Router>
  );
};

export default App;