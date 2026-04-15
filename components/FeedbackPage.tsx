import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { MessageSquare, Loader2, CheckCircle, AlertTriangle } from 'lucide-react';
import { auth } from '../firebaseConfig';
import { submitFeedback } from '../services/dataService';
import type { FeedbackKind, UserRole } from '../types';

const MAX_LEN = 2000;

interface Props {
  userRole: UserRole;
}

export const FeedbackPage: React.FC<Props> = ({ userRole }) => {
  const [kind, setKind] = useState<FeedbackKind>('feedback');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  if (userRole !== 'STUDENT' && userRole !== 'TEACHER' && userRole !== 'ADMIN') {
    return <Navigate to="/" replace />;
  }

  const isStudent = userRole === 'STUDENT';
  const intro = isStudent
    ? 'Share feedback about the Values Passport or suggest ideas to make it better. Your message goes to school administrators only.'
    : 'Share feedback or suggestions about the Values Passport system. Submissions are visible to administrators in the Admin Console.';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const user = auth.currentUser;
    const email = user?.email?.trim();
    if (!email) {
      setError('You must be signed in to send feedback.');
      return;
    }
    const trimmed = message.trim();
    if (!trimmed) {
      setError('Please enter a message.');
      return;
    }

    setSubmitting(true);
    const result = await submitFeedback({
      kind,
      message: trimmed,
      submitterRole: userRole,
      submitterEmail: email,
    });
    setSubmitting(false);

    if (result.ok) {
      setDone(true);
      setMessage('');
    } else {
      setError(result.userMessage);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 md:p-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-lg bg-emerald-100 text-emerald-800">
            <MessageSquare size={28} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Feedback & suggestions</h1>
        </div>
        <p className="text-gray-600 mb-6">{intro}</p>

        {done ? (
          <div className="flex flex-col items-center gap-4 py-8 text-center">
            <CheckCircle className="text-emerald-600" size={48} />
            <p className="text-lg font-medium text-gray-800">Thank you — your message has been sent.</p>
            <button
              type="button"
              onClick={() => {
                setDone(false);
                setKind('feedback');
              }}
              className="text-emerald-700 font-bold hover:underline"
            >
              Send another
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 text-red-700 text-sm">
                <AlertTriangle size={18} />
                {error}
              </div>
            )}

            <fieldset>
              <legend className="text-sm font-bold text-gray-700 mb-2">Type</legend>
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="kind"
                    checked={kind === 'feedback'}
                    onChange={() => setKind('feedback')}
                    className="text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="text-gray-800">Feedback</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="kind"
                    checked={kind === 'suggestion'}
                    onChange={() => setKind('suggestion')}
                    className="text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="text-gray-800">Suggestion</span>
                </label>
              </div>
            </fieldset>

            <div>
              <label htmlFor="feedback-message" className="block text-sm font-bold text-gray-700 mb-2">
                Message
              </label>
              <textarea
                id="feedback-message"
                value={message}
                onChange={(e) => setMessage(e.target.value.slice(0, MAX_LEN))}
                rows={8}
                maxLength={MAX_LEN}
                placeholder="Write your feedback or idea here…"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-gray-900 placeholder:text-gray-400"
              />
              <p className="text-xs text-gray-500 mt-1">
                {message.length} / {MAX_LEN} characters
              </p>
            </div>

            <button
              type="submit"
              disabled={submitting || !message.trim()}
              className="w-full md:w-auto bg-emerald-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  Sending…
                </>
              ) : (
                'Submit'
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
