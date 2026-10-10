import {chromium} from '@playwright/test';
import {writeFile} from 'node:fs/promises';
const browser = await chromium.launch({channel:'chrome',headless:true});
try {
 const context = await browser.newContext(); const page = await context.newPage();
 await page.setContent('<select aria-label="State"><option value="open">Open</option><option value="archived">Archived</option></select>');
 const select=page.getByRole('combobox'); const results=[];
 for(const sequence of [['End','Enter'],['ArrowDown','Tab'],['Space','ArrowDown','Enter'],['ArrowDown','Enter']]){
  await select.selectOption('open');await select.focus();for(const key of sequence)await page.keyboard.press(key);
  results.push({sequence,value:await select.inputValue()});
 }
 await writeFile(new URL('./select-key-diagnostic.json',import.meta.url),JSON.stringify(results,null,2)+'\n');await context.close();
} finally {await browser.close();}
