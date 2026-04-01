import React, { useRef } from 'react';

interface FilePickerProps {
  onFileLoaded: (content: string) => void;
  onFileError: (error: string) => void;
}

const FilePicker: React.FC<FilePickerProps> = ({ onFileLoaded, onFileError }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (!file.name.endsWith('.xmi')) {
      onFileError('Bitte wählen Sie eine .xmi-Datei aus.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result;
      if (typeof text === 'string') {
        onFileLoaded(text);
      }
    };
    reader.onerror = () => {
      onFileError('Fehler beim Lesen der Datei.');
    };
    reader.readAsText(file);
  };

  return (
    <div>
      <label htmlFor="file-upload" className="cursor-pointer inline-flex items-center px-4 py-2 bg-violet-600 text-white rounded-md font-semibold text-sm hover:bg-violet-700 transition-colors">
        {/* SVG Icon für Upload */}
        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
        XMI-Datei auswählen
      </label>
      <input 
        id="file-upload" 
        type="file" accept=".xmi" onChange={handleFileChange} ref={fileInputRef} className="hidden" 
      />
    </div>
  );
};

export default FilePicker;