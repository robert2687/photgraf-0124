
import React, { useState, useCallback } from 'react';
import { Header } from './components/Header';
import { ImageUploader } from './components/ImageUploader';
import { StyleSelector } from './components/StyleSelector';
import { LoadingOverlay } from './components/LoadingOverlay';
import { generateImage } from './services/geminiService';
import { HEADSHOT_STYLES } from './constants';
import { SparklesIcon, EditIcon, BackIcon, ChatIcon } from './components/icons';
import { Chatbot } from './components/Chatbot';

type AppStep = 'UPLOAD' | 'STYLE' | 'EDIT';

const App: React.FC = () => {
    const [step, setStep] = useState<AppStep>('UPLOAD');
    const [originalImage, setOriginalImage] = useState<string | null>(null);
    const [generatedImage, setGeneratedImage] = useState<string | null>(null);
    const [stylePrompt, setStylePrompt] = useState<string>('');
    const [editPrompt, setEditPrompt] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isChatOpen, setIsChatOpen] = useState(false);

    const handleImageUpload = (base64Image: string) => {
        setOriginalImage(base64Image);
        setGeneratedImage(null);
        setStylePrompt('');
        setError(null);
        setStep('STYLE');
    };

    const handleReset = useCallback(() => {
        setStep('UPLOAD');
        setOriginalImage(null);
        setGeneratedImage(null);
        setStylePrompt('');
        setEditPrompt('');
        setIsLoading(false);
        setLoadingMessage('');
        setError(null);
    }, []);

    const handleGenerate = async () => {
        if (!originalImage || !stylePrompt) return;
        setIsLoading(true);
        setLoadingMessage('Crafting your new headshot... This may take a moment.');
        setError(null);
        try {
            const result = await generateImage(originalImage, stylePrompt);
            setGeneratedImage(result);
            setStep('EDIT');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred.');
            // Stay on style step if generation fails
        } finally {
            setIsLoading(false);
        }
    };

    const handleEdit = async () => {
        if (!generatedImage || !editPrompt) return;
        setIsLoading(true);
        setLoadingMessage('Applying your edits...');
        setError(null);
        try {
            const result = await generateImage(generatedImage, editPrompt);
            setGeneratedImage(result); // Replace the current generated image with the edited one
            setEditPrompt(''); // Clear the input field
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred.');
        } finally {
            setIsLoading(false);
        }
    };

    const renderContent = () => {
        switch (step) {
            case 'UPLOAD':
                return <ImageUploader onImageUpload={handleImageUpload} />;
            case 'STYLE':
                return (
                    <div className="w-full max-w-6xl mx-auto p-4 md:p-8">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            <div className="flex flex-col items-center">
                                <h2 className="text-2xl font-semibold mb-4 text-gray-300">Your Selfie</h2>
                                <div className="aspect-square w-full max-w-md bg-gray-800 rounded-lg overflow-hidden shadow-lg">
                                    {originalImage && <img src={originalImage} alt="Uploaded selfie" className="w-full h-full object-cover" />}
                                </div>
                            </div>
                            <div className="flex flex-col">
                                <h2 className="text-2xl font-semibold mb-4 text-gray-300">1. Select a Style</h2>
                                <StyleSelector selectedStylePrompt={stylePrompt} onStyleSelect={setStylePrompt} />
                                <h2 className="text-2xl font-semibold mt-8 mb-4 text-gray-300">2. Generate</h2>
                                <button
                                    onClick={handleGenerate}
                                    disabled={!stylePrompt || isLoading}
                                    className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white font-bold py-4 px-6 rounded-lg hover:bg-indigo-500 disabled:bg-gray-600 disabled:cursor-not-allowed transition-all duration-300 shadow-lg text-lg"
                                >
                                    <SparklesIcon />
                                    Generate Headshot
                                </button>
                                {error && <p className="text-red-400 mt-4 text-center">{error}</p>}
                            </div>
                        </div>
                    </div>
                );
            case 'EDIT':
                return (
                    <div className="w-full max-w-6xl mx-auto p-4 md:p-8">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                            <div className="flex flex-col items-center">
                                 <h2 className="text-2xl font-semibold mb-4 text-gray-300">AI Generated Headshot</h2>
                                <div className="aspect-square w-full max-w-md bg-gray-800 rounded-lg overflow-hidden shadow-2xl relative">
                                    {generatedImage && <img src={generatedImage} alt="Generated headshot" className="w-full h-full object-cover" />}
                                    <div className="absolute top-2 left-2 bg-black bg-opacity-50 rounded-full p-2">
                                        <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-gray-400">
                                            {originalImage && <img src={originalImage} alt="Original" className="w-full h-full object-cover" />}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="flex flex-col">
                                <h2 className="text-2xl font-semibold mb-4 text-gray-300">Refine Your Image</h2>
                                <p className="text-gray-400 mb-4">Describe the changes you'd like to make. For example: "Add a retro filter", "Change the background to a library", "Make the smile wider".</p>
                                <div className="flex flex-col gap-4">
                                    <textarea
                                        value={editPrompt}
                                        onChange={(e) => setEditPrompt(e.target.value)}
                                        placeholder="e.g., Change suit color to navy blue..."
                                        className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-white placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition h-24 resize-none"
                                    />
                                    <button
                                        onClick={handleEdit}
                                        disabled={!editPrompt || isLoading}
                                        className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-indigo-500 disabled:bg-gray-600 disabled:cursor-not-allowed transition-all duration-300 shadow-lg"
                                    >
                                        <EditIcon />
                                        Apply Edit
                                    </button>
                                </div>
                                {error && <p className="text-red-400 mt-4 text-center">{error}</p>}
                                <div className="mt-8 border-t border-gray-700 pt-6">
                                     <button
                                        onClick={handleReset}
                                        className="w-full flex items-center justify-center gap-2 bg-gray-700 text-white font-bold py-3 px-6 rounded-lg hover:bg-gray-600 transition-all duration-300 shadow-lg"
                                    >
                                        <BackIcon />
                                        Start Over
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                );
        }
    };

    return (
        <div className="min-h-screen bg-gray-900 text-gray-200 flex flex-col items-center">
            {isLoading && <LoadingOverlay message={loadingMessage} />}
            <Header />
            <main className="w-full flex-grow flex items-center justify-center">
                {renderContent()}
            </main>
            <button
                onClick={() => setIsChatOpen(true)}
                className="fixed bottom-6 right-6 bg-indigo-600 text-white p-4 rounded-full shadow-lg hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-indigo-500 transition-transform transform hover:scale-110"
                aria-label="Open chat"
            >
                <ChatIcon />
            </button>
            <Chatbot isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
        </div>
    );
};

export default App;
