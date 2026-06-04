import { useState, useEffect, useCallback, useRef } from "react";
import FilePicker from './components/filePicker';
import { parseXmlToAny } from './utils/xmiParser';
import { logger } from './utils/logger';
import ProposalPanel from './components/proposalPanel';
import { mapXmiToIR } from './mappers/jsonToUml'; // Corrected import path
import { mapUmlToMerode } from './mappers/umlToMerode';
import UMLDiagram from "./components/diagrammElements/UMLDiagram";
import MERODEDiagram from "./components/diagrammElements/MerodeDiagram";
import { type XmiJsonData } from './types/metamodels/xmiJson';
import { type UMLIR, type UMLAssociation } from './types/metamodels/uml';
import { type MerodeIR } from "./types/metamodels/merode";
import { 
  type Proposal,
  type BinaryAssociationProposal, 
  type UnaryAssociationProposal,
  type NAryAssociationProposal,
} from './types/proposals';
import { 
  type Decision, 
} from './types/decisions';
import { convertProposalToDecision } from "./utils/decisionConverter";
import './App.css'; // Add CSS import
import { ReactFlowProvider } from '@xyflow/react';
import { exportToMxp } from './utils/exportService';
import { aiService } from './utils/aiService';

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
  const [isAILoading, setIsAILoading] = useState<boolean>(false);
  const [aiLoadingText, setAiLoadingText] = useState<string>("");

  const proposalsRef = useRef<Proposal[]>([]);
  useEffect(() => {
    proposalsRef.current = proposals;
  }, [proposals]);

  const reMapModels = useCallback((currentProposals: Proposal[] = proposalsRef.current) => {
    if (umlIR) {
      const { merodeIR: newMerodeIR, proposals: newProposals } = mapUmlToMerode(umlIR, decisions, currentProposals);
      setMerodeIR(newMerodeIR);
      setProposals(newProposals);
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
      const name = rawData["uml:Model"].name || "Untitled Model";
      setModelName(name);
      logger.log("These are the elements:", rawData["uml:Model"].packagedElement);
      
      // Transform the raw JSON into our clean UML IR graph format
      const mappedIR = mapXmiToIR(rawData);
      logger.log("Mapped UML Internal Representation (IR):", mappedIR);
      setUmlIR(mappedIR);
      setDecisions(new Map()); // Reset decisions when a new file is loaded

      if (mappedIR === null) {
        const errorMessage = "Error processing XMI data. Please check the file structure.";
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
    const updatedProposals = proposalsRef.current.map(p => {
      if (p.id === proposalId) {
        return { ...p, [key]: value } as Proposal;
      }
      return p;
    });
    
    // Instantly map models so real-time modifications apply in the MERODE view
    reMapModels(updatedProposals);
  };

  const handleSwapMasterDependent = (proposalId: string) => {
    const updatedProposals = proposalsRef.current.map(p => {
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
    });
    
    reMapModels(updatedProposals);
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

  const handleAiModelGeneration = async () => {
    if (umlIR) {
      setIsAILoading(true);
      setAiLoadingText("Initializing AI...");
      aiService.setProgressCallback((text) => setAiLoadingText(text));
      try {
        await aiService.initialize();
        
        const updatedProposals = [...proposalsRef.current];
        let hasChanges = false;

        for (let i = 0; i < updatedProposals.length; i++) {
          const p = updatedProposals[i];
          
          if (decisions.has(p.id)) continue;
          
          if ('proposedClassName' in p && (!p.proposedClassName || p.proposedClassName.trim() === '')) {
            let classNames: string[] = [];
            let roles: string[] = [];
            
            if ('proposedMasterClassName' in p && 'proposedDependentClassName' in p) {
              const bp = p as BinaryAssociationProposal;
              if (!bp.proposedExistenceDependency) {
                classNames = [bp.proposedMasterClassName, bp.proposedDependentClassName];
                roles = [bp.proposedRole1Name || '', bp.proposedRole2Name || ''];
              }
            } else if ('proposedRoleNames' in p) {
              const np = p as NAryAssociationProposal;
              const assoc = umlIR.model.packagedElement.find(el => el.id === np.id) as UMLAssociation;
              classNames = assoc ? assoc.ends.map(e => umlIR.model.packagedElement.find(c => c.id === e.targetClassId)?.name || 'Entity') : [];
              roles = np.proposedRoleNames;
            } else if ('proposedRole1Name' in p && !('proposedExistenceDependency' in p)) {
              const up = p as UnaryAssociationProposal;
              const assoc = umlIR.model.packagedElement.find(el => el.id === up.id) as UMLAssociation;
              const name = assoc ? (umlIR.model.packagedElement.find(c => c.id === assoc.ends[0].targetClassId)?.name || 'Entity') : 'Entity';
              classNames = [name, name];
              roles = [up.proposedRole1Name || '', up.proposedRole2Name || ''];
            }

            if (classNames.length > 0) {
              setAiLoadingText(`Generating name for ${classNames.join(', ')}...`);
              const generatedName = await aiService.generateIntermediateClassName(classNames, roles);
              updatedProposals[i] = { ...p, proposedClassName: generatedName } as any;
              hasChanges = true;
            }
          }
        }

        if (hasChanges) reMapModels(updatedProposals);
      } catch (err) {
        console.error("AI Generation failed:", err);
      } finally {
        setIsAILoading(false);
      }
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
        <main className="app-main-content" style={{ position: 'relative' }}>
          {isAILoading && (
            <div style={{
              position: 'absolute',
              top: 0, left: 0, right: 0, bottom: 0,
              backgroundColor: 'rgba(18, 18, 18, 0.6)',
              backdropFilter: 'blur(10px)',
              zIndex: 1000,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#f3f4f6'
            }}>
              <div style={{
                width: '50px', height: '50px',
                border: '5px solid #3f3f46',
                borderTop: '5px solid #818cf8',
                borderRadius: '50%',
                animation: 'ai-spin 1s linear infinite',
                marginBottom: '20px'
              }}></div>
              <style>{`@keyframes ai-spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
              <h3 style={{ margin: '0 0 10px 0' }}>Please wait, AI is generating names... Magic is happening here!</h3>
              <p style={{ maxWidth: '80%', textAlign: 'center', margin: 0, fontSize: '0.9em', color: '#a1a1aa' }}>{aiLoadingText}</p>
            </div>
          )}
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
            <div id="merode-diagram-container" className="app-diagram-container" style={{ display: viewMode === 'uml' ? 'none' : undefined }}>
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
              <p>No model loaded. Please select an XMI file.</p>
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
                      title="Show UML Diagram"
                    >
                      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                        <text x="12" y="16" fontSize="10" fontWeight="bold" textAnchor="middle" fill="currentColor" stroke="none" fontFamily="sans-serif">U</text>
                      </svg>
                    </button>
                    <button 
                      onClick={() => setViewMode('split')} 
                      className={`app-control-btn ${showProposals ? 'expanded' : 'collapsed'} ${viewMode === 'split' ? 'active' : 'inactive'}`}
                      title="Show Split View"
                    >
                      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                        <line x1="12" y1="3" x2="12" y2="21"></line>
                      </svg>
                    </button>
                    <button 
                      onClick={() => setViewMode('merode')} 
                      className={`app-control-btn ${showProposals ? 'expanded' : 'collapsed'} ${viewMode === 'merode' ? 'active' : 'inactive'}`}
                      title="Show MERODE Diagram"
                    >
                      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                        <text x="12" y="16" fontSize="10" fontWeight="bold" textAnchor="middle" fill="currentColor" stroke="none" fontFamily="sans-serif">M</text>
                      </svg>
                    </button>
                    <button 
                      onClick={() => setLayoutResetCount(prev => prev + 1)} 
                      className={`app-control-btn ${showProposals ? 'expanded' : 'collapsed'} inactive`}
                      title="Rearrange Diagram Layout"
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
                    <button 
                      onClick={handleAiModelGeneration} 
                      className={`app-control-btn ${showProposals ? 'expanded' : 'collapsed'} ${isAILoading ? 'active' : 'inactive'}`}
                      title="Generate Names with AI"
                      disabled={isAILoading}
                    >
                      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                        <text x="12" y="16" fontSize="10" fontWeight="bold" textAnchor="middle" fill="currentColor" stroke="none" fontFamily="sans-serif">AI</text>
                      </svg>
                    </button>
                  </>
                )}
              <button 
                onClick={() => setShowProposals(!showProposals)} 
                className={`app-control-btn ${showProposals ? 'expanded' : 'collapsed'} inactive`}
                title={showProposals ? "Hide Proposals" : "Show Proposals"}
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