import React from 'react';
import { TermCandidate } from '@glossarly/shared';

interface TermPanelProps {
  terms: TermCandidate[];
  selectedTerm: string | null;
  onTermSelect: (term: TermCandidate) => void;
}

export const TermPanel: React.FC<TermPanelProps> = ({
  terms,
  selectedTerm,
  onTermSelect
}) => {
  return (
    <div className="glossarly-term-panel">
      <h2 className="glossarly-term-panel-title">
        Detected Terms ({terms.length})
      </h2>
      <div className="glossarly-term-list">
        {terms.length === 0 ? (
          <p className="glossarly-empty-state">
            No jargon detected on this page yet.
          </p>
        ) : (
          terms.map((term) => (
            <button
              key={`${term.text}-${term.position.start}`}
              className={`glossarly-term-badge ${
                selectedTerm === term.text ? 'active' : ''
              }`}
              onClick={() => onTermSelect(term)}
              title={`Confidence: ${term.confidence}%`}
            >
              <span className="glossarly-term-text">{term.text}</span>
              <span
                className="glossarly-confidence-indicator"
                style={{
                  width: `${term.confidence}%`
                }}
              />
            </button>
          ))
        )}
      </div>
    </div>
  );
};
