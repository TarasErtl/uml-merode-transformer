import {
    type Decision,
    type UnaryAssociationDecision,
    type BinaryAssociationExistenceDependentDecision,
    type BinaryAssociationNoExistenceDependencyDecision,
} from '../types/decisions';
import { 
    type Proposal,
    type UnaryAssociationProposal,
    type BinaryAssociationExistenceDependentProposal,
    type BinaryAssociationNoExistenceDependencyProposal
 } from '../types/proposals';
import { isBinaryAssociationExistenceDependentProposal, isBinaryAssociationNoExistenceDependencyProposal, isBinaryAssociationProposal, isUnaryAssociationProposal } from './proposalTypeGuards';

const convertUnaryAssociationProposalToDecision = (proposal: UnaryAssociationProposal): UnaryAssociationDecision => ({
    id: proposal.id,
    type: 'unaryAssociationDecision',
    chosenClassName: proposal.proposedClassName,
    chosenRole1Name: proposal.proposedRole1Name,
    chosenRole2Name: proposal.proposedRole2Name,
});

const convertBinaryAssociationNoExistenceDependencyProposalToDecision = (proposal: BinaryAssociationNoExistenceDependencyProposal): BinaryAssociationNoExistenceDependencyDecision => ({
    id: proposal.id,
    type: 'binaryAssociationNoExistenceDependencyDecision',
    chosenExistenceDependency: false,
    chosenClassName: proposal.proposedClassName,
    chosenRole1Name: proposal.proposedRole1Name,
    chosenRole2Name: proposal.proposedRole2Name,
});

const convertBinaryAssociationExistenceDependentProposalToDecision = (proposal: BinaryAssociationExistenceDependentProposal): BinaryAssociationExistenceDependentDecision => ({
    id: proposal.id,
    type: 'binaryAssociationExistenceDependentDecision',
    chosenExistenceDependency: true,
    chosenMasterClassId: proposal.proposedMasterClassId,
    chosenDependentClassId: proposal.proposedDependentClassId,
});

export const convertProposalToDecision = (proposal: Proposal): Decision | null => {
    if (isUnaryAssociationProposal(proposal)) {
        return convertUnaryAssociationProposalToDecision(proposal);
    }
    else if (isBinaryAssociationProposal(proposal)) {
        if (isBinaryAssociationExistenceDependentProposal(proposal)) {
            return convertBinaryAssociationExistenceDependentProposalToDecision(proposal);
        }
        else if (isBinaryAssociationNoExistenceDependencyProposal(proposal)) {
            return convertBinaryAssociationNoExistenceDependencyProposalToDecision(proposal);
        }
    }
    return null;
        
}