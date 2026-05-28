import {
    type Decision,
    type UnaryAssociationDecision,
    type BinaryAssociationDecision,
    type NAryAssociationDecision,
    type EventsDecision,
} from '../types/decisions';
import { 
    type Proposal,
    type UnaryAssociationProposal,
    type BinaryAssociationProposal,
    type NAryAssociationProposal
 } from '../types/proposals';
import { isBinaryAssociationProposal, isNAryAssociationProposal, isUnaryAssociationProposal, isEventsProposal } from './proposalTypeGuards';

const convertUnaryAssociationProposalToDecision = (proposal: UnaryAssociationProposal): UnaryAssociationDecision => ({
    id: proposal.id,
    type: 'unaryAssociationDecision',
    chosenClassName: proposal.proposedClassName,
    chosenRole1Name: proposal.proposedRole1Name,
    chosenRole2Name: proposal.proposedRole2Name,
});

const convertNaryAssociationProposalToDecision = (proposal: NAryAssociationProposal): NAryAssociationDecision => ({
    id: proposal.id,
    type: 'nAryAssociationDecision',
    chosenClassName: proposal.proposedClassName,
    chosenRoleNames: proposal.proposedRoleNames,
});

const convertBinaryAssociationProposalToDecision = (proposal: BinaryAssociationProposal): BinaryAssociationDecision => ({
    id: proposal.id,
    type: 'binaryAssociationDecision',
    chosenExistenceDependency: proposal.proposedExistenceDependency,
    chosenMasterClassId: proposal.proposedMasterClassId,
    chosenDependentClassId: proposal.proposedDependentClassId,
    chosenClassName: proposal.proposedClassName,
    chosenRole1Name: proposal.proposedRole1Name,
    chosenRole2Name: proposal.proposedRole2Name,
});

const convertEventsProposalToDecision = (proposal: EventsDecision): EventsDecision => ({
    id: proposal.id,
    type: 'eventsDecision',
    events: proposal.events,
});

export const convertProposalToDecision = (proposal: Proposal): Decision | null => {
    if (isUnaryAssociationProposal(proposal)) {
        return convertUnaryAssociationProposalToDecision(proposal);
    }
    else if (isNAryAssociationProposal(proposal)) {
        return convertNaryAssociationProposalToDecision(proposal);
    }
    else if (isEventsProposal(proposal)) {
        return convertEventsProposalToDecision(proposal);
    }
    else if (isBinaryAssociationProposal(proposal)) {
        return convertBinaryAssociationProposalToDecision(proposal);
    }
    return null;
        
}