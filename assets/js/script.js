/**
 * Premium Portfolio Redesign - Motion & Interaction Engine
 * Inspired by the design language of cinetica.studio
 * 
 * Features:
 * - Lenis Smooth momentum scrolling
 * - SplitType text reveal clip-masks
 * - Speed-stretched custom trailing cursor (composed via composite matrix)
 * - 3D Tech Stack Card Cylinder Carousel (drag-to-spin + scroll-linked physics)
 * - Magnetic anchors & Elastic transitions
 * - Interactive mouse parallax & 3D tilt effects
 */

// Register ScrollTrigger plugin
if (typeof gsap !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

// ── CUSTOM STRETCHED CURSOR ENGINE ──
const cursorRing = document.getElementById('cursor-ring');
const cursorDot = document.getElementById('cursor-dot-inner');
const cursorLabel = document.getElementById('cursor-label');

let mouseX = 0, mouseY = 0;       // Current pointer positions
let ringX = 0, ringY = 0;       // Trailing ring positions

// Track mouse location
document.addEventListener('mousemove', e => {
  mouseX = e.clientX;
  mouseY = e.clientY;
}, { passive: true });

function updateCursorDynamics() {
  if (!cursorRing || !cursorDot) return;

  // Lerp trailing coordinates for smooth tail
  const lerpCoeff = 0.15;
  ringX += (mouseX - ringX) * lerpCoeff;
  ringY += (mouseY - ringY) * lerpCoeff;

  // Calculate velocity vector of the trailing ring
  const vx = mouseX - ringX;
  const vy = mouseY - ringY;
  const speed = Math.min(Math.hypot(vx, vy), 120); // Cap velocity to prevent crazy distortion

  // Determine angle of velocity vector
  const angle = Math.atan2(vy, vx);

  // Velocity stretch scaling (stretch in vector direction, squash perpendicular)
  const scaleX = 1 + speed * 0.0075;
  const scaleY = 1 - speed * 0.0035;

  // Render cursor ring via GPU accelerated CSS properties
  cursorRing.style.setProperty('--cx', `${ringX}px`);
  cursorRing.style.setProperty('--cy', `${ringY}px`);
  cursorRing.style.setProperty('--rot', `${angle * 180 / Math.PI}deg`);
  cursorRing.style.setProperty('--sx', scaleX);
  cursorRing.style.setProperty('--sy', scaleY);

  // Render inner dot and label
  cursorDot.style.setProperty('--dx', `${mouseX}px`);
  cursorDot.style.setProperty('--dy', `${mouseY}px`);
  
  if (cursorLabel) {
    cursorLabel.style.setProperty('--dx', `${mouseX}px`);
    cursorLabel.style.setProperty('--dy', `${mouseY}px`);
  }

  requestAnimationFrame(updateCursorDynamics);
}
requestAnimationFrame(updateCursorDynamics);

// Bind custom hover states
function initCursorStates() {
  document.querySelectorAll('a, button, [data-magnetic], .tech-pill, #tech-carousel-container').forEach(el => {
    el.addEventListener('mouseenter', () => {
      if (el.hasAttribute('data-cursor-text') && cursorLabel) {
        document.body.classList.add('hover-card');
        cursorLabel.textContent = el.getAttribute('data-cursor-text');
      } else {
        document.body.classList.add('hover-link');
      }
    });

    el.addEventListener('mouseleave', () => {
      document.body.classList.remove('hover-link', 'hover-card');
    });
  });
}

// ── IMMERSIVE BACKGROUND CANVAS ──
const canvas = document.getElementById('bg-canvas');
const ctx = canvas ? canvas.getContext('2d') : null;
let bgCanvasWidth = window.innerWidth;
let bgCanvasHeight = window.innerHeight;

let meshMouse = { x: null, y: null, targetX: null, targetY: null, radius: 180 };
const backgroundParticles = [];

if (canvas && ctx) {
  canvas.width = bgCanvasWidth;
  canvas.height = bgCanvasHeight;

  window.addEventListener('mousemove', e => {
    meshMouse.targetX = e.clientX;
    meshMouse.targetY = e.clientY;
  }, { passive: true });

  window.addEventListener('mouseleave', () => {
    meshMouse.targetX = null;
    meshMouse.targetY = null;
  }, { passive: true });

  window.addEventListener('resize', () => {
    bgCanvasWidth = canvas.width = window.innerWidth;
    bgCanvasHeight = canvas.height = window.innerHeight;
    blobs[0].radius = Math.min(bgCanvasWidth, bgCanvasHeight) * 0.35;
    blobs[1].radius = Math.min(bgCanvasWidth, bgCanvasHeight) * 0.45;
    blobs[2].radius = Math.min(bgCanvasWidth, bgCanvasHeight) * 0.4;
  });
}

// Particles network background layer
class Particle {
  constructor() {
    this.reset();
  }
  reset() {
    this.x = Math.random() * bgCanvasWidth;
    this.y = Math.random() * bgCanvasHeight;
    this.vx = (Math.random() - 0.5) * 0.3;
    this.vy = (Math.random() - 0.5) * 0.3;
    this.size = Math.random() * 2 + 0.8;
    this.baseAlpha = Math.random() * 0.2 + 0.08;
    this.alpha = this.baseAlpha;
  }
  update() {
    this.x += this.vx;
    this.y += this.vy;
    if (this.x < 0 || this.x > bgCanvasWidth) this.vx *= -1;
    if (this.y < 0 || this.y > bgCanvasHeight) this.vy *= -1;

    // Mouse magnetic influence
    if (meshMouse.x && meshMouse.y) {
      const dx = meshMouse.x - this.x;
      const dy = meshMouse.y - this.y;
      const dist = Math.hypot(dx, dy);
      if (dist < meshMouse.radius) {
        const pull = (meshMouse.radius - dist) / meshMouse.radius;
        this.x += (dx / dist) * pull * 0.35;
        this.y += (dy / dist) * pull * 0.35;
        this.alpha = Math.min(0.55, this.baseAlpha + pull * 0.35);
      } else {
        this.alpha = this.baseAlpha;
      }
    } else {
      this.alpha = this.baseAlpha;
    }
  }
  draw() {
    if (!ctx) return;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(201, 79, 44, ${this.alpha})`;
    ctx.fill();
  }
}

// Background mesh colors
const blobs = [
  { x: bgCanvasWidth * 0.25, y: bgCanvasHeight * 0.35, radius: Math.min(bgCanvasWidth, bgCanvasHeight) * 0.35, color: 'rgba(201, 79, 44, 0.04)', vx: 0.1, vy: 0.08 },
  { x: bgCanvasWidth * 0.75, y: bgCanvasHeight * 0.55, radius: Math.min(bgCanvasWidth, bgCanvasHeight) * 0.45, color: 'rgba(74, 124, 89, 0.03)', vx: -0.08, vy: 0.12 },
  { x: bgCanvasWidth * 0.5, y: bgCanvasHeight * 0.8, radius: Math.min(bgCanvasWidth, bgCanvasHeight) * 0.4, color: 'rgba(201, 79, 44, 0.025)', vx: 0.06, vy: -0.1 }
];

function drawMeshBackground() {
  if (!ctx) return;
  blobs.forEach(blob => {
    blob.x += blob.vx;
    blob.y += blob.vy;

    if (blob.x - blob.radius < -150 || blob.x + blob.radius > bgCanvasWidth + 150) blob.vx *= -1;
    if (blob.y - blob.radius < -150 || blob.y + blob.radius > bgCanvasHeight + 150) blob.vy *= -1;

    const g = ctx.createRadialGradient(blob.x, blob.y, 0, blob.x, blob.y, blob.radius);
    g.addColorStop(0, blob.color);
    g.addColorStop(1, 'rgba(245, 242, 237, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(blob.x, blob.y, blob.radius, 0, Math.PI * 2);
    ctx.fill();
  });
}

function runBackgroundEngine() {
  if (!canvas || !ctx) return;
  ctx.fillStyle = '#f5f2ed';
  ctx.fillRect(0, 0, bgCanvasWidth, bgCanvasHeight);

  if (meshMouse.targetX !== null && meshMouse.targetY !== null) {
    if (meshMouse.x === null) {
      meshMouse.x = meshMouse.targetX;
      meshMouse.y = meshMouse.targetY;
    } else {
      meshMouse.x += (meshMouse.targetX - meshMouse.x) * 0.08;
      meshMouse.y += (meshMouse.targetY - meshMouse.y) * 0.08;
    }
  } else {
    meshMouse.x = null;
    meshMouse.y = null;
  }

  drawMeshBackground();

  backgroundParticles.forEach(p => {
    p.update();
    p.draw();
  });

  requestAnimationFrame(runBackgroundEngine);
}

function initMeshParticles() {
  if (!canvas) return;
  const pCount = Math.min(Math.floor((bgCanvasWidth * bgCanvasHeight) / 30000), 60);
  for (let i = 0; i < pCount; i++) {
    backgroundParticles.push(new Particle());
  }
}

// ── LENIS SMOOTH MOMENTUM SCROLL ──
let lenis;
function initSmoothScrolling() {
  if (typeof Lenis === 'undefined') return;
  lenis = new Lenis({
    duration: 1.2,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    orientation: 'vertical',
    gestureOrientation: 'vertical',
    smoothWheel: true,
    wheelMultiplier: 1.0,
    smoothTouch: false,
    infinite: false,
  });

  function raf(time) {
    if (lenis) lenis.raf(time);
    requestAnimationFrame(raf);
  }
  requestAnimationFrame(raf);

  if (typeof ScrollTrigger !== 'undefined') {
    lenis.on('scroll', ScrollTrigger.update);
  }
}

// ── NAVIGATION & SCROLL TRACKING ──
const dockNav = document.querySelector('.dock-nav');
const scrollProgressBar = document.querySelector('.scroll-progress-bar');

function initScrollHandlers() {
  window.addEventListener('scroll', () => {
    const scrollOffset = window.scrollY || document.documentElement.scrollTop;
    const scrollMaxHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    
    // Toggle scrolled state on dock navigation
    if (dockNav) {
      if (scrollOffset > 60) {
        dockNav.classList.add('scrolled');
      } else {
        dockNav.classList.remove('scrolled');
      }
    }
    
    // Fill progress bar
    if (scrollProgressBar && scrollMaxHeight > 0) {
      const fillPercentage = (scrollOffset / scrollMaxHeight) * 100;
      scrollProgressBar.style.width = `${fillPercentage}%`;
    }
  }, { passive: true });
}

// ── MAGNETIC BUTTON INTERACTIONS ──
function initMagneticHovers() {
  if (typeof gsap === 'undefined') return;
  document.querySelectorAll('[data-magnetic]').forEach(element => {
    element.addEventListener('mousemove', e => {
      const bounds = element.getBoundingClientRect();
      const centerX = bounds.left + bounds.width / 2;
      const centerY = bounds.top + bounds.height / 2;
      
      const offsetX = e.clientX - centerX;
      const offsetY = e.clientY - centerY;
      
      // Pull element slightly toward cursor coordinates
      const maxTranslation = 14;
      const transX = (offsetX / (bounds.width / 2)) * maxTranslation;
      const transY = (offsetY / (bounds.height / 2)) * maxTranslation;
      
      gsap.to(element, {
        x: transX,
        y: transY,
        duration: 0.3,
        ease: 'power2.out'
      });
      
      // Sub-label text offset for double-layer depth parallax
      const subText = element.querySelector('span');
      if (subText) {
        gsap.to(subText, {
          x: transX * 0.5,
          y: transY * 0.5,
          duration: 0.3,
          ease: 'power2.out'
        });
      }
    });
    
    element.addEventListener('mouseleave', () => {
      gsap.to(element, { 
        x: 0, 
        y: 0, 
        duration: 0.6, 
        ease: 'elastic.out(1, 0.4)' 
      });
      
      const subText = element.querySelector('span');
      if (subText) {
        gsap.to(subText, { 
          x: 0, 
          y: 0, 
          duration: 0.6, 
          ease: 'elastic.out(1, 0.4)' 
        });
      }
    });
  });
}

// ── 3D TILT WITH HOVER GLOWS ──
function initCardTilts() {
  if (typeof gsap === 'undefined') return;
  document.querySelectorAll('[data-tilt]').forEach(card => {
    card.addEventListener('mousemove', e => {
      const bounds = card.getBoundingClientRect();
      const mouseX = e.clientX - bounds.left;
      const mouseY = e.clientY - bounds.top;
      
      const pctX = (mouseX / bounds.width) - 0.5;
      const pctY = (mouseY / bounds.height) - 0.5;
      
      const maxTilt = 10;
      const tiltX = pctY * -maxTilt;
      const tiltY = pctX * maxTilt;
      
      gsap.to(card, {
        rotateX: tiltX,
        rotateY: tiltY,
        transformPerspective: 1000,
        duration: 0.35,
        ease: 'power2.out'
      });
      
      // Position tracking glow overlay
      const cardGlow = card.querySelector('.cooking-glow, .project-card-glow');
      if (cardGlow) {
        gsap.to(cardGlow, {
          x: mouseX - 150,
          y: mouseY - 150,
          duration: 0.15
        });
      }
    });
    
    card.addEventListener('mouseleave', () => {
      gsap.to(card, {
        rotateX: 0,
        rotateY: 0,
        duration: 0.5,
        ease: 'power3.out'
      });
    });
  });
}

// ── MOUSE PARALLAX FLOATING BADGES ──
function initBadgeParallax() {
  if (typeof gsap === 'undefined') return;
  document.addEventListener('mousemove', e => {
    document.querySelectorAll('.mouse-parallax').forEach(badge => {
      const speed = parseFloat(badge.getAttribute('data-speed')) || 1;
      const targetX = (window.innerWidth / 2 - e.clientX) * speed * 0.06;
      const targetY = (window.innerHeight / 2 - e.clientY) * speed * 0.06;
      
      gsap.to(badge, {
        x: targetX,
        y: targetY,
        duration: 0.5,
        ease: 'power2.out'
      });
    });
  });
}

// ── PROJECT CARD PARTICLES CANVAS ──
function initCardCanvases() {
  document.querySelectorAll('.card-canvas-particles').forEach(cvs => {
    const cardCtx = cvs.getContext('2d');
    if (!cardCtx) return;
    let cardW = cvs.width = cvs.offsetWidth;
    let cardH = cvs.height = cvs.offsetHeight;
    
    const baseColor = cvs.getAttribute('data-color') === 'accent2' ? '74, 124, 89' : '201, 79, 44';
    
    // Card local particles
    const localPts = Array.from({ length: 20 }, () => ({
      x: Math.random() * cardW,
      y: Math.random() * cardH,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      size: Math.random() * 2 + 0.6
    }));
    
    let activeHover = false;
    const cardParent = cvs.closest('.project-card');
    
    if (cardParent) {
      cardParent.addEventListener('mouseenter', () => activeHover = true);
      cardParent.addEventListener('mouseleave', () => activeHover = false);
    }
    
    function drawParticles() {
      cardCtx.clearRect(0, 0, cardW, cardH);
      
      localPts.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        
        if (p.x < 0 || p.x > cardW) p.vx *= -1;
        if (p.y < 0 || p.y > cardH) p.vy *= -1;
        
        cardCtx.beginPath();
        cardCtx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        cardCtx.fillStyle = activeHover ? `rgba(${baseColor}, 0.65)` : `rgba(${baseColor}, 0.25)`;
        cardCtx.fill();
      });
      
      // Node connections on hover
      if (activeHover) {
        for (let i = 0; i < localPts.length; i++) {
          for (let j = i + 1; j < localPts.length; j++) {
            const distance = Math.hypot(localPts[i].x - localPts[j].x, localPts[i].y - localPts[j].y);
            if (distance < 70) {
              cardCtx.beginPath();
              cardCtx.moveTo(localPts[i].x, localPts[i].y);
              cardCtx.lineTo(localPts[j].x, localPts[j].y);
              cardCtx.strokeStyle = `rgba(${baseColor}, ${0.2 * (1 - distance / 70)})`;
              cardCtx.lineWidth = 0.5;
              cardCtx.stroke();
            }
          }
        }
      }
      
      requestAnimationFrame(drawParticles);
    }
    
    window.addEventListener('resize', () => {
      cardW = cvs.width = cvs.offsetWidth;
      cardH = cvs.height = cvs.offsetHeight;
    });
    
    drawParticles();
  });
}

// ── 3D TECH STACK CYLINDER CAROUSEL CONTROLLER ──
let dragYRotation = 0;        // Current rotation angle of track Y
let targetYRotation = 0;      // Target Y rotation target
let scrollRotationY = 0;      // Scroll linked offset
let totalRotationY = 0;       // Sum of drag and scroll offset
let isDraggingCarousel = false;
let startDragX = 0;
let baseDragRotation = 0;
let dragVelocity = 0;

const carouselContainer = document.getElementById('tech-carousel-container');
const carouselTrack = document.getElementById('tech-carousel-track');
const carouselCards = document.querySelectorAll('.tech-carousel-card');

function init3DTechCarousel() {
  if (!carouselContainer || !carouselTrack) return;
  
  // Disable drag interactions on mobile screens (stacked layouts)
  const isMobile = () => window.innerWidth <= 1024;
  
  // Drag start
  const handleDragStart = (xVal) => {
    if (isMobile()) return;
    isDraggingCarousel = true;
    startDragX = xVal;
    baseDragRotation = dragYRotation;
    dragVelocity = 0;
  };
  
  carouselContainer.addEventListener('mousedown', e => handleDragStart(e.clientX));
  carouselContainer.addEventListener('touchstart', e => handleDragStart(e.touches[0].clientX), { passive: true });
  
  // Drag move
  const handleDragMove = (xVal) => {
    if (!isDraggingCarousel || isMobile()) return;
    const delta = xVal - startDragX;
    // Map drag pixels directly to degrees Y rotation (0.4 coefficient)
    targetYRotation = baseDragRotation + delta * 0.4;
  };
  
  window.addEventListener('mousemove', e => handleDragMove(e.clientX));
  window.addEventListener('touchmove', e => {
    if (isDraggingCarousel) handleDragMove(e.touches[0].clientX);
  }, { passive: false });
  
  // Drag end
  const handleDragEnd = () => {
    if (!isDraggingCarousel) return;
    isDraggingCarousel = false;
  };
  
  window.addEventListener('mouseup', handleDragEnd);
  window.addEventListener('touchend', handleDragEnd);
  window.addEventListener('mouseleave', handleDragEnd);

  // Link carousel to page scroll using ScrollTrigger
  if (typeof ScrollTrigger !== 'undefined') {
    ScrollTrigger.create({
      trigger: '#stack',
      start: 'top bottom',
      end: 'bottom top',
      scrub: true,
      onUpdate: self => {
        if (isMobile()) return;
        // Cylinder spins 180 degrees slowly as you scroll past
        scrollRotationY = self.progress * 180;
      }
    });
  }

  // Loop update cylinder physics and fog states
  function updateCarouselPhysics() {
    if (isMobile()) {
      // Clean transform rules if on tablet/mobile views
      carouselTrack.style.transform = '';
      carouselCards.forEach(c => c.classList.remove('inactive'));
      requestAnimationFrame(updateCarouselPhysics);
      return;
    }

    // Apply physics drag lag deceleration
    if (isDraggingCarousel) {
      dragVelocity = targetYRotation - dragYRotation;
      dragYRotation = targetYRotation;
    } else {
      dragVelocity *= 0.95; // Drag friction
      dragYRotation += dragVelocity;
      targetYRotation = dragYRotation;
    }

    // Sum rotation states
    totalRotationY = dragYRotation + scrollRotationY;

    // Apply rotation on track
    carouselTrack.style.transform = `rotateY(${totalRotationY}deg)`;

    // Calculate active cards facing viewport (world angle close to 0 modulo 360)
    carouselCards.forEach((card, index) => {
      const cardBaseAngle = index * 90;
      // Get absolute face rotation
      let absAngle = (totalRotationY + cardBaseAngle) % 360;
      if (absAngle < 0) absAngle += 360;
      
      // Normalize to [-180, 180]
      const normalizedAngle = absAngle > 180 ? absAngle - 360 : absAngle;

      // Card is facing camera within a 45 degree bracket
      if (Math.abs(normalizedAngle) < 45) {
        card.classList.remove('inactive');
      } else {
        card.classList.add('inactive');
      }
    });

    requestAnimationFrame(updateCarouselPhysics);
  }
  requestAnimationFrame(updateCarouselPhysics);
}

// ── SPLIT TYPE TEXT ANIMATION REVEALS ──
function initTextAnimations() {
  if (typeof gsap === 'undefined') return;

  // Reveal headlines clip-mask reveals
  document.querySelectorAll('.reveal-word-by-word').forEach(headline => {
    if (typeof SplitType !== 'undefined') {
      // Slices text into words and chars wrapper structures
      const splitText = new SplitType(headline, { types: 'words,chars' });
      
      // Animate characters up
      gsap.to(splitText.chars, {
        y: '0%',
        duration: 1.1,
        ease: 'power4.out',
        stagger: 0.03,
        scrollTrigger: {
          trigger: headline,
          start: 'top 85%',
          toggleActions: 'play none none none'
        }
      });
    } else {
      headline.style.opacity = 1;
    }
  });

  // Reveal subtitles & labels line-by-line
  document.querySelectorAll('.reveal-line').forEach(label => {
    if (typeof SplitType !== 'undefined') {
      const splitText = new SplitType(label, { types: 'lines' });
      
      splitText.lines.forEach(line => {
        const wrapper = document.createElement('div');
        wrapper.style.overflow = 'hidden';
        line.parentNode.insertBefore(wrapper, line);
        wrapper.appendChild(line);
      });

      gsap.fromTo(splitText.lines, 
        { y: '105%' },
        {
          y: '0%',
          duration: 1.2,
          ease: 'power3.out',
          stagger: 0.08,
          scrollTrigger: {
            trigger: label,
            start: 'top 88%',
            toggleActions: 'play none none none'
          }
        }
      );
    } else {
      label.style.opacity = 1;
    }
  });

  // Standard Fade elements
  document.querySelectorAll('.reveal-fade').forEach(el => {
    gsap.fromTo(el, 
      { opacity: 0, y: 35 },
      { 
        opacity: 1, 
        y: 0, 
        duration: 1.2, 
        ease: 'power3.out',
        scrollTrigger: {
          trigger: el,
          start: 'top 88%',
          toggleActions: 'play none none none'
        }
      }
    );
  });

  // Stats Counters Incremental reveals
  document.querySelectorAll('.about-stat .num').forEach(statBox => {
    const targetVal = parseFloat(statBox.getAttribute('data-count'));
    const suffix = statBox.getAttribute('data-suffix') || '';
    const isInfinite = statBox.getAttribute('data-infinite') === 'true';

    if (isInfinite) return; // Skip dynamic counter for infinity sign

    const dataObj = { count: 0 };
    gsap.to(dataObj, {
      count: targetVal,
      duration: 2.2,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: statBox,
        start: 'top 90%',
        toggleActions: 'play none none none'
      },
      onUpdate: () => {
        statBox.textContent = Math.floor(dataObj.count) + suffix;
      }
    });
  });
}

// ── MAIN CORE ENTRANCE TRANSITIONS ──
function triggerPageEntranceTimeline() {
  if (typeof gsap === 'undefined') return;
  const introTL = gsap.timeline();

  // Slide up grid dividers
  introTL.fromTo('.grid-line', 
    { scaleY: 0, transformOrigin: 'top' }, 
    { scaleY: 1, duration: 1.4, ease: 'power4.out', stagger: 0.1 }
  );

  // Fade-up Hero eyebrow and descriptions
  introTL.fromTo('#hero .reveal-line, #hero .reveal-fade, #hero .scroll-hint-wrapper', 
    { opacity: 0, y: 30 },
    { opacity: 1, y: 0, duration: 1.2, ease: 'power3.out', stagger: 0.12 },
    '-=1.0'
  );

  // Floating elastic deco blocks
  introTL.fromTo('#hero .deco', 
    { opacity: 0, scale: 0.85, y: 40 },
    { opacity: 1, scale: 1, y: 0, duration: 1.4, ease: 'elastic.out(1, 0.75)', stagger: 0.1 },
    '-=0.8'
  );

  // Slide down Dock Menu
  introTL.fromTo('.dock-nav', 
    { y: -100, opacity: 0 },
    { y: 0, opacity: 1, duration: 1.2, ease: 'power3.out' },
    '-=1.2'
  );
}

// ── LOADER SYSTEM DIAGNOSTICS ──
function initLoader() {
  const loaderOverlay = document.getElementById('loader');
  const progressFill = document.querySelector('.loader-progress');
  const percentText = document.querySelector('.loader-percentage');
  const statusLabel = document.querySelector('.loader-status');
  
  if (!loaderOverlay || !progressFill || !percentText) return;

  const statusLogs = [
    'System diagnostics...',
    'Synchronizing layers...',
    'Aligning responsive coordinates...',
    'Structuring vertical grid guides...',
    'Slicing typography layouts...',
    'Rendering background canvases...',
    'Complete'
  ];
  
  document.body.classList.add('loading');
  let currentProgress = 0;
  
  const loaderTimer = setInterval(() => {
    currentProgress += Math.floor(Math.random() * 6) + 2;
    if (currentProgress >= 100) {
      currentProgress = 100;
      clearInterval(loaderTimer);
      
      progressFill.style.width = '100%';
      percentText.textContent = '100';
      if (statusLabel) statusLabel.textContent = 'System Ready';
      
      setTimeout(() => {
        loaderOverlay.classList.add('loaded');
        document.body.classList.remove('loading');
        // Fire entrance reveals
        triggerPageEntranceTimeline();
      }, 500);
    } else {
      progressFill.style.width = `${currentProgress}%`;
      percentText.textContent = currentProgress.toString().padStart(2, '0');
      // Shift log message based on progress bracket
      if (statusLabel) {
        const logIdx = Math.floor((currentProgress / 100) * statusLogs.length);
        statusLabel.textContent = statusLogs[Math.min(logIdx, statusLogs.length - 1)];
      }
    }
  }, 35);
}

// ── MAIN CORE DEPLOY ──
function deployAll() {
  try {
    initMeshParticles();
    runBackgroundEngine();
    initSmoothScrolling();
    initScrollHandlers();
    initCursorStates();
    initMagneticHovers();
    initCardTilts();
    initBadgeParallax();
    initCardCanvases();
    init3DTechCarousel();
    initTextAnimations();
  } catch (err) {
    console.error("Initialization error:", err);
  } finally {
    // Loader is always run to guarantee page reveal
    initLoader();
  }
}

// Execution entry checkpoint to avoid missing DOMContentLoaded in fast readyStates
if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', deployAll);
} else {
  deployAll();
}