export function assessBrief(brief){
 const questions=[];const ask=(field,question)=>questions.push({field,question});
 const text=x=>typeof x==='string'&&x.trim().length>0;
 if(!brief||typeof brief!=='object'||Array.isArray(brief))return {ready:false,questions:[{field:'brief',question:'Please provide your presentation brief.'}]};
 for(const [key,q] of Object.entries({title:'What is the presentation title?',purpose:'What should this presentation achieve?',audience:'Who is the presentation for?',density:'Should this be speaker-led or a reading deck?',style:'Which visual style should we use? This proof supports Paper & Ink.'}))if(!text(brief[key]))ask(key,q);
 if(text(brief.style)&&brief.style!=='Paper & Ink')ask('style','This proof currently supports Paper & Ink. Approve that style or wait for support for another style.');
 if(text(brief.density)&&!['speaker-led','reading'].includes(brief.density))ask('density','Choose speaker-led or reading.');
 if(brief.slideCount!==5)ask('slideCount','This proof supports five slides. Please confirm a five-slide presentation.');
 if(!Array.isArray(brief.slides)||brief.slides.length!==5)ask('slides','Please supply titles and facts for each of the five slides.');
 if(Array.isArray(brief.slides))brief.slides.forEach((slide,i)=>{if(!text(slide?.title))ask(`slides.${i}.title`,`What is the title of slide ${i+1}?`);if(!Array.isArray(slide?.facts)||!slide.facts.length||slide.facts.some(f=>!text(f)))ask(`slides.${i}.facts`,`What exact content should slide ${i+1} contain?`);});
 if(brief.requiredFiles!==undefined){if(!Array.isArray(brief.requiredFiles))ask('requiredFiles','List required source files, or remove this field if none are needed.');else for(const name of brief.requiredFiles)ask('requiredFiles',`Please paste the relevant content from ${String(name)} into the slide facts, then remove it from requiredFiles. File import is not supported in this proof.`);}
 return {ready:questions.length===0,questions};
}
