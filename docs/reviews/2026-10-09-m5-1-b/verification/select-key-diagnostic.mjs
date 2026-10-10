import {chromium} from '@playwright/test';
import {writeFile} from 'node:fs/promises';
const browser = await chromium.launch({channel:'chrome',headless:true});
try {
 const context = await browser.newContext(); const page = await context.newPage();
 await page.setContent('<select aria-label="State"><option value="open">Open</option><option value="archived">Archived</option></select>');
 const select = page.getByRole('combobox');
 await select.evaluate(element => {window.fixtureKeys=[];element.addEventListener('keydown',event=>window.fixtureKeys.push({key:event.key,trusted:event.isTrusted,targetIsSelect:event.target===element}));});
 await select.focus();const focused=await select.evaluate(element=>document.activeElement===element);
 await page.keyboard.press('ArrowDown');await page.keyboard.press('Enter');
 const receipt={browser_version:browser.version(),platform:process.platform,headless:true,focused_before_keys:focused,keydown:await page.evaluate(()=>window.fixtureKeys),value:await select.inputValue()};
 await writeFile(new URL('./select-key-diagnostic.json',import.meta.url),JSON.stringify(receipt,null,2)+'\n');await context.close();
} finally {await browser.close();}
