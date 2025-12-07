
import React, { useState } from 'react';
import { BookOpen, RefreshCw, Lightbulb, CheckCircle2, XCircle, BrainCircuit, GraduationCap, ArrowRight } from 'lucide-react';
import { CORE_VALUES, SUBJECTS } from '../constants';
import { CoreValue } from '../types';

export const ValuesLearning: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'EXPLORE' | 'SPIN' | 'QUIZ'>('EXPLORE');

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-8">
      {/* Page Header */}
      <div className="text-center space-y-4 mb-8">
        <h1 className="text-4xl font-bold text-blue-900 flex items-center justify-center gap-3">
          <BrainCircuit className="w-10 h-10 text-emerald-600" />
          The Values Lab
        </h1>
        <p className="text-gray-600 max-w-2xl mx-auto text-lg">
          Explore the meanings behind our core values, challenge yourself to think creatively, and test your knowledge.
        </p>
      </div>

      {/* Navigation Tabs */}
      <div className="flex justify-center mb-8">
        <div className="bg-white p-1 rounded-xl shadow-sm border border-gray-200 inline-flex">
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
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden min-h-[500px]">
        {activeTab === 'EXPLORE' && <ValuesExplorer />}
        {activeTab === 'SPIN' && <IdeaGenerator />}
        {activeTab === 'QUIZ' && <ValuesQuiz />}
      </div>
    </div>
  );
};

// --- SUB-COMPONENT: EXPLORER ---
const ValuesExplorer: React.FC = () => {
  const [selectedValue, setSelectedValue] = useState<CoreValue>(CoreValue.TRUTH);
  const def = CORE_VALUES[selectedValue];

  return (
    <div className="flex flex-col md:flex-row h-full min-h-[600px]">
      {/* Sidebar */}
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

      {/* Content Area */}
      <div className="flex-1 p-8 bg-white overflow-y-auto">
        <div className={`inline-block px-4 py-1 rounded-full text-sm font-bold mb-4 ${def.color}`}>
          {def.id}
        </div>
        <h2 className="text-3xl font-bold text-blue-900 mb-2">{def.description.split(':')[0]}</h2>
        <p className="text-gray-600 text-lg mb-8 italic">{def.description.split(':')[1]}</p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div>
            <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
              <CheckCircle2 className="text-emerald-500" size={20} /> Key Sub-Values
            </h3>
            <div className="flex flex-wrap gap-2">
              {def.subValues.map(sub => (
                <span 
                  key={sub} 
                  className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium border border-gray-200 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 transition-colors cursor-default"
                >
                  {sub}
                </span>
              ))}
            </div>
          </div>

          <div className="bg-blue-50 p-6 rounded-xl border border-blue-100 h-fit">
            <h3 className="font-bold text-blue-900 mb-4">Reflection Question</h3>
            <p className="text-blue-800 mb-6">
              "When was the last time you demonstrated <strong>{def.subValues[Math.floor(Math.random() * def.subValues.length)]}</strong>? How did it make you feel?"
            </p>
            <div className="w-full h-32 bg-white rounded-lg border border-blue-200 p-3 text-sm text-gray-400 italic">
              (Think about your answer...)
            </div>
          </div>
        </div>
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
const ValuesQuiz: React.FC = () => {
  const [currentQuestion, setCurrentQuestion] = useState<{ subValue: string, correctValue: CoreValue } | null>(null);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [feedback, setFeedback] = useState<'CORRECT' | 'WRONG' | null>(null);

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

  const handleAnswer = (answer: CoreValue) => {
    if (!currentQuestion) return;

    if (answer === currentQuestion.correctValue) {
      setFeedback('CORRECT');
      setScore(s => s + 10);
      setStreak(s => s + 1);
      setTimeout(generateQuestion, 1500);
    } else {
      setFeedback('WRONG');
      setStreak(0);
    }
  };

  if (!currentQuestion) return null;

  return (
    <div className="flex flex-col items-center justify-center p-8 bg-blue-50 min-h-[600px]">
      <div className="w-full max-w-2xl">
        {/* Score Board */}
        <div className="flex justify-between items-center mb-8 bg-white p-4 rounded-xl shadow-sm">
          <div className="text-gray-500 font-bold text-sm">Score: <span className="text-blue-900 text-xl">{score}</span></div>
          <div className="flex items-center gap-2">
            <span className="text-gray-500 font-bold text-sm">Streak:</span>
            <div className="flex">
              {[...Array(streak)].map((_, i) => (
                <StarIcon key={i} className="w-5 h-5 text-yellow-400 fill-current" />
              ))}
              {streak === 0 && <span className="text-gray-300">-</span>}
            </div>
          </div>
        </div>

        {/* Question Card */}
        <div className="bg-white rounded-2xl shadow-xl border-b-8 border-blue-900 overflow-hidden text-center p-12 mb-8 relative">
           {feedback === 'CORRECT' && (
             <div className="absolute inset-0 bg-green-100/90 flex items-center justify-center z-10 animate-in fade-in zoom-in duration-200">
               <div className="text-green-700 font-bold text-2xl flex flex-col items-center gap-2">
                 <CheckCircle2 size={64} />
                 Correct!
               </div>
             </div>
           )}
           {feedback === 'WRONG' && (
             <div className="absolute inset-0 bg-red-100/90 flex items-center justify-center z-10 animate-in fade-in zoom-in duration-200">
               <div className="text-red-700 font-bold text-2xl flex flex-col items-center gap-2">
                 <XCircle size={64} />
                 Try Again!
               </div>
               <button 
                onClick={() => setFeedback(null)}
                className="absolute bottom-10 px-6 py-2 bg-white rounded-full shadow text-sm font-bold text-red-700 hover:bg-red-50"
               >
                 Retry
               </button>
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
      </div>
    </div>
  );
};

const StarIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);
