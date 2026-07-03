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
  totalAmount?: number;
  amountPaid?: number;
  couponId?: string;
  waitlistNotifiedDate?: Date;
  members?: RegistrationMemberInterface[];
  selectionChoices?: RegistrationSelectionChoiceInterface[];
  payments?: RegistrationPaymentInterface[];
  event?: EventInterface;
}

export interface RegistrationMemberInterface {
  id?: string;
  churchId?: string;
  registrationId?: string;
  personId?: string;
  firstName?: string;
  lastName?: string;
  registrationTypeId?: string;
}

export interface RegistrationTypeInterface {
  id?: string;
  churchId?: string;
  eventId?: string;
  name?: string;
  description?: string;
  price?: number;
  capacity?: number;
  minAgeYears?: number;
  maxAgeYears?: number;
  formId?: string;
  sort?: number;
  active?: boolean;
  remainingCapacity?: number | null;
}

export interface RegistrationSelectionInterface {
  id?: string;
  churchId?: string;
  eventId?: string;
  name?: string;
  description?: string;
  price?: number;
  capacity?: number;
  maxQuantity?: number;
  sort?: number;
  active?: boolean;
  remainingCapacity?: number | null;
}

export interface RegistrationSelectionChoiceInterface {
  id?: string;
  churchId?: string;
  registrationId?: string;
  registrationMemberId?: string;
  selectionId?: string;
  quantity?: number;
}

export interface RegistrationPaymentInterface {
  id?: string;
  churchId?: string;
  registrationId?: string;
  gatewayId?: string;
  provider?: string;
  transactionId?: string;
  method?: string;
  amount?: number;
  currency?: string;
  kind?: string;
  status?: string;
  personId?: string;
  createdDate?: Date;
}

export interface RegistrationCouponInterface {
  id?: string;
  churchId?: string;
  eventId?: string;
  code?: string;
  discountType?: string;
  value?: number;
  startDate?: Date;
  endDate?: Date;
  minMembers?: number;
  maxUses?: number;
  active?: boolean;
  uses?: number;
}
