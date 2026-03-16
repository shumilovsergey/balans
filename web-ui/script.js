const SCREENS = {
  info:     { title: 'Info',     showDate: false },
  scale:    { title: 'Weight',   showDate: false },
  main:     { title: 'Today',    showDate: true  },
  food:     { title: 'Calories', showDate: false },
  settings: { title: 'Settings', showDate: false },
};

const cache = {};

async function loadScreen(name) {
  if (!cache[name]) {
    const res = await fetch(`./${name}/${name}.html`);
    cache[name] = await res.text();
  }

  document.getElementById('screen').innerHTML = cache[name];

  // Update nav title + date visibility
  const cfg = SCREENS[name];
  document.querySelector('.nav-top-title').textContent = cfg.title;
  document.querySelector('.nav-top-date').style.display = cfg.showDate ? '' : 'none';

  // Swap screen CSS
  document.querySelectorAll('.screen-css').forEach(el => el.remove());
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = `./${name}/${name}.css`;
  link.className = 'screen-css';
  document.head.appendChild(link);

  // Swap screen JS
  document.querySelectorAll('.screen-js').forEach(el => el.remove());
  const script = document.createElement('script');
  script.src = `./${name}/${name}.js?v=${Date.now()}`;
  script.className = 'screen-js';
  document.body.appendChild(script);
}

function setTab(el, screenName) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  loadScreen(screenName);
}

// Boot: load main screen
loadScreen('main');
