// Áp theme trước khi React chạy để không nháy màu.
try {
  var m = localStorage.getItem('umlab.theme');
  if (m === 'light' || m === 'dark') document.documentElement.setAttribute('data-theme', m);
  document.documentElement.classList.add('platform-' + (navigator.userAgent.indexOf('Mac') >= 0 ? 'mac' : 'win'));
} catch (e) {}
