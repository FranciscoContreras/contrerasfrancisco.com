import type { APIRoute } from 'astro';
import { Resend } from 'resend';

type ContactPayload = {
  name?: string;
  email?: string;
  company?: string;
  message?: string;
  budget?: string;
  timeline?: string;
  projectType?: string;
};

const resendApiKey = import.meta.env.RESEND_API_KEY;
const contactRecipientString =
  import.meta.env.CONTACT_TO_EMAIL ?? 'contrerasfrancisco@icloud.com';
const contactRecipients = contactRecipientString
  .split(',')
  .map((address) => address.trim())
  .filter(Boolean);
const fromAddress =
  import.meta.env.CONTACT_FROM_EMAIL ?? 'Francisco Portfolio <onboarding@resend.dev>';

const resend = resendApiKey ? new Resend(resendApiKey) : null;

const escapeHtml = (value: string) =>
  value.replace(/[&<>"\']/g, (character) => {
    switch (character) {
      case '&':
        return '&amp;';
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '"':
        return '&quot;';
      case "'":
        return '&#39;';
      default:
        return character;
    }
  });

const formatHtml = (
  data: Required<Pick<ContactPayload, 'name' | 'email' | 'message'>> &
    Partial<ContactPayload>,
) => {
  const detailRows: Array<[string, string | undefined]> = [
    ['Name', data.name],
    ['Email', data.email],
    ['Company', data.company],
    ['Project Type', data.projectType],
    ['Budget', data.budget],
    ['Timeline', data.timeline],
  ];

  const rowsHtml = detailRows
    .filter(([, value]) => Boolean(value))
    .map(
      ([label, value]) => `
        <tr>
          <td style="padding: 8px 12px; font-weight: 600; background:#F7FAFF; width: 160px;">${label}</td>
          <td style="padding: 8px 12px;">${escapeHtml(value ?? '')}</td>
        </tr>
      `,
    )
    .join('');

  return `
    <div style="font-family: 'Inter', sans-serif; color: #0B1220; line-height: 1.6;">
      <h2 style="margin-bottom: 12px; font-size: 20px;">New contact request</h2>
      <p style="margin: 0 0 16px;">A new message just came through your portfolio. Here are the details:</p>
      <table style="border-collapse: collapse; width: 100%;">
        <tbody>${rowsHtml}</tbody>
      </table>
      <div style="margin-top: 24px;">
        <h3 style="margin-bottom: 8px; font-size: 16px;">Message</h3>
        <div style="padding: 16px; background: #F0F4FF; border-radius: 12px; white-space: pre-wrap;">${escapeHtml(
          data.message,
        )}</div>
      </div>
    </div>
  `;
};

const formatText = (
  data: Required<Pick<ContactPayload, 'name' | 'email' | 'message'>> &
    Partial<ContactPayload>,
) => {
  const detailLines = [
    `Name: ${data.name}`,
    `Email: ${data.email}`,
    data.company ? `Company: ${data.company}` : null,
    data.projectType ? `Project Type: ${data.projectType}` : null,
    data.budget ? `Budget: ${data.budget}` : null,
    data.timeline ? `Timeline: ${data.timeline}` : null,
  ]
    .filter((line): line is string => Boolean(line))
    .join('\n');

  return `New contact request

${detailLines}

Message:
${data.message}
`;
};

export const POST: APIRoute = async ({ request }) => {
  const contentType = (request.headers.get('content-type') ?? '').toLowerCase();

  const sanitizePayload = (data: unknown): ContactPayload | null => {
    if (!data || typeof data !== 'object') return null;
    return data as ContactPayload;
  };

  const jsonPayload = await request
    .clone()
    .json()
    .then(sanitizePayload)
    .catch(() => null);

  const formPayload = await request
    .clone()
    .formData()
    .then((formData) => {
      const collected: Record<string, string> = {};
      formData.forEach((value, key) => {
        if (typeof value === 'string') {
          collected[key] = value;
        }
      });
      return collected as ContactPayload;
    })
    .catch(() => null);

  let payload: ContactPayload | null = null;

  if (contentType.includes('application/json') || contentType.includes('text/plain')) {
    payload = jsonPayload;
  } else if (
    contentType.includes('application/x-www-form-urlencoded') ||
    contentType.includes('multipart/form-data')
  ) {
    payload = formPayload;
  } else {
    payload = jsonPayload ?? formPayload;
  }

  if (!payload) {
    return new Response(
      JSON.stringify({ error: 'Unsupported submission format. Please try again.' }),
      {
        status: 415,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'project-type')) {
    const rawProjectType = (payload as Record<string, unknown>)['project-type'];
    if (typeof rawProjectType === 'string') {
      payload.projectType = rawProjectType;
    }
    delete (payload as Record<string, unknown>)['project-type'];
  }

  const name = payload.name?.trim();
  const email = payload.email?.trim();
  const message = payload.message?.trim();
  const company = payload.company?.trim();
  const budget = payload.budget?.trim();
  const timeline = payload.timeline?.trim();
  const projectType = payload.projectType?.trim();

  if (!name || !email || !message) {
    return new Response(
      JSON.stringify({ error: 'Please provide your name, email, and a short message.' }),
      {
        status: 422,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }

  const emailRegex = /^(?:[\w!#$%&'*+/=?`{|}~^.-]+)@(?:[\w.-]+\.)+[A-Za-z]{2,}$/;
  if (!emailRegex.test(email)) {
    return new Response(JSON.stringify({ error: 'Please share a valid email address.' }), {
      status: 422,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!resend) {
    return new Response(
      JSON.stringify({
        error:
          'Email service is not configured yet. Ask the site owner to add a RESEND_API_KEY environment variable.',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }

  try {
    await resend.emails.send({
      from: fromAddress,
      to: contactRecipients,
      replyTo: email,
      subject: `New contact from ${name}`,
      html: formatHtml({ name, email, message, company, budget, timeline, projectType }),
      text: formatText({ name, email, message, company, budget, timeline, projectType }),
    });

    return new Response(
      JSON.stringify({ success: true, message: 'Message delivered successfully.' }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  } catch (error) {
    console.error('Contact form send failed', error);
    return new Response(
      JSON.stringify({
        error:
          'We could not send your message right now. Please try again or email contrerasfrancisco@icloud.com directly.',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }
};
