import { type UnaryAssociationProposal } from '../types/proposals';

interface UnaryAssociationProposalCardProps {
  proposal: UnaryAssociationProposal;
  onProposalChange: (proposalId: string, key: string, value: string) => void;
  onAcceptProposal: (proposal: UnaryAssociationProposal) => void;
}

const UnaryAssociationProposalCard = ({ proposal, onProposalChange, onAcceptProposal }: UnaryAssociationProposalCardProps) => {
  const fieldsToRender = [
    { key: 'proposedClassName', label: 'Name der neuen Klasse:' },
    { key: 'proposedRole1Name', label: 'Rollenname 1:' },
    { key: 'proposedRole2Name', label: 'Rollenname 2:' },
  ];

  return (
    <div className="border border-[#555] rounded-lg p-4 bg-[#2d2d2d]">
      <h3 className="mb-2.5 text-[#888]">Unäre Assoziation auflösen</h3>
      <p className="mb-[15px]">{proposal.message}</p>
      
      <div className="flex flex-col gap-2.5 mb-[15px]">
        {fieldsToRender.map(({ key, label }) => (
          <div key={key}>
            <label htmlFor={`${proposal.id}-${key}`} className="block mb-1.5 text-xs text-[#A0A0A0]">{label}</label>
            <input
              id={`${proposal.id}-${key}`}
              type="text"
              value={proposal[key as keyof UnaryAssociationProposal] as string}
              onChange={(e) => onProposalChange(proposal.id, key, e.target.value)}
              className="w-full p-2 rounded border border-[#666] bg-[#3a3a3a] text-[#eee]"
            />
          </div>
        ))}
      </div>

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

export default UnaryAssociationProposalCard;