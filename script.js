const menu=document.querySelector('.menu'),nav=document.querySelector('.site-header nav');
if(menu && nav){
  menu.addEventListener('click',()=>nav.classList.toggle('open'));
  document.querySelectorAll('nav a').forEach(a=>a.addEventListener('click',()=>nav.classList.remove('open')));
}



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


// Send the custom Zyen Homes search form to Guesty's live property results.
const bookingSearch=document.querySelector('#booking-search');
if(bookingSearch){
  const checkin=bookingSearch.querySelector('#booking-checkin');
  const checkout=bookingSearch.querySelector('#booking-checkout');
  const guests=bookingSearch.querySelector('#booking-guests');

  const today=new Date();
  const localToday=new Date(today.getTime()-today.getTimezoneOffset()*60000).toISOString().slice(0,10);
  checkin.min=localToday;

  checkin.addEventListener('change',()=>{
    checkout.min=checkin.value;
    if(checkout.value && checkout.value<=checkin.value) checkout.value='';
  });

  bookingSearch.addEventListener('submit',(event)=>{
    event.preventDefault();
    if(!checkin.value || !checkout.value || checkout.value<=checkin.value){
      checkout.focus();
      return;
    }
    const adults=Math.max(1,parseInt(guests.value,10)||1);
    const params=new URLSearchParams({
      minOccupancy:String(adults),
      checkIn:checkin.value,
      checkOut:checkout.value,
      adults:String(adults)
    });
    window.location.href='https://zyenhomes.guestybookings.com/en/properties?'+params.toString();
  });
}


// Email signup popup. Mailchimp connection will be added separately.
const emailPopup=document.querySelector('#email-popup');
const emailPopupForm=document.querySelector('#email-popup-form');
if(emailPopup && emailPopupForm){
  const closeButton=emailPopup.querySelector('.email-popup-close');
  const status=emailPopup.querySelector('.email-popup-status');
  const storageKey='zyenEmailPopupDismissedAt';
  const subscribedKey='zyenEmailPopupSubscribed';
  const cooldown=14*24*60*60*1000;
  let shown=false;

  const recentlyDismissed=()=>{
    const dismissed=Number(localStorage.getItem(storageKey)||0);
    return dismissed && (Date.now()-dismissed)<cooldown;
  };
  const eligible=()=>!shown && !localStorage.getItem(subscribedKey) && !recentlyDismissed();
  const openPopup=()=>{
    if(!eligible()) return;
    shown=true;
    emailPopup.classList.add('is-open');
    emailPopup.setAttribute('aria-hidden','false');
  };
  const closePopup=()=>{
    emailPopup.classList.remove('is-open');
    emailPopup.setAttribute('aria-hidden','true');
    localStorage.setItem(storageKey,String(Date.now()));
  };

  const timer=setTimeout(openPopup,20000);
  const onScroll=()=>{
    const doc=document.documentElement;
    const scrollable=doc.scrollHeight-window.innerHeight;
    if(scrollable>0 && window.scrollY/scrollable>=0.35){
      clearTimeout(timer);
      openPopup();
      window.removeEventListener('scroll',onScroll);
    }
  };
  window.addEventListener('scroll',onScroll,{passive:true});
  closeButton.addEventListener('click',closePopup);
  emailPopup.addEventListener('click',(e)=>{if(e.target===emailPopup) closePopup();});
  document.addEventListener('keydown',(e)=>{if(e.key==='Escape' && emailPopup.classList.contains('is-open')) closePopup();});

  emailPopupForm.addEventListener('submit',(e)=>{
    e.preventDefault();
    status.textContent='Thanks! Mailing-list signup will be activated when we connect Mailchimp.';
  });
}


// Ski House manual previous/next controls.
const skiPrev=document.querySelector('.ski-arrow-left');
const skiNext=document.querySelector('.ski-arrow-right');
const skiArrowGallery=document.querySelector('.ski-gallery');
if(skiArrowGallery && skiPrev && skiNext){
  const moveSkiGallery=(direction)=>{
    const first=skiArrowGallery.querySelector('img');
    if(!first) return;
    const gap=parseFloat(getComputedStyle(skiArrowGallery).gap)||10;
    const amount=first.getBoundingClientRect().width+gap;
    skiArrowGallery.scrollBy({left:direction*amount,behavior:'smooth'});
  };
  skiPrev.addEventListener('click',()=>moveSkiGallery(-1));
  skiNext.addEventListener('click',()=>moveSkiGallery(1));
}


