import { type BinaryAssociationProposal} from '../../types/proposals';

interface BinaryAssociationProposalCardProps {
  proposal: BinaryAssociationProposal;
  onProposalChange: (proposalId: string, key: string, value: any) => void;
  onAcceptProposal: (proposal: BinaryAssociationProposal) => void;
  onSwapMasterDependent: (proposalId: string) => void;
}

const BinaryAssociationProposalCard = ({ proposal, onProposalChange, onAcceptProposal, onSwapMasterDependent }: BinaryAssociationProposalCardProps) => {

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onProposalChange(proposal.id, 'proposedExistenceDependency', e.target.checked);
  };

  return (
    <div className="proposal-card">
      <h3 className="proposal-card-title">Resolve Binary Association</h3>
      <p className="proposal-card-section">{proposal.message}</p>

      <div className="proposal-card-section">
        <label className="proposal-card-checkbox-label">
          <input
            type="checkbox"
            checked={proposal.proposedExistenceDependency}
            onChange={handleCheckboxChange}
            
          />
          Assume existence dependency?
        </label>
      </div>

      {proposal.proposedExistenceDependency ? (
        <ExistenceDependentView
          proposal={proposal} 
          onSwapMasterDependent={onSwapMasterDependent} 
        />
      ) : (
        <NoExistenceDependencyView
          proposal={proposal} 
          onProposalChange={onProposalChange} 
        />
      )}

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

const ExistenceDependentView = ({ proposal, onSwapMasterDependent }: { proposal: BinaryAssociationProposal, onSwapMasterDependent: (id: string) => void }) => (
  <div className="proposal-card-section">
    <p className="proposal-card-section-title">Role distribution:</p>
    <div className="proposal-card-role-distribution">
      <div className="proposal-card-role-side">
        <span className="proposal-card-role-label">Master:</span>
        <span className="proposal-card-role-value" title={proposal.proposedMasterClassName}>{proposal.proposedMasterClassName}</span>
      </div>
      <button type="button" onClick={() => onSwapMasterDependent(proposal.id)} className="proposal-card-swap-button">⇋</button>
      <div className="proposal-card-role-side right">
        <span className="proposal-card-role-label">Dependent:</span>
        <span className="proposal-card-role-value" title={proposal.proposedDependentClassName}>{proposal.proposedDependentClassName}</span>
      </div>
    </div>
  </div>
);

const NoExistenceDependencyView = ({ proposal, onProposalChange }: { proposal: BinaryAssociationProposal, onProposalChange: (id: string, key: string, value: string) => void }) => {
  const fields = [
    { key: 'proposedClassName', label: 'Name of the link class:' },
    { key: 'proposedRole1Name', label: `Role to '${proposal.proposedMasterClassName}':` },
    { key: 'proposedRole2Name', label: `Role to '${proposal.proposedDependentClassName}':` },
  ];
  return (
    <div className="proposal-card-section">
      <p className="proposal-card-section-title-alt">Model as link class:</p>
      <div className="proposal-card-fields">
        {fields.map(({ key, label }) => (
          <div key={key}>
            <label htmlFor={`${proposal.id}-${key}`} className="proposal-card-label">{label}</label>
            <input
              id={`${proposal.id}-${key}`}
              type="text"
              value={(proposal[key as keyof BinaryAssociationProposal] as string) || ''}
              onChange={(e) => onProposalChange(proposal.id, key, e.target.value)}
              className="proposal-card-input"
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default BinaryAssociationProposalCard;