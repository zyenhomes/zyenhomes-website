const menu=document.querySelector('.menu'),nav=document.querySelector('.site-header nav');menu.addEventListener('click',()=>nav.classList.toggle('open'));document.querySelectorAll('nav a').forEach(a=>a.addEventListener('click',()=>nav.classList.remove('open')));


const skiGallery=document.querySelector('.ski-gallery');

if(skiGallery){
  const originalSlides=[...skiGallery.querySelectorAll('img')];
  const total=originalSlides.length;

  if(total>1){
    const firstClone=originalSlides[0].cloneNode(true);
    const lastClone=originalSlides[total-1].cloneNode(true);
    firstClone.setAttribute('aria-hidden','true');
    lastClone.setAttribute('aria-hidden','true');
    skiGallery.insertBefore(lastClone,originalSlides[0]);
    skiGallery.appendChild(firstClone);

    const slides=[...skiGallery.querySelectorAll('img')];
    let current=1;
    let jumping=false;

    const goTo=(index,behavior='auto')=>{
      skiGallery.scrollTo({
        left:slides[index].offsetLeft-skiGallery.offsetLeft,
        behavior
      });
    };

    const settle=()=>{
      if(jumping) return;
      const left=skiGallery.scrollLeft;
      let nearest=0;
      let distance=Infinity;

      slides.forEach((slide,index)=>{
        const d=Math.abs((slide.offsetLeft-skiGallery.offsetLeft)-left);
        if(d<distance){
          distance=d;
          nearest=index;
        }
      });

      current=nearest;

      if(current===0 || current===total+1){
        jumping=true;
        const target=current===0 ? total : 1;
        requestAnimationFrame(()=>{
          goTo(target,'auto');
          current=target;
          requestAnimationFrame(()=>{jumping=false;});
        });
      }
    };

    let timer;
    skiGallery.addEventListener('scroll',()=>{
      clearTimeout(timer);
      timer=setTimeout(settle,80);
    },{passive:true});

    const initialize=()=>{
      if(window.matchMedia('(max-width: 600px)').matches){
        goTo(1,'auto');
        current=1;
      }
    };

    if(document.readyState==='complete'){
      initialize();
    } else {
      window.addEventListener('load',initialize,{once:true});
    }

    window.addEventListener('resize',()=>{
      if(window.matchMedia('(max-width: 600px)').matches){
        goTo(current,'auto');
      }
    });
  }
}
