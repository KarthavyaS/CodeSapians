// auth.js
document.addEventListener('DOMContentLoaded', () => {
  const loginPanel = document.getElementById('login-panel');
  const signupPanel = document.getElementById('signup-panel');
  const showSignup = document.getElementById('show-signup');
  const showLogin = document.getElementById('show-login');

  const loginBtn = document.getElementById('login-btn');
  const signupBtn = document.getElementById('signup-btn');

  // email inputs & hints
  function createHintElement(afterNode, id){
    let el = document.createElement('div'); el.className='hint muted'; el.id = id;
    afterNode.parentNode.insertBefore(el, afterNode.nextSibling);
    return el;
  }

  const loginEmail = document.getElementById('login-email');
  const signupEmail = document.getElementById('signup-email');

  const loginHint = createHintElement(loginEmail, 'login-hint');
  const signupHint = createHintElement(signupEmail, 'signup-hint');

  // email validator: (example-youremail@gmail.com)
  const emailRegex = /^[A-Za-z][A-Za-z0-9._%+-]*@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

  function validateEmailField(inputEl, hintEl, btnToControl){
    const v = inputEl.value.trim();
    if(!v){ hintEl.textContent = 'Example: alice@example.com'; hintEl.className='hint muted'; if(btnToControl) btnToControl.disabled=false; return true; }
    if(!emailRegex.test(v)){
      hintEl.textContent = 'Invalid email — must start with a letter and contain @ and a domain (e.g. alice@mail.com)';
      hintEl.className='hint err';
      if(btnToControl) btnToControl.disabled = true;
      return false;
    } else {
      hintEl.textContent = 'Looks good';
      hintEl.className='hint ok';
      if(btnToControl) btnToControl.disabled = false;
      return true;
    }
  }

  loginEmail.addEventListener('input', ()=> validateEmailField(loginEmail, loginHint, loginBtn));
  signupEmail.addEventListener('input', ()=> validateEmailField(signupEmail, signupHint, signupBtn));

  showSignup.addEventListener('click', () => {
    loginPanel.classList.add('hidden');
    signupPanel.classList.remove('hidden');
  });
  showLogin.addEventListener('click', () => {
    signupPanel.classList.add('hidden');
    loginPanel.classList.remove('hidden');
  });

  document.getElementById('signup-btn').addEventListener('click', async () => {
    const name = document.getElementById('signup-name').value.trim();
    const email = signupEmail.value.trim().toLowerCase();
    const password = document.getElementById('signup-password').value;

    if(!email || !password) return alert('Enter email and password');
    if(!emailRegex.test(email)) return alert('Email not valid');
    if(password.length < 6) return alert('Use at least 6 characters');

    const users = loadUsersLocal();
    if(users[email]) return alert('Account already exists');

    const hashed = await hashPassword(password);
    const userObj = { name, email, passwordHash: hashed };
    await backend.registerLocal(userObj);
    saveSession(email);
    window.location.href = 'dashboard.html';
  });

  document.getElementById('login-btn').addEventListener('click', async () => {
    const email = loginEmail.value.trim().toLowerCase();
    const password = document.getElementById('login-password').value;
    if(!email || !password) return alert('Enter credentials');
    if(!emailRegex.test(email)) return alert('Enter a valid email');

    const users = loadUsersLocal();
    const user = users[email];
    if(!user) return alert('No account found');

    const hashed = await hashPassword(password);
    if(hashed !== user.passwordHash) return alert('Invalid password');

    saveSession(email);
    window.location.href = 'dashboard.html';
  });

  // if already signed in, go to dashboard
  if(getSession()){
    window.location.href = 'dashboard.html';
  }
});
