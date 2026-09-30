'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import SettingsForm from './SettingsForm';
import ProfileForm from './ProfileForm';

export interface AdminUser {
  email: string;
  name?: string;
  role: string; // 'admin' (owner) | 'employee'
  permissions: string[];
}

const GRANTABLE = [
  { key: 'map', label: 'Map Editor', icon: 'fa-map-location-dot', desc: 'Add & edit project pins, infra and roads' },
  { key: 'blogs', label: 'Blogs', icon: 'fa-newspaper', desc: 'Write & publish SEO articles' },
  { key: 'seo', label: 'SEO & Health', icon: 'fa-chart-line', desc: 'View search & site health' },
  { key: 'settings', label: 'Settings', icon: 'fa-gear', desc: 'Edit analytics & verification' },
];

const TAB_META: Record<string, { label: string; icon: string }> = {
  dashboard: { label: 'Dashboard', icon: 'fa-gauge-high' },
  map: { label: 'Map Editor', icon: 'fa-map-location-dot' },
  blogs: { label: 'Blogs', icon: 'fa-newspaper' },
  employees: { label: 'Employees', icon: 'fa-users-gear' },
  seo: { label: 'SEO & Health', icon: 'fa-chart-line' },
  settings: { label: 'Settings', icon: 'fa-gear' },
  profile: { label: 'Profile', icon: 'fa-user' },
};

function useToast() {
  const [toast, setToast] = useState<{ msg: string; err?: boolean } | null>(null);
  const flash = (msg: string, err = false) => {
    setToast({ msg, err });
    setTimeout(() => setToast(null), 2800);
  };
  const node = toast ? (
    <div className={`adm-toast show${toast.err ? ' err' : ''}`}>
      <i className={`fas ${toast.err ? 'fa-triangle-exclamation' : 'fa-circle-check'}`} />
      {toast.msg}
    </div>
  ) : null;
  return { flash, node };
}

