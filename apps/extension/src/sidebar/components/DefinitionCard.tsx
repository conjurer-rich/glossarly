import React from 'react';
import { TermDefinition_Response } from '@glossarly/shared';

interface DefinitionCardProps {
  term: string | null;
  definition: TermDefinition_Response | null;
  loading: boolean;
  onSaveToGlossary?: () => void;
}

export const DefinitionCard: React.FC<DefinitionCardProps> = ({
  term,
  definition,
  loading,
  onSaveToGlossary
}) => {
  if (!term) {
    return (
      <div className="glossarly-definition-card empty">
        <p>Select a term to see its definition</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="glossarly-definition-card loading">
        <div className="glossarly-spinner" />
        <p>Loading definition...</p>
      </div>
    );
  }

  if (!definition) {
    return (
      <div className="glossarly-definition-card error">
        <p>Could not load definition for "{term}"</p>
      </div>
    );
  }

  return (
    <div className="glossarly-definition-card">
      <div className="glossarly-definition-header">
        <h3 className="glossarly-definition-term">{definition.term}</h3>
        {definition.category && (
          <span className="glossarly-category-badge">{definition.category}</span>
        )}
      </div>

      <p className="glossarly-definition-text">{definition.definition}</p>

      {definition.example && (
        <div className="glossarly-example">
          <p className="glossarly-example-label">Example:</p>
          <p className="glossarly-example-text">"{definition.example}"</p>
        </div>
      )}

      {definition.confidence !== undefined && (
        <div className="glossarly-confidence">
          <label>Confidence</label>
          <div className="glossarly-confidence-bar">
            <div
              className="glossarly-confidence-fill"
              style={{ width: `${definition.confidence}%` }}
            />
          </div>
          <span className="glossarly-confidence-value">
            {definition.confidence}%
          </span>
        </div>
      )}

      {onSaveToGlossary && (
        <button
          className="glossarly-save-button"
          onClick={onSaveToGlossary}
        >
          Save to Glossary
        </button>
      )}
    </div>
  );
};
