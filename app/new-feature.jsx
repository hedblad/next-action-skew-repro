'use client';

import { useState } from 'react';

import { formatLabel } from './shared';

export function NewFeature() {
  const [open, setOpen] = useState(false);
  return (
    <p id="new-feature" onClick={() => setOpen(!open)}>
      {formatLabel(`New feature ${open ? 'open' : 'closed'}`)}
    </p>
  );
}
