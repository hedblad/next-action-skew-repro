'use server';

import { revalidatePath } from 'next/cache';

let count = 0;

export async function increment() {
  count += 1;
  console.log(`[${process.env.DEPLOYMENT_ID}] increment -> ${count}`);
  revalidatePath('/');
  return count;
}

export async function getCount() {
  return count;
}
