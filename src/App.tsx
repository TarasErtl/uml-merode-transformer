import { useState } from 'react';
import FilePicker from './components/FilePicker';
import { parseXmlToAny } from './utils/xmiParser';
import { logger } from './utils/logger';
import { mapXmiToIR } from './utils/json2umlMapper';
import { mapUmlToMerode } from './utils/uml2merodeMapper';
import { type XmiJsonData } from './types/xmiJson';
import { type UMLIR } from './types/uml';
import { type MerodeIR } from './types/merode';
import { type Proposal } from './types/proposals';
import { type Decision } from './types/decisions';

function App() {
  const [modelName, setModelName] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [umlIR, setUmlIR] = useState<UMLIR | null>(null);
  const [merodeIR, setMerodeIR] = useState<MerodeIR | null>(null);
  const [proposals, setProposals] = useState<Proposal[]>([]);

  /**
   * Proccesses the content of the uploaded file, passed to this callback by the FilePicker component.
   * @param {string} xmlContent the string content of the uploaded .xmi file
   */
  const handleFileLoaded = (xmlContent: string) => {
    setError(""); 
    const rawData = parseXmlToAny(xmlContent) as XmiJsonData;
    logger.log("JSON parsed from the uploaded XMI file:", rawData);

    if (rawData && rawData["uml:Model"]) {
      const name = rawData["uml:Model"].name || "Unbenanntes Modell";
      setModelName(name);
      logger.log("These are the elements:", rawData["uml:Model"].packagedElement);
      
      // Transform the raw JSON into our clean UML IR graph format
      const mappedIR = mapXmiToIR(rawData);
      logger.log("Mapped UML Internal Representation (IR):", mappedIR);
      setUmlIR(mappedIR);

      if (mappedIR === null) {
        const errorMessage = "Fehler bei der Verarbeitung der XMI-Daten. Bitte überprüfen Sie die Struktur der Datei.";
        setError(errorMessage);
        logger.error(errorMessage);
        return;
      }  
       
      const decisions = new Map<string, Decision>(); // Hier sollten die tatsächlichen Entscheidungen geladen oder initialisiert werden
      //Transform the UML IR into a MERODE IR
      const merodeModel = mapUmlToMerode(mappedIR, decisions, setProposals);
      logger.log("Mapped MERODE Internal Representation (IR):", merodeModel);
      setMerodeIR(merodeModel);
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
    setUmlIR(null);
    setMerodeIR(null);
    logger.error(errorMessage);
  };

  return (
    <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, display: 'flex', flexDirection: 'column', fontFamily: 'sans-serif', padding: '20px', boxSizing: 'border-box', overflow: 'hidden' }}>
      <div style={{ flexShrink: 0, marginBottom: '20px' }}>
        <h1 style={{ marginTop: 0 }}>UML to MERODE Transformer</h1>
        <FilePicker onFileLoaded={handleFileLoaded} onFileError={handleFileError} />
        {modelName && (
          <div style={{ marginTop: '10px' }}>
            <strong>Modell geladen:</strong> {modelName}
          </div>
        )}
        {error && <div style={{ marginTop: '10px', color: 'red' }}>{error}</div>}
      </div>
    </div>
  );
}

export default App;