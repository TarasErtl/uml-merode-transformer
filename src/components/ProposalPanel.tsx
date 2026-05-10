import { type Proposal } from '../types/proposals';
import { isBinaryAssociationProposal, isNAryAssociationProposal, isUnaryAssociationProposal } from '../utils/proposalTypeGuards';
import UnaryAssociationProposalCard from './UnaryAssociationProposalCard';
import BinaryAssociationProposalCard from './BinaryAssociationProposalCard';
import NAryAssociationProposalCard from './NAryAssociationProposalCard';
import './Proposals.css';

interface ProposalPanelProps {
  proposals: Proposal[];
  onProposalChange: (proposalId: string, key: string, value: any) => void;
  onAcceptProposal: (proposal: Proposal) => void;
  onSwapMasterDependent: (proposalId: string) => void; // Added here
}

export const ProposalPanel = ({ proposals, onProposalChange, onAcceptProposal, onSwapMasterDependent }: ProposalPanelProps) => {
  if (proposals.length > 0) {
    return (
    <div className="proposal-panel">
      <h2 className="proposal-panel-title">Open Proposals:</h2>
      <div className="proposal-panel-list">
        {proposals.map((proposal) => {
          let cardContent;

          if (isUnaryAssociationProposal(proposal)) {
            cardContent = <UnaryAssociationProposalCard proposal={proposal} onProposalChange={onProposalChange} onAcceptProposal={onAcceptProposal} />;
          } else if (isBinaryAssociationProposal(proposal)) {
            cardContent = <BinaryAssociationProposalCard proposal={proposal} onProposalChange={onProposalChange} onAcceptProposal={onAcceptProposal} onSwapMasterDependent={onSwapMasterDependent} />;
          } else if (isNAryAssociationProposal(proposal)) {
            cardContent = <NAryAssociationProposalCard proposal={proposal} onProposalChange={onProposalChange} onAcceptProposal={onAcceptProposal} />;
          } else {
            // Fallback für unbekannte Proposal-Typen
            cardContent = <div>Unbekannter Proposal-Typ: {proposal.id}</div>;
          }

          return (
            <div 
              key={proposal.id}
            >
              {cardContent}
            </div>
          );
        })}
      </div>
    </div>
  );
}
};

export default ProposalPanel;