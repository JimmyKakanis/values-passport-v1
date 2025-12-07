import React, { useState } from 'react';
import { BookOpen, BrainCircuit, LineChart } from 'lucide-react';
import { ValueDeepDive } from './ValueDeepDive';
import { ScenarioSimulator } from './ScenarioSimulator';
import { TeacherInsights } from './TeacherInsights';

type Tab = 'DEEP_DIVE' | 'SCENARIO' | 'INSIGHTS';

export const TeacherCorner: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('INSIGHTS');

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      
      {/* Header Section */}
      <div className="bg-indigo-900 rounded-2xl p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -mr-16 -mt-16 blur-3xl"></div>
        <div className="relative z-10">
            <h1 className="text-4xl font-bold mb-3 flex items-center gap-3">
                <BookOpen className="w-10 h-10 text-indigo-300" />
                Values Development
            </h1>
            <p className="text-indigo-100 text-lg max-w-2xl">
                Your professional hub for mastering the Values Framework. Explore resources, 
                practice with scenarios, and track your impact.
            </p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex justify-center">
        <div className="bg-white p-1 rounded-xl shadow-sm border border-gray-200 inline-flex">
          <button
            onClick={() => setActiveTab('INSIGHTS')}
            className={`px-6 py-3 rounded-lg font-bold flex items-center gap-2 transition-all ${
              activeTab === 'INSIGHTS' ? 'bg-blue-100 text-blue-800' : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            <LineChart size={20} /> My Insights
          </button>
          <button
            onClick={() => setActiveTab('DEEP_DIVE')}
            className={`px-6 py-3 rounded-lg font-bold flex items-center gap-2 transition-all ${
              activeTab === 'DEEP_DIVE' ? 'bg-indigo-100 text-indigo-800' : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            <BookOpen size={20} /> Deep Dive
          </button>
          <button
            onClick={() => setActiveTab('SCENARIO')}
            className={`px-6 py-3 rounded-lg font-bold flex items-center gap-2 transition-all ${
              activeTab === 'SCENARIO' ? 'bg-purple-100 text-purple-800' : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            <BrainCircuit size={20} /> Scenario Simulator
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="min-h-[500px]">
        {activeTab === 'DEEP_DIVE' && <ValueDeepDive />}
        {activeTab === 'SCENARIO' && <ScenarioSimulator />}
        {activeTab === 'INSIGHTS' && <TeacherInsights />}
      </div>
    </div>
  );
};

