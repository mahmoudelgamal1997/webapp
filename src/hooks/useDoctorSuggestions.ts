import { useCallback, useEffect, useState } from 'react';

const DIAGNOSES_KEY = (doctorId: string) => `rx_diag_${doctorId}`;
const DRUGS_KEY = (doctorId: string) => `rx_drug_${doctorId}`;

const MAX_ITEMS = 300;

function loadList(key: string): string[] {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveList(key: string, list: string[]) {
  try {
    localStorage.setItem(key, JSON.stringify(list));
  } catch {
    // localStorage quota exceeded or unavailable – silently ignore
  }
}

function addUnique(existing: string[], value: string): string[] {
  const trimmed = value.trim();
  if (!trimmed) return existing;
  // Remove duplicate (case-insensitive), then prepend so most-recent comes first
  const deduped = existing.filter(s => s.toLowerCase() !== trimmed.toLowerCase());
  return [trimmed, ...deduped].slice(0, MAX_ITEMS);
}

export interface SuggestionOption {
  value: string;
}

export function useDoctorSuggestions(doctorId: string) {
  const [diagnoses, setDiagnoses] = useState<string[]>([]);
  const [drugs, setDrugs] = useState<string[]>([]);

  // Load from localStorage whenever doctorId changes
  useEffect(() => {
    if (!doctorId) return;
    setDiagnoses(loadList(DIAGNOSES_KEY(doctorId)));
    setDrugs(loadList(DRUGS_KEY(doctorId)));
  }, [doctorId]);

  const saveDiagnosis = useCallback(
    (value: string) => {
      if (!value?.trim() || !doctorId) return;
      setDiagnoses(prev => {
        const updated = addUnique(prev, value);
        saveList(DIAGNOSES_KEY(doctorId), updated);
        return updated;
      });
    },
    [doctorId]
  );

  const saveDrug = useCallback(
    (value: string) => {
      if (!value?.trim() || !doctorId) return;
      setDrugs(prev => {
        const updated = addUnique(prev, value);
        saveList(DRUGS_KEY(doctorId), updated);
        return updated;
      });
    },
    [doctorId]
  );

  // Returns filtered options for a given input – starts-with first, then contains
  const filterDiagnoses = useCallback(
    (input: string): SuggestionOption[] => {
      if (!input || input.length < 1) return [];
      const lower = input.toLowerCase();
      const startsWith = diagnoses.filter(s => s.toLowerCase().startsWith(lower));
      const contains = diagnoses.filter(
        s => !s.toLowerCase().startsWith(lower) && s.toLowerCase().includes(lower)
      );
      return [...startsWith, ...contains].slice(0, 10).map(s => ({ value: s }));
    },
    [diagnoses]
  );

  const filterDrugs = useCallback(
    (input: string): SuggestionOption[] => {
      if (!input || input.length < 1) return [];
      const lower = input.toLowerCase();
      const startsWith = drugs.filter(s => s.toLowerCase().startsWith(lower));
      const contains = drugs.filter(
        s => !s.toLowerCase().startsWith(lower) && s.toLowerCase().includes(lower)
      );
      return [...startsWith, ...contains].slice(0, 10).map(s => ({ value: s }));
    },
    [drugs]
  );

  return { saveDiagnosis, saveDrug, filterDiagnoses, filterDrugs };
}
