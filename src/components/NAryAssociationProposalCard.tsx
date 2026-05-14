import { type NAryAssociationProposal } from '../types/proposals';

interface NAryAssociationProposalCardProps {
  proposal: NAryAssociationProposal;
  onProposalChange: (proposalId: string, key: string, value: any) => void;
  onAcceptProposal: (proposal: NAryAssociationProposal) => void;
}

const NAryAssociationProposalCard = ({ proposal, onProposalChange, onAcceptProposal }: NAryAssociationProposalCardProps) => {
  const handleRoleChange = (index: number, value: string) => {
    const newRoles = [...proposal.proposedRoleNames];
    newRoles[index] = value;
    onProposalChange(proposal.id, 'proposedRoleNames', newRoles);
  };

  return (
    <div className="proposal-card">
      <h3 className="proposal-card-title">Resolve N-ary Association</h3>
      <p className="proposal-card-section">{proposal.message}</p>
      
      <div className="proposal-card-fields">
        <div>
          <label htmlFor={`${proposal.id}-className`} className="proposal-card-label">Name of the new class:</label>
          <input
            id={`${proposal.id}-className`}
            type="text"
            value={proposal.proposedClassName}
            onChange={(e) => onProposalChange(proposal.id, 'proposedClassName', e.target.value)}
            className="proposal-card-input"
          />
        </div>

        {proposal.proposedRoleNames.map((roleName, index) => (
          <div key={`${proposal.id}-role-${index}`}>
            <label htmlFor={`${proposal.id}-role-${index}`} className="proposal-card-label">Role name {index + 1}:</label>
            <input
              id={`${proposal.id}-role-${index}`}
              type="text"
              value={roleName || ''}
              onChange={(e) => handleRoleChange(index, e.target.value)}
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

export default NAryAssociationProposalCard;