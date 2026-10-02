const menu=document.querySelector('.menu'),nav=document.querySelector('.site-header nav');menu.addEventListener('click',()=>nav.classList.toggle('open'));document.querySelectorAll('nav a').forEach(a=>a.addEventListener('click',()=>nav.classList.remove('open')));



const skiGallery=document.querySelector('.ski-gallery');

if(skiGallery){
  const originals=[...skiGallery.querySelectorAll('img')];
  const total=originals.length;

  if(total>1){
    // Repeat the full set before and after the originals so mobile swiping
    // feels continuous in either direction, without a visible end/reset.
    const before=document.createDocumentFragment();
    const after=document.createDocumentFragment();

    originals.forEach(img=>{
      const clone=img.cloneNode(true);
      clone.setAttribute('aria-hidden','true');
      before.appendChild(clone);
    });
    originals.forEach(img=>{
      const clone=img.cloneNode(true);
      clone.setAttribute('aria-hidden','true');
      after.appendChild(clone);
    });

    skiGallery.insertBefore(before,originals[0]);
    skiGallery.appendChild(after);

    const slides=[...skiGallery.querySelectorAll('img')];
    let recentering=false;
    let scrollTimer;

    const positionAt=(index)=>{
      const slide=slides[index];
      if(!slide) return;
      skiGallery.scrollLeft=slide.offsetLeft-skiGallery.offsetLeft;
    };

    const nearestIndex=()=>{
      const left=skiGallery.scrollLeft;
      let nearest=0;
      let best=Infinity;
      slides.forEach((slide,index)=>{
        const d=Math.abs((slide.offsetLeft-skiGallery.offsetLeft)-left);
        if(d<best){best=d;nearest=index;}
      });
      return nearest;
    };

    const recenter=()=>{
      if(recentering || !window.matchMedia('(max-width: 600px)').matches) return;
      const index=nearestIndex();

      // The middle copy is indices total..(2*total-1). Move to the
      // identical slide in that middle copy only after scrolling settles.
      let target=index;
      if(index<total) target=index+total;
      else if(index>=2*total) target=index-total;
      else return;

      recentering=true;
      requestAnimationFrame(()=>{
        positionAt(target);
        requestAnimationFrame(()=>{recentering=false;});
      });
    };

    skiGallery.addEventListener('scroll',()=>{
      if(recentering) return;
      clearTimeout(scrollTimer);
      scrollTimer=setTimeout(recenter,140);
    },{passive:true});

    const initialize=()=>{
      if(window.matchMedia('(max-width: 600px)').matches){
        positionAt(total);
      }
    };

    if(document.readyState==='complete') initialize();
    else window.addEventListener('load',initialize,{once:true});

    window.addEventListener('resize',()=>{
      if(window.matchMedia('(max-width: 600px)').matches){
        const index=nearestIndex();
        const logical=((index%total)+total)%total;
        positionAt(total+logical);
      }
    });
  }
}
