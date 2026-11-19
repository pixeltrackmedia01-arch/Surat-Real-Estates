import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Terms' };

export default function Terms() {
  return (
    <div className="container page prose">
      <p className="eyebrow">Terms of use</p>
      <h1>Terms</h1>
      <ul>
        <li>Information is compiled from public and submitted sources. It may be incomplete or out of date. It is not legal, financial or property advice.</li>
        <li>Prices, availability, status and possession dates are not guaranteed. Always verify registration details on the official Gujarat RERA portal and with the developer.</li>
        <li>A listing does not mean the developer endorses it or has confirmed its details, unless a detail is marked “Developer-provided”.</li>
        <li>Project names and trademarks belong to their owners. Media is shown only with recorded permission and attribution.</li>
        <li>Map data © OpenStreetMap contributors, where maps are shown. Postal data © India Post, under GODL-India.</li>
      </ul>
    </div>
  );
}
