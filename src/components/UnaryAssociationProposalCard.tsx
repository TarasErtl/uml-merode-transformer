import { type UnaryAssociationProposal } from '../types/proposals';

interface UnaryAssociationProposalCardProps {
  proposal: UnaryAssociationProposal;
  onProposalChange: (proposalId: string, key: string, value: string) => void;
  onAcceptProposal: (proposal: UnaryAssociationProposal) => void;
}

const UnaryAssociationProposalCard = ({ proposal, onProposalChange, onAcceptProposal }: UnaryAssociationProposalCardProps) => {
  const fieldsToRender = [
    { key: 'proposedClassName', label: 'Name of the new class:' },
    { key: 'proposedRole1Name', label: 'Role name 1:' },
    { key: 'proposedRole2Name', label: 'Role name 2:' },
  ];

  return (
    <div className="proposal-card">
      <h3 className="proposal-card-title">Resolve Unary Association</h3>
      <p className="proposal-card-section">{proposal.message}</p>
      
      <div className="proposal-card-fields">
        {fieldsToRender.map(({ key, label }) => (
          <div key={key}>
            <label htmlFor={`${proposal.id}-${key}`} className="proposal-card-label">{label}</label>
            <input
              id={`${proposal.id}-${key}`}
              type="text"
              value={(proposal[key as keyof UnaryAssociationProposal] as string) || ''}
              onChange={(e) => onProposalChange(proposal.id, key, e.target.value)}
              className="proposal-card-input"
            />
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() => onAcceptProposal(proposal)}
        className="proposal-card-button"
      >
        Accept proposal
      </button>
    </div>
  );
};

export default UnaryAssociationProposalCard;