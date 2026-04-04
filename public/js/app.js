// ===== Campus Connect Frontend App =====
const API = '';
let currentUser = null;
let currentPage = 'dashboard';
let _token = null;

function saveToken(t, u) { _token = t; try { localStorage.setItem('cc_token', t); localStorage.setItem('cc_user', JSON.stringify(u)); } catch(e) {} }
function clearToken() { _token = null; try { localStorage.removeItem('cc_token'); localStorage.removeItem('cc_user'); } catch(e) {} }
function getToken() { if(_token) return _token; try { return localStorage.getItem('cc_token'); } catch(e) { return null; } }

document.addEventListener('DOMContentLoaded', () => {
    // Apply theme
    const savedTheme = localStorage.getItem('cc_theme') || 'dark';
    if (savedTheme === 'light') {
        document.body.classList.add('light-mode');
        const btn = document.getElementById('theme-toggle');
        if (btn) btn.textContent = '🌙';
    }

    // Check for forced logout via query param
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('logout') === 'true') {
        clearToken();
        window.history.replaceState({}, document.title, window.location.pathname);
    }

    let token = getToken();
    let user = null;
    try { const u = localStorage.getItem('cc_user'); if(u) user = JSON.parse(u); } catch(e) {}
    if (token && user) { currentUser = user; _token = token; showApp(); }
    else { showAuth(); }
    
    // Initial sync of landing content
    const tmpl = document.getElementById('landing-template');
    const target = document.getElementById('landing-static-target');
    if (tmpl && target) target.appendChild(tmpl.content.cloneNode(true));
});

function toggleTheme() {
    const isLight = document.body.classList.toggle('light-mode');
    localStorage.setItem('cc_theme', isLight ? 'light' : 'dark');
    document.getElementById('theme-toggle').textContent = isLight ? '🌙' : '☀️';
    showToast(`${isLight ? 'Light' : 'Dark'} mode enabled`, 'info');
}

function toggleNotifs() {
    const panel = document.getElementById('notif-panel');
    const isShowing = panel.style.display === 'block';
    panel.style.display = isShowing ? 'none' : 'block';
    if (!isShowing) document.getElementById('notif-badge').style.display = 'none';
}

// Close notif panel when clicking outside
document.addEventListener('click', (e) => {
    const panel = document.getElementById('notif-panel');
    const toggle = document.querySelector('.notif-toggle');
    if (panel && panel.style.display === 'block' && !panel.contains(e.target) && !toggle.contains(e.target)) {
        panel.style.display = 'none';
    }
});

function showAuth() {
    document.getElementById('auth-screen').style.display = 'flex';
    document.getElementById('app').style.display = 'none';
}

function showApp() {
    document.getElementById('auth-screen').style.display = 'none';
    document.getElementById('app').style.display = 'flex';
    updateSidebar();
    navigate('dashboard');
}

function updateSidebar() {
    if (!currentUser) return;
    const initials = currentUser.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
    
    // Update sidebar elements
    const avatar = document.getElementById('sidebar-avatar');
    if (avatar) avatar.textContent = initials;
    
    const name = document.getElementById('sidebar-name');
    if (name) name.textContent = currentUser.full_name;
    
    const role = document.getElementById('sidebar-role');
    if (role) role.textContent = currentUser.role === 'admin' ? 'Administrator' : 'Student';
    
    // Update admin navigation
    const adminNav = document.getElementById('admin-nav');
    if (adminNav) {
        adminNav.style.display = currentUser.role === 'admin' ? 'block' : 'none';
    }
}

// ===== AUTH =====
function switchAuthTab(tab) {
    document.getElementById('tab-login').classList.toggle('active', tab === 'login');
    document.getElementById('tab-register').classList.toggle('active', tab === 'register');
    document.getElementById('login-form').style.display = tab === 'login' ? 'block' : 'none';
    document.getElementById('register-form').style.display = tab === 'register' ? 'block' : 'none';
    document.getElementById('auth-msg').textContent = '';
}

function showAuthMsg(msg, isError) {
    const el = document.getElementById('auth-msg');
    el.textContent = msg;
    el.style.color = isError ? '#ff8080' : '#43e97b';
}

function togglePassword(id) {
    const input = document.getElementById(id);
    const icon = input.nextElementSibling;
    if (input.type === 'password') {
        input.type = 'text';
        icon.textContent = '🙈';
    } else {
        input.type = 'password';
        icon.textContent = '👁️';
    }
}

async function handleLogin() {
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    if (!email || !password) { showAuthMsg('Please enter email and password', true); return; }
    showAuthMsg('Signing in...', false);
    try {
        const res = await apiFetch('/api/auth/login', 'POST', { email, password });
        if (res.success) {
            saveToken(res.token, res.user);
            currentUser = res.user;
            showToast('Welcome back, ' + res.user.full_name + '!', 'success');
            showApp();
        } else {
            showAuthMsg(res.message || 'Invalid email or password', true);
        }
    } catch (err) {
        showAuthMsg('Connection error. Is the server running?', true);
    }
}

async function handleRegister() {
    const full_name = document.getElementById('reg-name').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const password = document.getElementById('reg-password').value;
    if (!full_name || !email || !password) { showAuthMsg('Name, email and password are required', true); return; }
    showAuthMsg('Creating account...', false);
    try {
        const res = await apiFetch('/api/auth/register', 'POST', {
            full_name, email, password,
            roll_number: document.getElementById('reg-roll').value,
            department: document.getElementById('reg-department').value
        });
        if (res.success) {
            saveToken(res.token, res.user);
            currentUser = res.user;
            showToast('Account created!', 'success');
            showApp();
        } else {
            showAuthMsg(res.message || 'Registration failed', true);
        }
    } catch (err) {
        showAuthMsg('Connection error. Is the server running?', true);
    }
}

async function handleLogout() {
    try { 
        showToast('Signing out...', 'info');
        await apiFetch('/api/auth/logout', 'POST'); 
    } catch(e) {}
    clearToken();
    currentUser = null;
    // Clear form inputs
    document.querySelectorAll('.auth-card input').forEach(i => i.value = '');
    showAuth();
}

// ===== NAVIGATION =====
function navigate(page) {
    currentPage = page;
    document.querySelectorAll('.nav-item').forEach(el => el.classList.toggle('active', el.dataset.page === page));
    
    const titles = {
        dashboard: currentUser && currentUser.role === 'admin' ? 'Admin Control Center 🛡️' : 'Dashboard', 
        notes: 'Notes Sharing', 'lost-found': 'Lost & Found',
        complaints: 'Complaints', events: 'Events', profile: 'My Profile',
        'admin-users': 'Manage Users', 'admin-notes': 'Approve Notes',
        'admin-complaints': 'Manage Complaints', 'admin-events': 'Manage Events'
    };
    document.getElementById('page-title').textContent = titles[page] || page;
    
    // Close sidebar on mobile
    document.getElementById('sidebar').classList.remove('open');
    
    const pages = { dashboard, notes, 'lost-found': lostFound, complaints, events, profile, 'admin-users': adminUsers, 'admin-notes': adminNotes, 'admin-complaints': adminComplaints, 'admin-events': adminEvents };
    if (pages[page]) pages[page]();
}

