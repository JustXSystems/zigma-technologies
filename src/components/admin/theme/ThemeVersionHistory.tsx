'use client';

export type ThemeHistoryRow = {
  id: number;
  version: number;
  status: string;
  notes: string | null;
  css_text?: string;
};

type Props = {
  history: ThemeHistoryRow[];
  publishedId: number | null;
  onPublish: (id: number) => void;
  onLoad: (row: ThemeHistoryRow) => void;
};

export default function ThemeVersionHistory({ history, publishedId, onPublish, onLoad }: Props) {
  return (
    <div className="admin-table-wrap admin-card" style={{ padding: 0 }}>
      <table className="admin-table">
        <thead>
          <tr>
            <th>Version</th>
            <th>Status</th>
            <th>Notes</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {history.length === 0 ? (
            <tr>
              <td colSpan={4} className="admin-empty">
                No CSS versions yet.
              </td>
            </tr>
          ) : (
            history.map((row) => (
              <tr key={row.id}>
                <td>v{row.version}</td>
                <td>
                  <span className={`admin-badge ${row.status === 'published' ? 'published' : 'draft'}`}>
                    {row.status}
                    {publishedId === row.id ? ' · live' : ''}
                  </span>
                </td>
                <td>{row.notes || '—'}</td>
                <td>
                  <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                    <button type="button" className="admin-btn admin-btn-secondary" onClick={() => onLoad(row)}>
                      Load
                    </button>
                    {row.status !== 'published' ? (
                      <button type="button" className="admin-btn admin-btn-primary" onClick={() => onPublish(row.id)}>
                        Publish
                      </button>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
