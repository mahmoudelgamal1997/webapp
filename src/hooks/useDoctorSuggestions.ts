import { useCallback, useEffect, useState } from 'react';

const DIAGNOSES_KEY  = (doctorId: string) => `rx_diag_${doctorId}`;
const DRUGS_KEY      = (doctorId: string) => `rx_drug_${doctorId}`;
const COMPLAINTS_KEY = (doctorId: string) => `rx_comp_${doctorId}`;

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
  } catch {}
}

function addUnique(existing: string[], value: string): string[] {
  const trimmed = value.trim();
  if (!trimmed) return existing;
  const deduped = existing.filter(s => s.toLowerCase() !== trimmed.toLowerCase());
  return [trimmed, ...deduped].slice(0, MAX_ITEMS);
}

export interface SuggestionOption {
  value: string;
}

export function useDoctorSuggestions(doctorId: string) {
  const [diagnoses,  setDiagnoses]  = useState<string[]>([]);
  const [drugs,      setDrugs]      = useState<string[]>([]);
  const [complaints, setComplaints] = useState<string[]>([]);

  useEffect(() => {
    if (!doctorId) return;
    setDiagnoses(loadList(DIAGNOSES_KEY(doctorId)));
    setDrugs(loadList(DRUGS_KEY(doctorId)));
    setComplaints(loadList(COMPLAINTS_KEY(doctorId)));
  }, [doctorId]);

  const saveDiagnosis = useCallback((value: string) => {
    if (!value?.trim() || !doctorId) return;
    const current = loadList(DIAGNOSES_KEY(doctorId));
    const updated = addUnique(current, value);
    saveList(DIAGNOSES_KEY(doctorId), updated);
    setDiagnoses(updated);
  }, [doctorId]);

  const saveDrug = useCallback((value: string) => {
    if (!value?.trim() || !doctorId) return;
    const current = loadList(DRUGS_KEY(doctorId));
    const updated = addUnique(current, value);
    saveList(DRUGS_KEY(doctorId), updated);
    setDrugs(updated);
  }, [doctorId]);

  const saveComplaint = useCallback((value: string) => {
    if (!value?.trim() || !doctorId) return;
    const current = loadList(COMPLAINTS_KEY(doctorId));
    const updated = addUnique(current, value);
    saveList(COMPLAINTS_KEY(doctorId), updated);
    setComplaints(updated);
  }, [doctorId]);

  const filterDiagnoses = useCallback((input: string): SuggestionOption[] => {
    if (!input) return [];
    const lower = input.toLowerCase();
    const startsWith = diagnoses.filter(s => s.toLowerCase().startsWith(lower));
    const contains   = diagnoses.filter(s => !s.toLowerCase().startsWith(lower) && s.toLowerCase().includes(lower));
    return [...startsWith, ...contains].slice(0, 10).map(s => ({ value: s }));
  }, [diagnoses]);

  const filterDrugs = useCallback((input: string): SuggestionOption[] => {
    if (!input) return [];
    const lower = input.toLowerCase();
    const startsWith = drugs.filter(s => s.toLowerCase().startsWith(lower));
    const contains   = drugs.filter(s => !s.toLowerCase().startsWith(lower) && s.toLowerCase().includes(lower));
    return [...startsWith, ...contains].slice(0, 10).map(s => ({ value: s }));
  }, [drugs]);

  const filterComplaints = useCallback((input: string): SuggestionOption[] => {
    if (!input) return [];
    const lower = input.toLowerCase();
    const startsWith = complaints.filter(s => s.toLowerCase().startsWith(lower));
    const contains   = complaints.filter(s => !s.toLowerCase().startsWith(lower) && s.toLowerCase().includes(lower));
    return [...startsWith, ...contains].slice(0, 10).map(s => ({ value: s }));
  }, [complaints]);

  return {
    diagnoses,
    complaints,
    drugs,
    saveDiagnosis,
    saveDrug,
    saveComplaint,
    filterDiagnoses,
    filterDrugs,
    filterComplaints
  };
}
