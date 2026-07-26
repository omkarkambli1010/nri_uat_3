// app-routing.ts — equivalent to Angular AppRoutingModule
// In Next.js App Router, routing is file-based (no route config needed).
// This file documents the route mapping between Angular routes and Next.js file paths.
//
// Angular Route                      → Next.js File Path
// -------------------------------------------------------------------
// ''                                 → src/app/page.tsx
// 'home'                             → src/app/home/page.tsx
// 'mobile-home-otp'                  → src/app/mobile-home-otp/page.tsx
// 'email'                            → src/app/email/page.tsx
// 'email-home-textpage'              → src/app/email-home-textpage/page.tsx
// 'email-home-otp'                   → src/app/email-home-otp/page.tsx
// 'digilocker-screen'                → src/app/digilocker-screen/page.tsx
// 'uploadProcess/:formNumber'        → src/app/uploadProcess/[formNumber]/page.tsx
// 'aadhar'                           → src/app/aadhar/page.tsx
// 'aadhar/upload'                    → src/app/aadhar/upload/page.tsx
// 'personalDetailsForm/0'            → src/app/personalDetailsForm/0/page.tsx
// 'personalDetailsForm/1'            → src/app/personalDetailsForm/1/page.tsx
// 'personalDetailsForm/2'            → src/app/personalDetailsForm/2/page.tsx
// 'personalDetailsForm/3'            → src/app/personalDetailsForm/3/page.tsx
// 'personalDetailsForm/4'            → src/app/personalDetailsForm/4/page.tsx
// 'personalDetailsForm/5'            → src/app/personalDetailsForm/5/page.tsx
// 'personalDetailsForm/6'            → REMOVED, merged into 'manual-bankdetails'
//                                      (redirected in next.config.ts)
// 'manual-bankdetails'               → src/app/manual-bankdetails/page.tsx
//                                      (account type + details, single page)
// 'manual-document-screen'           → src/app/manual-document-screen/page.tsx
// 'planprocess/1'                    → src/app/planprocess/1/page.tsx
// 'planprocess/2'                    → src/app/planprocess/2/page.tsx
// 'planprocess/3'                    → src/app/planprocess/3/page.tsx
// 'CaptureSelfie/:formNumber'        → src/app/CaptureSelfie/[formNumber]/page.tsx
// 'uploadSignature'                  → src/app/uploadSignature/page.tsx
// 'uploadSignatureinfo'              → src/app/uploadSignatureinfo/page.tsx
// 'uploadPan'                        → src/app/uploadPan/page.tsx
// 'nameChange'                       → src/app/nameChange/page.tsx
// 'support-document'                 → src/app/support-document/page.tsx
// 'additional-document'              → src/app/additional-document/page.tsx
// 'addNominee/:formNumber'           → src/app/addNominee/[formNumber]/page.tsx
// 'esign'                            → src/app/esign/page.tsx
// 'fnoesign'                         → src/app/fnoesign/page.tsx
// 'aacallback'                       → src/app/aacallback/page.tsx
// 'bp-sso/:formNumber'               → src/app/bp-sso/[formNumber]/page.tsx
// 'thankyou'                         → src/app/thankyou/page.tsx
// 'fno-thankyou'                     → src/app/fno-thankyou/page.tsx
// 'faq'                              → src/app/faq/page.tsx
// 'passportUpload/details'           → src/app/passportUpload/details/page.tsx
// 'passportUpload/upload'            → src/app/passportUpload/upload/page.tsx
// 'oci'                              → src/app/oci/page.tsx
// 'oci/upload'                       → src/app/oci/upload/page.tsx
// 'fatca'                            → src/app/fatca/page.tsx
// 'fatca/document'                   → src/app/fatca/document/page.tsx
// 'fatca/upload'                     → src/app/fatca/upload/page.tsx
// 'visa'                             → src/app/visa/page.tsx
// 'visa/upload'                      → src/app/visa/upload/page.tsx
// 'permanent-address-details'        → src/app/permanent-address-details/page.tsx
// 'foreignAddress'                   → src/app/foreignAddress/page.tsx (fields + upload, single page)
// 'permanentAddress'                 → src/app/permanentAddress/page.tsx (fields + upload, single page)
// 'page-not-found'                   → src/app/page-not-found/page.tsx
// '**' (catch-all)                   → src/app/not-found.tsx

export {};
