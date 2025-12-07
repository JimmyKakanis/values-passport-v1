import React, { useState } from 'react';
import { CoreValue } from '../../types';
import { CORE_VALUES } from '../../constants';
import { VALUE_DEEP_DIVES } from '../../data/teacherResources';
import { BookOpen, MessageCircle, CheckCircle2 } from 'lucide-react';
import * as LucideIcons from 'lucide-react';

export const ValueDeepDive: React.FC = () => {
  const [activeValue, setActiveValue] = useState<CoreValue>(CoreValue.TRUTH);

  const content = VALUE_DEEP_DIVES[activeValue];
  const definition = CORE_VALUES[activeValue];
  
  // Dynamic Icon
  const IconComponent = (LucideIcons as any)[definition.icon];

  return (
    <div className="flex flex-col md:flex-row gap-6 min-h-[600px]">
      {/* Sidebar Navigation */}
      <div className="w-full md:w-64 flex-shrink-0 space-y-2">
        <h3 className="font-bold text-gray-500 text-xs uppercase tracking-wider mb-4 px-2">Select a Value</h3>
        {Object.values(CORE_VALUES).map((val) => (
          <button
            key={val.id}
            onClick={() => setActiveValue(val.id as CoreValue)}
            className={`w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 transition-all ${
              activeValue === val.id 
                ? `${val.color} font-bold shadow-sm ring-1 ring-inset ring-black/10` 
                : 'bg-white text-gray-600 hover:bg-gray-50 border border-transparent'
            }`}
          >
            {/* We render a small dot instead of the full icon here for cleaner UI */}
            <div className={`w-3 h-3 rounded-full ${
              val.id === CoreValue.TRUTH ? 'bg-blue-500' :
              val.id === CoreValue.LOVE ? 'bg-pink-500' :
              val.id === CoreValue.PEACE ? 'bg-teal-500' :
              val.id === CoreValue.RIGHT_CONDUCT ? 'bg-emerald-500' :
              'bg-orange-500'
            }`} />
            {val.id}
          </button>
        ))}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 bg-white rounded-2xl border border-gray-100 shadow-xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className={`p-8 ${definition.color} bg-opacity-20 border-b border-gray-100`}>
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className={`p-2 rounded-lg bg-white/50 backdrop-blur-sm`}>
                  {IconComponent && <IconComponent className="w-8 h-8" />}
                </div>
                <h2 className="text-3xl font-bold">{content.title}</h2>
              </div>
              <p className="text-xl opacity-80 font-medium italic">"{content.tagline}"</p>
            </div>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="p-8 space-y-8 overflow-y-auto flex-1">
          
          {/* Observable Behaviors */}
          <section>
            <h3 className="flex items-center gap-2 text-lg font-bold text-gray-900 mb-4">
              <CheckCircle2 className="text-emerald-600" />
              What to Look For
            </h3>
            <div className="grid grid-cols-1 gap-3">
              {content.observableBehaviors.map((behavior, idx) => (
                <div key={idx} className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 text-gray-700 border border-gray-100">
                  <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
                  <span>{behavior}</span>
                </div>
              ))}
            </div>
          </section>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Teaching Prompts */}
            <section className="bg-blue-50 p-6 rounded-xl border border-blue-100">
              <h3 className="flex items-center gap-2 text-lg font-bold text-blue-900 mb-4">
                <MessageCircle className="text-blue-600" />
                Discussion Prompts
              </h3>
              <ul className="space-y-4">
                {content.teachingPrompts.map((prompt, idx) => (
                  <li key={idx} className="flex gap-3 text-blue-800">
                    <span className="font-bold opacity-50">{idx + 1}.</span>
                    <span className="italic">"{prompt}"</span>
                  </li>
                ))}
              </ul>
            </section>

            {/* Curriculum Links */}
            <section className="bg-orange-50 p-6 rounded-xl border border-orange-100">
              <h3 className="flex items-center gap-2 text-lg font-bold text-orange-900 mb-4">
                <BookOpen className="text-orange-600" />
                Curriculum Connections
              </h3>
              <div className="space-y-4">
                {content.curriculumLinks.map((link, idx) => (
                  <div key={idx} className="bg-white/60 p-3 rounded-lg border border-orange-100/50">
                    <div className="text-xs font-bold text-orange-600 uppercase tracking-wide mb-1">
                      {link.subject}
                    </div>
                    <div className="text-orange-900 text-sm">
                      {link.idea}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>

        </div>
      </div>
    </div>
  );
};

