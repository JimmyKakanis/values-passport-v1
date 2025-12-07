import React, { useState } from 'react';
import { SCENARIOS, Scenario } from '../../data/teacherResources';
import { Check, X, RefreshCw, ChevronRight, PlayCircle } from 'lucide-react';
import { CoreValue } from '../../types';

export const ScenarioSimulator: React.FC = () => {
  const [activeScenarioIndex, setActiveScenarioIndex] = useState<number>(0);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);

  const scenario = SCENARIOS[activeScenarioIndex];
  const isLastScenario = activeScenarioIndex === SCENARIOS.length - 1;

  const handleSelectOption = (optionId: string) => {
    if (showFeedback) return;
    setSelectedOptionId(optionId);
    setShowFeedback(true);
  };

  const handleNext = () => {
    if (isLastScenario) {
        // Reset
        setActiveScenarioIndex(0);
        setHasStarted(false);
    } else {
        setActiveScenarioIndex(prev => prev + 1);
    }
    setSelectedOptionId(null);
    setShowFeedback(false);
  };

  if (!hasStarted) {
    return (
        <div className="flex flex-col items-center justify-center h-[500px] bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl border border-indigo-100 p-8 text-center">
            <div className="bg-white p-6 rounded-full shadow-xl mb-6 transform hover:scale-110 transition-transform duration-500">
                <PlayCircle className="w-16 h-16 text-indigo-600" />
            </div>
            <h2 className="text-3xl font-bold text-indigo-900 mb-3">Classroom Simulator</h2>
            <p className="text-indigo-600 max-w-md mx-auto mb-8 text-lg">
                Practice identifying values in real-world situations. 
                There are {SCENARIOS.length} scenarios to explore.
            </p>
            <button 
                onClick={() => setHasStarted(true)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 px-10 rounded-full shadow-lg transition-all text-lg flex items-center gap-2"
            >
                Start Simulation <ChevronRight />
            </button>
        </div>
    );
  }

  const selectedOption = scenario.options.find(o => o.id === selectedOptionId);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      
      {/* Progress Bar */}
      <div className="flex items-center gap-4 text-sm font-bold text-gray-400">
        <span>Scenario {activeScenarioIndex + 1} of {SCENARIOS.length}</span>
        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div 
                className="h-full bg-indigo-500 transition-all duration-500" 
                style={{ width: `${((activeScenarioIndex + 1) / SCENARIOS.length) * 100}%` }} 
            />
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
        {/* Scenario Header */}
        <div className="bg-indigo-900 p-8 text-white">
            <h3 className="text-2xl font-bold mb-3">{scenario.title}</h3>
            <p className="text-indigo-100 text-lg leading-relaxed">{scenario.description}</p>
        </div>

        {/* Options */}
        <div className="p-8 space-y-4">
            <h4 className="font-bold text-gray-700 mb-2 uppercase tracking-wide text-xs">How would you respond?</h4>
            {scenario.options.map((option) => {
                const isSelected = selectedOptionId === option.id;
                const isCorrect = option.isCorrect;
                
                let containerClass = "border-2 border-gray-100 hover:border-indigo-200 hover:bg-indigo-50";
                let icon = null;

                if (showFeedback) {
                    if (isSelected) {
                        containerClass = isCorrect 
                            ? "bg-green-50 border-green-500 ring-1 ring-green-500 text-gray-900" 
                            : "bg-red-50 border-red-500 ring-1 ring-red-500 text-gray-900";
                    } else if (isCorrect) {
                        // Highlight the correct answer if they picked wrong
                         containerClass = "bg-green-50 border-green-200 border-dashed opacity-70 text-gray-900";
                    } else {
                        containerClass = "opacity-50 border-gray-100 grayscale text-gray-400";
                    }
                }

                return (
                    <button
                        key={option.id}
                        disabled={showFeedback}
                        onClick={() => handleSelectOption(option.id)}
                        className={`w-full text-left p-4 rounded-xl transition-all flex items-start gap-4 ${containerClass} text-gray-800`}
                    >
                        <div className={`mt-0.5 w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                            isSelected && showFeedback 
                                ? (isCorrect ? 'border-green-600 bg-green-600 text-white' : 'border-red-600 bg-red-600 text-white')
                                : 'border-gray-300 text-transparent'
                        }`}>
                            {isSelected && showFeedback && (isCorrect ? <Check size={14} /> : <X size={14} />)}
                        </div>
                        <div className="flex-1">
                            <span className={`text-lg ${showFeedback && isSelected ? 'font-bold' : ''}`}>{option.text}</span>
                        </div>
                    </button>
                );
            })}
        </div>

        {/* Feedback Section */}
        {showFeedback && selectedOption && (
            <div className={`p-8 border-t ${selectedOption.isCorrect ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'} animate-in slide-in-from-bottom-4 duration-300`}>
                <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-full ${selectedOption.isCorrect ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'}`}>
                        {selectedOption.isCorrect ? <Check size={24} /> : <X size={24} />}
                    </div>
                    <div className="flex-1">
                        <h4 className={`font-bold text-lg mb-1 ${selectedOption.isCorrect ? 'text-green-900' : 'text-red-900'}`}>
                            {selectedOption.isCorrect ? 'Correct!' : 'Not quite right...'}
                        </h4>
                        <p className={`${selectedOption.isCorrect ? 'text-green-800' : 'text-red-800'} mb-4`}>
                            {selectedOption.feedback}
                        </p>
                        
                        <button 
                            onClick={handleNext}
                            className={`px-6 py-2 rounded-lg font-bold text-white shadow-md transition-transform hover:scale-105 active:scale-95 ${
                                selectedOption.isCorrect ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
                            }`}
                        >
                            {isLastScenario ? 'Finish Simulation' : 'Next Scenario'}
                        </button>
                    </div>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};

