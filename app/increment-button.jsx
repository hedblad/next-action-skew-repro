'use client';

import { increment } from './actions';

export function IncrementButton() {
  return (
    <button id="increment" onClick={() => increment()}>
      Increment
    </button>
  );
}
