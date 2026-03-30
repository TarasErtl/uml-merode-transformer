import { useState, useEffect, useCallback } from "react";
import FilePicker from './components/FilePicker';
import { parseXmlToAny } from './utils/xmiParser';
import { logger } from './utils/logger';
import { mapXmiToIR } from './utils/json2umlMapper';
import { mapUmlToMerode } from './utils/uml2merodeMapper';
import { type XmiJsonData } from './types/xmiJson';
import { type UMLIR } from './types/uml';
import { type MerodeIR } from "./types/merode";
import { 
  type Proposal, 
  type UnaryAssociationProposal, 
  type BinaryAssociationProposal, 
  type BinaryAssociationExistenceDependentProposal, 
  type BinaryAssociationNoExistenceDependencyProposal 
} from './types/proposals';
import { 
  type Decision, 
  type UnaryAssociationDecision, 
  type BinaryAssociationExistenceDependentDecision, 
  type BinaryAssociationNoExistenceDependencyDecision 
} from './types/decisions';

// Type guards to determine proposal type at runtime by checking for unique properties
const isBinaryAssociationProposal = (p: Proposal): p is BinaryAssociationProposal => 'proposedExistenceDependency' in p;
const isUnaryAssociationProposal = (p: Proposal): p is UnaryAssociationProposal => 'proposedClassName' in p && !isBinaryAssociationProposal(p);

function App() {
  const [modelName, setModelName] = useState<string>("");
  const [umlIR, setUmlIR] = useState<UMLIR | null>(null);
  const [error, setError] = useState<string>("");
  const [merodeIR, setMerodeIR] = useState<MerodeIR | null>(null);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [decisions, setDecisions] = useState<Map<string, Decision>>(new Map()); // New state for decisions

  //recreates the function if umlIR or decisions change, which triggers the execution in useEffect
  const reMapModels = useCallback(() => {
    if (umlIR) {
      const { merodeIR: newMerodeIR, proposals: newProposals } = mapUmlToMerode(umlIR, decisions);
      setMerodeIR(newMerodeIR);
      setProposals(newProposals);
      console.log("Re-mapped MERODE IR:", newMerodeIR);
      console.log("Generated Proposals based on current decisions:", newProposals);
      console.log("Current decisions:", Array.from(decisions.entries()));
    }
  }, [umlIR, decisions]); // Depend on umlIR and decisions

  useEffect(() => {
    reMapModels();
  }, [reMapModels]); // Re-run mapping when reMapModels changes

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
      setDecisions(new Map()); // Reset decisions when a new file is loaded

      if (mappedIR === null) {
        const errorMessage = "Fehler bei der Verarbeitung der XMI-Daten. Bitte überprüfen Sie die Struktur der Datei.";
        setError(errorMessage);
        logger.error(errorMessage);
      }  
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
    setProposals([]);
    setDecisions(new Map());
    logger.error(errorMessage);
  };

  /**
   * handles the change of the proposal value by the user
   * @param proposalId 
   * @param key 
   * @param value 
   */
  const handleProposalChange = (proposalId: string, key: string, value: string) => {
    setProposals(prevProposals =>
      prevProposals.map(p =>
        p.id === proposalId ? { ...p, [key]: value } : p
      )
    );
  };

  const handleAcceptProposal = (proposal: Proposal) => {
    // Convert the proposal to a decision based on its type
    let newDecision: Decision | null = null;
    
    if (isUnaryAssociationProposal(proposal)) {
      newDecision = {
        id: proposal.id,
        type: 'unaryAssociationDecision',
        chosenClassName: proposal.proposedClassName,
        chosenRole1Name: proposal.proposedRole1Name,
        chosenRole2Name: proposal.proposedRole2Name,
      } as UnaryAssociationDecision;
    } else if (isBinaryAssociationProposal(proposal)) {
      if (proposal.proposedExistenceDependency) {
        const p = proposal as BinaryAssociationExistenceDependentProposal;
        newDecision = {
          id: p.id,
          type: 'binaryAssociationExistenceDependentDecision',
          chosenExistenceDependency: true,
          chosenMasterClassId: p.proposedMasterClassId,
          chosenDependentClassId: p.proposedDependentClassId,
        } as BinaryAssociationExistenceDependentDecision;
      } else {
        const p = proposal as BinaryAssociationNoExistenceDependencyProposal;
        newDecision = {
          id: p.id,
          type: 'binaryAssociationNoExistenceDependencyDecision',
          chosenExistenceDependency: false,
          chosenClassName: p.proposedClassName,
          chosenRole1Name: p.proposedRole1Name,
          chosenRole2Name: p.proposedRole2Name,
        } as BinaryAssociationNoExistenceDependencyDecision;
      }
    }
    // Add more cases for other proposal types with `else if`
    else {
      console.warn(`Unknown proposal type for ID: ${proposal.id}`);
    }

    if (newDecision) {
      setDecisions(prevDecisions => {
        const updatedDecisions = new Map(prevDecisions);
        updatedDecisions.set(newDecision!.id, newDecision!);
        return updatedDecisions;
      });
      // The reMapModels useEffect will be triggered by the setDecisions call
    }
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
      {proposals.length > 0 && ( // Überprüfen, ob Proposals vorhanden sind
        <div style={{ flexShrink: 0, marginTop: '20px', padding: '15px', border: '1px solid #555', borderRadius: '8px', backgroundColor: '#1e1e1e', boxShadow: '0 4px 6px rgba(0,0,0,0.4)', overflowX: 'auto' }}>
          <h2 style={{ marginTop: 0, marginBottom: '15px', color: '#f8f8f2' }}>Vorschläge zur Klärung:</h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px' }}>
            {proposals.map((proposal, index) => (
              <div key={proposal.id} style={{
                border: '1px solid #4A90E2',
                borderRadius: '8px',
                padding: '15px',
                backgroundColor: '#2d2d2d',
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                minWidth: '300px', // Mindestbreite für die Karte
                color: '#f8f8f2'
              }}>
                <h3 style={{ margin: '0 0 10px 0', color: '#4A90E2' }}>Vorschlag {index + 1}</h3>
                {Object.entries(proposal).map(([key, value]) => {
                  if (key === 'id') return null;
                  return (
                    <div key={`${proposal.id}-${key}`} style={{ marginBottom: '8px' }}>
                      <label htmlFor={`${proposal.id}-${key}`} style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>{key}:</label>
                      <input
                        id={`${proposal.id}-${key}`}
                        type="text"
                        value={value as string}
                        onChange={(e) => {
                          handleProposalChange(proposal.id, key, e.target.value);
                        }}
                        style={{
                          width: 'calc(100% - 10px)',
                          padding: '8px',
                          borderRadius: '4px',
                          border: '1px solid #555',
                          backgroundColor: '#3c3c3c',
                          color: '#f8f8f2'
                        }}
                      />
                    </div>
                  );
                })}
                <button
                  onClick={() => handleAcceptProposal(proposal)}
                  style={{
                    marginTop: '15px',
                    padding: '10px 20px',
                    backgroundColor: '#28a745', // Green color for accept
                    color: 'white',
                    border: 'none',
                    borderRadius: '5px',
                    cursor: 'pointer',
                    fontSize: '1em',
                  }}>Vorschlag annehmen</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;