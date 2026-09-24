/*B_IMPORT*/

export const dynamic = 'force-dynamic';

export default function Other() {
  return (
    <main>
      <p id="other">Other page rendered by deployment: {process.env.DEPLOYMENT_ID}</p>
      {/*B_RENDER*/}
    </main>
  );
}
