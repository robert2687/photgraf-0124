
import React from 'react';

interface LoadingOverlayProps {
    message: string;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ message }) => {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex flex-col items-center justify-center z-50 backdrop-blur-sm">
            <div className="w-16 h-16 border-4 border-t-indigo-500 border-gray-600 rounded-full animate-spin"></div>
            <p className="mt-6 text-white text-lg font-semibold text-center max-w-sm">{message}</p>
        </div>
    );
};
