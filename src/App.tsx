import { useState } from 'react';
import FilePicker from './components/FilePicker';
import { parseXmlToAny } from './utils/xmiParser';
import { logger } from './utils/logger';

function App() {
  const [modelName, setModelName] = useState<string>("");
  const [error, setError] = useState<string>("");

  /**
   * Proccesses the content of the uploaded file, passed to this callback by the FilePicker component.
   * @param {string} xmlContent the string content of the uploaded .xmi file
   */
  const handleFileLoaded = (xmlContent: string) => {
    setError(""); 
    const rawData = parseXmlToAny(xmlContent);
    logger.log("JSON parsed from the uploaded XMI file:", rawData);

    if (rawData && rawData["uml:Model"]) {
      /* TODO hier wird geschaut ob das element uml:Model existiert, da es das Hauptelement in einem XMI-Dokument ist.
      Mann könnte einen allgemeinen check einbauen der prüft ob das Dokument valide ist. Vlt später machen
      Da nicht jedes XMI-Dokument das selbe format haben muss
      */
      const name = rawData["uml:Model"].name || "Unbenanntes Modell";
      setModelName(name);
      logger.log("These are the elements:", rawData["uml:Model"].packagedElement);
    }
  };

  /**
   * Handles errors that occur during file loading, by printing the error message
   * passed to this callback by the FilePicker component.
   * @param {string} errorMessage The error message, passed by the FilePicker.
   */
  const handleFileError = (errorMessage: string) => {
    setModelName("");
    setError(errorMessage);
    logger.error(errorMessage);
  };

  return (
    <div style={{ maxWidth: '800px', margin: '40px auto', fontFamily: 'sans-serif' }}>
      <h1>UML to MERODE Transformer</h1>
      <FilePicker onFileLoaded={handleFileLoaded} onFileError={handleFileError} />
      {modelName && (
        <div style={{ marginTop: '20px' }}>
          <strong>Modell geladen:</strong> {modelName}
        </div>
      )}
      {error && <div style={{ marginTop: '20px', color: 'red' }}>{error}</div>}
    </div>
  );
}

export default App;