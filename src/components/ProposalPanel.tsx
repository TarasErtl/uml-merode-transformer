import { type Proposal } from '../types/proposals';
import { isBinaryAssociationProposal, isNAryAssociationProposal, isUnaryAssociationProposal, isEventsProposal } from '../utils/proposalTypeGuards';
import UnaryAssociationProposalCard from './proposals/unaryAssociationProposalCard';
import BinaryAssociationProposalCard from './proposals/binaryAssociationProposalCard';
import NAryAssociationProposalCard from './proposals/nAryAssociationProposalCard';
import EventsProposalCard from './proposals/eventsProposalCard';
import './Proposals.css';

interface ProposalPanelProps {
  proposals: Proposal[];
  onProposalChange: (proposalId: string, key: string, value: any) => void;
  onAcceptProposal: (proposal: Proposal) => void;
  onSwapMasterDependent: (proposalId: string) => void; // Added here
  onHoverProposal: (proposalId: string | null) => void;
}

export const ProposalPanel = ({ proposals, onProposalChange, onAcceptProposal, onSwapMasterDependent, onHoverProposal }: ProposalPanelProps) => {
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
          } else if (isEventsProposal(proposal)) {
            cardContent = <EventsProposalCard proposal={proposal} onProposalChange={onProposalChange} onAcceptProposal={onAcceptProposal} onHoverEvent={onHoverProposal} />;
          } else {
            // Fallback for unknown proposal types
            cardContent = <div>Unknown proposal type: {proposal.id}</div>;
          }

          return (
            <div 
              key={proposal.id}
              onMouseEnter={() => onHoverProposal(proposal.id)}
              onMouseLeave={() => onHoverProposal(null)}
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