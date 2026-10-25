// One DOM text rule for the editor and the geometry verifier, including mixed markup.
export function textRuns(root=document.querySelector('.slide.active')){const result=[];const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);let node;while((node=walker.nextNode())){if(node.textContent.trim()&&!node.parentElement.closest('style,script,svg'))result.push(node);}return result;}