function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('open');
}

// ===== API HELPER =====
async function apiFetch(url, method = 'GET', data = null, isFormData = false) {
    const headers = {};
    let token = null; try { token = localStorage.getItem('cc_token'); } catch(ex) {}
    if (token) headers['Authorization'] = 'Bearer ' + token;
    if (!isFormData && data) headers['Content-Type'] = 'application/json';
    
    const opts = { method, headers, credentials: 'include' };
    if (data) opts.body = isFormData ? data : JSON.stringify(data);
    
    const res = await fetch(API + url, opts);
    return await res.json();
}

function setContent(html) {
    const el = document.getElementById('content-area');
    el.innerHTML = html;
    el.classList.remove('content-fade-in');
    void el.offsetWidth; // Trigger reflow
    el.classList.add('content-fade-in');
}

function loading() {
    setContent('<div class="loading"><div class="spinner"></div> Loading...</div>');
}

// ===== TOAST =====
let toastTimer;
function showToast(msg, type = '') {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.className = 'toast ' + type;
    t.style.display = 'block';
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.style.display = 'none', 3500);
}

// ===== MODAL =====
function openModal(title, bodyHTML) {
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-body').innerHTML = bodyHTML;
    document.getElementById('modal-overlay').style.display = 'block';
}
function closeModal() {
    document.getElementById('modal-overlay').style.display = 'none';
}

// ===== DASHBOARD =====
async function dashboard() {
    loading();
    if (currentUser.role === 'admin') {
        try {
            const res = await apiFetch('/api/admin/stats');
            if (res.success) {
                const s = res.stats;
                setContent(`
                    <div class="welcome-banner">
                        <div class="banner-content">
                            <h2>Admin Control Center 🛡️</h2>
                            <p>Real-time campus overview — ${new Date().toLocaleDateString('en-US', { weekday:'long', year:'numeric', month:'long', day:'numeric' })}</p>
                        </div>
                    </div>
                    <div class="stat-grid">
                        <div class="stat-card" style="--accent-color: var(--accent)"><div class="stat-icon">👥</div><div class="stat-value">${s.students}</div><div class="stat-label">Verified Students</div></div>
                        <div class="stat-card" style="--accent-color: var(--accent4)"><div class="stat-icon">📚</div><div class="stat-value">${s.pendingNotes}</div><div class="stat-label">Pending Approval</div></div>
                        <div class="stat-card" style="--accent-color: var(--accent2)"><div class="stat-icon">⚠️</div><div class="stat-value">${s.pendingComplaints}</div><div class="stat-label">Active Tickets</div></div>
                        <div class="stat-card" style="--accent-color: var(--accent3)"><div class="stat-icon">📅</div><div class="stat-value">${s.upcomingEvents}</div><div class="stat-label">Live Events</div></div>
                        <div class="stat-card" style="--accent-color: #f7971e"><div class="stat-icon">🔍</div><div class="stat-value">${s.lostFoundItems}</div><div class="stat-label">Lost & Found Items</div></div>
                        <div class="stat-card" style="--accent-color: var(--accent3)"><div class="stat-icon">✨</div><div class="stat-value">${s.totalRegistrations}</div><div class="stat-label">Total Users</div></div>
                    </div>
                    <div class="grid-2">
                        <div>
                            <div class="section-title">Recent Complaints</div>
                            <div class="card">
                                ${res.recentComplaints.length ? res.recentComplaints.map(c => `
                                    <div style="padding: 12px 0; border-bottom: 1px solid var(--border);">
                                        <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
                                            <span style="font-weight:600;font-size:0.9rem">${c.title}</span>
                                            <span class="badge badge-${c.status}">${c.status}</span>
                                        </div>
                                        <div style="font-size:0.8rem;color:var(--text-muted)">${c.full_name} · ${c.category}</div>
                                    </div>`).join('') : '<div class="empty-state"><div class="empty-icon">✅</div><p>No complaints</p></div>'}
                            </div>
                        </div>
                        <div>
                            <div class="section-title">Recent Registrations</div>
                            <div class="card">
                                ${res.recentUsers.length ? res.recentUsers.map(u => `
                                    <div style="padding: 12px 0; border-bottom: 1px solid var(--border);">
                                        <div style="font-weight:600;font-size:0.9rem">${u.full_name}</div>
                                        <div style="font-size:0.8rem;color:var(--text-muted)">${u.email} · ${u.department || 'N/A'}</div>
                                    </div>`).join('') : '<div class="empty-state"><p>No users yet</p></div>'}
                            </div>
                        </div>
                    </div>
                    </div>
                    ${aboutSectionHTML()}`); 
            } else {
                setContent(`<div class="empty-state"><div class="empty-icon">⚠️</div><p>Failed to load stats: ${res.message || 'Unknown error'}</p></div>`);
            }
        } catch (e) { setContent('<div class="empty-state"><div class="empty-icon">⚠️</div><p>Failed to load stats. Connection error.</p></div>'); }
    } else {
        setContent(`
            <div class="welcome-banner">
                <div class="banner-content">
                    <h2>Welcome back, ${currentUser.full_name.split(' ')[0]}! 👋</h2>
                    <p>Your central hub for campus resources, events, and support.</p>
                </div>
            </div>
            <div class="stat-grid">
                <div class="stat-card" style="--accent-color:var(--accent); cursor:pointer" onclick="navigate('notes')">
                    <div class="stat-icon">📚</div>
                    <div class="stat-value">Explore</div>
                    <div class="stat-label">Study Resources</div>
                </div>
                <div class="stat-card" style="--accent-color:var(--accent3); cursor:pointer" onclick="navigate('events')">
                    <div class="stat-icon">🎉</div>
                    <div class="stat-value">Join</div>
                    <div class="stat-label">Campus Events</div>
                </div>
                <div class="stat-card" style="--accent-color:var(--accent2); cursor:pointer" onclick="navigate('lost-found')">
                    <div class="stat-icon">🔍</div>
                    <div class="stat-value">Search</div>
                    <div class="stat-label">Lost & Found</div>
                </div>
                <div class="stat-card" style="--accent-color:var(--accent4); cursor:pointer" onclick="navigate('complaints')">
                    <div class="stat-icon">📩</div>
                    <div class="stat-value">Report</div>
                    <div class="stat-label">Need Help?</div>
                </div>
            </div>
            <div class="card" style="margin-top:32px">
                <div class="section-title">Getting Started</div>
                <div class="grid-3" style="margin-top:20px">
                    <div class="info-bubble">
                        <div class="bubble-icon">📤</div>
                        <div class="bubble-title">Share Notes</div>
                        <p>Upload PDFs to build our collective knowledge base.</p>
                    </div>
                    <div class="info-bubble">
                        <div class="bubble-icon">📣</div>
                        <div class="bubble-title">Help Others</div>
                        <p>Post items you've found on campus to the feed.</p>
                    </div>
                    <div class="info-bubble">
                        <div class="bubble-icon">🏃</div>
                        <div class="bubble-title">Stay Active</div>
                        <p>Register for workshops, sports, and cultural meets.</p>
                    </div>
                </div>
            </div>
            ${aboutSectionHTML()}`);
    }
}

