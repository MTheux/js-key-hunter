(async () => {
  const results = [];
  const seen = new Set();

  const crit = [/AKIA[0-9A-Z]{16}/, /sk_live_[0-9a-zA-Z]{24}/, /gh[pus]_?[0-9a-zA-Z]{36}/, /xox[baprs]-[0-9]{8,}-[0-9A-Za-z-]{18,}/, /[A-Za-z0-9_-]{40}==?/, /ey[A-Za-z0-9_]{10,}\.ey[A-Za-z0-9_]{10,}\.[A-Za-z0-9_-]{10,}/];
  const high = [/[A-Za-z0-9]{32,100}/, /[A-Za-z0-9_-]{35,80}/, /["'][A-Za-z0-9+\/]{40,}={0,2}["']/];

  const scan = (txt, url) => {
    [...txt.matchAll(/([A-Za-z0-9_-]{25,100}|[A-Za-z0-9+\/]{35,}={0,2})/g)].forEach(m => {
      const v = m[0].trim();
      if (v.length < 25 || seen.has(v)) return;
      seen.add(v);

      let risk = "MEDIUM";
      if (crit.some(r => r.test(v))) risk = "CRITICAL";
      else if (high.some(r => r.test(v))) risk = "HIGH";

      results.push({
        url: url,
        key: v.slice(0,16) + '...' + v.slice(-10),
        full_key: v,           // chave completa (clica na tabela e vê)
        risk: risk
      });
    });
  };

  // 1. Scripts já carregados
  for (const s of document.querySelectorAll('script[src]')) {
    const url = s.src;
    if (!url.startsWith(location.origin)) continue;
    try { scan(await fetch(url).then(r => r.text()), url); } catch {}
  }

  // 2. Descobre todos os JS escondidos
  const html = await fetch(location.href).then(r => r.text());
  for (const m of html.matchAll(/["'](\/[^"']*\.js[^"']*)["']/gi)) {
    const url = new URL(m[1], location.origin).href;
    if (!url.startsWith(location.origin) || seen.has(url)) continue;
    seen.add(url);
    try { scan(await fetch(url, {credentials:'include'}).then(r => r.ok ? r.text() : ''), url); } catch {}
  }

  // Resultado final com URL completa
  const final = results.sort((a,b) => 'CRITICAL,HIGH,MEDIUM'.indexOf(a.risk) - 'CRITICAL,HIGH,MEDIUM'.indexOf(b.risk));
  console.table(final);
  console.log(`%cACHADAS: ${final.length} chaves • ${final.filter(x=>x.risk==='CRITICAL').length} CRITICAL`, 'color:red;font-size:20px;font-weight:bold');
})();
