
import React, { useCallback, useState } from 'react';
import { UploadIcon } from './icons';

interface ImageUploaderProps {
    onImageUpload: (base64Image: string) => void;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({ onImageUpload }) => {
    const [isDragging, setIsDragging] = useState(false);

    const handleFileChange = (file: File | null) => {
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (e) => {
                if (e.target && typeof e.target.result === 'string') {
                    onImageUpload(e.target.result);
                }
            };
            reader.readAsDataURL(file);
        }
    };

    // FIX: Changed event type to HTMLLabelElement to match the element it's used on.
    const onDragOver = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    }, []);

    // FIX: Changed event type to HTMLLabelElement to match the element it's used on.
    const onDragLeave = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    }, []);

    // FIX: Changed event type to HTMLLabelElement to match the element it's used on.
    const onDrop = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFileChange(e.dataTransfer.files[0]);
        }
    }, [onImageUpload]);

    return (
        <div className="w-full max-w-2xl p-4">
            <label
                htmlFor="image-upload"
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
                className={`relative flex flex-col items-center justify-center w-full h-96 border-4 border-dashed rounded-xl cursor-pointer transition-colors duration-300
                ${isDragging ? 'border-indigo-500 bg-gray-800' : 'border-gray-600 hover:border-gray-500 bg-gray-800/50'}`}
            >
                <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center">
                    <UploadIcon />
                    <p className="mb-2 text-2xl font-semibold text-gray-300">
                        <span className="font-bold text-indigo-400">Click to upload</span> or drag and drop
                    </p>
                    <p className="text-md text-gray-400">Upload a clear, forward-facing selfie</p>
                    <p className="text-sm text-gray-500">PNG, JPG, or WEBP (MAX. 10MB)</p>
                </div>
                <input
                    id="image-upload"
                    type="file"
                    accept="image/png, image/jpeg, image/webp"
                    className="hidden"
                    onChange={(e) => handleFileChange(e.target.files ? e.target.files[0] : null)}
                />
            </label>
        </div>
    );
};
