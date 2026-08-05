export const CASE_TYPES = [
  "corporate_business_advisory",
  "commercial_litigation",
  "civil_litigation",
  "personal_injury_plaintiff",
  "medical_malpractice_plaintiff",
  "employment_litigation_employee",
  "employment_counseling_employer",
  "family_law",
  "criminal_defense",
  "estate_planning",
  "probate_administration",
  "real_estate_closings",
  "commercial_real_estate",
  "bankruptcy",
  "immigration",
  "intellectual_property_prosecution",
  "intellectual_property_litigation",
  "tax_planning",
  "tax_controversy",
  "mergers_and_acquisitions",
  "contract_drafting",
  "regulatory_compliance",
  "debt_collection",
  "class_action_litigation",
  "insurance_defense",
] as const;

export type CaseTypeId = (typeof CASE_TYPES)[number];

export type TaskOwner = "client" | "legal_team" | "both";

export interface CaseTypeTaskTemplate {
  id: string;
  title: string;
  owner: TaskOwner;
  description: string;
}

export const CASE_TYPE_LABELS: Record<CaseTypeId, string> = {
  corporate_business_advisory: "Corporate / Business Advisory",
  commercial_litigation: "Commercial Litigation",
  civil_litigation: "Civil Litigation",
  personal_injury_plaintiff: "Personal Injury (Plaintiff)",
  medical_malpractice_plaintiff: "Medical Malpractice (Plaintiff)",
  employment_litigation_employee: "Employment Litigation (Employee)",
  employment_counseling_employer: "Employment Counseling (Employer)",
  family_law: "Family Law",
  criminal_defense: "Criminal Defense",
  estate_planning: "Estate Planning",
  probate_administration: "Probate Administration",
  real_estate_closings: "Real Estate Closings",
  commercial_real_estate: "Commercial Real Estate",
  bankruptcy: "Bankruptcy",
  immigration: "Immigration",
  intellectual_property_prosecution: "Intellectual Property Prosecution",
  intellectual_property_litigation: "Intellectual Property Litigation",
  tax_planning: "Tax Planning",
  tax_controversy: "Tax Controversy",
  mergers_and_acquisitions: "Mergers and Acquisitions",
  contract_drafting: "Contract Drafting",
  regulatory_compliance: "Regulatory Compliance",
  debt_collection: "Debt Collection",
  class_action_litigation: "Class Action Litigation",
  insurance_defense: "Insurance Defense",
};

function tasks(
  caseType: CaseTypeId,
  items: Array<Omit<CaseTypeTaskTemplate, "id">>,
): CaseTypeTaskTemplate[] {
  return items.map((item, index) => ({
    id: `${caseType}-${index + 1}`,
    ...item,
  }));
}