function aboutSectionHTML() {
    return `
    <div style="margin-top:48px;border-top:1px solid var(--border);padding-top:40px">
        <div style="text-align:center;margin-bottom:32px">
            <h2 style="font-family:'Syne',sans-serif;font-size:1.8rem;font-weight:800;margin-bottom:8px">About Campus Connect</h2>
            <p style="color:var(--text-muted);font-size:1rem;max-width:600px;margin:0 auto">We are a next-generation student ecosystem unifying the academic and social threads of campus life.</p>
        </div>
        <div class="grid-2" style="margin-bottom:32px">
            <div class="card" style="padding:28px">
                <div style="font-size:1.8rem;margin-bottom:12px">🎯</div>
                <h3 style="font-family:'Syne',sans-serif;color:var(--accent);margin-bottom:10px">Our Vision</h3>
                <p style="color:var(--text-muted);line-height:1.7;font-size:0.95rem">To become the central hub of student life — from sharing knowledge to reporting campus issues, all in one secure platform.</p>
            </div>
            <div class="card" style="padding:28px">
                <div style="font-size:1.8rem;margin-bottom:12px">❤️</div>
                <h3 style="font-family:'Syne',sans-serif;color:var(--accent2);margin-bottom:10px">Our Mission</h3>
                <p style="color:var(--text-muted);line-height:1.7;font-size:0.95rem">To build a stronger campus community by fostering <strong>seamless communication</strong> and shared knowledge through technology.</p>
            </div>
        </div>
        <div style="text-align:center;margin-bottom:24px">
            <h3 style="font-family:'Syne',sans-serif;font-size:1.3rem;font-weight:800">👥 The Innovators</h3>
        </div>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:24px">
            <div class="card" style="padding:28px;text-align:center">
                <div style="width:72px;height:72px;border-radius:50%;background:linear-gradient(135deg,var(--accent),var(--accent2));display:flex;align-items:center;justify-content:center;font-weight:800;font-size:1.4rem;color:#fff;margin:0 auto 16px">SS</div>
                <div style="font-weight:700;font-size:1.1rem;margin-bottom:4px">Shivani Sharma</div>
                <div style="color:var(--accent);font-size:0.8rem;font-weight:600;text-transform:uppercase;letter-spacing:1px;margin-bottom:12px">Founder &amp; Lead Architect</div>
                <p style="color:var(--text-muted);font-size:0.9rem;line-height:1.6">Building the core foundations of the Campus Connect experience.</p>
            </div>
            <div class="card" style="padding:28px;text-align:center">
                <div style="width:72px;height:72px;border-radius:50%;background:linear-gradient(135deg,var(--accent3),var(--accent4));display:flex;align-items:center;justify-content:center;font-weight:800;font-size:1.4rem;color:#fff;margin:0 auto 16px">NP</div>
                <div style="font-weight:700;font-size:1.1rem;margin-bottom:4px">Nancy Parmar</div>
                <div style="color:var(--accent3);font-size:0.8rem;font-weight:600;text-transform:uppercase;letter-spacing:1px;margin-bottom:12px">Creative Director</div>
                <p style="color:var(--text-muted);font-size:0.9rem;line-height:1.6">Designing intuitive interfaces that simplify student life.</p>
            </div>
            <div class="card" style="padding:28px;text-align:center">
                <div style="width:72px;height:72px;border-radius:50%;background:linear-gradient(135deg,var(--accent2),var(--accent3));display:flex;align-items:center;justify-content:center;font-weight:800;font-size:1.4rem;color:#fff;margin:0 auto 16px">ST</div>
                <div style="font-weight:700;font-size:1.1rem;margin-bottom:4px">Samiksha Thakur</div>
                <div style="color:var(--accent2);font-size:0.8rem;font-weight:600;text-transform:uppercase;letter-spacing:1px;margin-bottom:12px">Product Strategist</div>
                <p style="color:var(--text-muted);font-size:0.9rem;line-height:1.6">Bridging the gap between user needs and technical excellence.</p>
            </div>
        </div>
    </div>`;
}

// ===== NOTES =====
async function notes() {
    loading();
    const res = await apiFetch('/api/notes');
    const notesList = res.notes || [];
    setContent(`
        <div class="page-header">
            <h2>Notes Sharing</h2>
            <button class="btn-primary" onclick="openUploadNoteModal()">+ Upload Note</button>
        </div>
        <div class="search-bar">
            <input type="text" id="notes-search" placeholder="Search notes..." oninput="filterNotes()">
            <select id="notes-subject" onchange="filterNotes()">
                <option value="">All Subjects</option>
                ${[...new Set(notesList.map(n => n.subject))].map(s => `<option>${s}</option>`).join('')}
            </select>
        </div>
        <div id="notes-grid" class="item-grid">
            ${renderNoteCards(notesList)}
        </div>`);
    window._notesData = notesList;
}

function renderNoteCards(notes) {
    if (!notes.length) return `<div class="empty-state" style="grid-column:1/-1"><div class="empty-icon">📚</div><p>No study notes available in this category.</p></div>`;
    return notes.map(n => `
        <div class="note-card">
            <div class="note-subject">${n.subject}</div>
            <div class="note-title">${n.title}</div>
            <div class="note-meta">
                ${n.semester ? `<span class="badge badge-academic">Sem ${n.semester}</span>` : ''} 
                <span style="opacity:0.6">${n.department || ''}</span>
            </div>
            <div class="note-details">
                By <strong>${n.uploader_name}</strong> · ${n.download_count} Downloads<br>
                <small>${new Date(n.created_at).toLocaleDateString()}</small>
            </div>
            ${n.description ? `<div class="note-desc">${n.description.slice(0, 80)}${n.description.length > 80 ? '...' : ''}</div>` : ''}
            <button class="btn-primary btn-sm full-width" style="margin-top:10px" onclick="downloadNote(${n.id}, '${n.title}')">
                <span style="font-size:1.1rem;margin-right:6px">⬇</span> Download PDF
            </button>
        </div>`).join('');
}

