
import React from 'react';
import { CameraIcon } from './icons';

export const Header: React.FC = () => {
    return (
        <header className="w-full bg-gray-900/80 backdrop-blur-sm p-4 border-b border-gray-700 sticky top-0 z-10">
            <div className="max-w-6xl mx-auto flex items-center justify-center gap-3">
                <CameraIcon />
                <h1 className="text-2xl md:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-500">
                    AI Headshot Photographer
                </h1>
            </div>
        </header>
    );
};
