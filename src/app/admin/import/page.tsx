import { CSV_COLUMNS } from '@/lib/importer';
import { Importer } from './Importer';

export default function ImportPage() {
  return (
    <>
      <h1 className="admin-h1">Import projects</h1>
      <p className="small muted" style={{ maxWidth: '75ch' }}>
        Upload or paste CSV or JSON. Run a dry run first: every row is validated, localities are matched against the dataset
        (fuzzy matches are marked <em>inferred</em>), and duplicates are detected by RERA number and by name + developer +
        locality. Rows with a certain duplicate are held back unless you allow them. Imported rows default to{' '}
        <strong>needs review</strong> unless the file sets <code>publication</code>. Schema: <code>docs/IMPORT_SCHEMA.md</code>; templates in{' '}
        <code>data/import-template.csv</code> and <code>data/import-template.json</code>.
      </p>
      <details className="small" style={{ marginBottom: 16 }}>
        <summary>CSV columns</summary>
        <code style={{ wordBreak: 'break-word' }}>{CSV_COLUMNS.join(', ')}</code>
      </details>
      <Importer />
    </>
  );
}
