import { branches } from "./branches";
import { CONTACT } from "./events";

/**
 * Who customers contact about their personal data, and when the notice last changed.
 * Change the contact here; the privacy page and checkout read it.
 */
export const PRIVACY = {
  controller: "Enero Marso Cafe",
  phone: CONTACT.phone,
  tel: CONTACT.tel,
  facebook: branches[0].socials.facebook,
  updated: "October 12, 2026",
};
