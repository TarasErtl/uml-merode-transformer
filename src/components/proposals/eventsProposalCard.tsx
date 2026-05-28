import React from 'react';
import { type EventsProposal, type BusinessEventItem } from '../../types/proposals';

interface EventsProposalCardProps {
  proposal: EventsProposal;
  onProposalChange: (proposalId: string, key: string, value: any) => void;
  onAcceptProposal: (proposal: EventsProposal) => void;
  onHoverEvent?: (classId: string | null) => void;
}

const EventsProposalCard = ({ proposal, onProposalChange, onAcceptProposal, onHoverEvent }: EventsProposalCardProps) => {

  const handleEventChange = (operationId: string, isBusinessEvent: boolean) => {
    const updatedEvents = proposal.events.map((e: BusinessEventItem) => 
      e.operationId === operationId ? { ...e, isBusinessEvent } : e
    );
    onProposalChange(proposal.id, 'events', updatedEvents);
  };

  return (
    <div className="proposal-card">
      <h3 className="proposal-card-title">Filter Business Events</h3>
      <p className="proposal-card-section">{proposal.message}</p>
      
      <div className="proposal-card-section events-list-container">
        {proposal.events.map((ev: BusinessEventItem) => (
          <div 
            key={ev.operationId} 
            className="event-item"
            onMouseEnter={() => onHoverEvent?.(ev.classId)}
            onMouseLeave={() => onHoverEvent?.(null)}
            onClick={() => handleEventChange(ev.operationId, !ev.isBusinessEvent)} // Make the entire item clickable
          >
            <span className={`event-status-indicator ${ev.isBusinessEvent ? 'accepted' : 'rejected'}`} title={ev.isBusinessEvent ? "Accepted" : "Rejected"} />
            <label className="proposal-card-label event-label"> {/* Removed htmlFor as checkbox is removed */}
              <span className="event-class-name">
                Class: {ev.className}
              </span>
              <span className="event-operation-name">Event: {ev.operationName}</span>
            </label>
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

export default EventsProposalCard;