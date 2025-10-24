
import React, { useState, useRef, useEffect, FormEvent } from 'react';
import { createChatSession } from '../services/geminiService';
import type { Chat } from '@google/genai';

interface Message {
    role: 'user' | 'model';
    text: string;
}

interface ChatbotProps {
    isOpen: boolean;
    onClose: () => void;
}

export const Chatbot: React.FC<ChatbotProps> = ({ isOpen, onClose }) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [userInput, setUserInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const chatRef = useRef<Chat | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isOpen && !chatRef.current) {
            chatRef.current = createChatSession();
            setMessages([{ role: 'model', text: "Hi! I'm your AI assistant. How can I help you with your headshot today?" }]);
        }
    }, [isOpen]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(scrollToBottom, [messages]);

    const handleSendMessage = async (e: FormEvent) => {
        e.preventDefault();
        if (!userInput.trim() || isLoading || !chatRef.current) return;

        const userMessage: Message = { role: 'user', text: userInput };
        setMessages(prev => [...prev, userMessage]);
        setUserInput('');
        setIsLoading(true);

        try {
            const response = await chatRef.current.sendMessage({ message: userInput });
            const modelMessage: Message = { role: 'model', text: response.text };
            setMessages(prev => [...prev, modelMessage]);
        } catch (error) {
            console.error("Chatbot error:", error);
            const errorMessage: Message = { role: 'model', text: "Sorry, I'm having trouble connecting right now. Please try again later." };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-40 flex items-center justify-center" onClick={onClose}>
            <div
                className="fixed bottom-6 right-6 w-[calc(100%-3rem)] max-w-lg h-[70vh] bg-gray-800 rounded-2xl shadow-2xl flex flex-col transform transition-all duration-300 origin-bottom-right"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-700">
                    <h2 className="text-lg font-semibold text-white">AI Assistant</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">&times;</button>
                </div>

                {/* Messages */}
                <div className="flex-1 p-4 overflow-y-auto">
                    <div className="flex flex-col gap-4">
                        {messages.map((msg, index) => (
                            <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-xs md:max-w-md px-4 py-2 rounded-2xl ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-br-lg' : 'bg-gray-700 text-gray-200 rounded-bl-lg'}`}>
                                    {msg.text}
                                </div>
                            </div>
                        ))}
                        {isLoading && (
                            <div className="flex justify-start">
                                <div className="bg-gray-700 text-gray-200 px-4 py-2 rounded-2xl rounded-bl-lg">
                                    <span className="animate-pulse">...</span>
                                </div>
                            </div>
                        )}
                         <div ref={messagesEndRef} />
                    </div>
                </div>

                {/* Input */}
                <div className="p-4 border-t border-gray-700">
                    <form onSubmit={handleSendMessage} className="flex gap-2">
                        <input
                            type="text"
                            value={userInput}
                            onChange={(e) => setUserInput(e.target.value)}
                            placeholder="Ask me anything..."
                            className="flex-1 bg-gray-900 border border-gray-600 rounded-full px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            disabled={isLoading}
                        />
                        <button
                            type="submit"
                            disabled={!userInput.trim() || isLoading}
                            className="bg-indigo-600 text-white px-4 py-2 rounded-full font-semibold hover:bg-indigo-500 disabled:bg-gray-600 disabled:cursor-not-allowed"
                        >
                            Send
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};
