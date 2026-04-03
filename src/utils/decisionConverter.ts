import {
    type Decision,
    type UnaryAssociationDecision,
    type BinaryAssociationExistenceDependentDecision,
    type BinaryAssociationNoExistenceDependencyDecision,
    type NAryAssociationDecision,
} from '../types/decisions';
import { 
    type Proposal,
    type UnaryAssociationProposal,
    type BinaryAssociationExistenceDependentProposal,
    type BinaryAssociationNoExistenceDependencyProposal,
    type NAryAssociationProposal
 } from '../types/proposals';
import { isBinaryAssociationExistenceDependentProposal, isBinaryAssociationNoExistenceDependencyProposal, isBinaryAssociationProposal, isNAryAssociationProposal, isUnaryAssociationProposal } from './proposalTypeGuards';

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

const convertNaryAssociationProposalToDecision = (proposal: NAryAssociationProposal): NAryAssociationDecision => ({
    id: proposal.id,
    type: 'nAryAssociationDecision',
    chosenClassName: proposal.proposedClassName,
    chosenRoleNames: proposal.proposedRoleNames,
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
    else if (isNAryAssociationProposal(proposal)) {
        return convertNaryAssociationProposalToDecision(proposal);
    }
    return null;
        
}