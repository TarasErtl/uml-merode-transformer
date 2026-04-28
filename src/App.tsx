import { useState, useEffect, useCallback } from "react";
import FilePicker from './components/FilePicker';
import { parseXmlToAny } from './utils/xmiParser';
import { logger } from './utils/logger';
import ProposalPanel from './components/ProposalPanel';
import { mapXmiToIR } from './mappers/jsonToUml'; // Corrected import path
import { mapUmlToMerode } from './mappers/umlToMerode';
import UMLDiagram from "./components/DiagrammElements/UMLDiagram";
import MERODEDiagram from "./components/DiagrammElements/MerodeDiagram";
import { type XmiJsonData } from './types/metamodels/xmiJson';
import { type UMLIR } from './types/metamodels/uml';
import { type MerodeIR } from "./types/metamodels/merode";
import { 
  type Proposal,
  type BinaryAssociationExistenceDependentProposal, 
} from './types/proposals';
import { 
  type Decision, 
} from './types/decisions';
import { convertProposalToDecision } from "./utils/decisionConverter";

function App() {
  const [modelName, setModelName] = useState<string>("");
  const [umlIR, setUmlIR] = useState<UMLIR | null>(null);
  const [error, setError] = useState<string>("");
  const [merodeIR, setMerodeIR] = useState<MerodeIR | null>(null);
  const [showMerodeDiagram, setShowMerodeDiagram] = useState<boolean>(false); // New state to toggle diagram view
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
  const handleProposalChange = (proposalId: string, key: string, value: any) => {
    setProposals(prevProposals =>
      prevProposals.map(p => {
        if (p.id === proposalId) {
          const updated = { ...p, [key]: value } as any;
          if (key === 'proposedExistenceDependency') {
            if (value === true) {
              if (!updated.proposedMasterClassName && updated.class1Name) {
                updated.proposedMasterClassName = updated.class1Name;
              }
              if (!updated.proposedDependentClassName && updated.class2Name) {
                updated.proposedDependentClassName = updated.class2Name;
              }
              // Fehlende IDs aus dem ursprünglichen UML-Graphen laden, damit der Swap-Button funktioniert
              if (!updated.proposedMasterClassId || !updated.proposedDependentClassId) {
                const assoc = umlIR?.model.packagedElement.find(e => e.id === proposalId) as any;
                if (assoc && assoc.ends && assoc.ends.length >= 2) {
                  updated.proposedMasterClassId = assoc.ends[0].targetClassId;
                  updated.proposedDependentClassId = assoc.ends[1].targetClassId;
                }
              }
            } else {
              if (!updated.class1Name && updated.proposedMasterClassName) {
                updated.class1Name = updated.proposedMasterClassName;
              }
              if (!updated.class2Name && updated.proposedDependentClassName) {
                updated.class2Name = updated.proposedDependentClassName;
              }
            }
          }
          return updated as Proposal;
        }
        return p;
      })
    );
  };

  const handleSwapMasterDependent = (proposalId: string) => {
    setProposals(prev => prev.map(p => {
      if (p.id === proposalId && 'proposedMasterClassId' in p) {
        const prop = p as BinaryAssociationExistenceDependentProposal;
        return {
          ...prop,
          proposedMasterClassId: prop.proposedDependentClassId,
          proposedDependentClassId: prop.proposedMasterClassId,
          proposedMasterClassName: prop.proposedDependentClassName,
          proposedDependentClassName: prop.proposedMasterClassName,
        };
      }
      return p;
    }));
  }

  const handleAcceptProposal = (proposal: Proposal) => {
    // Convert the proposal to a decision based on its type
    const newDecision: Decision | null = convertProposalToDecision(proposal);

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
    <div className="flex flex-col h-screen font-sans bg-gray-900 text-gray-100">
      {!modelName && (
        <header className="flex-shrink-0 p-4 border-b border-gray-700 shadow-md">
          <h1 className="text-2xl font-bold text-white">UML-zu-MERODE Transformator</h1>
          <p className="text-sm text-gray-400">Laden Sie eine XMI-Datei hoch, um die Transformation zu starten und Vorschläge zu bearbeiten.</p>
          <div className="mt-4">
            <FilePicker onFileLoaded={handleFileLoaded} onFileError={handleFileError} />
            {modelName && ( // This inner check for modelName will now always be false if the outer condition is true
              <div className="mt-2 text-sm">
                <strong>Modell:</strong> <span className="font-mono p-1 bg-gray-700 rounded">{modelName}</span>
              </div>
            )}
            {error && <div className="mt-2 text-red-400 bg-red-900/50 p-2 rounded">{error}</div>}
          </div>
        </header>
      )}
      <div className="flex flex-grow overflow-hidden">
        {/* Toggle button for diagram view */}
        {umlIR && (
          <div className="absolute top-4 right-4 z-10">
            <button 
              onClick={() => setShowMerodeDiagram(!showMerodeDiagram)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md font-semibold text-sm hover:bg-blue-700 transition-colors"
            >
              {showMerodeDiagram ? 'Show UML Diagram' : 'Show MERODE Diagram'}
            </button>
          </div>
        )}
        <main className="flex-grow p-4 relative">
          {umlIR && showMerodeDiagram && merodeIR ? (
            <MERODEDiagram merodeIR={merodeIR} />
          ) : umlIR && !showMerodeDiagram ? (
            <UMLDiagram umlIR={umlIR} />
          ) : ( // No UML IR loaded
            <div className="flex items-center justify-center h-full text-gray-500"> 
              <p>Kein Modell geladen. Bitte wählen Sie eine XMI-Datei aus.</p> 
            </div>
          )}
        </main>
        <aside className="w-1/4 flex-shrink-0 h-full p-4"> {/* aside nimmt volle Höhe und hat Padding */} 
          <ProposalPanel 
            proposals={proposals}
            onProposalChange={handleProposalChange}
            onSwapMasterDependent={handleSwapMasterDependent}
            onAcceptProposal={handleAcceptProposal}
            className="h-full flex flex-col" /* ProposalPanel füllt die übergeordnete Höhe aus und wird zu einem Flex-Spalten-Container */
          />
        </aside>
      </div>
    </div>
  );
}

export default App;