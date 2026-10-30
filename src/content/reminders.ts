import { orgName } from "@/content/site";

// Wording of the reminder emails and the backup alert (sent by the daily job). Components never hardcode copy.

const sign = `\n\n${orgName}`;

export const reminders = {
  dayBefore: {
    subject: (reference: string) => `Reminder: your RSF booking ${reference} is tomorrow`,
    body: (name: string, reference: string, when: string, link: string) =>
      `Hello ${name},\n\nA friendly reminder that your booking ${reference} is tomorrow:\n${when}\n\nYou can see the details, and the way to reach us, on your booking page:\n${link}\n\nIf your plans have changed, please cancel from that page so someone else can use the place.${sign}`,
  },
  passStarts: {
    subject: (reference: string) => `Your RSF monthly pass ${reference} starts tomorrow`,
    body: (name: string, reference: string, when: string, link: string) =>
      `Hello ${name},\n\nYour monthly pass ${reference} starts tomorrow:\n${when}\n\nYour pass details are on your booking page:\n${link}\n\nWe look forward to seeing you.${sign}`,
  },
  passEnds: {
    subject: (reference: string) => `Your RSF monthly pass ${reference} ends in 5 days`,
    body: (name: string, reference: string, when: string, link: string) =>
      `Hello ${name},\n\nYour monthly pass ${reference} ends in 5 days:\n${when}\n\nTo keep your place, renew from your booking page. Desks are checked again when you renew, so please do it soon:\n${link}${sign}`,
  },
  holdExpiring: {
    subject: (reference: string) => `Your RSF booking ${reference} will be released soon`,
    body: (name: string, reference: string, when: string, until: string, link: string) =>
      `Hello ${name},\n\nWe are holding your booking ${reference} (${when}) only until ${until}. After that it is released for others.\n\nTo keep it, please pay by bank transfer and tell us you have paid, from your booking page:\n${link}${sign}`,
  },
};

export const backupAlert = {
  subject: "RSF website: the last backup is too old",
  body: (age: string, checkUrl: string) =>
    `The website's last successful backup was ${age}. Backups should arrive about twice a day, so something has probably stopped.\n\nWhat to do:\n1. Open the backup monitor to see the last time it heard from the backup job:\n${checkUrl}\n2. In GitHub, open the repository's Actions tab and look at the "Backup" workflow for a red cross.\n3. If you are not sure, ask for help before anyone makes changes to the database.\n\nThis alert is sent at most once a day until a backup succeeds.${sign}`,
  neverPinged: "never recorded",
};