/* ------------------------------- Dashboard ------------------------------- */
function DashboardPanel({ onGo }: { onGo: (t: string) => void }) {
  const [s, setS] = useState<any>(null);
  useEffect(() => {
    fetch('/api/admin/stats', { credentials: 'same-origin' })
      .then((r) => r.json()).then((b) => setS(b.data)).catch(() => setS({ dbOk: false }));
  }, []);
  if (!s) return <div className="adm-empty"><i className="fas fa-spinner fa-spin" /><p>Loading…</p></div>;

  const cards = [
    { num: s.pins ?? 0, lbl: 'Project pins', icon: 'fa-map-pin', bg: '#e8f2e1', c: '#2f7a3c' },
    { num: s.posts?.published ?? 0, lbl: `Blogs live · ${s.posts?.draft ?? 0} draft`, icon: 'fa-newspaper', bg: '#e6f0f8', c: '#2d6fa3' },
    { num: s.leads ?? 0, lbl: 'Leads captured', icon: 'fa-user-group', bg: '#fbf1dc', c: '#c9861f' },
    { num: (s.infra ?? 0) + (s.roads ?? 0), lbl: 'Infra & roads', icon: 'fa-road', bg: '#f6e6dd', c: '#a9532d' },
  ];
  const health = [
    { ok: s.dbOk ? 'ok' : 'bad', b: 'Database', v: s.dbOk ? 'Connected' : 'Error' },
    { ok: 'ok', b: 'Sitemap & robots', v: 'Active' },
    { ok: s.seo?.gsc ? 'ok' : 'warn', b: 'Search Console verification', v: s.seo?.gsc ? 'Set' : 'Not set' },
    { ok: s.seo?.gtm ? 'ok' : 'warn', b: 'Google Tag Manager', v: s.seo?.gtm ? 'Set' : 'Not set' },
  ];
  return (
    <>
      <div className="adm-cards">
        {cards.map((c) => (
          <div className="adm-stat" key={c.lbl}>
            <div className="ic" style={{ background: c.bg, color: c.c }}><i className={`fas ${c.icon}`} /></div>
            <div className="num">{c.num}</div><div className="lbl">{c.lbl}</div>
          </div>
        ))}
      </div>
      <div className="adm-panel">
        <div className="adm-panel-head"><h3>Quick actions</h3></div>
        <div className="adm-actions">
          <button className="adm-btn primary" onClick={() => onGo('map')}><i className="fas fa-map-location-dot" /> Open map editor</button>
          <button className="adm-btn ghost" onClick={() => onGo('blogs')}><i className="fas fa-plus" /> Manage blogs</button>
          <button className="adm-btn ghost" onClick={() => onGo('settings')}><i className="fas fa-gear" /> SEO settings</button>
          <a className="adm-btn ghost" href="/map" target="_blank" rel="noopener"><i className="fas fa-arrow-up-right-from-square" /> View live site</a>
        </div>
      </div>
      <div className="adm-panel">
        <div className="adm-panel-head"><h3>Website health</h3><button className="adm-btn ghost sm" onClick={() => onGo('seo')}>Full report</button></div>
        <div className="adm-health">
          {health.map((h) => (
            <div className="adm-health-row" key={h.b}>
              <span className={`dot ${h.ok}`} /><div><b>{h.b}</b></div><span className="val">{h.v}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

/* ------------------------------- Map editor ------------------------------ */
function MapPanel() {
  return (
    <div className="adm-panel" style={{ padding: 0, overflow: 'hidden' }}>
      <iframe title="Map editor" src="/team-editor-x7k2/map" className="adm-frame" />
    </div>
  );
}

/* --------------------------------- SEO ----------------------------------- */
function SeoPanel() {
  const [s, setS] = useState<any>(null);
  useEffect(() => {
    fetch('/api/admin/stats', { credentials: 'same-origin' })
      .then((r) => r.json()).then((b) => setS(b.data)).catch(() => setS({}));
  }, []);
  const gsc = s?.seo?.gsc, gtm = s?.seo?.gtm, published = s?.posts?.published ?? 0;
  const checks = [
    { ok: s?.dbOk ? 'ok' : 'bad', b: 'Database connection', v: s?.dbOk ? 'Healthy' : '—' },
    { ok: 'ok', b: 'Server-side rendering (home, map, blog)', v: 'On' },
    { ok: 'ok', b: 'Sitemap.xml (auto, includes blogs)', v: 'Active' },
    { ok: 'ok', b: 'robots.txt — admin/API blocked', v: 'Active' },
    { ok: 'ok', b: 'JSON-LD structured data', v: 'On' },
    { ok: 'ok', b: 'Open Graph / Twitter cards', v: 'On' },
    { ok: 'ok', b: 'Mobile / PWA installable', v: 'Ready' },
    { ok: gsc ? 'ok' : 'warn', b: 'Search Console verification', v: gsc ? 'Set' : 'Add in Settings' },
    { ok: gtm ? 'ok' : 'warn', b: 'Google Tag Manager', v: gtm ? 'Connected' : 'Add in Settings' },
    { ok: published >= 3 ? 'ok' : 'warn', b: 'Blog content', v: `${published} published` },
  ];
  const steps = [
    ['Verify your domain', 'Paste the Search Console value in Settings, then click Verify in Google Search Console.'],
    ['Submit the sitemap', 'In Search Console → Sitemaps, submit /sitemap.xml.'],
    ['Request indexing', 'Use URL Inspection for the homepage and key pages → “Request indexing”.'],
    ['Publish blogs regularly', 'Target real searches like “2 BHK in Kharadi price”. Each post is a rankable page.'],
    ['Build links', 'Share on Instagram, WhatsApp, Google Business Profile & partner sites.'],
  ];
  if (!s) return <div className="adm-empty"><i className="fas fa-spinner fa-spin" /><p>Loading…</p></div>;
  return (
    <>
      <div className="adm-panel">
        <div className="adm-panel-head"><h3>Status</h3></div>
        <div className="adm-health">
          {checks.map((h) => (
            <div className="adm-health-row" key={h.b}><span className={`dot ${h.ok}`} /><div><b>{h.b}</b></div><span className="val">{h.v}</span></div>
          ))}
        </div>
      </div>
      <div className="adm-panel">
        <div className="adm-panel-head"><h3>Get ranked on Google — checklist</h3></div>
        <div className="adm-health">
          {steps.map(([t, d], i) => (
            <div className="adm-health-row" key={t}><span className="dot" style={{ background: '#2d6fa3' }} /><div><b>{i + 1}. {t}</b><br /><span>{d}</span></div></div>
          ))}
        </div>
        <p className="adm-note" style={{ marginTop: 16 }}><i className="fas fa-lightbulb" /><span>Indexing takes days to weeks. Verify + submit the sitemap first, keep publishing, and rankings build over time.</span></p>
      </div>
    </>
  );
}

/* -------------------------------- Blogs ---------------------------------- */
interface Post { id: string; slug: string; title: string; status: 'draft' | 'published'; updated_at?: string; }
const EMPTY_BLOG = { title: '', slug: '', excerpt: '', content: '', cover_image: '', tags: '', author: 'Mappingg Team', seo_title: '', seo_description: '' };

function BlogsPanel({ flash }: { flash: (m: string, e?: boolean) => void }) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'list' | 'form'>('list');
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<any>(EMPTY_BLOG);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const r = await fetch('/api/admin/blogs', { credentials: 'same-origin' });
      const b = await r.json();
      setPosts(Array.isArray(b.data) ? b.data : []);
    } catch { flash('Could not load posts', true); } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  function openNew() { setEditId(null); setForm(EMPTY_BLOG); setView('form'); }
  async function openEdit(id: string) {
    try {
      const r = await fetch(`/api/admin/blogs?id=${encodeURIComponent(id)}`, { credentials: 'same-origin' });
      const b = await r.json(); const p = b.data;
      if (!p) throw new Error();
      setForm({ ...EMPTY_BLOG, ...p, tags: (p.tags || []).join(', ') });
      setEditId(id); setView('form');
    } catch { flash('Could not open post', true); }
  }
  async function remove(p: Post) {
    if (!confirm(`Delete “${p.title}”?`)) return;
    try {
      const r = await fetch(`/api/admin/blogs?id=${encodeURIComponent(p.id)}`, { method: 'DELETE', credentials: 'same-origin' });
      if (!r.ok) throw new Error();
      setPosts((l) => l.filter((x) => x.id !== p.id)); flash('Post deleted');
    } catch { flash('Delete failed', true); }
  }
  function onCover(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    if (file.size > 2_000_000) return flash('Image too large (max 2 MB) — use a URL', true);
    const rd = new FileReader(); rd.onload = () => setForm((f: any) => ({ ...f, cover_image: String(rd.result || '') })); rd.readAsDataURL(file);
  }
  async function save(status: 'draft' | 'published') {
    if (!form.title.trim()) return flash('Add a title first', true);
    setSaving(true);
    const payload: any = {
      title: form.title, slug: form.slug || undefined, excerpt: form.excerpt, content: form.content,
      cover_image: form.cover_image, tags: String(form.tags).split(',').map((t: string) => t.trim()).filter(Boolean),
      author: form.author, seo_title: form.seo_title, seo_description: form.seo_description, status,
    };
    if (editId) payload.id = editId;
    try {
      const r = await fetch('/api/admin/blogs', {
        method: editId ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin', body: JSON.stringify(payload),
      });
      if (!r.ok) throw new Error();
      flash(status === 'published' ? 'Published!' : 'Saved as draft');
      setView('list'); load();
    } catch { flash('Save failed', true); } finally { setSaving(false); }
  }
  const set = (k: string, v: string) => setForm((f: any) => ({ ...f, [k]: v }));
  const fmt = (d?: string) => (d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');

  if (view === 'form') {
    return (
      <>
        <div className="adm-panel">
          <div className="adm-panel-head">
            <h3>{editId ? 'Edit post' : 'New post'}</h3>
            <button className="adm-btn ghost sm" onClick={() => setView('list')}><i className="fas fa-arrow-left" /> Back</button>
          </div>
          <div className="adm-field"><label>Title</label><input value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="Top 5 areas to buy a home in Pune (2026)" /></div>
          <div className="adm-grid2">
            <div className="adm-field"><label>Slug <small>(blank = auto)</small></label><input value={form.slug} onChange={(e) => set('slug', e.target.value)} placeholder="top-areas-to-buy-pune-2026" /></div>
            <div className="adm-field"><label>Tags <small>(comma separated)</small></label><input value={form.tags} onChange={(e) => set('tags', e.target.value)} placeholder="Pune, Investment, Guide" /></div>
          </div>
          <div className="adm-field"><label>Excerpt</label><input value={form.excerpt} onChange={(e) => set('excerpt', e.target.value)} placeholder="Short summary for listings & search." /></div>
          <div className="adm-grid2">
            <div className="adm-field"><label>Cover image URL</label><input value={String(form.cover_image).startsWith('data:') ? '' : form.cover_image} onChange={(e) => set('cover_image', e.target.value)} placeholder="https://…" /></div>
            <div className="adm-field"><label>…or upload <small>(max 2 MB)</small></label><input type="file" accept="image/*" onChange={onCover} /></div>
          </div>
          {form.cover_image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="adm-cover" src={form.cover_image} alt="Cover" style={{ marginBottom: 14 }} />
          ) : null}
          <div className="adm-field"><label>Content <small>(HTML supported)</small></label><textarea value={form.content} onChange={(e) => set('content', e.target.value)} placeholder={'<h2>Heading</h2>\n<p>Write your article…</p>'} /></div>
        </div>
        <div className="adm-panel">
          <div className="adm-panel-head"><h3>SEO</h3></div>
          <div className="adm-field"><label>SEO title <small>(defaults to title)</small></label><input value={form.seo_title} onChange={(e) => set('seo_title', e.target.value)} /></div>
          <div className="adm-field"><label>Meta description</label><input value={form.seo_description} onChange={(e) => set('seo_description', e.target.value)} placeholder="150–160 characters for Google" /></div>
          <div className="adm-actions" style={{ marginTop: 8 }}>
            <button className="adm-btn primary" disabled={saving} onClick={() => save('published')}><i className="fas fa-globe" /> {saving ? 'Saving…' : 'Publish'}</button>
            <button className="adm-btn ghost" disabled={saving} onClick={() => save('draft')}><i className="fas fa-floppy-disk" /> Save draft</button>
          </div>
        </div>
      </>
    );
  }

  return (
    <div className="adm-panel">
      <div className="adm-panel-head">
        <h3>All posts {posts.length ? `(${posts.length})` : ''}</h3>
        <button className="adm-btn primary sm" onClick={openNew}><i className="fas fa-plus" /> New post</button>
      </div>
      {loading ? (
        <div className="adm-empty"><i className="fas fa-spinner fa-spin" /><p>Loading…</p></div>
      ) : posts.length === 0 ? (
        <div className="adm-empty"><i className="fas fa-newspaper" /><p>No posts yet. Create your first SEO article.</p></div>
      ) : (
        <table className="adm-table">
          <thead><tr><th>Title</th><th>Status</th><th>Updated</th><th>Actions</th></tr></thead>
          <tbody>
            {posts.map((p) => (
              <tr key={p.id}>
                <td className="t-title">{p.title}<small>/blog/{p.slug}</small></td>
                <td><span className={`adm-badge ${p.status === 'published' ? 'ok' : 'muted'}`}>{p.status === 'published' ? 'Published' : 'Draft'}</span></td>
                <td className="muted">{fmt(p.updated_at)}</td>
                <td><div className="adm-actions">
                  <button className="adm-btn ghost sm" onClick={() => openEdit(p.id)}><i className="fas fa-pen" /> Edit</button>
                  {p.status === 'published' && <a className="adm-btn ghost sm" href={`/blog/${p.slug}`} target="_blank" rel="noopener"><i className="fas fa-arrow-up-right-from-square" /></a>}
                  <button className="adm-btn danger sm" onClick={() => remove(p)}><i className="fas fa-trash" /></button>
                </div></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

/* ------------------------------ Employees -------------------------------- */
interface Emp { id: string; email: string; name?: string; permissions: string[]; created_at?: string; }

function EmployeesPanel({ flash }: { flash: (m: string, e?: boolean) => void }) {
  const [list, setList] = useState<Emp[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'list' | 'form'>('list');
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [perms, setPerms] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const r = await fetch('/api/admin/employees', { credentials: 'same-origin' });
      const b = await r.json();
      setList(Array.isArray(b.data) ? b.data : []);
    } catch { flash('Could not load employees', true); } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  function openNew() { setEditId(null); setName(''); setEmail(''); setPassword(''); setPerms([]); setView('form'); }
  function openEdit(e: Emp) { setEditId(e.id); setName(e.name || ''); setEmail(e.email); setPassword(''); setPerms(e.permissions || []); setView('form'); }
  function togglePerm(k: string) { setPerms((p) => (p.includes(k) ? p.filter((x) => x !== k) : [...p, k])); }

  async function save() {
    if (!editId && (!email.trim() || password.length < 8)) return flash('Email and a password (8+ chars) are required', true);
    setSaving(true);
    try {
      const payload: any = { name, permissions: perms };
      let r;
      if (editId) {
        payload.id = editId; if (password) payload.password = password;
        r = await fetch('/api/admin/employees', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify(payload) });
      } else {
        payload.email = email.trim(); payload.password = password;
        r = await fetch('/api/admin/employees', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify(payload) });
      }
      const b = await r.json();
      if (!r.ok) throw new Error(b?.error?.message || 'Failed');
      flash(editId ? 'Employee updated' : 'Employee added'); setView('list'); load();
    } catch (e) { flash(e instanceof Error ? e.message : 'Save failed', true); } finally { setSaving(false); }
  }
  async function remove(e: Emp) {
    if (!confirm(`Remove ${e.email}? They will lose access.`)) return;
    try {
      const r = await fetch(`/api/admin/employees?id=${encodeURIComponent(e.id)}`, { method: 'DELETE', credentials: 'same-origin' });
      if (!r.ok) throw new Error();
      setList((l) => l.filter((x) => x.id !== e.id)); flash('Employee removed');
    } catch { flash('Delete failed', true); }
  }

  if (view === 'form') {
    return (
      <div className="adm-panel">
        <div className="adm-panel-head">
          <h3>{editId ? 'Edit employee' : 'Add employee'}</h3>
          <button className="adm-btn ghost sm" onClick={() => setView('list')}><i className="fas fa-arrow-left" /> Back</button>
        </div>
        <div className="adm-grid2">
          <div className="adm-field"><label>Full name</label><input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Rahul Sharma" /></div>
          <div className="adm-field"><label>Email {editId && <small>(cannot change)</small>}</label><input value={email} onChange={(e) => setEmail(e.target.value)} disabled={!!editId} placeholder="employee@example.com" /></div>
        </div>
        <div className="adm-field">
          <label>{editId ? 'Reset password ' : 'Password '}<small>{editId ? '(leave blank to keep current)' : '(min 8 characters)'}</small></label>
          <input type="text" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={editId ? '••••••••' : 'Set a password they will use to log in'} />
        </div>
        <div className="adm-field"><label>Access — which tabs can they use?</label></div>
        <div className="adm-perms">
          {GRANTABLE.map((g) => (
            <button type="button" key={g.key} className={`adm-perm${perms.includes(g.key) ? ' on' : ''}`} onClick={() => togglePerm(g.key)}>
              <span className="ic"><i className={`fas ${g.icon}`} /></span>
              <span className="t"><b>{g.label}</b><small>{g.desc}</small></span>
              <i className={`fas ${perms.includes(g.key) ? 'fa-circle-check' : 'fa-circle'} chk`} />
            </button>
          ))}
        </div>
        <p className="adm-note" style={{ marginTop: 4 }}><i className="fas fa-circle-info" /><span>Everyone can see the Dashboard and their own Profile. They sign in from the website’s Sign-in with the email &amp; password you set here.</span></p>
        <div className="adm-actions" style={{ marginTop: 16 }}>
          <button className="adm-btn primary" disabled={saving} onClick={save}><i className="fas fa-floppy-disk" /> {saving ? 'Saving…' : editId ? 'Save changes' : 'Add employee'}</button>
        </div>
      </div>
    );
  }

  return (
    <div className="adm-panel">
      <div className="adm-panel-head">
        <h3>Employees {list.length ? `(${list.length})` : ''}</h3>
        <button className="adm-btn primary sm" onClick={openNew}><i className="fas fa-user-plus" /> Add employee</button>
      </div>
      {loading ? (
        <div className="adm-empty"><i className="fas fa-spinner fa-spin" /><p>Loading…</p></div>
      ) : list.length === 0 ? (
        <div className="adm-empty"><i className="fas fa-users-gear" /><p>No employees yet. Add teammates and choose which tabs they can access.</p></div>
      ) : (
        <table className="adm-table">
          <thead><tr><th>Employee</th><th>Access</th><th>Actions</th></tr></thead>
          <tbody>
            {list.map((e) => (
              <tr key={e.id}>
                <td className="t-title">{e.name || e.email}<small>{e.email}</small></td>
                <td>{e.permissions.length ? e.permissions.map((p) => <span key={p} className="adm-badge muted" style={{ marginRight: 4 }}>{TAB_META[p]?.label || p}</span>) : <span className="muted">Dashboard only</span>}</td>
                <td><div className="adm-actions">
                  <button className="adm-btn ghost sm" onClick={() => openEdit(e)}><i className="fas fa-pen" /> Edit</button>
                  <button className="adm-btn danger sm" onClick={() => remove(e)}><i className="fas fa-trash" /></button>
                </div></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

/* ------------------------------- Shell ----------------------------------- */
export default function AdminApp({ user }: { user: AdminUser }) {
  const router = useRouter();
  const isOwner = user.role === 'admin';
  const { flash, node: toastNode } = useToast();

  const visible = isOwner
    ? ['dashboard', 'map', 'blogs', 'employees', 'seo', 'settings', 'profile']
    : ['dashboard', ...GRANTABLE.map((g) => g.key).filter((k) => user.permissions.includes(k)), 'profile'];

  const [tab, setTab] = useState(visible[0] || 'dashboard');
  const [menuOpen, setMenuOpen] = useState(false);
  const initials = (user.name || user.email || '?').slice(0, 2).toUpperCase();
  const menuRef = useRef<HTMLDivElement>(null);

  async function logout() {
    try { await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' }); } catch {}
    router.push('/'); router.refresh();
  }

  return (
    <div className="adm2">
      <header className="adm2-top">
        <div className="adm2-brand"><span className="mark">M</span><span><b>Mappingg</b><small>{isOwner ? 'Super admin' : 'Team panel'}</small></span></div>
        <div className="adm2-top-right" ref={menuRef}>
          <a className="adm-chip" href="/" target="_blank" rel="noopener"><i className="fas fa-arrow-up-right-from-square" /> View site</a>
          <button className="adm-chip" onClick={() => setMenuOpen((v) => !v)}>
            <span className="who">{initials}</span>
            <span className="who-meta"><b>{user.name || user.email.split('@')[0]}</b><small>{isOwner ? 'Owner' : 'Employee'}</small></span>
            <i className="fas fa-chevron-down" />
          </button>
          {menuOpen && (
            <div className="adm2-menu">
              <button onClick={() => { setTab('profile'); setMenuOpen(false); }}><i className="fas fa-user" /> Profile</button>
              <button onClick={logout}><i className="fas fa-right-from-bracket" /> Sign out</button>
            </div>
          )}
        </div>
      </header>

      <nav className="adm2-tabs">
        {visible.map((k) => (
          <button key={k} className={`adm2-tab${tab === k ? ' active' : ''}`} onClick={() => setTab(k)}>
            <i className={`fas ${TAB_META[k].icon}`} /> {TAB_META[k].label}
          </button>
        ))}
      </nav>

      <main className="adm2-main">
        <div className="adm-content" style={tab === 'map' ? { maxWidth: 'none', padding: 0 } : undefined}>
          {tab === 'dashboard' && <DashboardPanel onGo={(t) => visible.includes(t) && setTab(t)} />}
          {tab === 'map' && <MapPanel />}
          {tab === 'blogs' && <BlogsPanel flash={flash} />}
          {tab === 'employees' && isOwner && <EmployeesPanel flash={flash} />}
          {tab === 'seo' && <SeoPanel />}
          {tab === 'settings' && <SettingsForm />}
          {tab === 'profile' && <ProfileForm email={user.email} role={user.role} />}
        </div>
      </main>

      {toastNode}
    </div>
  );
}