function filterNotes() {
    const search = document.getElementById('notes-search').value.toLowerCase();
    const subject = document.getElementById('notes-subject').value;
    const filtered = (window._notesData || []).filter(n =>
        (!subject || n.subject === subject) &&
        (!search || n.title.toLowerCase().includes(search) || n.subject.toLowerCase().includes(search))
    );
    document.getElementById('notes-grid').innerHTML = renderNoteCards(filtered);
}

async function downloadNote(id, title) {
    const token = getToken();
    const url = `/api/notes/download/${id}?token=${token}`;
    
    // Instead of window.open, use a hidden link to trigger a smoother download
    const a = document.createElement('a');
    a.href = url;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => document.body.removeChild(a), 100);
}

function openUploadNoteModal() {
    openModal('Upload Study Note', `
        <form onsubmit="uploadNote(event)">
            <div class="form-group"><label>Title *</label><input type="text" id="note-title" required placeholder="e.g., Data Structures Complete Notes"></div>
            <div class="form-row">
                <div class="form-group"><label>Subject *</label><input type="text" id="note-subject" required placeholder="e.g., DSA"></div>
                <div class="form-group"><label>Semester</label><input type="text" id="note-semester" placeholder="e.g., 4"></div>
            </div>
            <div class="form-group"><label>Department</label><input type="text" id="note-dept" placeholder="e.g., Computer Science"></div>
            <div class="form-group"><label>Description</label><textarea id="note-desc" placeholder="Brief description of the notes..."></textarea></div>
            <div class="form-group"><label>PDF File *</label><input type="file" id="note-file" accept=".pdf" required></div>
            <div class="action-row" style="margin-top:8px">
                <button type="submit" class="btn-primary">Upload Note</button>
                <button type="button" class="btn-secondary" onclick="closeModal()">Cancel</button>
            </div>
        </form>`);
}

async function uploadNote(e) {
    e.preventDefault();
    const fd = new FormData();
    fd.append('title', document.getElementById('note-title').value);
    fd.append('subject', document.getElementById('note-subject').value);
    fd.append('semester', document.getElementById('note-semester').value);
    fd.append('department', document.getElementById('note-dept').value);
    fd.append('description', document.getElementById('note-desc').value);
    fd.append('file', document.getElementById('note-file').files[0]);
    const res = await apiFetch('/api/notes', 'POST', fd, true);
    if (res.success) { showToast('Note uploaded! Awaiting admin approval.', 'success'); closeModal(); notes(); }
    else showToast(res.message, 'error');
}

// ===== LOST & FOUND =====
async function lostFound() {
    loading();
    const res = await apiFetch('/api/lost-found');
    const items = res.items || [];
    setContent(`
        <div class="page-header">
            <h2>Lost & Found</h2>
            <button class="btn-primary" onclick="openPostItemModal()">+ Post Item</button>
        </div>
        <div class="search-bar">
            <input type="text" id="lf-search" placeholder="Search items..." oninput="filterLF()">
            <select id="lf-type" onchange="filterLF()">
                <option value="">All Items</option>
                <option value="lost">Lost Items</option>
                <option value="found">Found Items</option>
            </select>
        </div>
        <div id="lf-grid" class="item-grid">
            ${renderLostFoundCards(items)}
        </div>`);
    window._lfData = items;
}

function renderLostFoundCards(items) {
    if (!items.length) return `<div class="empty-state" style="grid-column:1/-1"><div class="empty-icon">🔍</div><p>No lost or found items reported yet.</p></div>`;
    return items.map(item => `
        <div class="item-card card">
            <div class="item-img-container">
                ${item.image_path ? `<img class="item-img" src="/uploads/images/${item.image_path}" alt="Item">` : `<div class="item-img-placeholder">❓</div>`}
                <div class="item-type-badge ${item.type}">${item.type}</div>
            </div>
            <div class="item-content">
                <div class="item-title">${item.title}</div>
                <div class="item-meta">
                    <span>📍 ${item.location || 'Campus'}</span> · 
                    <span>📅 ${new Date(item.date_occurred).toLocaleDateString()}</span>
                </div>
                <div class="item-desc">${item.description}</div>
                <div class="item-footer">
                    <div>
                        <div style="font-weight:600;font-size:0.85rem">${item.contact_name}</div>
                        ${item.contact_phone ? `<div style="font-size:0.75rem;color:var(--text-muted)">📞 ${item.contact_phone}</div>` : ''}
                    </div>
                    <div>
                        <span class="badge badge-${item.status}">${item.status.toUpperCase()}</span>
                    </div>
                </div>
                ${item.posted_by === currentUser.id || currentUser.role === 'admin' ? `
                <div class="action-row" style="margin-top:16px; border-top: 1px solid var(--border); padding-top: 16px">
                    ${item.status !== 'resolved' ? `<button class="btn-secondary btn-sm" onclick="markResolved(${item.id})">✓ Mark Resolved</button>` : ''}
                    <button class="btn-danger btn-sm" onclick="deleteLFItem(${item.id})">Delete</button>
                </div>` : ''}
            </div>
        </div>`).join('');
}

function filterLF() {
    const search = document.getElementById('lf-search').value.toLowerCase();
    const type = document.getElementById('lf-type').value;
    const filtered = (window._lfData || []).filter(i =>
        (!type || i.type === type) &&
        (!search || i.title.toLowerCase().includes(search) || i.description.toLowerCase().includes(search))
    );
    document.getElementById('lf-grid').innerHTML = renderLFCards(filtered);
}

function openPostItemModal() {
    openModal('Post Lost / Found Item', `
        <form onsubmit="postLFItem(event)">
            <div class="form-group"><label>Type *</label>
                <select id="lf-type-input" required>
                    <option value="lost">Lost Item</option>
                    <option value="found">Found Item</option>
                </select>
            </div>
            <div class="form-group"><label>Title *</label><input type="text" id="lf-title" required placeholder="e.g., Black wallet"></div>
            <div class="form-group"><label>Description *</label><textarea id="lf-desc" required placeholder="Describe the item in detail..."></textarea></div>
            <div class="form-row">
                <div class="form-group"><label>Location</label><input type="text" id="lf-loc" placeholder="e.g., Library Block B"></div>
                <div class="form-group"><label>Date *</label><input type="date" id="lf-date" required></div>
            </div>
            <div class="form-group"><label>Your Name *</label><input type="text" id="lf-cname" value="${currentUser.full_name}" required></div>
            <div class="form-row">
                <div class="form-group"><label>Email</label><input type="email" id="lf-cemail" value="${currentUser.email}"></div>
                <div class="form-group"><label>Phone</label><input type="text" id="lf-cphone"></div>
            </div>
            <div class="form-group"><label>Image (optional)</label><input type="file" id="lf-image" accept="image/*"></div>
            <div class="action-row" style="margin-top:8px">
                <button type="submit" class="btn-primary">Post Item</button>
                <button type="button" class="btn-secondary" onclick="closeModal()">Cancel</button>
            </div>
        </form>`);
}

