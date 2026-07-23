// app-module.ts — equivalent to Angular AppModule
// In Next.js App Router, there is no module system. This file documents
// the equivalent of Angular's AppModule declarations, imports, and providers
// for reference and developer understanding.
//
// DECLARATIONS (Angular components → Next.js components):
//   HomeComponent               → src/components/home/HomeComponent.tsx
//   MobileHomeOtpScreenComponent→ src/components/mobile-home-otp-screen/MobileHomeOtpScreen.tsx
//   EmailHomeScreenComponent    → src/components/email-home-screen/EmailHomeScreen.tsx
//   EmailHomePageComponent      → src/components/email-home-page/EmailHomePage.tsx
//   EmailHomeOtpScreenComponent → src/components/email-home-otp-screen/EmailHomeOtpScreen.tsx
//   DigilockerScreenComponent   → src/components/digilocker-screen/DigilockerScreen.tsx
//   BpSsoComponent              → src/components/bp-sso/BpSso.tsx
//   UploadProcessComponent      → src/components/upload-process/UploadProcess.tsx
//   AdhaarCopyComponent         → src/components/adhaar-copy/AdhaarCopy.tsx
//   PersonalDetailsFormComponent→ src/components/personal-details-form/PersonalDetailsForm.tsx
//   TradingExpComponent         → src/components/trading-exp/TradingExp.tsx
//   AnnualIncomeComponent       → src/components/annual-income/AnnualIncome.tsx
//   OccupDetailsComponent       → src/components/occup-details/OccupDetails.tsx
//   FatherSpouseNameComponent   → src/components/father-spouse-name/FatherSpouseName.tsx
//   (LinkBankAccount merged into src/components/manual-bankdetails/ManualBankDetails.tsx)
//   RpdComponent                → src/components/rpd/Rpd.tsx
//   DeclarationComponent        → src/components/declaration/Declaration.tsx
//   PlanPreferenceComponent     → src/components/plan-preference/PlanPreference.tsx
//   SegmentPreferenceComponent  → src/components/segment-preference/SegmentPreference.tsx
//   SelfieComponent             → src/components/selfie/Selfie.tsx
//   UploadSignatureComponent    → src/components/upload-signature/UploadSignature.tsx
//   UploadPanComponent          → src/components/upload-pan/UploadPan.tsx
//   NameChangeComponent         → src/components/name-change/NameChange.tsx
//   UploadSupportingComponent   → src/components/upload-supporting/UploadSupporting.tsx
//   UploadAdditionalComponent   → src/components/upload-additional/UploadAdditional.tsx
//   AadhaarUploadAll            → src/components/upload-aadhaar/AadhaarUploadAll.tsx
//   AddNomineeComponent         → src/components/add-nominee/AddNominee.tsx
//   EsignComponent              → src/components/esign/Esign.tsx
//   FnoesignComponent           → src/components/fnoesign/Fnoesign.tsx
//   AggregatorCallbackComponent → src/components/aggregator-callback/AggregatorCallback.tsx
//   ThankyouComponent           → src/components/thankyou/Thankyou.tsx
//   FnothankyouComponent        → src/components/fnothankyou/Fnothankyou.tsx
//   FaqNeedHelpComponent        → src/components/faq-need-help/FaqNeedHelp.tsx
//   PageNotFoundComponent       → src/components/page-not-found/PageNotFound.tsx
//   HeaderComponent             → src/components/header/Header.tsx
//   NomineeOptoutComponent      → src/components/nominee-optout/NomineeOptout.tsx
//   NomineeComponent            → src/components/nominee/Nominee.tsx
//   NomineeCallbackComponent    → src/components/nominee-callback/NomineeCallback.tsx
//
// IMPORTS (Angular modules → Next.js equivalents):
//   BrowserModule               → built-in (Next.js)
//   BrowserAnimationsModule     → built-in
//   AppRoutingModule            → src/lib/app-routing.ts (reference)
//   FormsModule / ReactiveFormsModule → React controlled components
//   HttpClientModule            → axios (src/services/api.service.ts)
//   NgxSpinnerModule            → src/components/spinner/Spinner.tsx
//   ToastrModule                → react-toastify (src/lib/providers.tsx)
//   WebcamModule                → react-webcam
//   NgOtpInputModule            → primereact/inputotp
//   CalendarModule              → primereact/calendar
//   InputOtpModule              → primereact/inputotp
//   AutoCompleteModule          → primereact/autocomplete
//   CarouselModule              → primereact/carousel
//   BackButtonDisableModule     → AppShell (window.onpopstate)
//   ImageCropperComponent       → react-image-crop
//   PdfViewerModule             → react-pdf
//   QRCodeModule                → react-qr-code
//   HammerModule                → touch event listeners in AppShell
//
// PROVIDERS (Angular services → Next.js singleton services):
//   DatePipe                    → date-fns or native Intl.DateTimeFormat
//   NavigationService           → src/services/navigation.service.ts
//   APIService                  → src/services/api.service.ts
//   MoengagesdkService          → src/services/moengagesdk.service.ts
//   AuthService                 → src/services/auth.service.ts
//   ExtensionService            → src/services/extension.service.ts
//   AesService                  → src/services/aes.service.ts
//
// SCHEMAS:
//   CUSTOM_ELEMENTS_SCHEMA      → not needed in React

export {};
