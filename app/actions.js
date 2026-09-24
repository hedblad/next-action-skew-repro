'use server';

import { revalidatePath } from 'next/cache';

let count = 0;

export async function getCount() {
  return count;
}

export async function increment() {
  count += 1;
  revalidatePath('/');
}
