import React, { useState, useEffect } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup, 
  getRedirectResult,
  signOut,
  linkWithCredential,
  OAuthProvider,
  AuthCredential,
  sendPasswordResetEmail,
  verifyPasswordResetCode,
  confirmPasswordReset,
} from 'firebase/auth';
import { auth, microsoftProvider } from '../firebaseConfig';
import { Loader2, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { SCHOOL_LOGO_URL, SCHOOL_EMAIL_DOMAIN, TEACHER_TEMP_PASSWORD, STUDENT_TEMP_PASSWORD } from '../constants';
import { isApprovedTeacher, getStudentByEmail } from '../services/dataService';
import { Logo } from './Logo';

// #region agent log
const agentDebugLog = (payload: {
  location: string;
  message: string;
  hypothesisId: string;
  data?: Record<string, unknown>;
  runId?: string;
}) => {
  fetch('http://127.0.0.1:7734/ingest/93bf1b1a-8bad-4cdd-ba40-041ea4a0ad57', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '663475' },
    body: JSON.stringify({
      sessionId: '663475',
      timestamp: Date.now(),
      ...payload,
    }),
  }).catch(() => {});
};
// #endregion

/** Firebase auth action params may arrive on the query string (including handleCodeInApp redirects). */
function parseAuthActionFromLocation(): { mode: string | null; oobCode: string | null } {
  const searchParams = new URLSearchParams(window.location.search);
  let mode = searchParams.get('mode');
  let oobCode = searchParams.get('oobCode');
  if (!mode && window.location.hash.includes('?')) {
    const q = window.location.hash.split('?')[1];
    const h = new URLSearchParams(q);
    mode = mode ?? h.get('mode');
    oobCode = oobCode ?? h.get('oobCode');
  }
  return { mode, oobCode };
}

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [pendingCred, setPendingCred] = useState<AuthCredential | null>(null);
  const [showEmailLogin, setShowEmailLogin] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);
  const [passwordResetOob, setPasswordResetOob] = useState<string | null>(null);
  const [passwordResetEmailHint, setPasswordResetEmailHint] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  // Shared Logic: Handle Successful Microsoft Login (Popup or Redirect)
  const handleMicrosoftSuccess = async (user: any) => {
      if (user.email && user.email.toLowerCase().endsWith(SCHOOL_EMAIL_DOMAIN)) {
        setSuccessMsg('Microsoft account verified! Logging you in...');
      } else {
        // Domain mismatch - sign out immediately
        await signOut(auth);
        setError(`Access denied. Please use your @${SCHOOL_EMAIL_DOMAIN} account.`);
      }
  };

  // Shared Logic: Handle Microsoft Login Errors (Popup or Redirect)
  const handleMicrosoftError = (err: any) => {
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
      } else if (err.code === 'auth/popup-blocked') {
        setError('Popup blocked. Retrying with redirect...');
      } else {
        // Show full error details to help debug the AAD/Redirect issue
        setError(`Failed to sign in with Microsoft. ${errorMessage}`);
      }
  };

  // Check for Redirect Result on Mount
  useEffect(() => {
    const checkRedirect = async () => {
      // Avoid checking redirect if we are already in a loading state initiated by something else
      setLoading(true); 
      try {
        const result = await getRedirectResult(auth);
        if (result) {
          await handleMicrosoftSuccess(result.user);
        }
      } catch (err: any) {
        handleMicrosoftError(err);
      } finally {
        setLoading(false);
      }
    };
    checkRedirect();
  }, []);

  // Complete password reset when opened via Firebase email link (handleCodeInApp).
  useEffect(() => {
    const { mode, oobCode } = parseAuthActionFromLocation();
    // #region agent log
    agentDebugLog({
      location: 'Login.tsx:resetLinkEffect',
      message: 'parse auth action landing',
      hypothesisId: 'H4',
      data: {
        mode,
        hasOobCode: !!oobCode,
        oobCodeLength: oobCode?.length ?? 0,
        searchEmpty: window.location.search.length === 0,
        hashHasQuery: window.location.hash.includes('?'),
      },
    });
    // #endregion
    if (mode !== 'resetPassword' || !oobCode) return;

    const dedupeKey = `vp_pwd_reset_oob:${oobCode}`;
    if (typeof sessionStorage !== 'undefined' && sessionStorage.getItem(dedupeKey)) {
      // #region agent log
      agentDebugLog({
        location: 'Login.tsx:resetLinkEffect:deduped',
        message: 'skipped duplicate reset verify (sessionStorage / StrictMode)',
        hypothesisId: 'H3',
        data: { oobCodeLength: oobCode.length },
      });
      // #endregion
      return;
    }
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem(dedupeKey, '1');
    }

    let alive = true;
    const run = async () => {
      // #region agent log
      agentDebugLog({
        location: 'Login.tsx:verifyPasswordResetCode:before',
        message: 'about to verify password reset oobCode',
        hypothesisId: 'H1',
        data: { oobCodeLength: oobCode.length },
      });
      // #endregion
      try {
        const verifiedEmail = await verifyPasswordResetCode(auth, oobCode);
        if (!alive) return;
        // #region agent log
        agentDebugLog({
          location: 'Login.tsx:verifyPasswordResetCode:after',
          message: 'verifyPasswordResetCode ok',
          hypothesisId: 'H1',
          data: {
            emailDomain: verifiedEmail.includes('@')
              ? verifiedEmail.split('@')[1]?.toLowerCase()
              : 'unknown',
          },
        });
        // #endregion
        setPasswordResetOob(oobCode);
        setPasswordResetEmailHint(verifiedEmail);
        setShowEmailLogin(true);
        setSuccessMsg('Choose a new password below.');
        window.history.replaceState({}, '', window.location.pathname + window.location.hash.split('?')[0]);
      } catch (err: unknown) {
        if (!alive) return;
        const code = err && typeof err === 'object' && 'code' in err ? String((err as { code?: string }).code) : 'unknown';
        // #region agent log
        agentDebugLog({
          location: 'Login.tsx:verifyPasswordResetCode:catch',
          message: 'verifyPasswordResetCode failed',
          hypothesisId: 'H1',
          data: { firebaseCode: code },
        });
        // #endregion
        if (code === 'auth/expired-action-code' || code === 'auth/invalid-action-code') {
          setError(
            'That reset link has expired or was already used. Request a new link with Forgot password (or your email scanner may have opened the link first—try again from a personal device).',
          );
        } else {
          setError('Could not validate the password reset link. Please use Forgot password to send a new one.');
        }
      }
    };
    void run();
    return () => {
      alive = false;
    };
  }, []);

  const sendPasswordResetFromForm = async () => {
    setError('');
    setSuccessMsg('');
    if (!email.toLowerCase().endsWith(SCHOOL_EMAIL_DOMAIN)) {
      setError(`Only emails ending in @${SCHOOL_EMAIL_DOMAIN} are allowed.`);
      return;
    }
    setLoading(true);
    const continueUrl = `${window.location.origin}${window.location.pathname || '/'}`;
    // #region agent log
    agentDebugLog({
      location: 'Login.tsx:sendPasswordResetEmail:before',
      message: 'sending password reset email',
      hypothesisId: 'H2',
      data: { continueUrl, handleCodeInApp: true },
    });
    // #endregion
    try {
      await sendPasswordResetEmail(auth, email, {
        url: continueUrl,
        handleCodeInApp: true,
      });
      setForgotSent(true);
      setSuccessMsg('If that account exists, a reset email was sent. Check your inbox.');
    } catch (err: unknown) {
      const code = err && typeof err === 'object' && 'code' in err ? String((err as { code?: string }).code) : 'unknown';
      // #region agent log
      agentDebugLog({
        location: 'Login.tsx:sendPasswordResetEmail:catch',
        message: 'sendPasswordResetEmail failed',
        hypothesisId: 'H2',
        data: { firebaseCode: code },
      });
      // #endregion
      setError('Could not send reset email. Try again later or contact support.');
    } finally {
      setLoading(false);
    }
  };

  const handleCompletePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    if (!passwordResetOob) return;
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    // #region agent log
    agentDebugLog({
      location: 'Login.tsx:confirmPasswordReset:before',
      message: 'confirmPasswordReset',
      hypothesisId: 'H3',
      data: { passwordLength: newPassword.length },
    });
    // #endregion
    try {
      await confirmPasswordReset(auth, passwordResetOob, newPassword);
      // #region agent log
      agentDebugLog({
        location: 'Login.tsx:confirmPasswordReset:after',
        message: 'confirmPasswordReset ok',
        hypothesisId: 'H3',
      });
      // #endregion
      setPasswordResetOob(null);
      setPasswordResetEmailHint(null);
      setNewPassword('');
      setConfirmNewPassword('');
      setForgotSent(false);
      setShowForgotPassword(false);
      setSuccessMsg('Password updated. Sign in with your new password below.');
    } catch (err: unknown) {
      const code = err && typeof err === 'object' && 'code' in err ? String((err as { code?: string }).code) : 'unknown';
      // #region agent log
      agentDebugLog({
        location: 'Login.tsx:confirmPasswordReset:catch',
        message: 'confirmPasswordReset failed',
        hypothesisId: 'H3',
        data: { firebaseCode: code },
      });
      // #endregion
      setError('Could not save the new password. Request a fresh reset link.');
    } finally {
      setLoading(false);
    }
  };

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

  useEffect(() => {
    if (passwordResetEmailHint) {
      setEmail(passwordResetEmailHint);
    }
  }, [passwordResetEmailHint]);

  const handleMicrosoftLogin = async () => {
    setError('');
    setSuccessMsg('');
    setLoading(true);

    try {
      const result = await signInWithPopup(auth, microsoftProvider);
      await handleMicrosoftSuccess(result.user);
    } catch (err: any) {
      if (err.code === 'auth/popup-blocked') {
        setError('Popup blocked by your browser. Please allow popups for this site and try again.');
      } else {
        handleMicrosoftError(err);
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
               {!passwordResetOob && loading ? (
                 <Loader2 size={16} className="animate-spin" />
               ) : null}{' '}
               {successMsg}
             </div>
           )}

           {passwordResetOob ? (
             <form onSubmit={handleCompletePasswordReset} className="space-y-4">
               <h3 className="font-bold text-gray-800">Set a new password</h3>
               <p className="text-sm text-gray-600">Your email: {passwordResetEmailHint ? '***@' + (passwordResetEmailHint.split('@')[1] ?? '') : '—'}</p>
               <div>
                 <label className="block text-sm font-bold text-gray-700 mb-1">New password</label>
                 <input
                   type="password"
                   required
                   value={newPassword}
                   onChange={(e) => setNewPassword(e.target.value)}
                   className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 text-gray-900 bg-white"
                   minLength={6}
                   autoComplete="new-password"
                 />
               </div>
               <div>
                 <label className="block text-sm font-bold text-gray-700 mb-1">Confirm new password</label>
                 <input
                   type="password"
                   required
                   value={confirmNewPassword}
                   onChange={(e) => setConfirmNewPassword(e.target.value)}
                   className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 text-gray-900 bg-white"
                   minLength={6}
                   autoComplete="new-password"
                 />
               </div>
               <button
                 type="submit"
                 disabled={loading}
                 className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-lg shadow-md transition-all flex items-center justify-center gap-2 disabled:bg-gray-400"
               >
                 {loading ? <Loader2 className="animate-spin" /> : 'Save new password'}
               </button>
             </form>
           ) : (
             <>
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

               {!pendingCred && (
                 <div className="text-right">
                   <button
                     type="button"
                     onClick={() => {
                       setShowForgotPassword(!showForgotPassword);
                       setForgotSent(false);
                       setError('');
                     }}
                     className="text-xs font-medium text-emerald-700 hover:text-emerald-900"
                   >
                     {showForgotPassword ? 'Cancel reset' : 'Forgot password?'}
                   </button>
                 </div>
               )}

               {showForgotPassword && !pendingCred && (
                 <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
                   <p className="text-xs text-gray-600">
                     Sends a reset link that opens this app (recommended for school email; avoids some broken Firebase
                     pages).
                   </p>
                   {forgotSent ? (
                     <p className="text-sm text-green-700 font-medium">Check your email for the reset link.</p>
                   ) : (
                     <button
                       type="button"
                       onClick={() => void sendPasswordResetFromForm()}
                       disabled={loading || !email}
                       className="w-full bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold py-2 rounded-lg disabled:bg-gray-300"
                     >
                       Send reset email
                     </button>
                   )}
                 </div>
               )}

               <button
                 type="submit"
                 disabled={loading}
                 className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-lg shadow-md transition-all flex items-center justify-center gap-2 disabled:bg-gray-400"
               >
                 {loading ? <Loader2 className="animate-spin" /> : (pendingCred ? 'Link Account' : 'Sign In')}
               </button>

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

             </>
           )}

        </div>
      </div>
    </div>
  );
};
