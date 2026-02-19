import React, { useState, useEffect } from 'react';
import { X, RefreshCw, Lock, Save, Wand2 } from 'lucide-react';
import { Student, StudentAchievement } from '../types';

interface AvatarEditorProps {
  isOpen: boolean;
  onClose: () => void;
  student: Student;
  achievements: StudentAchievement[];
  onSave: (config: any) => Promise<boolean>;
}

// DiceBear Avataaars Options
const AVATAR_OPTIONS = {
  top: [
    'longHair', 'shortHair', 'eyepatch', 'hat', 'hijab', 'turban', 
    'bigHair', 'bob', 'bun', 'curly', 'curvy', 'dreads', 'frida', 
    'fro', 'froBand', 'miaWallace', 'longButNotTooLong', 'shavedSides', 
    'straight01', 'straight02', 'straightStrand', 'winterHat01', 
    'winterHat02', 'winterHat03', 'winterHat04'
  ],
  accessories: [
    'kurt', 'prescription01', 'prescription02', 'round', 
    'sunglasses', 'wayfarers'
  ],
  hairColor: [
    'aurora', 'black', 'blonde', 'brown', 'brownDark', 
    'pastelPink', 'platinum', 'red', 'silverGray'
  ],
  facialHair: [
    'beardLight', 'beardMajestic', 'beardMedium', 
    'moustacheFancy', 'moustacheMagnum'
  ],
  clothing: [
    'blazerAndShirt', 'blazerAndSweater', 'collarAndSweater', 
    'graphicShirt', 'hoodie', 'overall', 'shirtCrewNeck', 
    'shirtScoopNeck', 'shirtVNeck'
  ],
  clothingColor: [
    'black', 'blue01', 'blue02', 'blue03', 'gray01', 'gray02', 
    'heather', 'pastelBlue', 'pastelGreen', 'pastelOrange', 
    'pastelRed', 'pastelYellow', 'pink', 'red', 'white'
  ],
  eyes: [
    'close', 'cry', 'default', 'dizzy', 'eyeRoll', 'happy', 
    'hearts', 'side', 'squint', 'surprised', 'wink', 'winkWacky'
  ],
  eyebrows: [
    'angry', 'angryNatural', 'default', 'defaultNatural', 
    'flatNatural', 'frownNatural', 'raisedExcited', 
    'raisedExcitedNatural', 'sadConcerned', 'sadConcernedNatural', 
    'unibrowNatural', 'upDown', 'upDownNatural'
  ],
  mouth: [
    'concerned', 'default', 'disbelief', 'eating', 'grimace', 
    'sad', 'screamOpen', 'serious', 'smile', 'tongue', 
    'twinkle', 'vomit'
  ],
  skinColor: [
    'tanned', 'yellow', 'pale', 'light', 'brown', 'darkBrown', 'black'
  ]
};

const BACKGROUND_COLORS = [
  'b6e3f4', 'c0aede', 'd1d4f9', 'ffd5dc', 'ffdfbf'
];

