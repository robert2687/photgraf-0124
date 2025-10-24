
import React from 'react';
import { HEADSHOT_STYLES } from '../constants';

interface StyleSelectorProps {
    selectedStylePrompt: string;
    onStyleSelect: (prompt: string) => void;
}

export const StyleSelector: React.FC<StyleSelectorProps> = ({ selectedStylePrompt, onStyleSelect }) => {
    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {HEADSHOT_STYLES.map(({ name, prompt, emoji }) => {
                const isSelected = selectedStylePrompt === prompt;
                return (
                    <button
                        key={name}
                        onClick={() => onStyleSelect(prompt)}
                        className={`p-4 rounded-lg flex flex-col items-center justify-center text-center transition-all duration-200 transform hover:-translate-y-1 shadow-md
                        ${isSelected ? 'bg-indigo-600 text-white ring-2 ring-indigo-400' : 'bg-gray-800 hover:bg-gray-700'}`}
                    >
                        <span className="text-4xl mb-2">{emoji}</span>
                        <span className="font-semibold text-sm">{name}</span>
                    </button>
                );
            })}
        </div>
    );
};
