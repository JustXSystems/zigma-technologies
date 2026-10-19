const res = await fetch('https://zigma-technologies.com/', {
  headers: { 'cache-control': 'no-cache', pragma: 'no-cache' },
});
const html = await res.text();
const m = html.match(/"hasMap"\s*:\s*"([^"]+)"/);
console.log(
  JSON.stringify(
    {
      status: res.status,
      hasMap: !!m,
      hasMapValue: m ? m[1] : null,
      sameAs: html.includes('sameAs'),
      LocalBusiness: html.includes('LocalBusiness'),
    },
    null,
    2
  )
);
