// Admin panel shell: sign-in, navigation and routing.
import { createClient, $, h, esc, toast, friendlyError, getConfig } from '../shared/lib.js';
import { renderQueue } from './views/queue.js';
import { renderReview, createManualSubmission } from './views/review.js';
import { renderBuilders, renderBuilderDetail } from './views/builders.js';
import { renderImport } from './views/import.js';
import { renderLive } from './views/live.js';

import { ctx, refreshCounts } from './context.js';

const cfg = getConfig();
const root = $('#root');

start();

async function start() {
  try {
    ctx.client = createClient();
  } catch (e) {
    root.innerHTML = `<div class="login"><div class="card"><div class="logo">Mappingg</div><p>${esc(e.message)}</p></div></div>`;
    return;
  }
  const { data } = await ctx.client.auth.getSession();
  if (data.session) await enter(data.session.user); else showLogin();
  ctx.client.auth.onAuthStateChange((evt, session) => {
    if (evt === 'SIGNED_OUT') showLogin();
    if (evt === 'PASSWORD_RECOVERY') showSetPassword();
    if (session) ctx.user = session.user;
  });
}

function showLogin(message = '') {
  root.innerHTML = '';
  const el = h(`<div class="login"><form class="card" autocomplete="on">
    <div class="logo">Mappingg</div>
    <div><h1 style="font-size:18px">Project Intake — Admin</h1>
      <p class="muted" style="margin:4px 0 0">${cfg.environment ? `${esc(cfg.environment)} environment` : ''}</p></div>
    ${message ? `<p style="color:var(--bad);margin:0">${esc(message)}</p>` : ''}
    <label>Email <input class="input" type="email" name="email" required autocomplete="username"></label>
    <label>Password <input class="input" type="password" name="password" required autocomplete="current-password"></label>
    <button class="btn primary" type="submit">Sign in</button>
    <button class="linkish" type="button" id="forgot">Forgot password?</button>
  </form></div>`);
  const form = $('form', el);
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const btn = $('button[type=submit]', form);
    btn.disabled = true; btn.textContent = 'Signing in…';
    const { data, error } = await ctx.client.auth.signInWithPassword({ email: form.email.value.trim(), password: form.password.value });
    if (error) { btn.disabled = false; btn.textContent = 'Sign in'; toast(error.message, 'bad'); return; }
    await enter(data.user);
  });
  $('#forgot', el).addEventListener('click', async () => {
    const email = form.email.value.trim();
    if (!email) { toast('Type your email first, then tap Forgot password.', 'bad'); return; }
    const { error } = await ctx.client.auth.resetPasswordForEmail(email, { redirectTo: location.href.split('#')[0] });
    toast(error ? error.message : 'Check your email for a reset link.', error ? 'bad' : 'ok');
  });
  root.appendChild(el);
}

function showSetPassword() {
  root.innerHTML = '';
  const el = h(`<div class="login"><form class="card">
    <div class="logo">Mappingg</div><h1 style="font-size:18px">Set a new password</h1>
    <label>New password <input class="input" type="password" name="pw" minlength="8" required autocomplete="new-password"></label>
    <button class="btn primary" type="submit">Save password</button></form></div>`);
  $('form', el).addEventListener('submit', async e => {
    e.preventDefault();
    const { error } = await ctx.client.auth.updateUser({ password: e.target.pw.value });
    if (error) return toast(error.message, 'bad');
    toast('Password updated');
    location.hash = '#/queue';
    const { data } = await ctx.client.auth.getUser();
    await enter(data.user);
  });
  root.appendChild(el);
}

async function enter(user) {
  ctx.user = user;
  const { data: isAdmin, error } = await ctx.client.rpc('is_admin');
  if (error || !isAdmin) {
    await ctx.client.auth.signOut();
    showLogin('This account is not set up as a Mappingg admin. Ask the owner to add you.');
    return;
  }
  drawShell();
  window.addEventListener('hashchange', route);
  route();
}

function drawShell() {
  root.innerHTML = '';
  root.appendChild(h(`<div class="shell">
    <aside class="side">
      <div class="logo">Mappingg</div>
      <div class="sub">Project Intake ${cfg.environment && cfg.environment !== 'production' ? `<span class="env">${esc(cfg.environment)}</span>` : ''}</div>
      <nav class="nav">
        <a href="#/queue" data-nav="queue">Review queue <span class="count" data-count="review"></span></a>
        <a href="#/builders" data-nav="builders">Builders &amp; links <span class="count" data-count="builders"></span></a>
        <a href="#/import" data-nav="import">Bulk upload</a>
        <a href="#/live" data-nav="live">Live projects <span class="count" data-count="live"></span></a>
      </nav>
      <div class="foot">${esc(ctx.user.email)}<br><button class="linkish" id="signout">Sign out</button></div>
    </aside>
    <main class="main"><div class="page" id="page"></div></main>
  </div>`));
  $('#signout').addEventListener('click', async () => { await ctx.client.auth.signOut(); location.hash = ''; });
}

let lastHash = '';
async function route() {
  if (ctx.leaveGuard && location.hash !== lastHash) {
    const ok = await ctx.leaveGuard();
    if (!ok) { history.replaceState(null, '', lastHash || '#/queue'); return; }
  }
  ctx.leaveGuard = null;
  lastHash = location.hash;
  const [path, query] = (location.hash.replace(/^#/, '') || '/queue').split('?');
  const parts = path.split('/').filter(Boolean);
  const params = new URLSearchParams(query || '');
  const page = $('#page');
  document.querySelectorAll('[data-nav]').forEach(a => a.classList.toggle('active', a.dataset.nav === (parts[0] === 'review' ? 'queue' : parts[0])));
  page.innerHTML = '<div class="muted pad">Loading…</div>';
  window.scrollTo(0, 0);
  try {
    await refreshCounts(); // keep sidebar numbers fresh on every page change
    switch (parts[0]) {
      case 'review': return await renderReview(page, parts[1]);
      case 'new': {
        const id = await createManualSubmission(params.get('builder'));
        location.replace(`#/review/${id}`);
        return;
      }
      case 'builders': return parts[1] ? await renderBuilderDetail(page, parts[1]) : await renderBuilders(page);
      case 'import': return await renderImport(page);
      case 'live': return await renderLive(page);
      default: return await renderQueue(page, params);
    }
  } catch (e) {
    console.error(e);
    page.innerHTML = `<div class="card pad"><h2>Something went wrong</h2><p class="muted">${esc(friendlyError(e))}</p></div>`;
  }
}
