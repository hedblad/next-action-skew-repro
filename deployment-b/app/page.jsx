import Link from 'next/link';

import { getCount, increment } from './actions';
import { NewFeature } from './new-feature';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const deployment = process.env.DEPLOYMENT_ID;
  return (
    <main>
      <p>
        Deployment {deployment}, count {await getCount()}
      </p>
      <form action={increment}>
        <button id="increment">Increment</button>
      </form>
      {/* Without prefetching, the click fetches /other from whichever deployment is running. */}
      <Link id="other-link" href="/other" prefetch={false}>
        Other page
      </Link>
      <NewFeature />
    </main>
  );
}
