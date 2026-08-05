export const REFERRAL_PROGRAM = Object.freeze({
  schemaVersion: 1,
  attribution: Object.freeze({
    rewardLive: false,
    description: "Referral links currently record signup attribution; they do not grant account-level free days.",
  }),
  gift: Object.freeze({
    recipientDays: 14,
    senderBonusDays: 7,
    limitCount: 5,
    limitWindowDays: 30,
    claimWindowDays: 30,
    senderAwardMoment: "token-issuance-attempt",
    providerScope: "Workspace access only; provider-backed tools still require a live launch capability.",
  }),
});

export function describeGiftReceipt(payload = {}) {
  const delivery = payload?.delivery || {};
  if (delivery.status === "accepted") {
    return { tone: "delivered", title: "Gift link created and email accepted", detail: "The email provider accepted the message. Delivery to the inbox is not guaranteed." };
  }
  if (delivery.status === "rejected") {
    return { tone: "link-only", title: "Gift link created; email was not accepted", detail: "Copy the gift link and send it directly. No email delivery is claimed." };
  }
  return { tone: "link-only", title: "Gift link created", detail: "Transactional email is not configured for this receipt. Copy and send the link directly." };
}

export function describeSenderBonus(payload = {}) {
  if (payload?.reward?.senderBonus?.status === "recorded") {
    return `${REFERRAL_PROGRAM.gift.senderBonusDays} sender bonus days were recorded.`;
  }
  return "The sender bonus update could not be confirmed; no credit is claimed.";
}