// Property owner inquiry popup.
const ownerPopup=document.querySelector('#owner-popup');
const ownerTrigger=document.querySelector('.owner-inquiry-trigger');
const ownerForm=document.querySelector('#owner-popup-form');
if(ownerPopup && ownerTrigger && ownerForm){
  const ownerClose=ownerPopup.querySelector('.owner-popup-close');
  const ownerStatus=ownerPopup.querySelector('.owner-popup-status');
  const openOwnerPopup=()=>{
    ownerPopup.classList.add('is-open');
    ownerPopup.setAttribute('aria-hidden','false');
    setTimeout(()=>ownerPopup.querySelector('#owner-name')?.focus(),100);
  };
  const closeOwnerPopup=()=>{
    ownerPopup.classList.remove('is-open');
    ownerPopup.setAttribute('aria-hidden','true');
  };
  ownerTrigger.addEventListener('click',openOwnerPopup);
  ownerClose.addEventListener('click',closeOwnerPopup);
  ownerPopup.addEventListener('click',(e)=>{if(e.target===ownerPopup) closeOwnerPopup();});
  document.addEventListener('keydown',(e)=>{if(e.key==='Escape' && ownerPopup.classList.contains('is-open')) closeOwnerPopup();});
  ownerForm.addEventListener('submit',(e)=>{
    e.preventDefault();
    ownerStatus.textContent='Thank you. Your property details are ready to be submitted once we connect the inquiry form.';
  });
}


// Custom group stay request
const customStayForm=document.querySelector('#custom-stay-form');
if(customStayForm){
  const ci=customStayForm.querySelector('#custom-checkin');
  const co=customStayForm.querySelector('#custom-checkout');
  const now=new Date();
  const localToday=new Date(now.getTime()-now.getTimezoneOffset()*60000).toISOString().slice(0,10);
  ci.min=localToday;
  ci.addEventListener('change',()=>{
    co.min=ci.value || localToday;
    if(co.value && ci.value && co.value<=ci.value) co.value='';
  });
  customStayForm.addEventListener('submit',(event)=>{
    event.preventDefault();
    if(!customStayForm.reportValidity()) return;
    const data=new FormData(customStayForm);
    const subject='Custom Group Stay Request - '+data.get('guests')+' Guests';
    const body=[
      'CUSTOM GROUP STAY REQUEST',
      '',
      'Name: '+data.get('name'),
      'Email: '+data.get('email'),
      'Phone: '+(data.get('phone')||'Not provided'),
      '',
      'Check-in: '+data.get('checkin'),
      'Check-out: '+data.get('checkout'),
      'Guests: '+data.get('guests'),
      'Group type: '+data.get('group'),
      'Preferred area: '+data.get('area'),
      'Approx. budget: '+(data.get('budget')||'Not provided'),
      '',
      'Additional details:',
      data.get('notes')||'None provided'
    ].join('\n');
    window.location.href='mailto:info@zyenhomes.com?subject='+encodeURIComponent(subject)+'&body='+encodeURIComponent(body);
  });
}


// Contact page guest and property-owner inquiry forms
document.querySelectorAll('.contact-form-toggle').forEach((button)=>{
  button.addEventListener('click',()=>{
    const target=document.getElementById(button.dataset.target);
    document.querySelectorAll('.contact-inline-form').forEach((form)=>{ if(form!==target) form.hidden=true; });
    if(target){
      target.hidden=false;
      target.scrollIntoView({behavior:'smooth',block:'start'});
    }
  });
});
document.querySelectorAll('.contact-form-close').forEach((button)=>{
  button.addEventListener('click',()=>{
    const panel=button.closest('.contact-inline-form');
    if(panel) panel.hidden=true;
  });
});
document.querySelectorAll('.contact-request-form').forEach((form)=>{
  form.addEventListener('submit',async (event)=>{
    event.preventDefault();
    if(!form.reportValidity()) return;

    const button=form.querySelector('button[type="submit"]');
    const originalText=button ? button.textContent : '';
    const type=form.dataset.inquiry || 'Zyen Homes Inquiry';
    const data=new FormData(form);
    data.append('_subject',type);
    data.append('inquiryType',type);

    if(button){
      button.disabled=true;
      button.textContent='Sending...';
    }

    let status=form.querySelector('.form-submit-status');
    if(!status){
      status=document.createElement('p');
      status.className='form-submit-status';
      status.setAttribute('role','status');
      form.appendChild(status);
    }
    status.textContent='';

    try{
      const response=await fetch('https://formspree.io/f/xaeqykbv',{
        method:'POST',
        body:data,
        headers:{'Accept':'application/json'}
      });
      if(!response.ok) throw new Error('Submission failed');
      form.reset();
      status.textContent='Thank you. Your inquiry has been sent to Zyen Homes. We will be in touch shortly.';
      status.classList.add('success');
      status.classList.remove('error');
    }catch(error){
      status.textContent='We could not send your inquiry. Please try again or email info@zyenhomes.com.';
      status.classList.add('error');
      status.classList.remove('success');
    }finally{
      if(button){
        button.disabled=false;
        button.textContent=originalText;
      }
    }
  });
});


// Contact dropdown navigation
document.querySelectorAll('.nav-contact-toggle').forEach((button)=>{
  button.addEventListener('click',(event)=>{
    event.stopPropagation();
    const wrap=button.closest('.nav-contact');
    if(!wrap) return;
    const open=wrap.classList.toggle('is-open');
    button.setAttribute('aria-expanded',String(open));
  });
});
document.addEventListener('click',(event)=>{
  document.querySelectorAll('.nav-contact.is-open').forEach((wrap)=>{
    if(!wrap.contains(event.target)){
      wrap.classList.remove('is-open');
      wrap.querySelector('.nav-contact-toggle')?.setAttribute('aria-expanded','false');
    }
  });
});
