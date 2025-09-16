
const EMBED_URL = 'https://app.cal.com/embed/embed.js';

declare global {
  interface Window {
    Cal?: any;
    __calEmbedPromise?: Promise<void>;
  }
}

const ensureCalScript = () => {
  if (typeof window === 'undefined') return Promise.resolve();
  if (window.Cal) return Promise.resolve();
  if (window.__calEmbedPromise) return window.__calEmbedPromise;

  window.__calEmbedPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector(`script[src="${EMBED_URL}"]`) as HTMLScriptElement | null;
    if (existing) {
      if (existing.dataset.loaded === 'true') {
        resolve();
        return;
      }
      existing.addEventListener('load', () => {
        existing.dataset.loaded = 'true';
        resolve();
      });
      existing.addEventListener('error', (event) => {
        reject(event);
      });
      return;
    }

    const script = document.createElement('script');
    script.src = EMBED_URL;
    script.async = true;
    script.onload = () => {
      script.dataset.loaded = 'true';
      resolve();
    };
    script.onerror = (event) => {
      reject(event);
    };
    document.head.appendChild(script);
  });

  return window.__calEmbedPromise;
};

const initCalFor = (wrapper: HTMLElement) => {
  const targetId = wrapper.dataset.calTarget;
  const namespace = wrapper.dataset.calNamespace || 'meet';
  const calLink = wrapper.dataset.calLink;
  const layout = wrapper.dataset.calLayout || 'month_view';

  if (!targetId || !calLink || !window.Cal) {
    return;
  }

  const selector = `#${targetId}`;
  const target = document.getElementById(targetId);
  if (!target) return;

  try {
    window.Cal('init', namespace, { origin: 'https://app.cal.com' });
    const ns = window.Cal.ns?.[namespace];
    if (!ns) return;

    window.Cal.ns[namespace]('inline', {
      elementOrSelector: selector,
      config: { layout },
      calLink,
    });

    window.Cal.ns[namespace]('ui', { hideEventTypeDetails: false, layout });
    wrapper.dataset.calLoaded = 'true';
  } catch (error) {
    console.error('Failed to initialize Cal.com embed', error);
  }
};

const loadCalFor = (wrapper: HTMLElement) => {
  if (wrapper.dataset.calLoaded === 'true' || wrapper.dataset.calLoaded === 'loading') {
    return;
  }
  wrapper.dataset.calLoaded = 'loading';

  ensureCalScript()
    .then(() => {
      requestAnimationFrame(() => initCalFor(wrapper));
    })
    .catch((error) => {
      console.warn('Cal.com embed script failed to load', error);
      wrapper.dataset.calLoaded = 'error';
    });
};

document.addEventListener('DOMContentLoaded', () => {
  const wrappers = Array.from(document.querySelectorAll<HTMLElement>('[data-cal-embed]'));
  if (!wrappers.length) return;

  const triggerLoad = (element: HTMLElement) => loadCalFor(element);

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const el = entry.target as HTMLElement;
          triggerLoad(el);
          observer.unobserve(el);
        }
      });
    }, { rootMargin: '0px 0px -20% 0px' });

    wrappers.forEach((wrapper) => {
      observer.observe(wrapper);
      const manualTrigger = () => triggerLoad(wrapper);
      wrapper.addEventListener('pointerdown', manualTrigger, { once: true });
      wrapper.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          manualTrigger();
        }
      }, { once: true });
    });
  } else {
    wrappers.forEach((wrapper) => triggerLoad(wrapper));
  }
});
