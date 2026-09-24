export const dynamic = 'force-dynamic';

export default function Other() {
  return (
    <main>
      <p>Other page, deployment {process.env.DEPLOYMENT_ID}</p>
    </main>
  );
}
