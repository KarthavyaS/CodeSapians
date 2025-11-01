// dashboard.js (updated: counts, lock icons, folder notes, file rename)
document.addEventListener('DOMContentLoaded', async () => {
  const email = getSession();
  if(!email) { window.location.href = 'index.html'; return; }

  // elements
  const userEmailEl = document.getElementById('user-email');
  const foldersList = document.getElementById('folders-list');
  const grid = document.getElementById('grid');
  const folderTitle = document.getElementById('folder-title');
  const countPill = document.getElementById('count-pill');
  const searchInput = document.getElementById('search');
  const notesPanel = document.getElementById('notes-panel');
  const notesText = document.getElementById('notes-text');
  const notesItemInfo = document.getElementById('notes-item-info');
  const modalRoot = document.getElementById('modal-root');
  const username = localStorage.getItem("enteredName") || "User";
    document.getElementById("enteredName").textContent = username;


  // topbar lock indicator (we add it dynamically to avoid editing HTML)
  let folderLockIndicator = document.getElementById('folder-lock-indicator');
  if(!folderLockIndicator){
    folderLockIndicator = document.createElement('span');
    folderLockIndicator.id = 'folder-lock-indicator';
    document.querySelector('.topbar .left').appendChild(folderLockIndicator);
  }

  userEmailEl.textContent = email;

  // load data
  let data = await backend.loadDataLocal(email);
  let currentFolderId = 'root';
  let selectedItem = null;

  // helpers
  function save(){ backend.saveDataLocal(email, data); }
  function findFolder(id){ return data.folders.find(f=>f.id===id) }
  function findFile(id){ return data.files.find(f=>f.id===id) }

  // compute counts per folder and store temporarily
  function computeFolderCounts(){
    const counts = {};
    data.folders.forEach(f=> counts[f.id]=0);
    data.files.forEach(fi=>{
      if(fi.deleted) return;
      const fid = fi.folderId || 'root';
      counts[fid] = (counts[fid]||0) + 1;
    });
    return counts;
  }

  // render folders with lock icon, count, notes button
  function renderFolders(){
    foldersList.innerHTML = '';
    const counts = computeFolderCounts();
    data.folders.forEach(f => {
      const el = document.createElement('div');
      el.className = 'folder-item' + (f.id === currentFolderId ? ' active' : '');
      el.innerHTML = `
        <div class="folder-left">
          <div style="width:36px;height:36px;border-radius:8px;background:linear-gradient(135deg, rgba(95,176,255,0.06), rgba(102,227,182,0.03));display:grid;place-items:center;font-weight:600">${f.name[0] || 'F'}</div>
          <div style="min-width:0">
            <div class="folder-name">${escapeHtml(f.name)}</div>
            <div class="folder-count">${counts[f.id] || 0} items</div>
          </div>
        </div>
        <div style="display:flex;gap:8px;align-items:center">
          <button class="icon-btn folder-notes" title="Notes">📝</button>
          <button class="folder-lock-btn" title="${f.important?'Locked':'Protect'}">${f.important ? '🔒' : '🔓'}</button>
        </div>
      `;
      // click to switch
      el.addEventListener('click', (e)=>{
        if(e.target.closest('.folder-notes') || e.target.closest('.folder-lock-btn')) return;
        currentFolderId = f.id;
        renderFolders(); renderGrid();
      });
      // notes
      el.querySelector('.folder-notes').addEventListener('click', (ev)=>{ ev.stopPropagation(); openNotesForFolder(f); });
      // lock toggle
      el.querySelector('.folder-lock-btn').addEventListener('click', (ev)=>{ ev.stopPropagation(); toggleProtectFolder(f); });

      foldersList.appendChild(el);
    });

    // when a folder is active, update topbar count for it too (already handled in renderGrid)
  }

  // render grid of files with rename
  function renderGrid(filter=''){
    grid.innerHTML = '';
    const files = data.files.filter(fi => !fi.deleted && (currentFolderId === 'root' ? true : fi.folderId === currentFolderId))
                .filter(fi => fi.name.toLowerCase().includes(filter.toLowerCase()) || (fi.notes||'').toLowerCase().includes(filter.toLowerCase()));
    folderTitle.textContent = findFolder(currentFolderId)?.name || 'All Documents';
    countPill.textContent = `${files.length} items`;
    // folder lock indicator
    const currentFolder = findFolder(currentFolderId);
    if(currentFolder && currentFolder.important){
      folderLockIndicator.textContent = '🔒';
      folderLockIndicator.title = 'Folder protected';
    } else {
      folderLockIndicator.textContent = '';
      folderLockIndicator.title = '';
    }

    files.forEach(f => {
      const card = document.createElement('div');
      card.className = 'card';
      card.innerHTML = `
        <div class="thumb">${iconForType(f.type)}</div>
        <div style="margin-top:10px">
          <div class="file-name"><strong class="fname">${escapeHtml(f.name)}</strong></div>
        </div>
        <div class="meta">
          <div class="small">${prettySize(f.size)} • ${new Date(f.createdAt).toLocaleDateString()}</div>
          <div style="display:flex;gap:8px">
            <button class="icon-btn open" title="Open">🔍</button>
            <button class="icon-btn notes" title="Notes">📝</button>
            <button class="icon-btn lock" title="Protect">${f.important ? '🔒' : '🔓'}</button>
            <button class="icon-btn rename" title="Rename">✎</button>
            <button class="icon-btn trash" title="Trash">🗑</button>
          </div>
        </div>`;
      // actions
      card.querySelector('.open').addEventListener('click', ()=> openFile(f));
      card.querySelector('.notes').addEventListener('click', ()=> openNotesFor(f));
      card.querySelector('.lock').addEventListener('click', ()=> toggleProtectFile(f));
      card.querySelector('.trash').addEventListener('click', ()=> moveToTrash(f));
      card.querySelector('.rename').addEventListener('click', ()=> renameFileInline(f, card));
      grid.appendChild(card);
    });
  }

  // rename file inline
  function renameFileInline(file, cardEl){
    const fnameEl = cardEl.querySelector('.fname');
    const current = file.name;
    const input = document.createElement('input');
    input.className = 'rename-input';
    input.value = current;
    fnameEl.replaceWith(input);
    input.focus();
    // save on enter or blur
    function saveName(){
      const v = input.value.trim();
      if(!v) { alert('Name cannot be empty'); input.focus(); return; }
      file.name = v; save(); renderGrid();
    }
    input.addEventListener('keydown', (e)=>{
      if(e.key === 'Enter'){ saveName(); }
      if(e.key === 'Escape'){ renderGrid(); }
    });
    input.addEventListener('blur', ()=> saveName());
  }

  // search
  searchInput.addEventListener('input', (e)=> renderGrid(e.target.value));

  // new folder
  document.getElementById('new-folder').addEventListener('click', ()=> {
    showModal(`<h3>Create folder</h3>
               <input id="new-folder-name" placeholder="Folder name" style="width:100%;padding:10px;border-radius:8px;background:transparent;border:1px solid rgba(0,0,0,0.06)">
               <div class="row"><button id="cancel-create" class="btn ghost">Cancel</button><button id="confirm-create" class="btn primary">Create</button></div>`);
    document.getElementById('cancel-create').onclick = closeModal;
    document.getElementById('confirm-create').onclick = ()=>{
      const name = document.getElementById('new-folder-name').value.trim();
      if(!name) return alert('Enter folder name');
      const id = uid('fld');
      data.folders.push({ id, name, important:false, notes:'' });
      save();
      renderFolders();
      closeModal();
    };
  });

  // upload
  const uploadBtn = document.getElementById('upload-btn');
  const fabUpload = document.getElementById('new-file-floating');
  [uploadBtn, fabUpload].forEach(bt => bt.addEventListener('click', ()=> {
    const inp = document.createElement('input'); inp.type='file';
    inp.onchange = (e)=>{
      const file = e.target.files[0]; if(!file) return;
      const reader = new FileReader();
      reader.onload = ()=> {
        data.files.push({
          id: uid('f'),
          name: file.name,
          size: file.size,
          type: file.type || 'application/octet-stream',
          data: reader.result,
          folderId: currentFolderId === 'root' ? null : currentFolderId,
          notes: '',
          important: false,
          passwordHash: null,
          deleted:false,
          createdAt: Date.now()
        });
        save();
        renderGrid();
        renderFolders(); // update counts in sidebar
      };
      reader.readAsDataURL(file);
    };
    inp.click();
  }));

  // trash view
  document.getElementById('trash-btn').addEventListener('click', ()=> {
    currentFolderId = 'trash';
    folderTitle.textContent = 'Trash';
    const trashFiles = data.files.filter(f => f.deleted);
    grid.innerHTML = '';
    trashFiles.forEach(f=>{
      const d = document.createElement('div'); d.className='card';
      d.innerHTML = `<div><strong>${escapeHtml(f.name)}</strong></div><div style="margin-top:10px"><button class="btn primary restore">Restore</button><button class="btn ghost delete">Delete Permanently</button></div>`;
      d.querySelector('.restore').addEventListener('click', ()=>{ f.deleted=false; save(); renderGrid(); renderFolders(); });
      d.querySelector('.delete').addEventListener('click', ()=>{ if(confirm('Delete permanently?')){ data.files = data.files.filter(x=>x.id!==f.id); save(); renderGrid(); renderFolders(); }});
      grid.appendChild(d);
    });
  });

  // notes for folder
  function openNotesForFolder(folder){
    if(folder.important){
      askPassword(folder).then(ok => { if(ok) openNotes(folder); });
    } else openNotes(folder);
  }

  // rename folder -> small modal used earlier; kept same

  // toggle protect folder
  async function toggleProtectFolder(folder){
    if(folder.important){
      const ok = await askPassword(folder);
      if(!ok) return;
      if(confirm('Remove protection?')){ folder.important=false; folder.passwordHash=null; save(); renderFolders(); renderGrid(); }
    } else {
      showModal(`<h3>Protect folder</h3><input id="protect1" type="password" placeholder="Password" style="width:100%;padding:10px;border-radius:8px"><input id="protect2" type="password" placeholder="Confirm" style="width:100%;margin-top:8px;padding:10px;border-radius:8px"><div class="row"><button id="cancel-p" class="btn ghost">Cancel</button><button id="save-p" class="btn primary">Protect</button></div>`);
      document.getElementById('cancel-p').onclick = closeModal;
      document.getElementById('save-p').onclick = async ()=>{
        const a = document.getElementById('protect1').value;
        const b = document.getElementById('protect2').value;
        if(!a||!b) return alert('Enter both');
        if(a!==b) return alert('Passwords do not match');
        folder.important = true;
        folder.passwordHash = await hashPassword(a);
        save(); closeModal(); renderFolders(); renderGrid();
      };
    }
  }

  // toggle protect file
  async function toggleProtectFile(file){
    if(file.important){
      const ok = await askPassword(file);
      if(!ok) return;
      if(confirm('Remove protection?')){ file.important=false; file.passwordHash=null; save(); renderGrid(); }
    } else {
      showModal(`<h3>Protect file</h3><input id="p1" type="password" placeholder="Password" style="width:100%;padding:10px;border-radius:8px"><input id="p2" type="password" placeholder="Confirm password" style="width:100%;margin-top:8px;padding:10px;border-radius:8px"><div class="row"><button id="cancp" class="btn ghost">Cancel</button><button id="prot" class="btn primary">Protect</button></div>`);
      document.getElementById('cancp').onclick = closeModal;
      document.getElementById('prot').onclick = async ()=>{
        const a=document.getElementById('p1').value; const b=document.getElementById('p2').value;
        if(!a||!b) return alert('enter both'); if(a!==b) return alert('mismatch');
        file.important=true; file.passwordHash = await hashPassword(a); save(); closeModal(); renderGrid(); renderFolders();
      };
    }
  }

  // ask password modal
  function askPassword(item){
    return new Promise((res) => {
      showModal(`<h3>Protected</h3><p class="muted">Enter password to continue</p><input id="askpass" type="password" placeholder="password" style="width:100%;padding:10px;border-radius:8px"><div class="row"><button id="ask-cancel" class="btn ghost">Cancel</button><button id="ask-ok" class="btn primary">Open</button></div>`);
      document.getElementById('ask-cancel').onclick = ()=>{ closeModal(); res(false); };
      document.getElementById('ask-ok').onclick = async ()=> {
        const val = document.getElementById('askpass').value;
        if(!val) return alert('Enter password');
        const h = await hashPassword(val);
        if(h === item.passwordHash){ closeModal(); res(true); } else { alert('Wrong password'); }
      };
    });
  }

  // open file (with check)
  async function openFile(file){
    if(file.important){
      const ok = await askPassword(file);
      if(!ok) return;
    }
    const isImage = file.type.startsWith('image/');
    const viewer = isImage ? `<img src="${file.data}" style="max-width:100%;border-radius:8px">` : `<div style="padding:12px;border-radius:8px;background:rgba(0,0,0,0.03)">Preview not available</div>`;
    showModal(`<h3>${escapeHtml(file.name)}</h3>${viewer}<div class="row"><button id="closev" class="btn ghost">Close</button><a id="download" class="btn primary" download="${escapeHtml(file.name)}">Download</a></div>`);
    document.getElementById('closev').onclick = closeModal;
    document.getElementById('download').href = file.data;
  }

  // notes (works for file or folder)
  function openNotesFor(item){
    if(item.important){
      askPassword(item).then(ok => { if(ok) openNotes(item); });
    } else openNotes(item);
  }
  function openNotes(item){
    selectedItem = item;
    notesPanel.classList.add('open');
    notesText.value = item.notes || '';
    notesItemInfo.textContent = `${item.name || item.id}`;
  }
  document.getElementById('close-notes').addEventListener('click', ()=> { notesPanel.classList.remove('open'); selectedItem=null; });
  document.getElementById('save-notes').addEventListener('click', ()=> {
    if(!selectedItem) return;
    selectedItem.notes = notesText.value;
    save(); renderGrid(); renderFolders();
    notesPanel.classList.remove('open');
  });
  document.getElementById('delete-notes').addEventListener('click', ()=> {
    if(!selectedItem) return;
    if(confirm('Delete notes?')){ selectedItem.notes=''; save(); notesText.value=''; renderGrid(); renderFolders(); }
  });

  // move to trash
  function moveToTrash(file){ if(confirm('Move to trash?')){ file.deleted = true; save(); renderGrid(); renderFolders(); } }

  // modal helpers
  function showModal(html){
    modalRoot.classList.add('open');
    modalRoot.innerHTML = `<div class="modal">${html}</div>`;
    modalRoot.addEventListener('click', (e)=>{ if(e.target === modalRoot){ closeModal(); } }, { once: true });
  }
  function closeModal(){ modalRoot.classList.remove('open'); modalRoot.innerHTML=''; }

  // misc & init
  function escapeHtml(s=''){ return String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;'); }
  function prettySize(n){ if(!n) return '0 B'; if(n<1024) return n+' B'; if(n<1024*1024) return (n/1024).toFixed(1)+' KB'; return (n/1024/1024).toFixed(2)+' MB'; }
  function iconForType(t){ if(!t) return '📁'; if(t.startsWith('image/')) return '🖼'; if(t.includes('pdf')) return '📄'; if(t.includes('sheet')||t.includes('excel')) return '📊'; return '📎'; }

  // sidebar collapse
  document.getElementById('collapse-sidebar').addEventListener('click', ()=>{
    document.querySelector('.sidebar').classList.toggle('hidden');
  });

  // logout
  document.getElementById('logout').addEventListener('click', ()=>{ clearSession(); window.location.href = 'index.html'; });

  // initial render
  renderFolders();
  renderGrid();
});
