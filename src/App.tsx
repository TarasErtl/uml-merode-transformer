import { useState, useEffect, useCallback } from "react";
import FilePicker from './components/filePicker';
import { parseXmlToAny } from './utils/xmiParser';
import { logger } from './utils/logger';
import ProposalPanel from './components/proposalPanel';
import { mapXmiToIR } from './mappers/jsonToUml'; // Corrected import path
import { mapUmlToMerode } from './mappers/umlToMerode';
import UMLDiagram from "./components/diagrammElements/UMLDiagram";
import MERODEDiagram from "./components/diagrammElements/MerodeDiagram";
import { type XmiJsonData } from './types/metamodels/xmiJson';
import { type UMLIR } from './types/metamodels/uml';
import { type MerodeIR } from "./types/metamodels/merode";
import { 
  type Proposal,
  type BinaryAssociationProposal, 
} from './types/proposals';
import { 
  type Decision, 
} from './types/decisions';
import { convertProposalToDecision } from "./utils/decisionConverter";
import './App.css'; // Add CSS import
import { ReactFlowProvider } from '@xyflow/react';
import { exportToMxp } from './utils/exportService';

function App() {
  const [modelName, setModelName] = useState<string>("");
  const [umlIR, setUmlIR] = useState<UMLIR | null>(null);
  const [error, setError] = useState<string>("");
  const [merodeIR, setMerodeIR] = useState<MerodeIR | null>(null);
  const [viewMode, setViewMode] = useState<'uml' | 'merode' | 'split'>('split');
  const [showProposals, setShowProposals] = useState<boolean>(true);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [decisions, setDecisions] = useState<Map<string, Decision>>(new Map()); // New state for decisions
  const [hoveredElementId, setHoveredElementId] = useState<string | null>(null); // State for cross-diagram hover
  const [hoverSource, setHoverSource] = useState<'proposal' | 'diagram' | null>(null);
  const [layoutResetCount, setLayoutResetCount] = useState<number>(0);

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

  const handleProposalHover = (id: string | null) => {
    setHoveredElementId(id);
    setHoverSource(id ? 'proposal' : null);
  };

  const handleDiagramHover = (id: string | null) => {
    setHoveredElementId(id);
    setHoverSource(id ? 'diagram' : null);
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
          return updated as Proposal;
        }
        return p;
      })
    );
  };

  const handleSwapMasterDependent = (proposalId: string) => {
    setProposals(prev => prev.map(p => {
      if (p.id === proposalId && 'proposedMasterClassId' in p) {
        const prop = p as BinaryAssociationProposal;
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
      setHoveredElementId(null); // Reset hover state when a proposal disappears
      setHoverSource(null);
      // The reMapModels useEffect will be triggered by the setDecisions call
    }
  };

  return (
    <div className="app-container">
      {!modelName && (
        <div className="app-loader-container">
          <div className="app-filepicker-wrapper">
            <FilePicker onFileLoaded={handleFileLoaded} onFileError={handleFileError} />
            {error && <div className="app-error-message">{error}</div>}
          </div>
        </div>
      )}
      {modelName && (
        <div className="app-main-layout">
        {/* Main content area */}
        <main className="app-main-content">
          {umlIR && (
            <div className="app-diagram-container" style={{ display: viewMode === 'merode' ? 'none' : undefined }}>
              <div className="app-diagram-wrapper">
                <ReactFlowProvider>
                  <UMLDiagram 
                    key={`uml-diagram-${modelName}-${layoutResetCount}`} 
                    umlIR={umlIR} 
                    hoveredElementId={hoveredElementId}
                    hoverSource={hoverSource}
                    onHoverElement={handleDiagramHover}
                  />
                </ReactFlowProvider>
              </div>
            </div>
          )}
          {umlIR && merodeIR && (
            <div className="app-diagram-container" style={{ display: viewMode === 'uml' ? 'none' : undefined }}>
              <div className="app-diagram-wrapper">
                <ReactFlowProvider>
                  <MERODEDiagram 
                    key={`merode-diagram-${modelName}-${layoutResetCount}`} 
                    merodeIR={merodeIR} 
                    hoveredElementId={hoveredElementId}
                    hoverSource={hoverSource}
                    onHoverElement={handleDiagramHover}
                  />
                </ReactFlowProvider>
              </div>
            </div>
          )}
          {(!umlIR) && (
            <div className="app-no-model">
              <p>Kein Modell geladen. Bitte wählen Sie eine XMI-Datei aus.</p>
            </div>
          )}
        </main>

        {/* Sidebar */}
        <aside className={`app-sidebar ${showProposals ? 'open' : 'closed'}`}> 
          <div className="app-sidebar-inner">
            {/* Control Panel */}
            <div className={`app-control-panel ${showProposals ? 'open' : 'closed'}`}>
                {umlIR && (
                  <>
                    <button 
                      onClick={() => setViewMode('uml')} 
                      className={`app-control-btn ${showProposals ? 'expanded' : 'collapsed'} ${viewMode === 'uml' ? 'active' : 'inactive'}`}
                      title="UML Diagramm anzeigen"
                    >
                      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                        <text x="12" y="16" fontSize="10" fontWeight="bold" textAnchor="middle" fill="currentColor" stroke="none" fontFamily="sans-serif">U</text>
                      </svg>
                    </button>
                    <button 
                      onClick={() => setViewMode('split')} 
                      className={`app-control-btn ${showProposals ? 'expanded' : 'collapsed'} ${viewMode === 'split' ? 'active' : 'inactive'}`}
                      title="Split View anzeigen"
                    >
                      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                        <line x1="12" y1="3" x2="12" y2="21"></line>
                      </svg>
                    </button>
                    <button 
                      onClick={() => setViewMode('merode')} 
                      className={`app-control-btn ${showProposals ? 'expanded' : 'collapsed'} ${viewMode === 'merode' ? 'active' : 'inactive'}`}
                      title="MERODE Diagramm anzeigen"
                    >
                      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                        <text x="12" y="16" fontSize="10" fontWeight="bold" textAnchor="middle" fill="currentColor" stroke="none" fontFamily="sans-serif">M</text>
                      </svg>
                    </button>
                    <button 
                      onClick={() => setLayoutResetCount(prev => prev + 1)} 
                      className={`app-control-btn ${showProposals ? 'expanded' : 'collapsed'} inactive`}
                      title="Diagramm-Layout neu anordnen"
                    >
                      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="8" y="3" width="8" height="6" rx="1"></rect>
                        <rect x="2" y="15" width="8" height="6" rx="1"></rect>
                        <rect x="14" y="15" width="8" height="6" rx="1"></rect>
                        <path d="M12 9v3"></path>
                        <path d="M18 15v-3H6v3"></path>
                      </svg>
                    </button>
                    <button 
                      onClick={() => merodeIR && exportToMxp(merodeIR)} 
                      className={`app-control-btn ${showProposals ? 'expanded' : 'collapsed'} inactive`}
                      title="Export to MXP"
                    >
                      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="7 10 12 15 17 10"></polyline>
                        <line x1="12" y1="15" x2="12" y2="3"></line>
                      </svg>
                    </button>
                  </>
                )}
              <button 
                onClick={() => setShowProposals(!showProposals)} 
                className={`app-control-btn ${showProposals ? 'expanded' : 'collapsed'} inactive`}
                title={showProposals ? "Proposals ausblenden" : "Proposals einblenden"}
              >
                {showProposals ? (
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                ) : (
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
                )}
              </button>
            </div>

            {/* Proposals Panel - only render when shown */}
            <div className={`app-proposals-container ${showProposals ? 'open' : 'closed'}`}>
              <ProposalPanel 
                proposals={proposals}
                onProposalChange={handleProposalChange}
                onSwapMasterDependent={handleSwapMasterDependent}
                onAcceptProposal={handleAcceptProposal}
                onHoverProposal={handleProposalHover}
              />
            </div>
          </div>
        </aside>
      </div>
      )}
    </div>
  );
}

export default App;