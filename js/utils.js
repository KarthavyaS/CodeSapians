/* utils.js
   - LocalStorage helpers + hash function
   - Abstracted functions to make swapping to a backend simple later.
*/

async function hashPassword(pw) {
  if (!pw) return null;
  const enc = new TextEncoder();
  const hashBuf = await crypto.subtle.digest("SHA-256", enc.encode(pw));
  return Array.from(new Uint8Array(hashBuf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

// Session & user storage (local)
const USERS_KEY = 'dv_users_v1';
const SESSION_KEY = 'dv_session_v1';

function loadUsersLocal(){
  return JSON.parse(localStorage.getItem(USERS_KEY) || '{}');
}
function saveUsersLocal(obj){
  localStorage.setItem(USERS_KEY, JSON.stringify(obj));
}
function saveSession(email){
  localStorage.setItem(SESSION_KEY, email);
}
function getSession(){
  return localStorage.getItem(SESSION_KEY);
}
function clearSession(){
  localStorage.removeItem(SESSION_KEY);
}

// Data per-user 
function dataKey(email){ return `dv_data_${email}_v1` }
function loadUserDataLocal(email){
  return JSON.parse(localStorage.getItem(dataKey(email)) || JSON.stringify({
    folders:[
      { id: 'root', name: 'All Documents', default: true },
      { id: 'personal', name: 'Personal' },
      { id: 'work', name: 'Work' }
    ],
    files: []
  }));
}
function saveUserDataLocal(email, data){
  localStorage.setItem(dataKey(email), JSON.stringify(data));
}

// Abstraction for future backend
/* Replace these with fetch calls to your API when backend exists:
*/
const backend = {
  // auth
  async registerLocal(userObj){
    const users = loadUsersLocal();
    users[userObj.email] = userObj;
    saveUsersLocal(users);
    // create starter data for user
    saveUserDataLocal(userObj.email, {
      folders:[
        { id: 'root', name: 'All Documents', default: true },
        { id: 'personal', name: 'Personal' },
        { id: 'work', name: 'Work' }
      ],
      files: []
    });
    return true;
  },
  async loginLocal(email){
    const users = loadUsersLocal();
    return users[email] || null;
  },
  // data
  async loadDataLocal(email){
    return loadUserDataLocal(email);
  },
  async saveDataLocal(email, data){
    saveUserDataLocal(email, data);
  }
};

// tiny uid
function uid(prefix='id'){ return `${prefix}_${Math.random().toString(36).slice(2,9)}` }