async function postLFItem(e) {
    e.preventDefault();
    const fd = new FormData();
    fd.append('type', document.getElementById('lf-type-input').value);
    fd.append('title', document.getElementById('lf-title').value);
    fd.append('description', document.getElementById('lf-desc').value);
    fd.append('location', document.getElementById('lf-loc').value);
    fd.append('date_occurred', document.getElementById('lf-date').value);
    fd.append('contact_name', document.getElementById('lf-cname').value);
    fd.append('contact_email', document.getElementById('lf-cemail').value);
    fd.append('contact_phone', document.getElementById('lf-cphone').value);
    const img = document.getElementById('lf-image').files[0];
    if (img) fd.append('image', img);
    const res = await apiFetch('/api/lost-found', 'POST', fd, true);
    if (res.success) { showToast('Item posted successfully!', 'success'); closeModal(); lostFound(); }
    else showToast(res.message, 'error');
}

async function markResolved(id) {
    const res = await apiFetch(`/api/lost-found/${id}/status`, 'PUT', { status: 'resolved' });
    if (res.success) { showToast('Marked as resolved!', 'success'); lostFound(); }
    else showToast(res.message, 'error');
}

async function deleteLFItem(id) {
    if (!confirm('Delete this item?')) return;
    const res = await apiFetch(`/api/lost-found/${id}`, 'DELETE');
    if (res.success) { showToast('Item deleted.', 'success'); lostFound(); }
    else showToast(res.message, 'error');
}

// ===== COMPLAINTS =====
async function complaints() {
    loading();
    const res = await apiFetch('/api/complaints');
    const list = res.complaints || [];
    setContent(`
        <div class="page-header">
            <h2>Campus Complaints</h2>
            <button class="btn-primary" onclick="openComplaintModal()">+ New Complaint</button>
        </div>
        <div id="complaints-list">
            ${renderComplaints(list)}
        </div>`);
    window._complaintsData = list;
}

function renderComplaints(complaints) {
    if (!complaints.length) return `<div class="empty-state"><div class="empty-icon">📩</div><p>No complaints reported yet. Be the first!</p></div>`;
    return complaints.map(c => `
        <div class="complaint-item card">
            <div class="complaint-header">
                <div class="complaint-title-group">
                    <h4 class="complaint-title">${c.title}</h4>
                    <span class="badge badge-${c.category}">${c.category.toUpperCase()}</span>
                </div>
                <div class="complaint-status-group">
                    <span class="status-pill status-${c.status}">${c.status.toUpperCase()}</span>
                    <span class="priority-tag priority-${c.priority}">${c.priority.toUpperCase()}</span>
                </div>
            </div>
            <div class="user-info-brief">
                By <strong>${c.submitter_name || 'Student'}</strong> · ${new Date(c.created_at).toLocaleDateString()}
            </div>
            <div class="complaint-body">
                <p>${c.description}</p>
            </div>
            <div class="complaint-footer">
                <div class="support-action">
                    <button class="btn-support ${c.is_supported ? 'active' : ''}" onclick="toggleSupport(${c.id})">
                        <span class="support-icon">${c.is_supported ? '♥' : '♡'}</span>
                        <span class="support-text">${c.is_supported ? 'Supported' : 'Support Issue'}</span>
                    </button>
                    <span class="support-count"><strong>${c.support_count || 0}</strong> students support this</span>
                </div>
                ${c.admin_remark ? `<div class="admin-note"><strong>Admin Note:</strong> ${c.admin_remark}</div>` : ''}
            </div>
        </div>`).join('');
}

async function toggleSupport(id) {
    const res = await apiFetch(`/api/complaints/${id}/support`, 'POST');
    if (res.success) {
        showToast(res.message, 'success');
        complaints(); // Refresh view
    } else {
        showToast(res.message, 'error');
    }
}

function openComplaintModal() {
    openModal('Submit Complaint', `
        <form onsubmit="submitComplaint(event)">
            <div class="form-group"><label>Title *</label><input type="text" id="c-title" required placeholder="Brief description of issue"></div>
            <div class="form-row">
                <div class="form-group"><label>Category *</label>
                    <select id="c-cat" required>
                        <option value="hostel">Hostel</option>
                        <option value="academic">Academic</option>
                        <option value="infrastructure">Infrastructure</option>
                        <option value="other">Other</option>
                    </select>
                </div>
                <div class="form-group"><label>Priority</label>
                    <select id="c-priority">
                        <option value="low">Low</option>
                        <option value="medium" selected>Medium</option>
                        <option value="high">High</option>
                    </select>
                </div>
            </div>
            <div class="form-group"><label>Description *</label><textarea id="c-desc" required placeholder="Describe your complaint in detail..."></textarea></div>
            <div class="action-row" style="margin-top:8px">
                <button type="submit" class="btn-primary">Submit Complaint</button>
                <button type="button" class="btn-secondary" onclick="closeModal()">Cancel</button>
            </div>
        </form>`);
}

async function submitComplaint(e) {
    e.preventDefault();
    const res = await apiFetch('/api/complaints', 'POST', {
        title: document.getElementById('c-title').value,
        category: document.getElementById('c-cat').value,
        priority: document.getElementById('c-priority').value,
        description: document.getElementById('c-desc').value
    });
    if (res.success) { showToast('Complaint submitted!', 'success'); closeModal(); complaints(); }
    else showToast(res.message, 'error');
}

// ===== EVENTS =====
async function events() {
    loading();
    const res = await apiFetch('/api/events');
    const myRegRes = await apiFetch('/api/events/my-registrations');
    const registeredIds = new Set((myRegRes.events || []).map(e => e.id));
    const list = res.events || [];
    setContent(`
        <div class="page-header">
            <h2>Campus Events</h2>
            <div class="action-row">
                <button class="btn-secondary" onclick="navigate('my-registrations')">My Registrations</button>
            </div>
        </div>
        <div class="search-bar">
            <input type="text" id="ev-search" placeholder="Search events..." oninput="filterGrid('ev-search', 'ev-grid')">
        </div>
        <div id="ev-grid" class="item-grid">
            ${renderEventCards(list, registeredIds)}
        </div>`);
    window._eventsData = list;
}

