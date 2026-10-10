import {test,expect} from '../../../../scripts/integrations/web/fixtures.js';
import {writeFile} from 'node:fs/promises';
test('one bounded comparison DOM and viewport diagnostic', async ({page,forum}) => {
  let post = await forum.seedPost({title:'Short version one',summary:'First comparison summary',body:'第一版研究正文🧪',tags:['one'],structured:{sample:1}});
  post = await forum.revisePost(post,{title:'Short version two',summary:'Second comparison summary',body:'第二版研究正文🧪',tags:['two'],structured:{sample:2}});
  await page.goto(forum.baseURL); await forum.login(page);
  await page.getByRole('button',{name:`${forum.space.slug} 进入空间 →`,exact:true}).click();
  await page.getByRole('button',{name:`${forum.thread.title} 开放 · 查看帖子 →`,exact:true}).click();
  await page.locator('.post-directory li').filter({hasText:post.id}).getByRole('button',{name:'查看修订 2',exact:true}).click();
  await expect(page.getByRole('button',{name:'加载修订目录',exact:true})).toBeEnabled();
  await page.getByRole('button',{name:'加载修订目录',exact:true}).click();
  await page.getByRole('combobox',{name:'比较版本一',exact:true}).selectOption('1');
  await page.getByRole('combobox',{name:'比较版本二',exact:true}).selectOption('2');
  await page.getByRole('button',{name:'比较所选版本',exact:true}).click();
  const region=page.getByRole('region',{name:'五字段比较',exact:true});
  await expect(region).toContainText('五字段完整对比');
  await page.setViewportSize({width:390,height:844});
  const measurements=[];
  for(const [name,selector] of [['top','#comparison-heading'],['body','.field-comparison:nth-of-type(3)'],['structured','.field-comparison:nth-of-type(5)']] as const){
    // nth-of-type refers to field sections inside the comparison region only.
    const target=name==='top'?page.locator(selector):region.locator('.field-comparison').nth(name==='body'?2:4);
    await target.evaluate(element=>scrollTo(0,element.getBoundingClientRect().top+scrollY-20));
    await page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))));
    const geometry=await region.evaluate(element=>{
      const rect=(node:Element)=>{const r=node.getBoundingClientRect();return {top:r.top,bottom:r.bottom,left:r.left,right:r.right,width:r.width,height:r.height,document_top:r.top+scrollY};};
      return {heading_count:document.querySelectorAll('#comparison-heading').length,comparison_regions:document.querySelectorAll('[aria-labelledby="comparison-heading"]').length,field_count:element.querySelectorAll('.field-comparison').length,field_labels:[...element.querySelectorAll('h5')].map(node=>node.textContent),heading:rect(document.querySelector('#comparison-heading')!),fields:[...element.querySelectorAll('.field-comparison')].map(rect),scrollHeight:document.documentElement.scrollHeight,scrollY,scrollWidth:document.documentElement.scrollWidth,innerWidth,innerHeight};
    });
    expect(geometry.heading_count===1&&geometry.comparison_regions===1&&geometry.field_count===5&&geometry.scrollWidth<=geometry.innerWidth).toBe(true);
    expect(geometry.fields.every((rect,index)=>index===0||rect.top>=geometry.fields[index-1]!.bottom)).toBe(true);
    measurements.push({viewport:name,...geometry});
    await page.screenshot({path:forum.evidencePath(`screenshots/d2-comparison-diagnostic-${name}.png`)});
  }
  await writeFile(forum.evidencePath('comparison-dom-geometry.json'),JSON.stringify({purpose:'Root-approved one minimal DOM/viewport diagnostic; not another functional scenario or product change.',measurements},null,2));
});
