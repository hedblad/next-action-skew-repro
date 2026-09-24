import Link from 'next/link';

import { getCount } from './actions';
import { IncrementButton } from './increment-button';
/*B_IMPORT*/

export const dynamic = 'force-dynamic';

export default async function Page() {
  return (
    <main>
      <p id="deployment">Rendered by deployment: {process.env.DEPLOYMENT_ID}</p>
      <p id="count">Count: {await getCount()}</p>
      <IncrementButton />
      <Link id="other-link" href="/other" prefetch={false}>
        Other page
      </Link>
      {/*B_RENDER*/}
    </main>
  );
}