export const CASE_TYPE_TASK_LISTS: Record<CaseTypeId, CaseTypeTaskTemplate[]> = {
  corporate_business_advisory: tasks("corporate_business_advisory", [
    {
      title: "Complete client intake and engagement letter",
      owner: "both",
      description: "Confirm business goals, conflict check, and signed engagement.",
    },
    {
      title: "Collect entity formation and governance documents",
      owner: "client",
      description: "Provide articles, bylaws/operating agreement, and ownership records.",
    },
    {
      title: "Review current corporate structure and risk profile",
      owner: "legal_team",
      description: "Analyze entity setup, ownership, and liability exposure.",
    },
    {
      title: "Advise on governance and compliance obligations",
      owner: "legal_team",
      description: "Recommend board practices, filings, and policy updates.",
    },
    {
      title: "Draft or revise key business agreements",
      owner: "legal_team",
      description: "Prepare shareholder, operating, vendor, or employment agreements.",
    },
    {
      title: "Client review and approval of draft documents",
      owner: "client",
      description: "Review recommendations and approve final document package.",
    },
    {
      title: "Implement approved corporate changes",
      owner: "both",
      description: "Execute filings, signatures, and updated company records.",
    },
    {
      title: "Deliver closing memo and ongoing advisory checklist",
      owner: "legal_team",
      description: "Summarize completed work and next-step compliance reminders.",
    },
  ]),

  commercial_litigation: tasks("commercial_litigation", [
    {
      title: "Matter intake and litigation hold notice",
      owner: "both",
      description: "Open the file and preserve relevant business records.",
    },
    {
      title: "Provide contracts, correspondence, and damages support",
      owner: "client",
      description: "Upload agreements, emails, invoices, and loss documentation.",
    },
    {
      title: "Investigate claims and prepare pleadings",
      owner: "legal_team",
      description: "Assess liability theory and draft complaint or answer.",
    },
    {
      title: "Serve and respond to discovery",
      owner: "both",
      description: "Exchange written discovery and document productions.",
    },
    {
      title: "Depositions and expert coordination",
      owner: "legal_team",
      description: "Take/defend depositions and retain needed experts.",
    },
    {
      title: "Mediation or settlement conference",
      owner: "both",
      description: "Prepare settlement position and attend mediation.",
    },
    {
      title: "Pretrial motions and trial preparation",
      owner: "legal_team",
      description: "File dispositive motions and prepare exhibits and witnesses.",
    },
    {
      title: "Trial, judgment, or settlement closeout",
      owner: "both",
      description: "Complete hearing/trial and finalize resolution paperwork.",
    },
  ]),

  civil_litigation: tasks("civil_litigation", [
    {
      title: "Client intake and case evaluation",
      owner: "both",
      description: "Confirm facts, goals, deadlines, and engagement terms.",
    },
    {
      title: "Gather evidence and witness information",
      owner: "client",
      description: "Provide photos, records, timelines, and contact details.",
    },
    {
      title: "File complaint or responsive pleading",
      owner: "legal_team",
      description: "Draft and file initiating or defensive pleadings.",
    },
    {
      title: "Complete discovery phase",
      owner: "both",
      description: "Respond to interrogatories, RFPs, and admissions.",
    },
    {
      title: "Motion practice and hearings",
      owner: "legal_team",
      description: "Prepare motions, oppositions, and court appearances.",
    },
    {
      title: "Settlement discussions",
      owner: "both",
      description: "Evaluate offers and negotiate resolution options.",
    },
    {
      title: "Trial preparation",
      owner: "legal_team",
      description: "Prepare exhibit lists, witnesses, and trial brief.",
    },
    {
      title: "Final judgment or settlement implementation",
      owner: "both",
      description: "Enter judgment/settlement and complete closing tasks.",
    },
  ]),

  personal_injury_plaintiff: tasks("personal_injury_plaintiff", [
    {
      title: "Intake, medical authorization, and engagement",
      owner: "both",
      description: "Sign engagement letter and medical release forms.",
    },
    {
      title: "Provide incident details and insurance information",
      owner: "client",
      description: "Share accident report, photos, witnesses, and coverage details.",
    },
    {
      title: "Collect medical records and bills",
      owner: "legal_team",
      description: "Request and organize treatment records and expenses.",
    },
    {
      title: "Investigate liability and damages",
      owner: "legal_team",
      description: "Preserve evidence and assess claim value.",
    },
    {
      title: "Submit demand package to insurer/defendant",
      owner: "legal_team",
      description: "Prepare demand with liability and damages support.",
    },
    {
      title: "Negotiate settlement or file suit",
      owner: "both",
      description: "Review offers and decide whether to litigate.",
    },
    {
      title: "Litigation milestones if lawsuit filed",
      owner: "legal_team",
      description: "Handle discovery, depositions, and motion practice.",
    },
    {
      title: "Settlement disbursement and case closing",
      owner: "both",
      description: "Approve settlement, pay liens, and close the matter.",
    },
  ]),

  medical_malpractice_plaintiff: tasks("medical_malpractice_plaintiff", [
    {
      title: "Client intake and HIPAA authorizations",
      owner: "both",
      description: "Complete engagement and medical release paperwork.",
    },
    {
      title: "Identify treating providers and facilities",
      owner: "client",
      description: "List all relevant doctors, clinics, and hospitals.",
    },
    {
      title: "Obtain and review complete medical chart",
      owner: "legal_team",
      description: "Collect records needed for liability screening.",
    },
    {
      title: "Retain medical expert for standard-of-care review",
      owner: "legal_team",
      description: "Secure expert opinion supporting or declining the claim.",
    },
    {
      title: "Prepare and file pre-suit notice / complaint",
      owner: "legal_team",
      description: "Satisfy statutory notice requirements and commence suit.",
    },
    {
      title: "Discovery and expert disclosures",
      owner: "both",
      description: "Exchange records, depositions, and expert reports.",
    },
    {
      title: "Mediation and settlement evaluation",
      owner: "both",
      description: "Evaluate damages and participate in settlement talks.",
    },
    {
      title: "Trial readiness or final resolution",
      owner: "legal_team",
      description: "Prepare for trial or finalize settlement documents.",
    },
  ]),

  employment_litigation_employee: tasks("employment_litigation_employee", [
    {
      title: "Intake and timeline of employment events",
      owner: "both",
      description: "Document discrimination, harassment, or wrongful termination facts.",
    },
    {
      title: "Provide personnel documents and communications",
      owner: "client",
      description: "Upload offer letter, handbook, reviews, and relevant emails/texts.",
    },
    {
      title: "Administrative charge filing (EEOC/agency) if required",
      owner: "legal_team",
      description: "Prepare and file required administrative complaints.",
    },
    {
      title: "Agency investigation response and monitoring",
      owner: "both",
      description: "Respond to agency requests and track determination.",
    },
    {
      title: "Lawsuit filing and early case strategy",
      owner: "legal_team",
      description: "Draft complaint and develop litigation plan.",
    },
    {
      title: "Discovery and depositions",
      owner: "both",
      description: "Produce documents and prepare for testimony.",
    },
    {
      title: "Mediation or settlement conference",
      owner: "both",
      description: "Assess settlement value and attend mediation.",
    },
    {
      title: "Trial or final settlement closeout",
      owner: "legal_team",
      description: "Complete trial prep or finalize release and payment terms.",
    },
  ]),

  employment_counseling_employer: tasks("employment_counseling_employer", [
    {
      title: "Engagement and workplace issue briefing",
      owner: "both",
      description: "Identify counseling goals, risks, and deadlines.",
    },
    {
      title: "Provide handbooks, policies, and personnel files",
      owner: "client",
      description: "Share current employment policies and relevant HR records.",
    },
    {
      title: "Legal risk assessment and recommendations",
      owner: "legal_team",
      description: "Advise on discipline, termination, accommodation, or compliance.",
    },
    {
      title: "Draft or revise employment policies/agreements",
      owner: "legal_team",
      description: "Update handbook language, offers, or separation agreements.",
    },
    {
      title: "Client approval of recommended actions",
      owner: "client",
      description: "Approve policy changes and next-step HR actions.",
    },
    {
      title: "Support implementation and manager guidance",
      owner: "legal_team",
      description: "Coach HR/managers on compliant execution.",
    },
    {
      title: "Document counseling outcome and follow-up plan",
      owner: "both",
      description: "Record actions taken and remaining compliance tasks.",
    },
    {
      title: "Close matter with advisory summary",
      owner: "legal_team",
      description: "Deliver final memo and recommended monitoring steps.",
    },
  ]),

  family_law: tasks("family_law", [
    {
      title: "Intake, goals, and temporary needs assessment",
      owner: "both",
      description: "Discuss custody, support, property, and protective concerns.",
    },
    {
      title: "Provide financial disclosures and supporting documents",
      owner: "client",
      description: "Submit income, asset, debt, and expense information.",
    },
    {
      title: "File petition/response and temporary orders",
      owner: "legal_team",
      description: "Initiate case and seek temporary relief as needed.",
    },
    {
      title: "Parenting plan and support calculations",
      owner: "both",
      description: "Develop custody schedule and child/spousal support positions.",
    },
    {
      title: "Discovery and valuation of marital assets",
      owner: "legal_team",
      description: "Exchange disclosures and value property/business interests.",
    },
    {
      title: "Mediation and settlement negotiations",
      owner: "both",
      description: "Attempt agreed resolution of contested issues.",
    },
    {
      title: "Final decree / agreement drafting",
      owner: "legal_team",
      description: "Prepare final orders reflecting settlement or trial result.",
    },
    {
      title: "Post-judgment implementation",
      owner: "both",
      description: "Complete title transfers, support setup, and compliance steps.",
    },
  ]),

  criminal_defense: tasks("criminal_defense", [
    {
      title: "Arrest/charge intake and bail status review",
      owner: "both",
      description: "Confirm charges, court dates, and release conditions.",
    },
    {
      title: "Provide citation, police reports, and personal background",
      owner: "client",
      description: "Upload tickets, notices, and relevant personal information.",
    },
    {
      title: "Arraignment and plea strategy conference",
      owner: "legal_team",
      description: "Appear at arraignment and advise on plea options.",
    },
    {
      title: "Discovery review and investigation",
      owner: "legal_team",
      description: "Obtain state's evidence and investigate defenses.",
    },
    {
      title: "Client compliance with court conditions",
      owner: "client",
      description: "Complete required classes, check-ins, or no-contact orders.",
    },
    {
      title: "Pretrial motions and negotiations",
      owner: "legal_team",
      description: "File suppression/dismissal motions and negotiate outcomes.",
    },
    {
      title: "Plea hearing or trial",
      owner: "both",
      description: "Appear for plea or trial and present defense.",
    },
    {
      title: "Sentencing, compliance, and case closing",
      owner: "both",
      description: "Complete sentencing terms and close the defense matter.",
    },
  ]),

  estate_planning: tasks("estate_planning", [
    {
      title: "Estate planning questionnaire and goals meeting",
      owner: "both",
      description: "Identify beneficiaries, fiduciaries, and planning objectives.",
    },
    {
      title: "Provide asset inventory and beneficiary information",
      owner: "client",
      description: "List accounts, property, business interests, and family details.",
    },
    {
      title: "Design estate plan structure",
      owner: "legal_team",
      description: "Recommend will, trust, and tax/planning tools.",
    },
    {
      title: "Draft core estate planning documents",
      owner: "legal_team",
      description: "Prepare will, trusts, POAs, and advance directives.",
    },
    {
      title: "Client review of draft documents",
      owner: "client",
      description: "Review drafts and request revisions.",
    },
    {
      title: "Execution ceremony / signing",
      owner: "both",
      description: "Properly sign and witness estate planning documents.",
    },
    {
      title: "Funding instructions and beneficiary designations",
      owner: "both",
      description: "Retitle assets and update account beneficiaries as needed.",
    },
    {
      title: "Deliver final plan binder and maintenance schedule",
      owner: "legal_team",
      description: "Provide signed originals guidance and review reminders.",
    },
  ]),

  probate_administration: tasks("probate_administration", [
    {
      title: "Death intake and estate overview",
      owner: "both",
      description: "Collect death certificate, will, and initial asset list.",
    },
    {
      title: "File probate petition and obtain letters",
      owner: "legal_team",
      description: "Open probate and secure fiduciary authority.",
    },
    {
      title: "Notify heirs, beneficiaries, and creditors",
      owner: "legal_team",
      description: "Complete required notices and publications.",
    },
    {
      title: "Inventory estate assets and debts",
      owner: "both",
      description: "Locate accounts, property, claims, and liabilities.",
    },
    {
      title: "Manage estate administration tasks",
      owner: "legal_team",
      description: "Handle claims, tax filings, and court accountings.",
    },
    {
      title: "Client/fiduciary decisions on distributions",
      owner: "client",
      description: "Approve sales, payments, and distribution timing.",
    },
    {
      title: "Prepare final accounting and distribution plan",
      owner: "legal_team",
      description: "Document receipts, expenses, and proposed distributions.",
    },
    {
      title: "Close probate and distribute remaining assets",
      owner: "both",
      description: "Obtain discharge and complete final transfers.",
    },
  ]),

  real_estate_closings: tasks("real_estate_closings", [
    {
      title: "Purchase/sale intake and contract review",
      owner: "both",
      description: "Confirm deal terms, deadlines, and contingencies.",
    },
    {
      title: "Provide ID, financing, and property documents",
      owner: "client",
      description: "Submit lender info, disclosures, and required IDs.",
    },
    {
      title: "Order title commitment and survey review",
      owner: "legal_team",
      description: "Review title exceptions and survey issues.",
    },
    {
      title: "Resolve title objections and lender requirements",
      owner: "both",
      description: "Clear title items and satisfy closing conditions.",
    },
    {
      title: "Prepare closing documents and settlement statement",
      owner: "legal_team",
      description: "Draft deed, affidavits, and closing disclosures.",
    },
    {
      title: "Client pre-closing review and wire confirmation",
      owner: "client",
      description: "Approve numbers and confirm secure funding instructions.",
    },
    {
      title: "Conduct closing and collect signatures",
      owner: "both",
      description: "Execute documents and fund the transaction.",
    },
    {
      title: "Record documents and deliver closing package",
      owner: "legal_team",
      description: "Record deed/mortgage and provide final closing set.",
    },
  ]),

  commercial_real_estate: tasks("commercial_real_estate", [
    {
      title: "Deal intake and letter of intent review",
      owner: "both",
      description: "Confirm commercial terms, diligence period, and structure.",
    },
    {
      title: "Provide entity docs, leases, and financials",
      owner: "client",
      description: "Share operating documents, rent rolls, and contracts.",
    },
    {
      title: "Due diligence and title/survey analysis",
      owner: "legal_team",
      description: "Review title, survey, zoning, and environmental issues.",
    },
    {
      title: "Negotiate purchase/sale or lease agreement",
      owner: "legal_team",
      description: "Draft and negotiate commercial transaction documents.",
    },
    {
      title: "Client approval of key commercial terms",
      owner: "client",
      description: "Approve contingencies, reps, indemnities, and economics.",
    },
    {
      title: "Satisfy closing conditions and third-party consents",
      owner: "both",
      description: "Obtain lender, landlord, or governmental approvals.",
    },
    {
      title: "Closing and funding",
      owner: "both",
      description: "Execute documents and complete commercial closing.",
    },
    {
      title: "Post-closing deliverables and recordings",
      owner: "legal_team",
      description: "Record instruments and deliver final transaction binder.",
    },
  ]),

  bankruptcy: tasks("bankruptcy", [
    {
      title: "Debt and asset intake consultation",
      owner: "both",
      description: "Evaluate chapter options and filing strategy.",
    },
    {
      title: "Complete bankruptcy worksheets and creditor list",
      owner: "client",
      description: "Provide income, expenses, assets, and creditor details.",
    },
    {
      title: "Credit counseling and required pre-filing course",
      owner: "client",
      description: "Complete mandatory counseling certificate.",
    },
    {
      title: "Prepare and file bankruptcy petition",
      owner: "legal_team",
      description: "Draft schedules, statements, and file the case.",
    },
    {
      title: "Attend 341 meeting of creditors",
      owner: "both",
      description: "Prepare and appear for trustee examination.",
    },
    {
      title: "Address trustee requests and plan confirmation",
      owner: "legal_team",
      description: "Respond to deficiencies and pursue confirmation if needed.",
    },
    {
      title: "Complete debtor education course",
      owner: "client",
      description: "Finish required financial management course.",
    },
    {
      title: "Discharge and case closing",
      owner: "legal_team",
      description: "Obtain discharge order and close the bankruptcy matter.",
    },
  ]),

  immigration: tasks("immigration", [
    {
      title: "Immigration goals and eligibility screening",
      owner: "both",
      description: "Identify visa, status, or relief pathway.",
    },
    {
      title: "Provide identity, travel, and supporting records",
      owner: "client",
      description: "Submit passports, prior filings, and evidence packets.",
    },
    {
      title: "Prepare petition/application package",
      owner: "legal_team",
      description: "Draft forms, cover letter, and supporting exhibits.",
    },
    {
      title: "Client review and signature of filings",
      owner: "client",
      description: "Review accuracy and sign required forms.",
    },
    {
      title: "File with USCIS/agency and track receipt",
      owner: "legal_team",
      description: "Submit package and monitor case status.",
    },
    {
      title: "Respond to RFEs or interview notices",
      owner: "both",
      description: "Gather additional evidence and prepare for interview.",
    },
    {
      title: "Attend interview / biometrics as required",
      owner: "client",
      description: "Complete biometrics and appear for interview.",
    },
    {
      title: "Decision follow-up and status compliance guidance",
      owner: "legal_team",
      description: "Advise on approval conditions and next filings.",
    },
  ]),

  intellectual_property_prosecution: tasks("intellectual_property_prosecution", [
    {
      title: "IP intake and invention/brand disclosure",
      owner: "both",
      description: "Identify patentable invention, trademark, or copyright assets.",
    },
    {
      title: "Provide technical materials and prior art/use history",
      owner: "client",
      description: "Share drawings, specs, specimens, and first-use details.",
    },
    {
      title: "Clearance search and filing strategy",
      owner: "legal_team",
      description: "Assess protectability and recommend filing approach.",
    },
    {
      title: "Prepare and file application",
      owner: "legal_team",
      description: "Draft patent/trademark/copyright application and file.",
    },
    {
      title: "Respond to office actions",
      owner: "both",
      description: "Provide technical input and submit examiner responses.",
    },
    {
      title: "Publication / examination milestones",
      owner: "legal_team",
      description: "Monitor prosecution deadlines and status updates.",
    },
    {
      title: "Allowance, registration, or issuance",
      owner: "legal_team",
      description: "Pay issue/registration fees and secure rights.",
    },
    {
      title: "Maintenance and portfolio monitoring plan",
      owner: "both",
      description: "Set renewals, maintenance fees, and watch services.",
    },
  ]),

  intellectual_property_litigation: tasks("intellectual_property_litigation", [
    {
      title: "IP dispute intake and rights ownership confirmation",
      owner: "both",
      description: "Confirm ownership, registration status, and dispute goals.",
    },
    {
      title: "Provide accused product, mark, or work evidence",
      owner: "client",
      description: "Share samples, sales data, and infringement evidence.",
    },
    {
      title: "Cease-and-desist or pre-suit demand strategy",
      owner: "legal_team",
      description: "Send demand or prepare defensive response.",
    },
    {
      title: "Complaint/answer and preliminary injunction practice",
      owner: "legal_team",
      description: "File pleadings and seek/oppose emergency relief.",
    },
    {
      title: "Discovery and claim construction / expert work",
      owner: "both",
      description: "Exchange technical discovery and expert analyses.",
    },
    {
      title: "Settlement discussions or mediation",
      owner: "both",
      description: "Evaluate licensing, coexistence, or damages settlement.",
    },
    {
      title: "Summary judgment and trial preparation",
      owner: "legal_team",
      description: "Brief dispositive motions and prepare trial presentation.",
    },
    {
      title: "Judgment, injunction, or settlement closeout",
      owner: "legal_team",
      description: "Implement court order or settlement terms.",
    },
  ]),

  tax_planning: tasks("tax_planning", [
    {
      title: "Tax planning goals and entity overview",
      owner: "both",
      description: "Identify planning objectives and current tax posture.",
    },
    {
      title: "Provide tax returns, financials, and entity docs",
      owner: "client",
      description: "Upload recent returns, K-1s, and organizational records.",
    },
    {
      title: "Analyze planning opportunities and risks",
      owner: "legal_team",
      description: "Model strategies and identify compliance constraints.",
    },
    {
      title: "Present recommended tax plan",
      owner: "legal_team",
      description: "Deliver options with benefits, timing, and risks.",
    },
    {
      title: "Client selection of preferred strategy",
      owner: "client",
      description: "Approve the planning approach to implement.",
    },
    {
      title: "Draft implementing documents and elections",
      owner: "legal_team",
      description: "Prepare agreements, resolutions, and tax elections.",
    },
    {
      title: "Coordinate with accountant for filings",
      owner: "both",
      description: "Align legal documents with tax return implementation.",
    },
    {
      title: "Deliver planning memo and calendar of deadlines",
      owner: "legal_team",
      description: "Summarize actions taken and upcoming compliance dates.",
    },
  ]),

  tax_controversy: tasks("tax_controversy", [
    {
      title: "Audit/notice intake and deadline calendar",
      owner: "both",
      description: "Review IRS/state notice and preserve response deadlines.",
    },
    {
      title: "Provide returns, workpapers, and requested records",
      owner: "client",
      description: "Gather documents supporting positions under examination.",
    },
    {
      title: "Prepare protest, response, or appeal package",
      owner: "legal_team",
      description: "Draft factual and legal response to the agency.",
    },
    {
      title: "Agency conferences and negotiations",
      owner: "legal_team",
      description: "Represent client in audit, appeals, or settlement talks.",
    },
    {
      title: "Client decisions on settlement vs. litigation",
      owner: "client",
      description: "Evaluate offers and authorize next procedural step.",
    },
    {
      title: "Tax Court / litigation filings if needed",
      owner: "legal_team",
      description: "File petition and handle controversy litigation.",
    },
    {
      title: "Resolution documentation and payment/refund setup",
      owner: "both",
      description: "Implement closing agreement, payment plan, or refund.",
    },
    {
      title: "Close controversy and compliance follow-up",
      owner: "legal_team",
      description: "Confirm final determination and remaining filing duties.",
    },
  ]),

  mergers_and_acquisitions: tasks("mergers_and_acquisitions", [
    {
      title: "Deal intake and term sheet / LOI review",
      owner: "both",
      description: "Confirm structure, valuation framework, and exclusivity.",
    },
    {
      title: "Populate diligence data room",
      owner: "client",
      description: "Provide corporate, financial, IP, HR, and contract files.",
    },
    {
      title: "Legal due diligence review",
      owner: "legal_team",
      description: "Identify legal risks, consents, and deal breakers.",
    },
    {
      title: "Negotiate definitive transaction agreements",
      owner: "legal_team",
      description: "Draft and negotiate SPA/APA/merger agreement and ancillaries.",
    },
    {
      title: "Client approval of key deal protections",
      owner: "client",
      description: "Approve reps, indemnities, escrow, and closing conditions.",
    },
    {
      title: "Obtain third-party and regulatory consents",
      owner: "both",
      description: "Secure lender, landlord, customer, or agency approvals.",
    },
    {
      title: "Closing checklist and funds flow",
      owner: "legal_team",
      description: "Coordinate signatures, deliverables, and payment mechanics.",
    },
    {
      title: "Post-closing integration and escrow claims window",
      owner: "both",
      description: "Complete post-closing covenants and monitor indemnities.",
    },
  ]),

  contract_drafting: tasks("contract_drafting", [
    {
      title: "Contract goals and counterparties briefing",
      owner: "both",
      description: "Define commercial objectives and negotiation priorities.",
    },
    {
      title: "Provide existing drafts, term sheets, and related docs",
      owner: "client",
      description: "Share prior versions and business requirements.",
    },
    {
      title: "Issue-spot and propose contract structure",
      owner: "legal_team",
      description: "Identify risk areas and recommend clause framework.",
    },
    {
      title: "Draft agreement and key exhibits",
      owner: "legal_team",
      description: "Prepare first-pass contract package.",
    },
    {
      title: "Client commercial review",
      owner: "client",
      description: "Confirm pricing, SLAs, deliverables, and business terms.",
    },
    {
      title: "Negotiate revisions with counterparty",
      owner: "legal_team",
      description: "Redline and resolve contested legal terms.",
    },
    {
      title: "Finalize execution version",
      owner: "both",
      description: "Approve final form and collect signatures.",
    },
    {
      title: "Deliver executed contract and obligation summary",
      owner: "legal_team",
      description: "Provide signed copy and key compliance deadlines.",
    },
  ]),

  regulatory_compliance: tasks("regulatory_compliance", [
    {
      title: "Compliance scope and regulatory map",
      owner: "both",
      description: "Identify applicable regulators, licenses, and obligations.",
    },
    {
      title: "Provide policies, permits, and audit history",
      owner: "client",
      description: "Share existing compliance manuals and prior findings.",
    },
    {
      title: "Gap assessment against legal requirements",
      owner: "legal_team",
      description: "Evaluate current controls and compliance shortfalls.",
    },
    {
      title: "Recommend remediation plan and priorities",
      owner: "legal_team",
      description: "Sequence policy, training, and filing fixes.",
    },
    {
      title: "Client approval of remediation roadmap",
      owner: "client",
      description: "Authorize budget, owners, and implementation timeline.",
    },
    {
      title: "Draft updated policies and filings",
      owner: "legal_team",
      description: "Prepare required policies, notices, and submissions.",
    },
    {
      title: "Implement training and operational controls",
      owner: "both",
      description: "Roll out procedures and document completion.",
    },
    {
      title: "Compliance monitoring and closeout report",
      owner: "legal_team",
      description: "Deliver status report and ongoing monitoring checklist.",
    },
  ]),

  debt_collection: tasks("debt_collection", [
    {
      title: "Account intake and documentation review",
      owner: "both",
      description: "Confirm debt amount, debtor identity, and supporting records.",
    },
    {
      title: "Provide contracts, invoices, and payment history",
      owner: "client",
      description: "Upload agreements and aging reports for each account.",
    },
    {
      title: "Demand letter and pre-suit collection efforts",
      owner: "legal_team",
      description: "Send compliant demands and pursue voluntary payment.",
    },
    {
      title: "File collection lawsuit if unresolved",
      owner: "legal_team",
      description: "Prepare and file complaint for unpaid balances.",
    },
    {
      title: "Service, default, or contested litigation steps",
      owner: "legal_team",
      description: "Complete service and pursue judgment pathway.",
    },
    {
      title: "Client decision on settlement vs. judgment enforcement",
      owner: "client",
      description: "Approve payment plans or enforcement actions.",
    },
    {
      title: "Obtain judgment and begin enforcement",
      owner: "legal_team",
      description: "Pursue garnishment, liens, or other remedies.",
    },
    {
      title: "Collections monitoring and matter closeout",
      owner: "both",
      description: "Track recoveries and close resolved accounts.",
    },
  ]),

  class_action_litigation: tasks("class_action_litigation", [
    {
      title: "Class claim intake and commonality assessment",
      owner: "both",
      description: "Evaluate whether claims are suitable for class treatment.",
    },
    {
      title: "Provide representative plaintiff evidence and class data leads",
      owner: "client",
      description: "Share personal harm evidence and potential class indicators.",
    },
    {
      title: "Prepare and file class complaint",
      owner: "legal_team",
      description: "Draft pleadings asserting class allegations and claims.",
    },
    {
      title: "Class certification discovery and briefing",
      owner: "legal_team",
      description: "Develop certification record and expert support.",
    },
    {
      title: "Certification hearing and notice planning",
      owner: "legal_team",
      description: "Seek certification and design class notice process.",
    },
    {
      title: "Merits discovery and settlement discussions",
      owner: "both",
      description: "Advance case facts and evaluate class-wide settlement.",
    },
    {
      title: "Preliminary / final settlement approval if resolved",
      owner: "legal_team",
      description: "Brief fairness and administer court-approved settlement.",
    },
    {
      title: "Trial preparation or distribution closeout",
      owner: "legal_team",
      description: "Prepare for class trial or complete claims distribution.",
    },
  ]),

  insurance_defense: tasks("insurance_defense", [
    {
      title: "Claim tender intake and coverage review",
      owner: "both",
      description: "Confirm policy, tender, reservation of rights, and defense scope.",
    },
    {
      title: "Provide claim file, incident reports, and insured contacts",
      owner: "client",
      description: "Share adjuster notes, photos, and witness information.",
    },
    {
      title: "Answer complaint and develop defense theory",
      owner: "legal_team",
      description: "File responsive pleadings and identify liability defenses.",
    },
    {
      title: "Discovery and expert retention",
      owner: "legal_team",
      description: "Defend discovery and retain liability/damages experts.",
    },
    {
      title: "Insured cooperation with discovery and testimony",
      owner: "client",
      description: "Provide documents and prepare for deposition/trial.",
    },
    {
      title: "Settlement evaluation and carrier reporting",
      owner: "both",
      description: "Assess exposure and communicate recommendations to carrier.",
    },
    {
      title: "Dispositive motions and trial readiness",
      owner: "legal_team",
      description: "File motions and prepare defense trial strategy.",
    },
    {
      title: "Resolution, judgment, or dismissal closeout",
      owner: "legal_team",
      description: "Finalize outcome and complete claim closing report.",
    },
  ]),
};

export function getCaseTypeTaskList(caseType: CaseTypeId) {
  return CASE_TYPE_TASK_LISTS[caseType];
}
