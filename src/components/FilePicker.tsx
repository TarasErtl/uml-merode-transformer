import React from 'react';

//Callback functions expected from the parent component (App.tsx)
interface FilePickerProps {
  onFileLoaded: (content: string) => void;
  onFileError: (error: string) => void;
}

const FilePicker: React.FC<FilePickerProps> = ({ onFileLoaded, onFileError }) => {
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    
    const file = event.target.files?.[0];
    if (!file) return;

    //Try to read the content of the picked file as text, and pass it to the callback. 
    //If an error occurs, pass the error message to the error callback.
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      onFileLoaded(text);
    };
    reader.onerror = () => {
      onFileError(`Fehler beim Lesen der Datei: ${reader.error?.message}`);
    };
    reader.readAsText(file);
  };

  return (
    <div style={{ border: '2px dashed #4A90E2', padding: '20px', textAlign: 'center' }}>
      <input 
        type="file" 
        accept=".xmi,.xml" 
        onChange={handleFileChange} 
      />
      <p style={{ color: '#666' }}>Lade deine .xmi Datei hier hoch</p>
    </div>
  );
};

export default FilePicker;