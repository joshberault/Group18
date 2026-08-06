import type { ClientFormValues } from "@/lib/clients/types";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type ClientFormErrors = Partial<Record<keyof ClientFormValues, string>>;

export function validateClientForm(values: ClientFormValues): ClientFormErrors {
  const errors: ClientFormErrors = {};

  if (values.client_type === "individual") {
    if (!values.first_name.trim()) errors.first_name = "First name is required.";
    if (!values.last_name.trim()) errors.last_name = "Last name is required.";
  } else {
    if (!values.company_name.trim()) {
      errors.company_name = "Company name is required.";
    }
    if (!values.primary_contact_name.trim()) {
      errors.primary_contact_name = "Primary contact name is required.";
    }
  }

  if (values.email.trim() && !EMAIL_RE.test(values.email.trim())) {
    errors.email = "Enter a valid email address.";
  }

  if (
    values.conflict_check_status === "cleared" &&
    !values.conflict_checked_by.trim()
  ) {
    errors.conflict_checked_by =
      "Record who cleared the conflict check before marking Cleared.";
  }

  return errors;
}

export function hasFormErrors(errors: ClientFormErrors): boolean {
  return Object.keys(errors).length > 0;
}
