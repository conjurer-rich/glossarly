import React, { useEffect, useState } from 'react';
import { TermCandidate, TermDefinition_Response } from '@glossarly/shared';
import { TermPanel } from './components/TermPanel';
import { DefinitionCard } from './components/DefinitionCard';
import './styles/globals.css';

export const SidebarApp: React.FC = () => {
  const [detectedTerms, setDetectedTerms] = useState<TermCandidate[]>([]);
  const [selectedTerm, setSelectedTerm] = useState<string | null>(null);
  const [definition, setDefinition] = useState<TermDefinition_Response | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Request detected terms from content script
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0].id) {
        chrome.tabs.sendMessage(
          tabs[0].id,
          { type: 'GET_DETECTED_TERMS' },
          (response) => {
            if (response && response.candidates) {
              setDetectedTerms(response.candidates);
            }
          }
        );
      }
    });

    // Listen for messages from content script and service worker
    const messageListener = (message: any) => {
      if (message.type === 'TERMS_DETECTED') {
        setDetectedTerms(message.payload.candidates);
      } else if (message.type === 'ENRICHMENT_RESULT') {
        setDefinition(message.payload);
      }
    };

    chrome.runtime.onMessage.addListener(messageListener);
    return () => chrome.runtime.onMessage.removeListener(messageListener);
  }, []);

  const handleTermSelect = async (term: TermCandidate) => {
    setSelectedTerm(term.text);
    setLoading(true);
    setDefinition(null);

    try {
      const response = await chrome.runtime.sendMessage({
        type: 'ENRICH_TERM',
        payload: { term: term.text, context: term.context }
      });

      setDefinition(response);
    } catch (error) {
      console.error('[Glossarly] Failed to enrich term:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glossarly-container">
      <header className="glossarly-header">
        <h1>Glossarly</h1>
        <p>Business jargon explained</p>
      </header>

      <div className="glossarly-content">
        <TermPanel
          terms={detectedTerms}
          selectedTerm={selectedTerm}
          onTermSelect={handleTermSelect}
        />

        <div className="glossarly-definition-section">
          <DefinitionCard
            term={selectedTerm}
            definition={definition}
            loading={loading}
          />
        </div>
      </div>
    </div>
  );
};
