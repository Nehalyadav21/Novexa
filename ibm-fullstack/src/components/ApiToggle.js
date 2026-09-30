"use client";

import { useState } from 'react';
import styles from './ApiToggle.module.css';

export default function ApiToggle({ currentApi, onToggle }) {
  const [isSimple, setIsSimple] = useState(currentApi === 'simple');

  const handleToggle = () => {
    const newValue = !isSimple;
    setIsSimple(newValue);
    onToggle(newValue ? 'simple' : 'standard');
  };

  return (
    <div className={styles.container}>
      <span className={styles.label}>API Version:</span>
      <button 
        onClick={handleToggle} 
        className={`${styles.toggleButton} ${isSimple ? styles.simple : styles.standard}`}
      >
        {isSimple ? 'Simple API' : 'Standard API'}
      </button>
      <span className={styles.hint}>
        {isSimple 
          ? 'Using simplified API (better compatibility)' 
          : 'Using standard API (more features)'}
      </span>
    </div>
  );
}
