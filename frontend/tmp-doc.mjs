import { chromium } from 'playwright';
const OUT='/private/tmp/claude-501/-Users-liltris-Desktop-Project-WeSee/5c751a90-d4a4-41e5-bf25-4d9ad7dc27ef/scratchpad';
const b=await chromium.launch();
const p=await b.newPage({viewport:{width:1280,height:1000}});
const errs=[]; p.on('pageerror',e=>errs.push(String(e).slice(0,120)));
await p.goto('http://localhost:4210/');
await p.getByRole('button',{name:/^log in$/i}).or(p.getByRole('link',{name:/^log in$/i})).first().click();
await p.waitForSelector('input[type=email]',{timeout:20000});
await p.locator('input[type=email]').first().fill('demo@wesee.my');
await p.locator('input[type=password]').first().fill('Demo#2026');
await p.locator('button[type=submit]').first().click();
await p.waitForTimeout(4500);
await p.goto('http://localhost:4210/#/documents'); await p.waitForTimeout(3000);

const count = () => p.locator('[data-document]').count();
console.log('rows initially:', await count());
await p.screenshot({path:`${OUT}/doc-1-idle.png`});

// Search the transcription: an account number that appears in no filename.
const box=p.getByLabel(/Search documents by name or content/i);
await box.fill('220487');
await p.waitForTimeout(700);
console.log('rows for "220487":', await count());
const hint = await p.locator('p', {hasText:/^Matched/}).allInnerTexts();
console.log('match hint:', JSON.stringify(hint.slice(0,2)));
await p.screenshot({path:`${OUT}/doc-2-search.png`});

// A Malay line item.
await box.fill('puncak'); await p.waitForTimeout(700);
console.log('rows for "puncak":', await count());

// Nonsense clears to the empty state.
await box.fill('zzzznope'); await p.waitForTimeout(700);
console.log('rows for nonsense:', await count(), '| empty state:', await p.getByText(/Nothing matches these filters/).count());
await box.fill(''); await p.waitForTimeout(600);

// The funnel: open it, set a file type, check the badge.
await p.getByLabel('More filters').click(); await p.waitForTimeout(500);
await p.screenshot({path:`${OUT}/doc-3-panel.png`});
const typeSel = p.getByLabel('Filter by file type');
await typeSel.click(); await p.waitForTimeout(400);
console.log('file type options:', JSON.stringify(await p.getByRole('option').allInnerTexts()));
await p.getByRole('option',{name:'Image'}).click(); await p.waitForTimeout(700);
console.log('rows for Image only:', await count());
console.log('badge:', (await p.getByLabel('More filters').innerText()).trim());
await p.screenshot({path:`${OUT}/doc-4-filtered.png`});
console.log('errors:', errs.length?[...new Set(errs)].slice(0,2):'none');
await b.close();