function renderEventCards(events, registeredIds = new Set()) {
    if (!events.length) return `<div class="empty-state" style="grid-column:1/-1"><div class="empty-icon">🎉</div><p>No upcoming events at the moment.</p></div>`;
    return events.map(e => {
        const isRegistered = registeredIds.has(e.id);
        const isFull = e.max_participants > 0 && e.registered_count >= e.max_participants;
        const eventDate = new Date(e.event_date);
        return `
        <div class="card event-card">
            <div class="event-date-ribbon">
                <span class="event-day">${eventDate.getDate()}</span>
                <span class="event-month">${eventDate.toLocaleString('default', { month: 'short' })}</span>
            </div>
            <div class="event-content">
                <div class="event-category-badge">${e.category || 'General'}</div>
                <h4 class="event-title">${e.title}</h4>
                <div class="event-meta">
                    <span>📍 ${e.location}</span> · 
                    <span>⏰ ${e.event_time || 'TBA'}</span>
                </div>
                <div class="participation-bar">
                    <div class="bar-info">
                        <span>${e.registered_count} Registered</span>
                        ${e.max_participants ? `<span style="opacity:0.6">/ ${e.max_participants} max</span>` : ''}
                    </div>
                    ${e.max_participants ? `<div class="bar-outer"><div class="bar-inner" style="width:${Math.min(100, (e.registered_count/e.max_participants)*100)}%"></div></div>` : ''}
                </div>
                <div class="event-footer">
                    ${isRegistered ? 
                        `<button class="btn-secondary btn-sm full-width" disabled>✓ Registered</button>` : 
                        (isFull ? 
                            `<button class="btn-secondary btn-sm full-width" disabled>Full</button>` : 
                            `<button class="btn-primary btn-sm full-width" onclick="registerForEvent(${e.id})">Register Now</button>`
                        )
                    }
                    <button class="btn-secondary btn-sm" onclick="viewEventDetails(${JSON.stringify(e).replace(/"/g, '&quot;')})" title="View Details">ℹ️</button>
                </div>
            </div>
        </div>`;
    }).join('');
}

async function registerEvent(id) {
    const res = await apiFetch(`/api/events/${id}/register`, 'POST');
    if (res.success) { showToast('Registered successfully!', 'success'); events(); }
    else showToast(res.message, 'error');
}

// ===== PROFILE =====
async function profile() {
    loading();
    try {
        const res = await apiFetch('/api/auth/profile');
        if (!res.success || !res.user) {
            setContent(`<div class="empty-state"><div class="empty-icon">⚠️</div><p>Error: ${res.message || 'Failed to load profile. Please log out and back in.'}</p></div>`);
            return;
        }
        const u = res.user;
        const initials = u.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
        setContent(`
            <div class="profile-header">
                <div class="profile-avatar">${initials}</div>
                <div>
                    <div style="font-family:'Syne',sans-serif;font-size:1.4rem;font-weight:800">${u.full_name}</div>
                    <div style="color:var(--text-muted);margin-top:4px">${u.email}</div>
                    <div style="margin-top:8px"><span class="badge badge-${u.role === 'admin' ? 'approved' : 'upcoming'}">${u.role === 'admin' ? 'Administrator' : 'Student'}</span></div>
                </div>
            </div>
        <div class="card">
            <div class="section-title">Edit Profile</div>
            <form onsubmit="updateProfile(event)">
                <div class="form-row">
                    <div class="form-group"><label>Full Name</label><input type="text" id="p-name" value="${u.full_name || ''}"></div>
                    <div class="form-group"><label>Roll Number</label><input type="text" id="p-roll" value="${u.roll_number || ''}"></div>
                </div>
                <div class="form-row">
                    <div class="form-group"><label>Department</label><input type="text" id="p-dept" value="${u.department || ''}"></div>
                    <div class="form-group"><label>Phone</label><input type="text" id="p-phone" value="${u.phone || ''}"></div>
                </div>
                <div class="form-group"><label>Email (cannot change)</label><input type="email" value="${u.email}" disabled></div>
                <button type="submit" class="btn-primary">Save Changes</button>
            </form>
        </div>`);
    } catch (e) {
        setContent(`<div class="empty-state"><div class="empty-icon">⚠️</div><p>Failed to load profile. Connection error.</p></div>`);
    }
}

async function updateProfile(e) {
    e.preventDefault();
    const res = await apiFetch('/api/auth/profile', 'PUT', {
        full_name: document.getElementById('p-name').value,
        roll_number: document.getElementById('p-roll').value,
        department: document.getElementById('p-dept').value,
        phone: document.getElementById('p-phone').value
    });
    if (res.success) {
        currentUser.full_name = document.getElementById('p-name').value;
        try { localStorage.setItem('cc_user', JSON.stringify(currentUser)); } catch(ex) {}
        updateSidebar();
        showToast('Profile updated!', 'success');
    } else showToast(res.message, 'error');
}

// ===== ADMIN: USERS =====
async function adminUsers() {
    loading();
    try {
        const res = await apiFetch('/api/admin/users');
        if (!res.success) {
            setContent(`<div class="empty-state"><div class="empty-icon">⚠️</div><p>Error: ${res.message || 'Failed to load users'}</p></div>`);
            return;
        }
        const users = res.users || [];
        setContent(`
            <div class="page-header">
                <h2>Manage Users</h2>
                <span style="color:var(--text-muted);font-size:0.9rem">${users.length} total users</span>
            </div>
        <div class="search-bar">
            <input type="text" placeholder="Search users..." oninput="filterUsers(this.value)">
        </div>
        <div class="card">
            <div class="table-wrap">
                <table id="users-table">
                    <thead><tr><th>Name</th><th>Email</th><th>Roll No.</th><th>Department</th><th>Role</th><th>Joined</th><th>Action</th></tr></thead>
                    <tbody>
                        ${users.map(u => `
                            <tr id="user-row-${u.id}">
                                <td><strong>${u.full_name}</strong></td>
                                <td style="color:var(--text-muted)">${u.email}</td>
                                <td>${u.roll_number || '—'}</td>
                                <td>${u.department || '—'}</td>
                                <td><span class="badge badge-${u.role === 'admin' ? 'approved' : 'upcoming'}">${u.role}</span></td>
                                <td style="color:var(--text-muted)">${new Date(u.created_at).toLocaleDateString()}</td>
                                <td>${u.id !== currentUser.id ? `<button class="btn-danger btn-sm" onclick="deleteUser(${u.id})">Delete</button>` : '<span style="color:var(--text-dim)">You</span>'}</td>
                            </tr>`).join('')}
                    </tbody>
                </table>
            </div>
        </div>`);
        window._usersData = users;
    } catch (e) {
        setContent(`<div class="empty-state"><div class="empty-icon">⚠️</div><p>Failed to load users. Connection error.</p></div>`);
    }
}

function filterUsers(search) {
    const rows = document.querySelectorAll('#users-table tbody tr');
    rows.forEach(row => {
        row.style.display = row.textContent.toLowerCase().includes(search.toLowerCase()) ? '' : 'none';
    });
}

