import React, { useRef } from 'react';
import './FilePicker.css';

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
      onFileError('Please select a .xmi file.');
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
      onFileError('Error reading file.');
    };
    reader.readAsText(file);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (!file) {
      return;
    }

    if (!file.name.endsWith('.xmi')) {
      onFileError('Please upload a .xmi file.');
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
      onFileError('Error reading file.');
    };
    reader.readAsText(file);
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  return (
    <div className="file-picker-wrapper">
      <div className="file-picker-header">
        <h2 className="file-picker-title">UML2Merode Converter</h2>
        <p className="file-picker-subtitle">Upload your UML Diagram to begin the conversion to Merode.</p>
      </div>

      <div className="file-picker-dropzone" onDrop={handleDrop} onDragOver={handleDragOver}>
        <div className="file-picker-content">
          {/* Use label as container to trigger file input on click */}
          <label htmlFor="file-upload" className="file-picker-icon-container">
            <span className="file-picker-icon">cloud_upload</span>
          </label>
          <h3 className="file-picker-instructions">Drag and drop files or click the cloud</h3>
          <p className="file-picker-limits">Supports xmi files</p>
          <input id="file-upload" type="file" accept=".xmi" onChange={handleFileChange} ref={fileInputRef} style={{ display: 'none' }} />
        </div>
      </div>
    </div>
  );
};

export default FilePicker;