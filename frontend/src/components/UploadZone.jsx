import { useState, useRef } from 'react';

const ACCEPTED_TYPES = {
  'application/pdf': '.pdf',
  'image/jpeg': '.jpg,.jpeg',
  'image/png': '.png',
  'image/heic': '.heic',
};

const ACCEPT_STRING = Object.values(ACCEPTED_TYPES).join(',');

export default function UploadZone({ onFileSelect, disabled }) {
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const inputRef = useRef(null);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) selectFile(file);
  };

  const handleChange = (e) => {
    const file = e.target.files[0];
    if (file) selectFile(file);
  };

  const selectFile = (file) => {
    setSelectedFile(file);
    onFileSelect?.(file);
  };

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      onClick={() => !disabled && inputRef.current?.click()}
      className={`
        border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors
        ${dragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
      `}
      role="button"
      tabIndex={0}
      aria-label="Upload blood work report"
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click(); }}
    >
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT_STRING}
        onChange={handleChange}
        className="hidden"
        disabled={disabled}
      />

      <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
      </svg>

      {selectedFile ? (
        <div className="mt-3">
          <p className="text-sm font-medium text-gray-900">{selectedFile.name}</p>
          <p className="text-xs text-gray-500 mt-1">
            {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
          </p>
        </div>
      ) : (
        <div className="mt-3">
          <p className="text-sm font-medium text-gray-700">
            Drag and drop your blood work report here
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Supports PDF, JPG, PNG, HEIC (max 20MB for PDF, 10MB for images)
          </p>
        </div>
      )}
    </div>
  );
}
