import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Header } from './components/Header';
import { ImageUploader } from './components/ImageUploader';
import { StyleSelector } from './components/StyleSelector';
import { LoadingOverlay } from './components/LoadingOverlay';
import { generateImage, generateVideo, generateSpeech } from './services/geminiService';
import { HEADSHOT_STYLES, VIDEO_LOADING_MESSAGES } from './constants';
import { SparklesIcon, EditIcon, BackIcon, ChatIcon, VideoIcon, SpeakerIcon } from './components/icons';
import { Chatbot } from './components/Chatbot';

type AppStep = 'UPLOAD' | 'STYLE' | 'EDIT' | 'VIDEO';

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

    // Video state
    const [videoPrompt, setVideoPrompt] = useState<string>('');
    const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>('16:9');
    const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);
    const [isKeySelected, setIsKeySelected] = useState(false);
    const loadingMessageIntervalRef = useRef<number | null>(null);

    // Audio state
    const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
    const [generatedAudioUrl, setGeneratedAudioUrl] = useState<string | null>(null);


    const checkApiKey = useCallback(async () => {
        if (window.aistudio) {
            const hasKey = await window.aistudio.hasSelectedApiKey();
            setIsKeySelected(hasKey);
            return hasKey;
        }
        return false;
    }, []);

    useEffect(() => {
        if (step === 'VIDEO') {
            checkApiKey();
        }
    }, [step, checkApiKey]);


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
        setVideoPrompt('');
        setAspectRatio('16:9');
        setGeneratedVideoUrl(null);
        setGeneratedAudioUrl(null);
        if (loadingMessageIntervalRef.current) {
            clearInterval(loadingMessageIntervalRef.current);
            loadingMessageIntervalRef.current = null;
        }
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
        setGeneratedAudioUrl(null); // Invalidate previous audio
        try {
            const result = await generateImage(generatedImage, editPrompt, true);
            setGeneratedImage(result); // Replace the current generated image with the edited one
            setEditPrompt(''); // Clear the input field
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleGenerateVoiceGuide = async () => {
        if (!stylePrompt) return;
        
        const styleName = HEADSHOT_STYLES.find(s => s.prompt === stylePrompt)?.name || 'this';
        const prompt = `Give a friendly, concise voice guide for a headshot in the '${styleName}' style. Include one quick photography tip.`;
        
        setIsGeneratingAudio(true);
        setError(null);
        try {
            const audioUrl = await generateSpeech(prompt);
            setGeneratedAudioUrl(audioUrl);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to generate audio.');
        } finally {
            setIsGeneratingAudio(false);
        }
    };

    const handleGenerateVideo = async () => {
        if (!generatedImage || !videoPrompt) return;

        try {
            const hasKey = await checkApiKey();
            if (!hasKey) {
                await window.aistudio.openSelectKey();
                // Assume key is selected now and proceed
                setIsKeySelected(true);
            }

            setIsLoading(true);

            // Start cycling through loading messages
            let messageIndex = 0;
            setLoadingMessage(VIDEO_LOADING_MESSAGES[messageIndex]);
            loadingMessageIntervalRef.current = window.setInterval(() => {
                messageIndex = (messageIndex + 1) % VIDEO_LOADING_MESSAGES.length;
                setLoadingMessage(VIDEO_LOADING_MESSAGES[messageIndex]);
            }, 5000);

            const onProgress = (message: string) => {
                // The interval is already running, so we won't override it
                console.log("Video Progress:", message);
            };

            const result = await generateVideo(generatedImage, videoPrompt, aspectRatio, onProgress);
            setGeneratedVideoUrl(result);

        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred while generating the video.');
        } finally {
            if (loadingMessageIntervalRef.current) {
                clearInterval(loadingMessageIntervalRef.current);
                loadingMessageIntervalRef.current = null;
            }
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
                                <p className="text-gray-400 mb-4">Describe the changes you'd like to make. For example: "Add a retro filter", "Change the background to a library".</p>
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
                                
                                <div className="mt-8 border-t border-gray-700 pt-6">
                                    <h3 className="text-xl font-semibold mb-4 text-indigo-300">Enhance Your Creation</h3>
                                    <div className="flex flex-col gap-4">
                                        <button
                                            onClick={handleGenerateVoiceGuide}
                                            disabled={isGeneratingAudio || isLoading}
                                            className="w-full flex items-center justify-center gap-3 bg-teal-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-teal-500 transition-all duration-300 shadow-lg disabled:bg-gray-600"
                                        >
                                            <SpeakerIcon />
                                            Get Voice Guide
                                        </button>
                                        {isGeneratingAudio && <p className="text-center text-teal-300">Generating audio...</p>}
                                        {generatedAudioUrl && (
                                            <audio controls src={generatedAudioUrl} className="w-full rounded-lg">
                                                Your browser does not support the audio element.
                                            </audio>
                                        )}
                                        <button
                                            onClick={() => setStep('VIDEO')}
                                            className="w-full flex items-center justify-center gap-3 bg-purple-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-purple-500 transition-all duration-300 shadow-lg"
                                        >
                                            <VideoIcon />
                                            Animate Your Headshot
                                        </button>
                                    </div>
                                </div>

                                <div className="mt-8 border-t border-gray-700 pt-6">
                                     <button
                                        onClick={handleReset}
                                        className="w-full flex items-center justify-center gap-2 bg-gray-700 text-white font-bold py-3 px-6 rounded-lg hover:bg-gray-600 transition-all duration-300 shadow-lg"
                                    >
                                        <BackIcon />
                                        Start Over
                                    </button>
                                </div>
                                {error && <p className="text-red-400 mt-4 text-center">{error}</p>}
                            </div>
                        </div>
                    </div>
                );
            case 'VIDEO':
                return (
                    <div className="w-full max-w-6xl mx-auto p-4 md:p-8">
                        {generatedVideoUrl ? (
                            <div className="flex flex-col items-center gap-8">
                                <h2 className="text-3xl font-bold text-center text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-400">Your Animated Headshot is Ready!</h2>
                                <div className="w-full max-w-2xl bg-gray-800 rounded-lg overflow-hidden shadow-2xl">
                                    <video 
                                        src={generatedVideoUrl}
                                        controls 
                                        autoPlay 
                                        loop 
                                        playsInline 
                                        className="w-full h-full object-contain" 
                                    />
                                </div>
                                <button
                                    onClick={handleReset}
                                    className="w-full max-w-xs flex items-center justify-center gap-2 bg-gray-700 text-white font-bold py-3 px-6 rounded-lg hover:bg-gray-600 transition-all duration-300 shadow-lg"
                                >
                                    <BackIcon />
                                    Start Over
                                </button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                                <div className="flex flex-col items-center">
                                    <h2 className="text-2xl font-semibold mb-4 text-gray-300">Starting Image</h2>
                                    <div className="aspect-square w-full max-w-md bg-gray-800 rounded-lg overflow-hidden shadow-2xl">
                                        {generatedImage && <img src={generatedImage} alt="Generated headshot for video" className="w-full h-full object-cover" />}
                                    </div>
                                </div>
                                <div className="flex flex-col gap-6">
                                    <div>
                                        <h2 className="text-2xl font-semibold mb-2 text-gray-300">1. Describe the Video</h2>
                                        <p className="text-gray-400 mb-4">What should happen? e.g., "A gentle zoom in, with a subtle smile appearing", "The background subtly shifts".</p>
                                        <textarea
                                            value={videoPrompt}
                                            onChange={(e) => setVideoPrompt(e.target.value)}
                                            placeholder="e.g., A gentle zoom in..."
                                            className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-white placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition h-24 resize-none"
                                        />
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-semibold mb-4 text-gray-300">2. Select Aspect Ratio</h2>
                                        <div className="flex gap-4">
                                            {(['16:9', '9:16'] as const).map(ratio => (
                                                <button 
                                                    key={ratio}
                                                    onClick={() => setAspectRatio(ratio)}
                                                    className={`flex-1 p-3 rounded-lg font-semibold transition ${aspectRatio === ratio ? 'bg-indigo-600 text-white' : 'bg-gray-700 hover:bg-gray-600'}`}
                                                >
                                                    {ratio} {ratio === '16:9' ? '(Landscape)' : '(Portrait)'}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    {!isKeySelected && (
                                        <div className="bg-yellow-900/50 border border-yellow-700 text-yellow-300 px-4 py-3 rounded-lg" role="alert">
                                            <p className="font-bold">Action Required</p>
                                            <p className="text-sm">Video generation requires you to select your own API key. This is a free operation for this model.</p>
                                            <p className="text-sm mt-2">For more information, see the <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="underline hover:text-yellow-200">billing documentation</a>.</p>
                                            <button onClick={() => window.aistudio.openSelectKey().then(() => setIsKeySelected(true))} className="mt-3 bg-yellow-600 text-white font-bold py-2 px-4 rounded hover:bg-yellow-500">
                                                Select API Key
                                            </button>
                                        </div>
                                    )}
                                    <div className="flex flex-col gap-4 mt-4">
                                        <button
                                            onClick={handleGenerateVideo}
                                            disabled={!videoPrompt || !isKeySelected || isLoading}
                                            className="w-full flex items-center justify-center gap-3 bg-purple-600 text-white font-bold py-4 px-6 rounded-lg hover:bg-purple-500 disabled:bg-gray-600 disabled:cursor-not-allowed transition-all duration-300 shadow-lg text-lg"
                                        >
                                            <VideoIcon />
                                            Generate Video
                                        </button>
                                        <button
                                            onClick={() => setStep('EDIT')}
                                            className="w-full flex items-center justify-center gap-2 bg-gray-700 text-white font-bold py-3 px-6 rounded-lg hover:bg-gray-600 transition-all duration-300 shadow-lg"
                                        >
                                            <BackIcon />
                                            Back to Editing
                                        </button>
                                    </div>
                                    {error && <p className="text-red-400 mt-2 text-center">{error}</p>}
                                </div>
                            </div>
                        )}
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