
import React, { useEffect, useMemo, useState } from 'react';
import { BookOpen, RefreshCw, Lightbulb, CheckCircle2, XCircle, BrainCircuit, GraduationCap, ArrowRight, Lock, Loader2, Save, Keyboard } from 'lucide-react';
import { CORE_VALUES, SUBJECTS } from '../constants';
import { CoreValue, ValueReflection } from '../types';
import { addValueReflection, subscribeToValueReflections, updateQuizScore } from '../services/dataService';
import {
  countWords,
  pickDailySubValue,
  pickStudentReflectionPrompt,
  REFLECTION_TEXT_MAX,
} from '../services/studentEngagement';
import { ValuesTypingGame } from './typing/ValuesTypingGame';

interface Props {
  studentId?: string | null;
  onQuizComplete?: () => void;
}

export const ValuesLearning: React.FC<Props> = ({ studentId, onQuizComplete }) => {
  const [activeTab, setActiveTab] = useState<'EXPLORE' | 'SPIN' | 'QUIZ' | 'TYPING'>('EXPLORE');

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-8">
      {/* Page Header */}
      <div className="text-center space-y-4 mb-8">
        <h1 className="text-4xl font-bold text-blue-900 flex items-center justify-center gap-3">
          <BrainCircuit className="w-10 h-10 text-emerald-600" />
          The Values Lab
        </h1>
        <p className="text-gray-600 max-w-2xl mx-auto text-lg">
          Explore the meanings behind our core values, challenge yourself to think creatively, test your knowledge, and race your typing speed.
        </p>
      </div>

      {/* Navigation Tabs */}
      <div className="flex justify-center mb-8">
        <div className="bg-white p-1 rounded-xl shadow-sm border border-gray-200 inline-flex flex-wrap justify-center">
          <button
            onClick={() => setActiveTab('EXPLORE')}
            className={`px-6 py-3 rounded-lg font-bold flex items-center gap-2 transition-all ${
              activeTab === 'EXPLORE' ? 'bg-emerald-100 text-emerald-800' : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            <BookOpen size={20} /> Values Explorer
          </button>
          <button
            onClick={() => setActiveTab('SPIN')}
            className={`px-6 py-3 rounded-lg font-bold flex items-center gap-2 transition-all ${
              activeTab === 'SPIN' ? 'bg-yellow-100 text-yellow-800' : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            <Lightbulb size={20} /> Idea Generator
          </button>
          <button
            onClick={() => setActiveTab('QUIZ')}
            className={`px-6 py-3 rounded-lg font-bold flex items-center gap-2 transition-all ${
              activeTab === 'QUIZ' ? 'bg-blue-100 text-blue-800' : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            <GraduationCap size={20} /> Pop Quiz
          </button>
          <button
            onClick={() => setActiveTab('TYPING')}
            className={`px-6 py-3 rounded-lg font-bold flex items-center gap-2 transition-all ${
              activeTab === 'TYPING' ? 'bg-violet-100 text-violet-800' : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            <Keyboard size={20} /> Speed Type
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden min-h-[500px]">
        {activeTab === 'EXPLORE' && <ValuesExplorer studentId={studentId} />}
        {activeTab === 'SPIN' && <IdeaGenerator />}
        {activeTab === 'QUIZ' && <ValuesQuiz studentId={studentId} onComplete={onQuizComplete} />}
        {activeTab === 'TYPING' && <ValuesTypingGame studentId={studentId} />}
      </div>
    </div>
  );
};

// --- SUB-COMPONENT: EXPLORER ---
const ValuesExplorer: React.FC<{ studentId?: string | null }> = ({ studentId }) => {
  const [selectedValue, setSelectedValue] = useState<CoreValue>(CoreValue.TRUTH);
  const [selectedSubValue, setSelectedSubValue] = useState(() =>
    pickDailySubValue(
      studentId ?? 'guest',
      CoreValue.TRUTH,
      CORE_VALUES[CoreValue.TRUTH].subValues
    )
  );
  const [reflectionText, setReflectionText] = useState('');
  const [reflections, setReflections] = useState<ValueReflection[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const def = CORE_VALUES[selectedValue];
  const wordCount = countWords(reflectionText);

  useEffect(() => {
    if (!studentId) return;
    const unsub = subscribeToValueReflections(studentId, setReflections);
    return () => unsub();
  }, [studentId]);

  useEffect(() => {
    setSelectedSubValue(
      pickDailySubValue(studentId ?? 'guest', selectedValue, def.subValues)
    );
    setReflectionText('');
    setSaveSuccess(false);
    setSaveError(null);
  }, [selectedValue, def.subValues, studentId]);

  const valueReflections = useMemo(
    () => reflections.filter((r) => r.coreValue === selectedValue).slice(0, 10),
    [reflections, selectedValue]
  );

  const reflectionPrompt = useMemo(
    () =>
      pickStudentReflectionPrompt(
        studentId ?? 'guest',
        selectedSubValue || 'this value'
      ),
    [studentId, selectedSubValue]
  );

  const handleSaveReflection = async () => {
    if (!studentId) {
      setSaveError('Sign in as a student to save reflections.');
      return;
    }
    if (!selectedSubValue || !reflectionText.trim()) {
      setSaveError('Choose a sub-value and write your reflection.');
      return;
    }
    setSaving(true);
    setSaveError(null);
    const result = await addValueReflection(
      studentId,
      selectedValue,
      selectedSubValue,
      reflectionText
    );
    setSaving(false);
    if (result.ok) {
      setReflectionText('');
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } else {
      setSaveError(result.userMessage);
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-full min-h-[600px]">
      <div className="w-full md:w-1/4 bg-gray-50 border-r border-gray-200 p-4 space-y-2">
        <h3 className="font-bold text-gray-400 text-xs uppercase tracking-wider mb-4 px-2">Core Values</h3>
        {Object.values(CORE_VALUES).map(val => (
          <button
            key={val.id}
            onClick={() => setSelectedValue(val.id)}
            className={`w-full text-left px-4 py-4 rounded-xl font-bold transition-all flex items-center gap-3 ${
              selectedValue === val.id
                ? `${val.color} shadow-md transform scale-105`
                : 'text-gray-600 hover:bg-white hover:shadow-sm'
            }`}
          >
            {val.id}
          </button>
        ))}
      </div>

      <div className="flex-1 p-8 bg-white overflow-y-auto">
        <div className={`inline-block px-4 py-1 rounded-full text-sm font-bold mb-4 ${def.color}`}>
          {def.id}
        </div>
        <h2 className="text-3xl font-bold text-blue-900 mb-2">{def.description.split(':')[0]}</h2>
        <p className="text-gray-600 text-lg mb-8 italic">{def.description.split(':')[1]}</p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
          <div>
            <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
              <CheckCircle2 className="text-emerald-500" size={20} /> Key Sub-Values
            </h3>
            <div className="flex flex-wrap gap-2">
              {def.subValues.map(sub => (
                <button
                  key={sub}
                  type="button"
                  onClick={() => setSelectedSubValue(sub)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                    selectedSubValue === sub
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                      : 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-emerald-50'
                  }`}
                >
                  {sub}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-blue-50 p-6 rounded-xl border border-blue-100 h-fit">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-blue-900">Reflect on your values</h3>
              <span className="text-[10px] text-blue-800/80 flex items-center gap-1">
                <Lock size={10} /> Private
              </span>
            </div>
            <p className="text-blue-800 mb-1 text-[10px] uppercase tracking-wide font-bold opacity-80">
              Today&apos;s question
            </p>
            <p className="text-blue-800 mb-4 text-sm leading-relaxed">
              {reflectionPrompt.prefix}
              <strong>{selectedSubValue || 'this sub-value'}</strong>
              {reflectionPrompt.suffix}
            </p>
            <textarea
              value={reflectionText}
              onChange={(e) => setReflectionText(e.target.value.slice(0, REFLECTION_TEXT_MAX))}
              rows={5}
              disabled={!studentId}
              className="w-full rounded-lg border border-blue-200 bg-white p-3 text-sm text-gray-800 focus:ring-2 focus:ring-blue-400 outline-none disabled:bg-gray-50"
              placeholder={
                studentId ? reflectionPrompt.placeholder : 'Sign in to save reflections'
              }
            />
            <div className="flex justify-between items-center mt-2 text-xs text-blue-800/80">
              <span>{wordCount} words</span>
              <span>{reflectionText.length}/{REFLECTION_TEXT_MAX}</span>
            </div>
            {saveError && <p className="text-xs text-red-600 mt-2">{saveError}</p>}
            {saveSuccess && (
              <p className="text-xs text-emerald-700 font-medium mt-2">Reflection saved.</p>
            )}
            <button
              type="button"
              onClick={handleSaveReflection}
              disabled={saving || !studentId || !reflectionText.trim()}
              className="mt-3 flex items-center gap-2 bg-blue-700 hover:bg-blue-600 text-white font-bold px-4 py-2 rounded-lg text-sm disabled:opacity-50"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              Save reflection
            </button>
          </div>
        </div>

        {valueReflections.length > 0 && (
          <div>
            <h3 className="font-bold text-gray-800 mb-4">My reflections — {def.id}</h3>
            <ul className="space-y-3">
              {valueReflections.map((r) => (
                <li
                  key={r.id}
                  className="p-4 rounded-xl border border-gray-100 bg-gray-50 text-sm"
                >
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span className="font-bold text-emerald-800">{r.subValue}</span>
                    <span>{new Date(r.createdAt).toLocaleDateString()}</span>
                  </div>
                  <p className="text-gray-700 whitespace-pre-wrap">{r.text}</p>
                  <span className="text-[10px] text-gray-400">{r.wordCount} words</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

// --- SUB-COMPONENT: GENERATOR ---
const IdeaGenerator: React.FC = () => {
  const [idea, setIdea] = useState<{ value: string, subValue: string, subject: string } | null>(null);
  const [isSpinning, setIsSpinning] = useState(false);

  const generateIdea = () => {
    setIsSpinning(true);
    setIdea(null);
    
    // Simulate spinning delay
    setTimeout(() => {
      const values = Object.values(CORE_VALUES);
      const randomValueDef = values[Math.floor(Math.random() * values.length)];
      const randomSubValue = randomValueDef.subValues[Math.floor(Math.random() * randomValueDef.subValues.length)];
      const randomSubject = SUBJECTS[Math.floor(Math.random() * SUBJECTS.length)];
      
      setIdea({
        value: randomValueDef.id,
        subValue: randomSubValue,
        subject: randomSubject
      });
      setIsSpinning(false);
    }, 800);
  };

  return (
    <div className="flex flex-col items-center justify-center p-12 min-h-[600px] bg-gradient-to-br from-yellow-50 to-orange-50">
      <div className="text-center max-w-lg mb-12">
        <h2 className="text-3xl font-bold text-gray-800 mb-4">Stuck for ideas?</h2>
        <p className="text-gray-600">
          Spin the wheel to get a random combination of a Value and a Location. 
          Then, brainstorm: <strong>How could you demonstrate this?</strong>
        </p>
      </div>

      <button
        onClick={generateIdea}
        disabled={isSpinning}
        className="group relative px-8 py-4 bg-yellow-400 text-blue-900 font-bold text-xl rounded-full shadow-lg hover:shadow-xl hover:bg-yellow-300 transform transition-all active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
      >
        <span className="flex items-center gap-3">
          <RefreshCw size={24} className={isSpinning ? "animate-spin" : "group-hover:rotate-180 transition-transform duration-500"} />
          {isSpinning ? "Spinning..." : "Spin for Inspiration"}
        </span>
      </button>

      {idea && (
        <div className="mt-12 w-full max-w-2xl animate-fade-in-up">
          <div className="bg-white rounded-2xl shadow-xl border-2 border-yellow-200 p-8 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-yellow-400 via-orange-400 to-red-400"></div>
            
            <div className="text-center space-y-6">
              <h3 className="text-gray-500 font-bold uppercase tracking-widest text-sm">Your Challenge</h3>
              
              <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-8 text-2xl md:text-3xl font-bold text-blue-900">
                <span className="bg-blue-50 px-6 py-3 rounded-xl text-blue-700 border border-blue-100">
                  {idea.subValue}
                </span>
                <ArrowRight className="text-gray-300 hidden md:block" />
                <span className="text-gray-300 md:hidden">in</span>
                <span className="bg-emerald-50 px-6 py-3 rounded-xl text-emerald-700 border border-emerald-100">
                  {idea.subject}
                </span>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg text-gray-600 italic">
                "What specific action could you take to show <strong>{idea.subValue}</strong> while you are in <strong>{idea.subject}</strong>?"
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// --- SUB-COMPONENT: QUIZ ---
const ValuesQuiz: React.FC<{ studentId?: string | null, onComplete?: () => void }> = ({ studentId, onComplete }) => {
  const [currentQuestion, setCurrentQuestion] = useState<{ subValue: string, correctValue: CoreValue } | null>(null);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0); // This is essentially "points per question" now (1, 2, 3...)
  const [lives, setLives] = useState(4);
  const [gameOver, setGameOver] = useState(false);
  const [feedback, setFeedback] = useState<'CORRECT' | 'WRONG' | null>(null);
  const [newHighScore, setNewHighScore] = useState(false);

  // Initialize first question
  React.useEffect(() => {
    if (!currentQuestion) generateQuestion();
  }, []);

  const generateQuestion = () => {
    const values = Object.values(CORE_VALUES);
    const randomValueDef = values[Math.floor(Math.random() * values.length)];
    const randomSubValue = randomValueDef.subValues[Math.floor(Math.random() * randomValueDef.subValues.length)];
    
    setCurrentQuestion({
      subValue: randomSubValue,
      correctValue: randomValueDef.id as CoreValue
    });
    setFeedback(null);
  };

  const handleRestart = () => {
    setScore(0);
    setStreak(0);
    setLives(4);
    setGameOver(false);
    setNewHighScore(false);
    generateQuestion();
  };

  const handleAnswer = (answer: CoreValue) => {
    if (!currentQuestion || gameOver) return;

    // Check if the answer is correct by seeing if the selected Value contains the sub-value
    const selectedValueDef = CORE_VALUES[answer];
    const isCorrect = selectedValueDef.subValues.includes(currentQuestion.subValue);

    if (isCorrect) {
      setFeedback('CORRECT');
      
      const pointsToAdd = streak + 1;
      setScore(s => s + pointsToAdd);
      setStreak(s => s + 1);
      
      setTimeout(generateQuestion, 1500);
    } else {
      setFeedback('WRONG');
      const newLives = lives - 1;
      setLives(newLives);
      setStreak(0); // Reset streak on wrong answer? Or just penalty? Request said "streak goes to 1" for next right answer implying reset.

      if (newLives <= 0) {
        handleGameOver();
      } else {
         // Continue game if lives remain
         setTimeout(() => {
            setFeedback(null); 
            // Optional: skip to next question or let them retry same? Usually skip or retry. 
            // Let's generate new question to prevent spamming guessing.
            generateQuestion(); 
         }, 1500);
      }
    }
  };

  const handleGameOver = async () => {
    setGameOver(true);
    if (studentId) {
      try {
        const isNewHigh = await updateQuizScore(studentId, score);
        if (isNewHigh) {
          setNewHighScore(true);
          // Trigger refresh of leaderboard data if available
          if (onComplete) onComplete();
        }
      } catch (e) {
        console.error("Failed to save high score", e);
      }
    }
  };

  if (!currentQuestion) return null;

  return (
    <div className="flex flex-col items-center justify-center p-8 bg-blue-50 min-h-[600px]">
      <div className="w-full max-w-2xl">
        {/* Score Board */}
        <div className="flex justify-between items-center mb-8 bg-white p-4 rounded-xl shadow-sm">
          <div className="flex flex-col">
             <div className="text-gray-500 font-bold text-xs uppercase">Score</div>
             <div className="text-blue-900 text-3xl font-bold">{score}</div>
          </div>
          
          <div className="flex flex-col items-center">
             <div className="text-gray-500 font-bold text-xs uppercase">Multiplier</div>
             <div className="flex items-center gap-1 text-yellow-600 font-bold">
               x{streak + 1}
             </div>
          </div>

          <div className="flex flex-col items-end">
             <div className="text-gray-500 font-bold text-xs uppercase">Lives</div>
             <div className="flex gap-1">
               {[...Array(4)].map((_, i) => (
                 <div key={i} className={`w-6 h-6 rounded-full border-2 border-red-500 flex items-center justify-center transition-all ${i < lives ? 'bg-red-500 text-white' : 'bg-transparent text-gray-200'}`}>
                   {i < lives && <span className="text-[10px]">❤️</span>}
                 </div>
               ))}
             </div>
          </div>
        </div>

        {gameOver ? (
             <div className="bg-white rounded-2xl shadow-xl p-12 text-center animate-in zoom-in duration-300">
               <h2 className="text-4xl font-bold text-blue-900 mb-2">Game Over!</h2>
               <p className="text-gray-500 mb-8">You ran out of lives.</p>
               
               <div className="bg-gray-100 p-6 rounded-xl mb-8 inline-block min-w-[200px]">
                 <div className="text-sm text-gray-500 font-bold uppercase mb-1">Final Score</div>
                 <div className="text-5xl font-bold text-blue-900">{score}</div>
                 {newHighScore && (
                   <div className="mt-2 bg-yellow-400 text-blue-900 text-xs font-bold px-2 py-1 rounded-full inline-block animate-bounce">
                     🏆 NEW HIGH SCORE!
                   </div>
                 )}
               </div>

               <div>
                 <button 
                   onClick={handleRestart}
                   className="px-8 py-3 bg-emerald-600 text-white font-bold rounded-full shadow-lg hover:bg-emerald-700 transition-transform transform hover:scale-105"
                 >
                   Play Again
                 </button>
               </div>
             </div>
        ) : (
          <>
            {/* Question Card */}
            <div className="bg-white rounded-2xl shadow-xl border-b-8 border-blue-900 overflow-hidden text-center p-12 mb-8 relative">
               {feedback === 'CORRECT' && (
                 <div className="absolute inset-0 bg-green-100/90 flex items-center justify-center z-10 animate-in fade-in zoom-in duration-200">
                   <div className="text-green-700 font-bold text-2xl flex flex-col items-center gap-2">
                     <CheckCircle2 size={64} />
                     Correct! (+{streak})
                   </div>
                 </div>
               )}
               {feedback === 'WRONG' && (
                 <div className="absolute inset-0 bg-red-100/90 flex items-center justify-center z-10 animate-in fade-in zoom-in duration-200">
                   <div className="text-red-700 font-bold text-2xl flex flex-col items-center gap-2">
                     <XCircle size={64} />
                     Wrong!
                   </div>
                 </div>
               )}

               <h3 className="text-gray-400 uppercase tracking-widest font-bold text-xs mb-4">Where does this belong?</h3>
               <div className="text-4xl md:text-5xl font-bold text-blue-900 mb-2">{currentQuestion.subValue}</div>
            </div>

            {/* Options */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.values(CORE_VALUES).map(val => (
                <button
                  key={val.id}
                  onClick={() => handleAnswer(val.id)}
                  disabled={feedback !== null}
                  className={`p-4 rounded-xl font-bold text-lg shadow-sm border-2 transition-all hover:-translate-y-1 hover:shadow-md ${
                    val.color.replace('text-', 'border-').replace('bg-', 'hover:bg-')
                  } bg-white text-gray-700`}
                >
                  {val.id}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// --- SUB-COMPONENT: QUIZ ---
