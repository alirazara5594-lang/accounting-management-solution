import { useEffect, useState } from 'react';

export function useFormDraft<T>(
  key: string,
  form: T,
  setForm: (form: T) => void,
  isOpen: boolean,
  isEditing?: boolean
) {
  const [hasDraft, setHasDraft] = useState(false);

  // Check if draft exists on mount/open ONLY WHEN NOT EDITING an existing record!
  useEffect(() => {
    if (isOpen && !isEditing) {
      const saved = localStorage.getItem(`draft_${key}`);
      setHasDraft(!!saved);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          // Only load if it's an object with keys
          if (parsed && typeof parsed === 'object') {
            setForm({ ...form, ...parsed });
          }
        } catch (e) {
          console.error("Failed to parse draft", e);
        }
      }
    }
  }, [isOpen, isEditing, key]);

  const saveDraft = () => {
    localStorage.setItem(`draft_${key}`, JSON.stringify(form));
    setHasDraft(true);
  };

  const clearDraft = () => {
    localStorage.removeItem(`draft_${key}`);
    setHasDraft(false);
  };

  return { saveDraft, clearDraft, hasDraft };
}