async function deleteUser(id) {
    if (!confirm('Delete this user? This cannot be undone.')) return;
    const res = await apiFetch(`/api/admin/users/${id}`, 'DELETE');
    if (res.success) { showToast('User deleted.', 'success'); document.getElementById('user-row-' + id)?.remove(); }
    else showToast(res.message, 'error');
}

// ===== ADMIN: NOTES =====
async function adminNotes() {
    loading();
    const res = await apiFetch('/api/admin/notes');
    const notes = res.notes || [];
    setContent(`
        <div class="page-header"><h2>Approve Notes</h2></div>
        <div class="card">
            <div class="table-wrap">
                <table>
                    <thead><tr><th>Title</th><th>Subject</th><th>Uploaded By</th><th>Status</th><th>Date</th><th>Actions</th></tr></thead>
                    <tbody>
                        ${notes.length === 0 ? '<tr><td colspan="6" style="text-align:center;color:var(--text-muted)">No notes</td></tr>' :
                        notes.map(n => `
                            <tr id="note-row-${n.id}">
                                <td><strong>${n.title}</strong></td>
                                <td>${n.subject}</td>
                                <td>${n.uploader_name}</td>
                                <td><span class="badge badge-${n.status}">${n.status}</span></td>
                                <td style="color:var(--text-muted)">${new Date(n.created_at).toLocaleDateString()}</td>
                                <td class="action-row">
                                    ${n.status !== 'approved' ? `<button class="btn-primary btn-sm" onclick="updateNoteStatus(${n.id},'approved')">Approve</button>` : ''}
                                    ${n.status !== 'rejected' ? `<button class="btn-secondary btn-sm" onclick="updateNoteStatus(${n.id},'rejected')">Reject</button>` : ''}
                                    <button class="btn-danger btn-sm" onclick="deleteNote(${n.id})">Delete</button>
                                </td>
                            </tr>`).join('')}
                    </tbody>
                </table>
            </div>
        </div>`);
}

async function updateNoteStatus(id, status) {
    const res = await apiFetch(`/api/admin/notes/${id}/status`, 'PUT', { status });
    if (res.success) { showToast(`Note ${status}.`, 'success'); adminNotes(); }
    else showToast(res.message, 'error');
}

async function deleteNote(id) {
    if (!confirm('Delete this note?')) return;
    const res = await apiFetch(`/api/admin/notes/${id}`, 'DELETE');
    if (res.success) { showToast('Note deleted.', 'success'); document.getElementById('note-row-' + id)?.remove(); }
    else showToast(res.message, 'error');
}

// ===== ADMIN: COMPLAINTS =====
async function adminComplaints() {
    loading();
    const res = await apiFetch('/api/admin/complaints');
    const list = res.complaints || [];
    setContent(`
        <div class="page-header"><h2>Manage Complaints</h2></div>
        <div class="search-bar">
            <select onchange="filterComplaintsAdmin(this.value, 'status')">
                <option value="">All Status</option>
                <option value="pending">Pending</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
            </select>
            <select onchange="filterComplaintsAdmin(this.value, 'category')">
                <option value="">All Categories</option>
                <option value="hostel">Hostel</option>
                <option value="academic">Academic</option>
                <option value="infrastructure">Infrastructure</option>
                <option value="other">Other</option>
            </select>
        </div>
        ${list.length === 0 ? `<div class="empty-state"><div class="empty-icon">✅</div><p>No complaints</p></div>` :
        list.map(c => `
            <div class="complaint-card" style="margin-bottom:16px" id="complaint-${c.id}">
                <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px">
                    <div>
                        <div class="complaint-title">${c.title}</div>
                        <div style="font-size:0.82rem;color:var(--text-muted)">${c.student_name} · ${c.student_email}</div>
                    </div>
                    <div class="action-row">
                        <span class="badge badge-${c.category}">${c.category}</span>
                        <span class="badge badge-${c.status}">${c.status.replace('_', ' ')}</span>
                    </div>
                </div>
                <div class="complaint-body">${c.description}</div>
                ${c.admin_note ? `<div class="admin-note-box" style="margin-bottom:12px">💬 Previous note: ${c.admin_note}</div>` : ''}
                <details>
                    <summary style="cursor:pointer;color:var(--accent);font-size:0.88rem">Update Status</summary>
                    <div style="margin-top:12px">
                        <div class="form-group"><label>Status</label>
                            <select id="cs-${c.id}">
                                <option value="pending" ${c.status==='pending'?'selected':''}>Pending</option>
                                <option value="in_progress" ${c.status==='in_progress'?'selected':''}>In Progress</option>
                                <option value="resolved" ${c.status==='resolved'?'selected':''}>Resolved</option>
                                <option value="rejected" ${c.status==='rejected'?'selected':''}>Rejected</option>
                            </select>
                        </div>
                        <div class="form-group"><label>Note to Student</label><textarea id="cn-${c.id}" placeholder="Add a note...">${c.admin_note || ''}</textarea></div>
                        <button class="btn-primary btn-sm" onclick="updateComplaint(${c.id})">Save Update</button>
                    </div>
                </details>
            </div>`).join('')}`);
    window._complaintsAdminData = list;
}

function filterComplaintsAdmin(value, field) {
    window._complaintsFilter = window._complaintsFilter || {};
    window._complaintsFilter[field] = value;
    const params = new URLSearchParams(window._complaintsFilter).toString();
    apiFetch('/api/admin/complaints?' + params).then(res => {
        // Re-render only the list part - simplified
        adminComplaints();
    });
}

async function updateComplaint(id) {
    const status = document.getElementById(`cs-${id}`).value;
    const admin_note = document.getElementById(`cn-${id}`).value;
    const res = await apiFetch(`/api/admin/complaints/${id}`, 'PUT', { status, admin_note });
    if (res.success) { showToast('Complaint updated!', 'success'); adminComplaints(); }
    else showToast(res.message, 'error');
}

// ===== ADMIN: EVENTS =====
async function adminEvents() {
    loading();
    const res = await apiFetch('/api/events');
    const list = res.events || [];
    setContent(`
        <div class="page-header">
            <h2>Manage Events</h2>
            <button class="btn-primary" onclick="openCreateEventModal()">+ Create Event</button>
        </div>
        <div class="card">
            <div class="table-wrap">
                <table>
                    <thead><tr><th>Title</th><th>Date</th><th>Venue</th><th>Category</th><th>Registrations</th><th>Status</th><th>Actions</th></tr></thead>
                    <tbody>
                        ${list.length === 0 ? '<tr><td colspan="7" style="text-align:center;color:var(--text-muted)">No events</td></tr>' :
                        list.map(ev => `
                            <tr>
                                <td><strong>${ev.title}</strong></td>
                                <td style="color:var(--text-muted)">${new Date(ev.event_date).toLocaleDateString()}</td>
                                <td>${ev.venue || '—'}</td>
                                <td>${ev.category || '—'}</td>
                                <td>${ev.registered_count}${ev.max_participants > 0 ? '/'+ev.max_participants : ''}</td>
                                <td><span class="badge badge-upcoming">${ev.status}</span></td>
                                <td class="action-row">
                                    <button class="btn-secondary btn-sm" onclick="viewParticipants(${ev.id}, '${ev.title}')">👥 View</button>
                                    <button class="btn-danger btn-sm" onclick="deleteEvent(${ev.id})">Delete</button>
                                </td>
                            </tr>`).join('')}
                    </tbody>
                </table>
            </div>
        </div>`);
}

