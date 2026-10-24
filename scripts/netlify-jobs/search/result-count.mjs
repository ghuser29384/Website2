// Match visible count text, allowing React's non-visible separator comments.
export function resultCountDiagnostic(html, expected, candidate) {
 if(!['canonical','legacy'].includes(candidate))throw Error('Unknown candidate');
 const texts=[...html.matchAll(/<strong(?:\s[^>]*)?>([\s\S]*?)<\/strong>/g)].map(m=>m[1].replace(/<!--[\s\S]*?-->/g,'').replace(/<[^>]*>/g,'').trim());
 const wanted=expected.toLocaleString('en-US')+(candidate==='legacy'?' matching offer(s)':'');
 return {matches:texts.includes(wanted),expected,observedCounts:texts.filter(t=>/^[\d,]+(?: matching offer\(s\))?$/.test(t)).slice(0,8)};
}
