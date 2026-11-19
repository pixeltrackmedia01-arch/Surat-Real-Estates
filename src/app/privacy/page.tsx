import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Privacy' };

export default function Privacy() {
  return (
    <div className="container page prose">
      <p className="eyebrow">Privacy notice</p>
      <h1>Privacy</h1>
      <p className="muted small">This notice describes how the site is built to handle data. The operator should review it with legal advice before launch, including under India’s Digital Personal Data Protection Act, 2023.</p>
      <h2>What we collect</h2>
      <ul>
        <li><strong>Enquiries:</strong> your name, mobile number, and optionally your budget, visit preference, preferred date and message. We also record the project, the page you sent it from, the time, and your consent.</li>
        <li><strong>Correction reports:</strong> the details you send, any evidence link, and contact details only if you give them.</li>
        <li><strong>Comparison list:</strong> stored only in your own browser (localStorage). It is not sent to us.</li>
      </ul>
      <h2>How it is used and who can see it</h2>
      <p>
        Enquiries are stored in a private database table that public visitors cannot read. Only site administrators, signed
        in to the admin area, can view them. They are used to respond to your enquiry. Your enquiry is not automatically
        passed to a developer. If we would need to share it with a developer to arrange a visit, the operator must tell you
        and get your agreement first.
      </p>
      <p>We do not sell personal data, and we do not use third-party advertising trackers.</p>
      <h2>Retention and your choices</h2>
      <p>
        You can ask for your enquiry to be corrected or deleted through the contact page. Administrators can mark enquiries
        as closed or spam. The operator should set and publish a retention period.
      </p>
    </div>
  );
}
