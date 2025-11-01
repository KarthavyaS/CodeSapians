// theme.js
const THEME_KEY = 'dv_theme_v1';

// apply saved theme
function applySavedTheme(){
  const t = localStorage.getItem(THEME_KEY) || 'light';
  if(t === 'dark') document.body.classList.add('dark');
  else document.body.classList.remove('dark');

  document.querySelectorAll('.theme-switch').forEach(cb => cb.checked = (t === 'dark'));
}
applySavedTheme();

// keep switches in sync and update
document.addEventListener('change', (e) => {
  if(e.target.matches('.theme-switch')){
    const isDark = e.target.checked;
    document.body.classList.toggle('dark', isDark);
    localStorage.setItem(THEME_KEY, isDark ? 'dark' : 'light');

    // sync others
    document.querySelectorAll('.theme-switch').forEach(cb => { if(cb !== e.target) cb.checked = isDark; });
  }
});