export const AvatarEditor: React.FC<AvatarEditorProps> = ({ 
  isOpen, 
  onClose, 
  student, 
  achievements, 
  onSave 
}) => {
  const [config, setConfig] = useState<any>({
    seed: student.avatarConfig?.seed || student.name.replace(/\s+/g, ''),
    backgroundColor: student.avatarConfig?.backgroundColor || 'b6e3f4',
    ...student.avatarConfig
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
        setConfig({
            seed: student.avatarConfig?.seed || student.name.replace(/\s+/g, ''),
            backgroundColor: student.avatarConfig?.backgroundColor || 'b6e3f4',
            ...student.avatarConfig
        });
    }
  }, [isOpen, student]);

  if (!isOpen) return null;

  // Unlocking Logic
  const beginnerAchievements = achievements.filter(a => a.difficulty === 'BEGINNER');
  const easyAchievements = achievements.filter(a => a.difficulty === 'EASY');

  const allBeginnerUnlocked = beginnerAchievements.every(a => a.isUnlocked);
  const allEasyUnlocked = easyAchievements.every(a => a.isUnlocked);

  // For testing/demo purposes, you might want to uncomment these to force unlock
  // const allBeginnerUnlocked = true;
  // const allEasyUnlocked = true;

  const handleRandomize = () => {
    const randomSeed = Math.random().toString(36).substring(7);
    setConfig({ ...config, seed: randomSeed });
  };

  const handleChange = (key: string, value: string) => {
    setConfig({ ...config, [key]: value });
  };

  const handleSave = async () => {
    setIsSaving(true);
    await onSave(config);
    setIsSaving(false);
    onClose();
  };

  // Construct Preview URL
  let previewUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${config.seed}`;
  if (config.backgroundColor) previewUrl += `&backgroundColor=${config.backgroundColor.replace('#', '')}`;
  Object.entries(config).forEach(([key, value]) => {
      if (key !== 'seed' && key !== 'backgroundColor' && value) {
          previewUrl += `&${key}=${value}`;
      }
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col md:flex-row">
        
        {/* Preview Section */}
        <div className="w-full md:w-1/3 bg-gray-50 p-8 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-gray-200 relative">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Avatar Studio</h2>
            <div className="relative w-48 h-48 md:w-64 md:h-64 bg-white rounded-full shadow-lg p-2 mb-6 ring-4 ring-indigo-100">
                <img 
                    src={previewUrl} 
                    alt="Avatar Preview" 
                    className="w-full h-full rounded-full"
                />
            </div>
            
            <div className="flex gap-3 w-full">
                <button
                    onClick={handleRandomize}
                    disabled={!allBeginnerUnlocked}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-medium transition-colors ${
                        allBeginnerUnlocked 
                            ? 'bg-indigo-600 text-white hover:bg-indigo-700' 
                            : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    }`}
                >
                    {allBeginnerUnlocked ? <Wand2 size={20} /> : <Lock size={16} />}
                    Randomize
                </button>
            </div>
            {!allBeginnerUnlocked && (
                <p className="text-xs text-gray-500 mt-2 text-center">
                    Complete all Beginner achievements to unlock Randomizer!
                </p>
            )}
        </div>

        {/* Controls Section */}
        <div className="w-full md:w-2/3 flex flex-col h-full bg-white">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                <h3 className="font-semibold text-gray-700">Customization Options</h3>
                <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-500">
                    <X size={20} />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
                {!allEasyUnlocked && (
                     <div className="mb-6 bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
                        <Lock className="text-amber-500 mt-1 shrink-0" size={20} />
                        <div>
                            <h4 className="font-semibold text-amber-800">Full Customization Locked</h4>
                            <p className="text-sm text-amber-700 mt-1">
                                Complete all <strong>Easy</strong> achievements to unlock detailed customization controls. 
                                Currently you can only use the Randomizer (if Beginner achievements are complete).
                            </p>
                        </div>
                    </div>
                )}

                <div className="space-y-6">
                    {/* Background Color - Unlocked with Easy */}
                    <div className={`p-4 rounded-lg border ${allEasyUnlocked ? 'border-gray-200 bg-white' : 'border-gray-100 bg-gray-50 opacity-60'}`}>
                        <label className="block text-sm font-medium text-gray-700 mb-3">Background Color</label>
                        <div className="flex flex-wrap gap-2">
                            {BACKGROUND_COLORS.map(color => (
                                <button
                                    key={color}
                                    disabled={!allEasyUnlocked}
                                    onClick={() => handleChange('backgroundColor', color)}
                                    className={`w-10 h-10 rounded-full border-2 transition-all ${
                                        config.backgroundColor === color ? 'border-indigo-600 scale-110' : 'border-transparent hover:scale-105'
                                    }`}
                                    style={{ backgroundColor: `#${color}` }}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Feature Controls - Unlocked with Easy */}
                    <div className={`grid grid-cols-1 sm:grid-cols-2 gap-4 ${!allEasyUnlocked ? 'opacity-50 pointer-events-none grayscale' : ''}`}>
                        {Object.entries(AVATAR_OPTIONS).map(([key, options]) => (
                            <div key={key} className="space-y-1">
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                    {key.replace(/([A-Z])/g, ' $1').trim()}
                                </label>
                                <select
                                    value={config[key] || ''}
                                    onChange={(e) => handleChange(key, e.target.value)}
                                    className="w-full p-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white text-sm"
                                >
                                    <option value="">Default / Random</option>
                                    {options.map(opt => (
                                        <option key={opt} value={opt}>
                                            {opt.replace(/([A-Z])/g, ' $1').trim()}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="p-4 border-t border-gray-100 flex justify-end gap-3 bg-gray-50">
                <button 
                    onClick={onClose}
                    className="px-5 py-2.5 rounded-lg text-gray-700 hover:bg-gray-200 font-medium transition-colors"
                >
                    Cancel
                </button>
                <button 
                    onClick={handleSave}
                    disabled={isSaving}
                    className="px-5 py-2.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 font-medium shadow-sm transition-colors flex items-center gap-2"
                >
                    {isSaving ? <RefreshCw className="animate-spin" size={18} /> : <Save size={18} />}
                    Save Avatar
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};
