import React, { useState } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup, 
  signOut,
  linkWithCredential,
  OAuthProvider,
  AuthCredential
} from 'firebase/auth';
import { auth, microsoftProvider } from '../firebaseConfig';
import { Loader2, AlertCircle, Key, ChevronDown, ChevronUp } from 'lucide-react';
import { SCHOOL_LOGO_URL, SCHOOL_EMAIL_DOMAIN, TEACHER_TEMP_PASSWORD, STUDENT_TEMP_PASSWORD } from '../constants';
import { isApprovedTeacher, getStudentByEmail } from '../services/dataService';
import { Logo } from './Logo';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [pendingCred, setPendingCred] = useState<AuthCredential | null>(null);
  const [showEmailLogin, setShowEmailLogin] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    // Basic Validation
    if (!email.toLowerCase().endsWith(SCHOOL_EMAIL_DOMAIN)) {
      setError(`Only emails ending in @${SCHOOL_EMAIL_DOMAIN} are allowed.`);
      return;
    }

    setLoading(true);

    try {
      if (pendingCred) {
        // LINKING FLOW:
        // 1. Sign in with the Email/Password first
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        
        // 2. Link the pending Microsoft credential
        await linkWithCredential(userCredential.user, pendingCred);
        
        setSuccessMsg('Account linked successfully! Logging you in...');
        setPendingCred(null);
        return;
      }

      // 1. Try to login normally first
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err: any) {
      // 2. If login fails, check if we should auto-provision a new account
      // This happens if the user is in our "approved list" and uses the CORRECT TEMP PASSWORD for their role
      const isTeacher = isApprovedTeacher(email);
      const isStudent = !!getStudentByEmail(email);

      let canProvision = false;

      if (isTeacher && password === TEACHER_TEMP_PASSWORD) {
        canProvision = true;
      } else if (isStudent && password === STUDENT_TEMP_PASSWORD) {
        canProvision = true;
      }

      if (canProvision) {
         try {
            await createUserWithEmailAndPassword(auth, email, password);
            setSuccessMsg('Account activated! Logging you in...');
            // Login happens automatically after creation
            return;
         } catch (createError: any) {
            // If they try to provision an existing account, just tell them to use their real password
            if (createError.code === 'auth/email-already-in-use') {
               setError('Account already active. Please use your personal password (not the temp one).');
            } else {
               console.error("Provisioning error:", createError);
               setError('Failed to activate account. Please contact support.');
            }
         }
      } else {
        // Standard error handling
        if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
           setError(pendingCred 
             ? 'Incorrect password. Please try again to link your account.' 
             : 'Invalid email or password.'
           );
        } else if (err.code === 'auth/too-many-requests') {
           setError('Too many attempts. Please try again later.');
        } else {
           setError('Failed to authenticate. Please check your connection.');
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleMicrosoftLogin = async () => {
    setError('');
    setSuccessMsg('');
    setLoading(true);

    try {
      const result = await signInWithPopup(auth, microsoftProvider);
      const user = result.user;

      if (user.email && user.email.toLowerCase().endsWith(SCHOOL_EMAIL_DOMAIN)) {
        setSuccessMsg('Microsoft account verified! Logging you in...');
      } else {
        // Domain mismatch - sign out immediately
        await signOut(auth);
        setError(`Access denied. Please use your @${SCHOOL_EMAIL_DOMAIN} account.`);
      }
    } catch (err: any) {
      console.error("Microsoft login error:", err);
      
      // Handle account linking (Email/Password exists, user tried Microsoft)
      if (err.code === 'auth/account-exists-with-different-credential') {
         // Get the pending credential from the error
         const pendingCredential = OAuthProvider.credentialFromError(err);
         // Get the email from the error object to pre-fill the form
         const email = err.customData?.email;
         
         if (pendingCredential && email) {
            setPendingCred(pendingCredential);
            setEmail(email);
            setShowEmailLogin(true); // Ensure form is visible for linking
            setError(`An account already exists for ${email}. Please enter your Values Passport password to link your Microsoft account.`);
            return;
         }
      }

      // Detailed error message for debugging
      const errorMessage = `Error: ${err.message} (Code: ${err.code})`;
      
      if (err.code === 'auth/configuration-not-found') {
        setError('Microsoft login is not yet configured in the Firebase Console.');
      } else if (err.code === 'auth/popup-closed-by-user') {
        setError('Login cancelled. Please try again.');
      } else {
        // Show full error details to help debug the AAD/Redirect issue
        setError(`Failed to sign in with Microsoft. ${errorMessage}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-emerald-900 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="bg-emerald-800 p-8 text-center border-b-4 border-yellow-400">
           <div className="bg-white p-3 rounded-full shadow-lg inline-block mb-4 h-24 w-24 flex items-center justify-center">
             {SCHOOL_LOGO_URL && !imgError ? (
               <img 
                 src={SCHOOL_LOGO_URL} 
                 alt="Logo" 
                 className="h-full w-full object-contain" 
                 onError={() => setImgError(true)}
               />
             ) : (
               <Logo className="w-16 h-16 text-emerald-800" />
             )}
           </div>
           <h1 className="text-2xl font-bold text-white">Values Passport</h1>
           <p className="text-emerald-200 text-sm font-medium mt-1">Sathya Sai College</p>
        </div>

        {/* Form */}
        <div className="p-8 space-y-6">
           <div className="text-center mb-6">
             <h2 className="text-xl font-bold text-gray-800">Sign In</h2>
             <p className="text-gray-500 text-sm">Please sign in with your school account.</p>
           </div>

           {error && (
             <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm flex items-center gap-2">
               <AlertCircle size={16} /> {error}
             </div>
           )}

           {successMsg && (
             <div className="bg-green-50 text-green-600 p-3 rounded-lg text-sm flex items-center gap-2">
               <Loader2 size={16} className="animate-spin" /> {successMsg}
             </div>
           )}

           {/* Microsoft Login - Primary Action */}
           <div className={pendingCred ? 'opacity-50 pointer-events-none' : ''}>
              <button
                type="button"
                onClick={handleMicrosoftLogin}
                disabled={loading || !!pendingCred}
                className="w-full bg-white hover:bg-gray-50 text-gray-700 font-bold py-3 px-4 border border-gray-300 rounded-lg shadow-sm transition-all flex items-center justify-center gap-3 disabled:bg-gray-50 disabled:text-gray-400"
              >
                {loading && !pendingCred ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <>
                    <svg className="w-5 h-5" viewBox="0 0 23 23">
                      <path fill="#f3f3f3" d="M0 0h23v23H0z"/>
                      <path fill="#f35325" d="M1 1h10v10H1z"/>
                      <path fill="#81bc06" d="M12 1h10v10H12z"/>
                      <path fill="#05a6f0" d="M1 12h10v10H1z"/>
                      <path fill="#ffba08" d="M12 12h10v10H12z"/>
                    </svg>
                    Sign in with Microsoft 365
                  </>
                )}
              </button>
           </div>

           {/* Divider or Spacer */}
           <div className="relative my-6">
             <div className="absolute inset-0 flex items-center">
               <div className="w-full border-t border-gray-300"></div>
             </div>
             <div className="relative flex justify-center text-sm">
               <span className="px-2 bg-white text-gray-500 font-medium">
                 {pendingCred ? 'Account Linking Required' : 'or'}
               </span>
             </div>
           </div>

           {/* Email/Password Section (Hidden by default unless linking) */}
           {(showEmailLogin || pendingCred) && (
             <form onSubmit={handleSubmit} className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-300">
               <div>
                 <label className="block text-sm font-bold text-gray-700 mb-1">Email Address</label>
                 <input
                   type="email"
                   required
                   value={email}
                   onChange={(e) => setEmail(e.target.value)}
                   // Disable email input during linking to ensure they link the correct account
                   readOnly={!!pendingCred}
                   className={`w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all text-gray-900 ${pendingCred ? 'bg-gray-100' : 'bg-white'}`}
                   placeholder={`name@${SCHOOL_EMAIL_DOMAIN}`}
                 />
               </div>

               <div>
                 <label className="block text-sm font-bold text-gray-700 mb-1">Password</label>
                 <input
                   type="password"
                   required
                   value={password}
                   onChange={(e) => setPassword(e.target.value)}
                   className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all text-gray-900 bg-white"
                   placeholder="••••••••"
                   minLength={6}
                   autoFocus={!!pendingCred}
                 />
               </div>

               <button
                 type="submit"
                 disabled={loading}
                 className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-lg shadow-md transition-all flex items-center justify-center gap-2 disabled:bg-gray-400"
               >
                 {loading ? <Loader2 className="animate-spin" /> : (pendingCred ? 'Link Account' : 'Sign In')}
               </button>

               {/* Only show "First time logging in" if NOT linking */}
               {!pendingCred && (
                 <div className="bg-blue-50 p-4 rounded-lg text-xs text-blue-800 border border-blue-100 flex gap-3 mt-4">
                    <Key size={24} className="flex-shrink-0 text-blue-600 mt-1" />
                    <div>
                      <strong className="block mb-1 text-sm text-blue-900">First time logging in?</strong>
                      <p className="mb-1">Use your email and the student code below:</p>
                      <div className="grid grid-cols-1 gap-1">
                         <div className="flex justify-between bg-white px-2 py-1 rounded border border-blue-200">
                           <span>Students:</span> <code className="font-bold text-blue-600">{STUDENT_TEMP_PASSWORD}</code>
                         </div>
                      </div>
                    </div>
                 </div>
               )}
             </form>
           )}

           {/* Toggle for Admin/Email Login */}
           {!pendingCred && (
             <div className="text-center pt-2">
               <button 
                 type="button"
                 onClick={() => setShowEmailLogin(!showEmailLogin)}
                 className="text-gray-400 hover:text-emerald-600 text-xs font-medium flex items-center justify-center gap-1 mx-auto transition-colors"
               >
                 {showEmailLogin ? (
                   <>
                     Hide Email Login <ChevronUp size={12} />
                   </>
                 ) : (
                   <>
                     Login with Email / Admin <ChevronDown size={12} />
                   </>
                 )}
               </button>
             </div>
           )}

        </div>
      </div>
    </div>
  );
};
