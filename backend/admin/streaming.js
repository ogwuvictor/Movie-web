(() => {
    const endpoint = '../api/streaming-availability.php';
    const form = document.getElementById('availabilityForm');
    const rows = document.getElementById('catalogRows');
    const message = document.getElementById('catalogMessage');
    const fields = { id: document.getElementById('catalogTmdbId'), title: document.getElementById('catalogTitle'), available: document.getElementById('catalogAvailable'), minutes: document.getElementById('catalogValidity'), confirmed: document.getElementById('catalogConfirmed') };
    const names = { vidlink: 'VidLink Pro', videasy: 'Videasy', vidfast: 'Vidfast', movies111: '111Movies' };
    let loadVersion = 0;
    const notify = (text, failed = false) => { message.textContent = text; message.className = `alert ${failed ? 'alert-danger' : 'alert-success'} mb-3`; };
    const date = value => Number.isFinite(Date.parse(value)) ? new Date(value).toLocaleString() : 'Unknown';
    async function request(options = {}) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);
        try {
            const response = await fetch(endpoint, { cache: 'no-store', ...options, signal: controller.signal });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Catalog request failed.');
            return data;
        } finally { clearTimeout(timeout); }
    }
    function mutation(method, body) {
        return request({ method, headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]').content }, body: JSON.stringify(body) });
    }
    async function load() {
        const version = ++loadVersion;
        try {
            const catalog = await request();
            if (version !== loadVersion) return;
            const serverTime = Number.isFinite(Date.parse(catalog.generatedAt)) ? Date.parse(catalog.generatedAt) : Date.now();
            rows.replaceChildren();
            for (const [id, record] of Object.entries(catalog.movies || {})) {
                const tr = document.createElement('tr');
                const expired = !Number.isFinite(Date.parse(record.expiresAt)) || Date.parse(record.expiresAt) <= serverTime;
                for (const text of [id, record.title || 'Untitled', expired ? 'Expired' : record.available ? 'Available' : 'Unavailable', (record.serverIds || []).map(server => names[server] || server).join(', '), date(record.checkedAt), date(record.expiresAt)]) {
                    const td = document.createElement('td'); td.textContent = text; tr.append(td);
                }
                const actions = document.createElement('td');
                const edit = document.createElement('button'); edit.type = 'button'; edit.className = 'btn btn-sm btn-outline-primary me-2'; edit.textContent = 'Edit'; edit.setAttribute('aria-label', `Edit ${record.title || id}`);
                edit.onclick = () => {
                    fields.id.value = id; fields.title.value = record.title || ''; fields.available.value = String(record.available === true); fields.minutes.value = '60'; fields.confirmed.checked = false;
                    document.querySelectorAll('[name="catalogServer"]').forEach(input => { input.checked = (record.serverIds || []).includes(input.value); });
                    fields.id.focus(); form.scrollIntoView({ block: 'start', behavior: 'smooth' });
                };
                const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'btn btn-sm btn-outline-danger'; remove.textContent = 'Remove'; remove.setAttribute('aria-label', `Remove ${record.title || id}`);
                remove.onclick = async () => {
                    if (!window.confirm(`Remove the availability record for ${record.title || id}?`)) return;
                    remove.disabled = true;
                    try { await mutation('DELETE', { tmdbId: id }); notify('Availability record removed.'); await load(); }
                    catch (error) { notify(error.message, true); remove.disabled = false; }
                };
                actions.append(edit, remove); tr.append(actions); rows.append(tr);
            }
            if (!rows.children.length) { const tr = rows.insertRow(); const td = tr.insertCell(); td.colSpan = 7; td.textContent = 'No availability records yet.'; }
        } catch (error) { if (version === loadVersion) { notify(error.message, true); rows.replaceChildren(); } }
    }
    form.addEventListener('submit', async event => {
        event.preventDefault();
        if (!form.reportValidity()) return;
        const save = document.getElementById('catalogSave'); save.disabled = true;
        try {
            await mutation('POST', { tmdbId: fields.id.value, title: fields.title.value, available: fields.available.value === 'true', validMinutes: Number(fields.minutes.value), confirmed: fields.confirmed.checked, serverIds: [...document.querySelectorAll('[name="catalogServer"]:checked')].map(input => input.value) });
            notify('Availability record saved.'); form.reset(); await load();
        } catch (error) { notify(error.message, true); }
        finally { save.disabled = false; }
    });
    document.getElementById('catalogRefresh').addEventListener('click', load);
    setInterval(() => { if (!document.hidden) load(); }, 60000);
    load();
})();
