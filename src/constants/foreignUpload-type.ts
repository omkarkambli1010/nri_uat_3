
export const FOREIGN_UPLOAD_TYPES = {
  Pio: 'PIO',
  Oci: 'OCI',
  DrivingLicense: 'Driving License',
  PermanentResidentCard: 'Permanent Resident Card',
  ForeignGovtIssuedIdentityCard: 'Foreign Issued Identity Card',
  BankStatement: 'Bank Statement',
  UtilityBillWaterGasElectricity: 'Utility Bill / Water / Gas / Electricity',
  IqamaOrNationalAddressCertificate: 'Iqama / National Address Certificate',
  CompanyAccommodationLetter: 'Company Accommodation Letter',
  UniversityLetterOrStudentId: 'University Letter / Student ID',
  ResidentPermitOrVisa: 'Resident Permit / Visa',
  LeaseAgreement: 'Lease Agreement',
} as const;


// BRD: Document Type is driven by the Document Master and offers exactly
// Passport, Driving License and Aadhaar. The keys are the enum values sent to
// the API as ProofType; the labels are shown to the user.
export const PERMANENT_UPLOAD_TYPES = {
  PassportAddress: 'Passport',
  DrivingLicense: 'Driving License',
  AadhaarCard: 'Aadhaar',
} as const;
 