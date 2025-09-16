const successFallback = 'Thanks for reaching out—expect a reply within one business day.';
const errorFallback = 'Please try again or reach out directly.';

type FeedbackType = 'success' | 'error';

const enhanceForm = (form: HTMLFormElement) => {
  if (form.dataset.enhanced === 'true') return;
  form.dataset.enhanced = 'true';

  const feedback = form.querySelector<HTMLElement>('[data-contact-feedback]');
  const submitButton = form.querySelector<HTMLButtonElement>('[data-contact-submit]');
  const defaultText = submitButton?.querySelector<HTMLElement>('[data-state="default"]');
  const loadingText = submitButton?.querySelector<HTMLElement>('[data-state="loading"]');

  const setSubmitting = (isSubmitting: boolean) => {
    if (!submitButton) return;
    submitButton.disabled = isSubmitting;
    submitButton.setAttribute('aria-busy', isSubmitting ? 'true' : 'false');
    submitButton.style.opacity = isSubmitting ? '0.75' : '';
    if (defaultText && loadingText) {
      if (isSubmitting) {
        defaultText.classList.add('hidden');
        loadingText.classList.remove('hidden');
      } else {
        defaultText.classList.remove('hidden');
        loadingText.classList.add('hidden');
      }
    }
  };

  const hideFeedback = () => {
    if (!feedback) return;
    feedback.classList.add('hidden');
  };

  const showFeedback = (type: FeedbackType, message: string) => {
    if (!feedback) return;
    feedback.textContent = message;
    feedback.classList.remove('hidden');
    feedback.classList.remove(
      'bg-rose-50',
      'text-rose-700',
      'dark:bg-rose-500/10',
      'dark:text-rose-300',
      'bg-emerald-50',
      'text-emerald-700',
      'dark:bg-emerald-500/10',
      'dark:text-emerald-300',
    );

    if (type === 'success') {
      feedback.classList.add('bg-emerald-50', 'text-emerald-700', 'dark:bg-emerald-500/10', 'dark:text-emerald-300');
    } else {
      feedback.classList.add('bg-rose-50', 'text-rose-700', 'dark:bg-rose-500/10', 'dark:text-rose-300');
    }
  };

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    setSubmitting(true);
    hideFeedback();

    const formData = new FormData(form);
    const payload: Record<string, string> = {};
    formData.forEach((value, key) => {
      if (typeof value === 'string') {
        payload[key] = value.trim();
      }
    });

    if ('project-type' in payload) {
      payload.projectType = payload['project-type'];
      delete payload['project-type'];
    }

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => ({}));
      if (response.ok) {
        form.reset();
        showFeedback('success', form.dataset.successMessage || successFallback);
      } else {
        showFeedback('error', data?.error || form.dataset.errorMessage || errorFallback);
      }
    } catch (error) {
      showFeedback('error', form.dataset.errorMessage || errorFallback);
    } finally {
      setSubmitting(false);
    }
  });
};

document.addEventListener('DOMContentLoaded', () => {
  const forms = document.querySelectorAll<HTMLFormElement>('form[data-contact-form]');
  forms.forEach(enhanceForm);
});
