# Supabase email templates (Phase 2, M1)

Paste these into the Supabase dashboard (Authentication, Emails, Templates). Supabase keeps the live copy; this file is the repo copy so the wording is not lost. No email addresses or passwords belong here.

The link points at the website's own `/auth/confirm` page, which shows a button. That way an email scanner opening the link cannot use up the one-time token. `{{ .RedirectTo }}` is the address the app passes when it asks Supabase to send the email (it ends in `/auth/confirm`), and it must be on the Redirect URLs allow-list.

## Confirm signup

Subject: `Verify your email for Rafael Support Foundation`

```html
<h2>Welcome to Rafael Support Foundation</h2>
<p>Thank you for creating an account. Please verify your email address so we know it is really you.</p>
<p><a href="{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=email" style="display:inline-block;padding:12px 24px;background:#FEAE23;color:#26374A;text-decoration:none;border-radius:999px;font-weight:bold;">Verify my email</a></p>
<p>If the button does not work, copy this address into your browser:<br>{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=email</p>
<p>If you did not create an account, you can ignore this email.</p>
<p style="color:#555;font-size:13px;">This is an automated message, so please do not reply to it. Need help? Visit the Contact page at https://rafaelsupportfoundation.org/contact and we will get back to you.</p>
```

## Reset password

Subject: `Reset your Rafael Support Foundation password`

```html
<h2>Reset your password</h2>
<p>We received a request to reset the password for your account. Press the button to choose a new one.</p>
<p><a href="{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=recovery" style="display:inline-block;padding:12px 24px;background:#FEAE23;color:#26374A;text-decoration:none;border-radius:999px;font-weight:bold;">Choose a new password</a></p>
<p>If the button does not work, copy this address into your browser:<br>{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=recovery</p>
<p>If you did not ask for this, you can ignore this email. Your password will not change.</p>
<p style="color:#555;font-size:13px;">This is an automated message, so please do not reply to it. Need help? Visit the Contact page at https://rafaelsupportfoundation.org/contact and we will get back to you.</p>
```

## Notes
- Supabase's login and verification emails cannot carry a Reply-To (its SMTP form has no such field). Replies go to the sender mailbox. The help line above points people to the Contact page instead, and the sender mailbox can forward incoming mail to the requests inbox.
- The other templates (Magic link, Change email, Invite, Reauthentication) are not used in M1. Leave them as they are.
