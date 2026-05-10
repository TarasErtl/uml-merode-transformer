import { type BinaryAssociationProposal, type BinaryAssociationExistenceDependentProposal, type BinaryAssociationNoExistenceDependencyProposal } from '../types/proposals';

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
      <h3 className="proposal-card-title">Binäre Assoziation auflösen</h3>
      <p className="proposal-card-section">{proposal.message}</p>

      <div className="proposal-card-section">
        <label className="proposal-card-checkbox-label">
          <input
            type="checkbox"
            checked={proposal.proposedExistenceDependency}
            onChange={handleCheckboxChange}
            
          />
          Existenzabhängigkeit annehmen?
        </label>
      </div>

      {proposal.proposedExistenceDependency ? (
        <ExistenceDependentView
          proposal={proposal as BinaryAssociationExistenceDependentProposal} 
          onSwapMasterDependent={onSwapMasterDependent} 
        />
      ) : (
        <NoExistenceDependencyView
          proposal={proposal as BinaryAssociationNoExistenceDependencyProposal} 
          onProposalChange={onProposalChange} 
        />
      )}

      <button
        type="button"
        onClick={() => onAcceptProposal(proposal)}
        className="proposal-card-button"
      >
        Vorschlag annehmen
      </button>
    </div>
  );
};

const ExistenceDependentView = ({ proposal, onSwapMasterDependent }: { proposal: BinaryAssociationExistenceDependentProposal, onSwapMasterDependent: (id: string) => void }) => (
  <div className="proposal-card-section">
    <p className="proposal-card-section-title">Rollenverteilung:</p>
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

const NoExistenceDependencyView = ({ proposal, onProposalChange }: { proposal: BinaryAssociationNoExistenceDependencyProposal, onProposalChange: (id: string, key: string, value: string) => void }) => {
  const fields = [
    { key: 'proposedClassName', label: 'Name der Link-Klasse:' },
    { key: 'proposedRole1Name', label: `Rolle zu '${proposal.class1Name}':` },
    { key: 'proposedRole2Name', label: `Rolle zu '${proposal.class2Name}':` },
  ];
  return (
    <div className="proposal-card-section">
      <p className="proposal-card-section-title-alt">Als Link-Klasse modellieren:</p>
      <div className="proposal-card-fields">
        {fields.map(({ key, label }) => (
          <div key={key}>
            <label htmlFor={`${proposal.id}-${key}`} className="proposal-card-label">{label}</label>
            <input
              id={`${proposal.id}-${key}`}
              type="text"
              value={proposal[key as keyof BinaryAssociationNoExistenceDependencyProposal] as string}
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