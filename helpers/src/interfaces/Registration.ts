import { EventInterface } from "./Content.js";

export interface RegistrationInterface {
  id?: string;
  churchId?: string;
  eventId?: string;
  personId?: string;
  householdId?: string;
  status?: string;
  formSubmissionId?: string;
  notes?: string;
  registeredDate?: Date;
  cancelledDate?: Date;
  members?: RegistrationMemberInterface[];
  event?: EventInterface;
}

export interface RegistrationMemberInterface {
  id?: string;
  churchId?: string;
  registrationId?: string;
  personId?: string;
  firstName?: string;
  lastName?: string;
}
