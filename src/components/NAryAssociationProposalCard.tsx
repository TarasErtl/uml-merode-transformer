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
    <div className="border border-[#555] rounded-lg p-4 bg-[#2d2d2d]">
      <h3 className="mb-2.5 text-[#888]">N-äre Assoziation auflösen</h3>
      <p className="mb-[15px]">{proposal.message}</p>
      
      <div className="flex flex-col gap-2.5 mb-[15px]">
        <div>
          <label htmlFor={`${proposal.id}-className`} className="block mb-1.5 text-xs text-[#A0A0A0]">Name der neuen Klasse:</label>
          <input
            id={`${proposal.id}-className`}
            type="text"
            value={proposal.proposedClassName}
            onChange={(e) => onProposalChange(proposal.id, 'proposedClassName', e.target.value)}
            className="w-full p-2 rounded border border-[#666] bg-[#3a3a3a] text-[#eee]"
          />
        </div>

        {proposal.proposedRoleNames.map((roleName, index) => (
          <div key={`${proposal.id}-role-${index}`}>
            <label htmlFor={`${proposal.id}-role-${index}`} className="block mb-1.5 text-xs text-[#A0A0A0]">Rollenname {index + 1}:</label>
            <input
              id={`${proposal.id}-role-${index}`}
              type="text"
              value={roleName}
              onChange={(e) => handleRoleChange(index, e.target.value)}
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

export default NAryAssociationProposalCard;