function openCreateEventModal() {
    openModal('Create New Event', `
        <form onsubmit="createEvent(event)">
            <div class="form-group"><label>Title *</label><input type="text" id="ev-title" required placeholder="Event name"></div>
            <div class="form-group"><label>Description</label><textarea id="ev-desc" placeholder="Event description..."></textarea></div>
            <div class="form-row">
                <div class="form-group"><label>Date & Time *</label><input type="datetime-local" id="ev-date" required></div>
                <div class="form-group"><label>Max Participants (0=unlimited)</label><input type="number" id="ev-max" value="0" min="0"></div>
            </div>
            <div class="form-row">
                <div class="form-group"><label>Venue</label><input type="text" id="ev-venue" placeholder="e.g., Auditorium"></div>
                <div class="form-group"><label>Category</label>
                    <select id="ev-cat">
                        <option value="academic">Academic</option>
                        <option value="cultural">Cultural</option>
                        <option value="sports">Sports</option>
                        <option value="technical">Technical</option>
                        <option value="other">Other</option>
                    </select>
                </div>
            </div>
            <div class="action-row" style="margin-top:8px">
                <button type="submit" class="btn-primary">Create Event</button>
                <button type="button" class="btn-secondary" onclick="closeModal()">Cancel</button>
            </div>
        </form>`);
}

async function createEvent(e) {
    e.preventDefault();
    const fd = new FormData();
    fd.append('title', document.getElementById('ev-title').value);
    fd.append('description', document.getElementById('ev-desc').value);
    fd.append('event_date', document.getElementById('ev-date').value);
    fd.append('venue', document.getElementById('ev-venue').value);
    fd.append('category', document.getElementById('ev-cat').value);
    fd.append('max_participants', document.getElementById('ev-max').value);
    const res = await apiFetch('/api/admin/events', 'POST', fd, true);
    if (res.success) { showToast('Event created!', 'success'); closeModal(); adminEvents(); }
    else showToast(res.message, 'error');
}

async function viewParticipants(id, title) {
    const res = await apiFetch(`/api/admin/events/${id}/participants`);
    const participants = res.participants || [];
    openModal(`Participants: ${title}`, `
        <p style="color:var(--text-muted);margin-bottom:16px">${participants.length} registered participants</p>
        ${participants.length === 0 ? '<div class="empty-state"><p>No registrations yet</p></div>' :
        `<div class="table-wrap"><table>
            <thead><tr><th>Name</th><th>Email</th><th>Roll No.</th><th>Department</th><th>Registered</th></tr></thead>
            <tbody>
                ${participants.map(p => `
                    <tr>
                        <td>${p.full_name}</td>
                        <td style="color:var(--text-muted)">${p.email}</td>
                        <td>${p.roll_number || '—'}</td>
                        <td>${p.department || '—'}</td>
                        <td style="color:var(--text-muted)">${new Date(p.registered_at).toLocaleDateString()}</td>
                    </tr>`).join('')}
            </tbody>
        </table></div>`}`);
}

async function deleteEvent(id) {
    if (!confirm('Delete this event? All registrations will be removed.')) return;
    const res = await apiFetch(`/api/admin/events/${id}`, 'DELETE');
    if (res.success) { showToast('Event deleted.', 'success'); adminEvents(); }
    else showToast(res.message, 'error');
}

// ===== HELPERS & UTILS =====
function filterGrid(inputId, gridId) {
    const input = document.getElementById(inputId);
    if (!input) return;
    const val = input.value.toLowerCase();
    const cards = document.querySelectorAll(`#${gridId} .card`);
    cards.forEach(c => {
        c.style.display = c.textContent.toLowerCase().includes(val) ? '' : 'none';
    });
}

function viewEventDetails(e) {
    const body = `
        <div class="modal-detail">
            <div class="event-meta" style="font-size:1.1rem;margin-bottom:15px;color:var(--text-muted)">
                📅 ${new Date(e.event_date).toLocaleDateString()} at ${e.event_time || 'TBA'}<br>
                📍 ${e.location}
            </div>
            <p style="white-space:pre-wrap;line-height:1.7;font-size:1rem;color:var(--text)">${e.description}</p>
            <div style="margin-top:20px;padding:20px;background:var(--bg3);border-radius:12px;border:1px solid var(--border)">
                <strong>Organized by:</strong> ${e.organizer}<br>
                <strong>Capacity:</strong> ${e.max_participants ? e.max_participants : 'Unlimited'}
            </div>
            <div class="action-row" style="margin-top:25px">
                <button class="btn-primary full-width" onclick="registerForEvent(${e.id});closeModal()">Register Now</button>
            </div>
        </div>
    `;
    openModal(e.title, body);
}

function viewItemDetails(item) {
    const body = `
        <div class="modal-detail">
            ${item.image_path ? `<img src="uploads/images/${item.image_path}" style="width:100%;border-radius:12px;margin-bottom:20px;box-shadow:var(--shadow);max-height:300px;object-fit:cover">` : ''}
            <div class="item-meta" style="margin-bottom:15px;font-size:1rem;color:var(--text-muted)">
                <span class="badge badge-${item.type}">${item.type.toUpperCase()}</span> ·
                📅 ${new Date(item.date_occurred).toLocaleDateString()} · 📍 ${item.location}
            </div>
            <p style="white-space:pre-wrap;line-height:1.7;font-size:1rem;color:var(--text)">${item.description}</p>
            <div style="margin-top:20px;padding:20px;background:var(--bg3);border-radius:12px;border:1px solid var(--border)">
                <h5 style="margin-bottom:10px;font-family:'Syne',sans-serif;color:var(--text)">Contact Information</h5>
                <strong>Name:</strong> ${item.contact_name}<br>
                ${item.contact_email ? `<strong>Email:</strong> ${item.contact_email}<br>` : ''}
                ${item.contact_phone ? `<strong>Phone:</strong> ${item.contact_phone}` : ''}
            </div>
        </div>
    `;
    openModal(item.title, body);
}

// Init
document.addEventListener('DOMContentLoaded', initApp);
