import { type Proposal } from '../types/proposals';
import { isBinaryAssociationProposal, isUnaryAssociationProposal } from '../utils/proposalTypeGuards';
import UnaryAssociationProposalCard from './UnaryAssociationProposalCard';
import BinaryAssociationProposalCard from './BinaryAssociationProposalCard';

interface ProposalPanelProps {
  proposals: Proposal[];
  onProposalChange: (proposalId: string, key: string, value: any) => void;
  onAcceptProposal: (proposal: Proposal) => void;
  onSwapMasterDependent: (proposalId: string) => void; // Added here
  className?: string; // Add className to props
}

const ProposalPanel = ({ proposals, onProposalChange, onAcceptProposal, onSwapMasterDependent, className }: ProposalPanelProps) => {
  if (proposals.length > 0) {
    return (
    <div className={`${className} p-4`}> {/* Abstand zum Panel-Rand mit Tailwind statt inline-style */}
      <h2 className="text-lg font-bold mb-4">Open Proposals:</h2> {/* Added mb-4 for spacing */}
      <div className="flex flex-col gap-4 flex-grow overflow-y-auto"> {/* Ermöglicht Scrollen und nimmt verfügbaren Platz ein */}
        {proposals.map((proposal) => {
          if (isUnaryAssociationProposal(proposal)) {
            return <UnaryAssociationProposalCard key={proposal.id} proposal={proposal} onProposalChange={onProposalChange} onAcceptProposal={onAcceptProposal} />;
          }
          if (isBinaryAssociationProposal(proposal)) {
            return <BinaryAssociationProposalCard key={proposal.id} proposal={proposal} onProposalChange={onProposalChange} onAcceptProposal={onAcceptProposal} onSwapMasterDependent={onSwapMasterDependent} />;
          }
          // Fallback für unbekannte Proposal-Typen
          return <div key={proposal.id}>Unbekannter Proposal-Typ: {proposal.id}</div>;
        })}
      </div>
    </div>
  );
  }
};

export default ProposalPanel;