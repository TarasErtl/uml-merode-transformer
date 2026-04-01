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
    <div className="border border-[#555] rounded-lg p-4 bg-[#2d2d2d]">
      <h3 className="mb-2.5 text-[#888]">Binäre Assoziation auflösen</h3>
      <p className="mb-[15px]">{proposal.message}</p>

      <div className="mb-[15px]">
        <label className="flex items-center gap-2 cursor-pointer">
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
        className="w-full py-[10px] px-[15px] bg-[#4CAF50] text-white border-none rounded-md cursor-pointer text-base"
      >
        Vorschlag annehmen
      </button>
    </div>
  );
};

const ExistenceDependentView = ({ proposal, onSwapMasterDependent }: { proposal: BinaryAssociationExistenceDependentProposal, onSwapMasterDependent: (id: string) => void }) => (
  <div className="mb-[15px]">
    <p className="font-bold text-sm mb-2">Rollenverteilung:</p>
    <div className="flex items-center justify-between gap-2 p-2 border border-[#666] rounded bg-[#3a3a3a]">
      <span className="font-bold text-[#A0A0A0]">Master:</span>
      <span className="flex-grow">{proposal.proposedMasterClassName}</span>
      <button type="button" onClick={() => onSwapMasterDependent(proposal.id)} className="bg-[#555] text-white border-none rounded-full w-[30px] h-[30px] flex items-center justify-center cursor-pointer">⇋</button>
      <span className="font-bold text-[#A0A0A0]">Dependent:</span>
      <span className="flex-grow text-right">{proposal.proposedDependentClassName}</span>
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
    <div className="mb-[15px]">
      <p className="font-bold text-sm mb-2.5">Als Link-Klasse modellieren:</p>
      <div className="flex flex-col gap-2.5">
        {fields.map(({ key, label }) => (
          <div key={key}>
            <label htmlFor={`${proposal.id}-${key}`} className="block mb-1.5 text-xs text-[#A0A0A0]">{label}</label>
            <input
              id={`${proposal.id}-${key}`}
              type="text"
              value={proposal[key as keyof BinaryAssociationNoExistenceDependencyProposal] as string}
              onChange={(e) => onProposalChange(proposal.id, key, e.target.value)}
              className="w-full p-2 rounded border border-[#666] bg-[#3a3a3a] text-[#eee]"
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default BinaryAssociationProposalCard;