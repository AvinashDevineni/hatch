'use client';

import { FormEvent, useState } from 'react';
import styles from './idea-form.module.css';

interface IdeaFormProps {
  onSubmitIdea: (idea: string) => Promise<void> | void;
  isSubmitting: boolean;
}

export function IdeaForm({ onSubmitIdea, isSubmitting }: IdeaFormProps) {
  const [idea, setIdea] = useState('');

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!idea.trim() || isSubmitting) {
      return;
    }
    await onSubmitIdea(idea.trim());
    setIdea('');
  };

  return (
    <section className={styles.wrapper}>
      <div className={styles.copy}>
        <h2 className={styles.title}>Describe the startup you want to launch</h2>
        <p className={styles.subtitle}>We&apos;ll turn your idea into a working MVP automatically.</p>
      </div>

      <form className={styles.form} onSubmit={handleSubmit}>
        <textarea
          className={styles.textarea}
          placeholder="Enter your amazing idea (be as detailed as possible!)..."
          value={idea}
          onChange={(event) => setIdea(event.target.value)}
          rows={5}
          required
        />
        <div className={styles.actions}>
          <button type="submit" className={styles.submit} disabled={isSubmitting || !idea.trim()}>
            {isSubmitting ? 'Generating your MVP...' : 'Make my MVP'}
          </button>
          <p className={styles.hint}>Tip: include the core features, audience, and desired vibe.</p>
        </div>
      </form>
    </section>
  );
}
