import type { Metadata } from 'next';
import { SubmitForm } from './SubmitForm';

export const metadata: Metadata = { title: 'Submit or correct a project' };

export default function Submit() {
  return (
    <div className="container page prose">
      <p className="eyebrow">Developers &amp; contributors</p>
      <h1>Submit or correct a project</h1>
      <p className="lede">
        Send us a residential project in the Surat Municipal Corporation area, or a correction to an existing record.
        Submissions are reviewed before anything is published.
      </p>
      <ul className="small">
        <li>Include the <strong>GujRERA registration number</strong> where one exists.</li>
        <li>For photos, floor plans or 3D models (GLB/glTF, 25 MB or smaller, with a preview image), say what use you permit and how they should be credited. We record permission before displaying anything.</li>
        <li>Mark renders and reconstructed models as illustrative.</li>
      </ul>
      <SubmitForm />
    </div>
  );
}
