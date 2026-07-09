import axios, { AxiosRequestConfig, AxiosResponse } from "axios";
import aesService from "./aes.service";
import { moengagesdkService } from "./moengagesdk.service";
import { toast } from "@/services/toast.service";
import { environment } from "@/environments/environment";

// Equivalent to Angular's environment import
const backendurl = environment.nriBackendurl ?? "https://udn.sbisecurities.in/";

const nriBackendurl = environment.nriBackendurl;

export interface BankMasterIFSCResponse {
  ifscCode: string;
  bankName: string;
  bbmCd: string;
  branchName: string;
  micrNo: string;
  address: string;
}

// Country Master row (POST …/masters/get { masterName: "COUNTRYMASTER" }).Ij
// countryCode is "ISO2/ISO3" (e.g. "AF/AFG"), occasionally just "ISO2" ("IN").
// status "Y" = selectable, "N" = restricted.
export interface CountryMaster {
  countryId: number;
  countryName: string;
  countryCode: string;
  teleCode: string;
  status: string;
}

// Reverse-penny-drop bank verification status (GET …/bank/rpd/status).
// Optional extras are mapped only when the backend includes them.
export interface BankRpdStatusResponse {
  status?: string;
  accountNumber?: string;
  ifscCode?: string;
  holderName?: string;
  bankName?: string;
  accountType?: string;
  micrCode?: string;
  bankAddress?: string;
}

// API Service — equivalent to Angular APIService
// Handles all HTTP communication with AES-encrypted payloads

class APIService {
  private routeurl: string = backendurl;
  private nriRouteurl: string = nriBackendurl;

  api: string = this.routeurl; //+ "diypwaapi/";
  esignapi: string =
    this.routeurl + "EsignService/api/v1/esignstamp/getEsignPDFData";
  nomineeapi: string =
    this.routeurl + "NomineeOptOutService/api/v1/nomineeservice/";
  msfapi: string = this.routeurl + "msfpwaapi/";
  // nriapi: string = this.nriRouteurl + '/api/v1/';
  nriapi: string = this.nriRouteurl.replace(/\/$/, "") + "/api/v1/";

  private getHeaders(withAuth = true) {
    const client_id =
      typeof window !== "undefined"
        ? (window.sessionStorage.getItem("clientid") ?? "")
        : "";
    const token =
      typeof window !== "undefined"
        ? window.sessionStorage.getItem("token")
        : null;

    const headers: Record<string, string> = {
      client_id: client_id || "no-client",
    };

    if (withAuth && token) {
      headers["Authorization"] = "Bearer " + token;
    }

    return headers;
  }

  private getClientId(): string {
    return typeof window !== "undefined"
      ? (window.sessionStorage.getItem("clientid") ?? "")
      : "";
  }

  private encryptPayload(data: any): { request: string } {
    const client_id = this.getClientId();
    return {
      request: aesService.encrypt(JSON.stringify(data), client_id, client_id),
    };
  }

  private decryptResponse(response: AxiosResponse): any {
    const client_id = this.getClientId();
    const rawData = response.data;
    if (rawData?.response) {
      try {
        const decrypted = aesService.decrypt(
          rawData.response,
          client_id,
          client_id,
        );
        return JSON.parse(decrypted);
      } catch {
        return rawData;
      }
    }
    return rawData;
  }

  private removeModal() {
    if (typeof document !== "undefined") {
      document.querySelectorAll(".modal-backdrop").forEach((el) => el.remove());
      document.body.classList.remove("modal-open");
    }
  }

  private handleError(
    error: any,
    hideSpinner?: () => void,
    options?: { silentStatuses?: number[]; silentErrorCodes?: string[] },
  ): never {
    const status = error?.response?.status;
    const errorData = error?.response?.data;
    const errorCode = errorData?.errorCode;
    const isSilent =
      (!!status && !!options?.silentStatuses?.includes(status)) ||
      (!!errorCode && !!options?.silentErrorCodes?.includes(errorCode));

    const msg =
      (errorData?.detail ?? "") ||
      (errorData?.message ?? "") ||
      (errorData?.title ?? "") ||
      "";

    const formNumber =
      typeof window !== "undefined"
        ? (window.sessionStorage.getItem("FormNumber") ?? "")
        : "";

    const trackError = (errMsg: string, code: number) => {
      moengagesdkService.trackEvent("General Errors", {
        product_id: formNumber,
        product_name: "Onboarding DIY",
        category: "Errors",
        ErrorMsg: errMsg,
        ErrorCode: code,
      });
    };

    const showError = (message: string) => {
      toast.error(
        message ||
        "Please check the internet connectivity. Still if the issue persists, please contact us at helpdesk@sbicapsec.com",
        { position: "bottom-center", autoClose: 3500 },
      );
    };

    if (status === 400) {
      hideSpinner?.();
      if (!isSilent) {
        showError(msg);
        trackError(msg, 400);
      }
      this.removeModal();
    } else if (status === 401) {
      hideSpinner?.();
      const isUnauthorized =
        errorData == null || errorData?.ReasonPhrase === "Unauthorized";

      if (isUnauthorized) {
        const alreadyShown = window.sessionStorage.getItem("Unauthorized");
        if (!alreadyShown) {
          toast.error("Session Expired...", {
            position: "bottom-center",
            autoClose: 4500,
          });
        }
        trackError("Session Expired...", 401);
        window.sessionStorage.setItem("Unauthorized", "Error Message Shown");
        setTimeout(() => {
          moengagesdkService.logoutUser();
          window.localStorage.clear();
          window.sessionStorage.clear();
          window.location.href = "https://udn.sbisecurities.in/diynri/";
        }, 200);
      } else {
        showError(msg);
        trackError(msg, 401);
      }
      this.removeModal();
    } else if (status === 404) {
      hideSpinner?.();
      if (!isSilent) {
        toast.error("Details Not Found...", {
          position: "bottom-center",
          autoClose: 3500,
        });
        trackError("Details Not Found...", 404);
      }
      this.removeModal();
    } else {
      hideSpinner?.();
      if (!isSilent) {
        showError(msg);
        trackError(msg, status ?? 0);
      }
      this.removeModal();
    }

    throw error;
  }


  async postRequest(
    controller: string,
    data: any,
    hideSpinner?: () => void,
  ): Promise<any> {
    const url = this.api + "/" + controller;
    const headers = this.getHeaders();
    const payload = this.encryptPayload(data);

    try {
      const response = await axios.post(url, payload, { headers });
      return this.decryptResponse(response);
    } catch (error) {
      return this.handleError(error, hideSpinner);
    }
  }

  async postRequestEsign(
    controller: string,
    data: any,
    hideSpinner?: () => void,
  ): Promise<any> {
    const url = this.esignapi;
    const payload = this.encryptPayload(data);

    try {
      const response = await axios.post(url, payload);
      return this.decryptResponse(response);
    } catch (error) {
      return this.handleError(error, hideSpinner);
    }
  }

  async postRequestNominee(
    controller: string,
    data: any,
    hideSpinner?: () => void,
  ): Promise<any> {
    const url = this.nomineeapi + controller;
    const headers = this.getHeaders();
    const payload = this.encryptPayload(data);

    try {
      const response = await axios.post(url, payload, { headers });
      return this.decryptResponse(response);
    } catch (error) {
      return this.handleError(error, hideSpinner);
    }
  }

  async postRequestMsf(
    controller: string,
    data: any,
    hideSpinner?: () => void,
  ): Promise<any> {
    const url = this.msfapi + controller;
    const headers = this.getHeaders();
    const payload = this.encryptPayload(data);

    try {
      const response = await axios.post(url, payload, { headers });
      return this.decryptResponse(response);
    } catch (error) {
      return this.handleError(error, hideSpinner);
    }
  }

  private generateIdempotencyKey(): string {
    const uuid =
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    return `reg-001-${uuid}`;
  }

  // ─── Masters ──────────────────────────────────────────────────────────────
  async getMaster(masterName: string): Promise<any[]> {
    const url = `${this.nriapi}masters/get`;
    const response = await axios.post(
      url,
      { masterName, idempotencyKey: "" },
      { headers: { accept: "*/*", "Content-Type": "application/json" } },
    );
    return response.data?.data ?? [];
  }

  async getCountryMaster(): Promise<CountryMaster[]> {
    return this.getMaster("COUNTRYMASTER");
  }

  async getBankMasterByIfsc(
    ifscCode: string,
    extraHeaders?: Record<string, string>,
    hideSpinner?: () => void,
  ): Promise<BankMasterIFSCResponse> {
    const url = `${this.nriapi}bank-master/${ifscCode}`;

    try {
      const response = await axios.get(url, {
        headers: {
          accept: "application/json",
          ...extraHeaders,
        },
      });

      return response.data;
    } catch (error) {
      console.log(error)
      this.removeModal();
      throw error; //this.handleError(error, hideSpinner);
    }
  }

  async searchBankMasterByIfsc(
    query: string,
    extraHeaders?: Record<string, string>,
  ): Promise<BankMasterIFSCResponse[]> {
    const url = `${this.nriapi}bank-master/${encodeURIComponent(query)}`;

    try {
      const response = await axios.get(url, {
        headers: {
          accept: "application/json",
          ...extraHeaders,
        },
      });

      const body = response.data;
      if (Array.isArray(body)) return body;
      if (Array.isArray(body?.data)) return body.data;
      if (body?.ifscCode) return [body];
      return [];
    } catch (error) {
      console.log(error);
      this.removeModal();
      throw error;
    }
  }

  async getBankRpdStatus(
    applicationId: string,
    vendorSessionId: string,
    hideSpinner?: () => void,
  ): Promise<BankRpdStatusResponse> {
    const url = `${this.nriapi}applications/${applicationId}/bank/rpd/status?vendorSessionId=${encodeURIComponent(
      vendorSessionId,
    )}`;

    try {
      const response = await axios.get(url, {
        headers: {
          accept: "*/*",
        },
      });

      return response.data;
    } catch (error) {
      return this.handleError(error, hideSpinner);
    }
  }

  // FATCA — submit tax residencies + US-person flag + country of birth.
  // POST …/applications/{applicationId}/fatca
  async submitFatca(
    applicationId: string,
    data: {
      residencies: {
        countryCode: string;                 // ISO-2 of Country of TAX Residence
        tin: string;
        // GUID fields — send null (not "") for empty slots, else binding fails
        // and the residency is dropped server-side.
        tinProofDocumentId: string | null;   // image slot 1
        tinProofDocumentId2: string | null;  // image slot 2
        tinProofDocumentId3: string | null;  // image slot 3
        countryofTaxResidence: string;       // full country name
        tinIssuingCountry: string;           // full country name
      }[];
      usCitizen: boolean;
      countryOfBirth: string;
      idempotencyKey: string;
      Citizenship: string;              // full country name (capital C per contract)
    },
    hideSpinner?: () => void,
  ): Promise<any> {
    const url = `${this.nriapi}applications/${applicationId}/fatca`;
    try {
      const response = await axios.post(url, data, {
        headers: {
          accept: "*/*",
          "Content-Type": "application/json",
        },
      });
      return response.data;
    } catch (error) {
      return this.handleError(error, hideSpinner);
    }
  }

  async postNri(
    path: string,
    data: any,
    hideSpinner?: () => void,
    extraHeaders?: Record<string, string>,
    errorOptions?: { silentStatuses?: number[]; silentErrorCodes?: string[] },
  ): Promise<any> {
    const url = this.nriapi + path;
    const headers = { "Content-Type": "application/json", ...extraHeaders };

    try {
      const response = await axios.post(url, data, { headers });
      return await response.data;
    } catch (error) {
      return this.handleError(error, hideSpinner, errorOptions);
    }
  }


  async registerUser(data: any, hideSpinner?: () => void): Promise<any> {
    return this.postNri("register", data, hideSpinner, {
      "Idempotency-Key": this.generateIdempotencyKey(),
    });
  }

  async uploadNriDocument(
    data: any,
    hideSpinner?: () => void,
    extraHeaders?: Record<string, string>,
  ): Promise<any> {
    const params = new URLSearchParams({
      applicationId: data.applicationId,
      documentType: data.documentType,
    });

    const url = `${this.nriapi}documents/upload?${params.toString()}`;

    const formData = new FormData();
    formData.append("file", data.file);

    try {
      const response = await axios.post(url, formData, {
        headers: {
          Accept: "application/json",
          "Content-Type": "multipart/form-data",
          ...extraHeaders,
        },
      });

      return response.data;
    } catch (error) {
      return this.handleError(error, hideSpinner);
    }
  }

  async verifyNriKycSelfie(
    data: any,
    hideSpinner?: () => void,
    extraHeaders?: Record<string, string>,
  ): Promise<any> {
    const url = `${this.nriapi}applications/${data.applicationId}/kyc/verify`;

    const formData = new FormData();
    formData.append("Photo", data.file);
    formData.append("GeoLat", data.geoLat);
    formData.append("GeoLng", data.geoLng);
    formData.append("GeoAccuracy", data.geoAccuracy);

    try {
      const response = await axios.post(url, formData, {
        headers: {
          Accept: "application/json",
          ...extraHeaders,
        },
      });

      return response.data;
    } catch (error) {
      return this.handleError(error, hideSpinner);
    }
  }

  async verifyNriSignature(
    data: any,
    hideSpinner?: () => void,
    extraHeaders?: Record<string, string>,
  ): Promise<any> {
    const url = `${this.nriapi}applications/${data.applicationId}/signature`;

    const formData = new FormData();
    formData.append("CaptureMethod", data.captureMethod);
    formData.append("File", data.file);
    formData.append("DocumentId", data.documentId);
    formData.append("IdempotencyKey", data.idempotencyKey || "");

    try {
      const response = await axios.post(url, formData, {
        headers: {
          Accept: "*/*",
          ...extraHeaders,
        },
      });

      return response.data;
    } catch (error) {
      return this.handleError(error, hideSpinner);
    }
  }

  // Send an OTP for the given application/channel (e.g. "Sms", "WhatsApp").
  async sendNriOtp(
    applicationId: string,
    channel: string,
    hideSpinner?: () => void,
    extra?: Record<string, unknown>,
  ): Promise<any> {
    return this.postNri(
      `applications/${applicationId}/otp/send`,
      { channel, ...extra },
      hideSpinner,
    );
  }

  // Verify the entered OTP code against the one sent for the application.
  async verifyNriOtp(
    applicationId: string,
    channel: string,
    code: string,
    hideSpinner?: () => void,
  ): Promise<any> {
    return this.postNri(
      `applications/${applicationId}/otp/verify`,
      { channel, code },
      hideSpinner,
    );
  }

  // Passport upload — multipart/form-data.
  async uploadPassportFile(
    applicationId: string,
    field: "FrontFile" | "BackFile" | "TranslationFile",
    file: File,
    passportType: string,
    onProgress?: (p: number) => void,
    hideSpinner?: () => void,
  ): Promise<any> {
    const url = `${this.nriapi}applications/${applicationId}/passport/upload`;
    const form = new FormData();
    form.append(field, file);
    // form.append("IdempotencyKey", this.generateIdempotencyKey());
    form.append("IdempotencyKey", '');
    form.append("passportType", passportType);

    try {
      const response = await axios.post(url, form, {
        headers: { accept: "*/*" },
        onUploadProgress: (e) => {
          if (onProgress && e.total) onProgress((e.loaded / e.total) * 100);
        },
      });
      return response.data;
    } catch (error) {
      return this.handleError(error, hideSpinner);
    }
  }

  // Passport details — GET the parsed/stored passport for an application.
  async getPassport(
    applicationId: string,
    hideSpinner?: () => void,
  ): Promise<any> {
    const url = `${this.nriapi}applications/${applicationId}/passport`;
    try {
      const response = await axios.get(url, { headers: { accept: "*/*" } });
      return response.data;
    } catch (error) {
      return this.handleError(error, hideSpinner);
    }
  }

  // Passport details — save user-edited details back to the application.
  async updatePassport(
    applicationId: string,
    data: any,
    hideSpinner?: () => void,
  ): Promise<any> {
    const url = `${this.nriapi}applications/${applicationId}/passport`;
    try {
      const response = await axios.post(url, data, {
        headers: { "Content-Type": "application/json", accept: "*/*" },
      });
      return response.data;
    } catch (error) {
      return this.handleError(error, hideSpinner);
    }
  }

  // ─── Documents ────────────────────────────────────────────────────────────
  async uploadDocument(
    applicationId: string,
    documentType: string,
    file: File,
    onProgress?: (p: number) => void,
    hideSpinner?: () => void,
  ): Promise<any> {
    const params = new URLSearchParams({ applicationId, documentType });
    const url = `${this.nriapi}documents/upload?${params.toString()}`;
    const form = new FormData();
    form.append("file", file);

    try {
      const response = await axios.post(url, form, {
        headers: { accept: "application/json" },
        onUploadProgress: (e) => {
          if (onProgress && e.total) onProgress((e.loaded / e.total) * 100);
        },
      });
      return response.data;
    } catch (error) {
      return this.handleError(error, hideSpinner);
    }
  }

  // ─── Visa ─────────────────────────────────────────────────────────────────
  async submitVisa(
    applicationId: string,
    data: any,
    hideSpinner?: () => void,
  ): Promise<any> {
    const body = {
      ...data,
      idempotencyKey: data.idempotencyKey ?? '',
    };
    return this.postNri(
      `applications/${applicationId}/visa`,
      body,
      hideSpinner,
      {
        accept: "*/*",
      },
    );
  }

  // ─── OCI / PIO ────────────────────────────────────────────────────────────
  async submitOciPoi(
    applicationId: string,
    data: any,
    hideSpinner?: () => void,
  ): Promise<any> {
    const url = `${this.nriapi}applications/${applicationId}/poi-oci/upload`;
    const form = new FormData();
    form.append("CardType", data.cardType);
    form.append("CardNumber", data.cardNumber);
    if (data.frontFile) form.append("FrontFile", data.frontFile);
    if (data.backFile) form.append("BackFile", data.backFile);
    if (data.translationFile)
      form.append("TranslationFile", data.translationFile);
    form.append("IdempotencyKey", '');

    try {
      const response = await axios.post(url, form, {
        headers: { accept: "*/*" },
      });
      return response.data;
    } catch (error) {
      return this.handleError(error, hideSpinner);
    }
  }

  // ─── Foreign Address ──────────────────────────────────────────────────────
  async submitForeignAddress(
    applicationId: string,
    data: {
      line1: string;
      line2?: string;
      line3?: string;
      city: string;
      stateProvince: string;
      postalCode: string;
      country: string;
      proofType: string;
      proofNumber: string;
      expiryDate: string;
      frontFile?: File;
      backFile?: File;
      existingFrontDocumentId?: string;
      existingBackDocumentId?: string;
      idempotencyKey?: string;
    },
    hideSpinner?: () => void,
  ): Promise<any> {
    const url = `${this.nriapi}applications/${applicationId}/address/foreign`;

    const form = new FormData();

    // Address fields
    form.append("StateProvince", data.stateProvince ?? "");
    form.append("ExpiryDate", data.expiryDate ?? "");
    form.append("City", data.city ?? "");
    form.append("ProofNumber", data.proofNumber ?? "");
    form.append("IdempotencyKey", data.idempotencyKey ?? "");
    form.append("Country", data.country ?? "");
    form.append("PostalCode", data.postalCode ?? "");
    form.append("Line1", data.line1 ?? "");
    form.append("ProofType", data.proofType ?? "");
    form.append("Line2", data.line2 ?? "");
    form.append("Line3", data.line3 ?? "");

    if (data.backFile) form.append("BackFile", data.backFile);
    if (data.frontFile) form.append("FrontFile", data.frontFile);

    if (data.existingBackDocumentId)
      form.append("ExistingBackDocumentId", data.existingBackDocumentId);
    if (data.existingFrontDocumentId)
      form.append("ExistingFrontDocumentId", data.existingFrontDocumentId);

    try {
      const response = await axios.post(url, form, {
        headers: {
          accept: "*/*",
        },
      });

      return response.data;
    } catch (error) {
      return this.handleError(error, hideSpinner);
    }
  }

  // ─── Permanent Address ─────────────────────────────────────────────────────
  async submitPermanentAddress(
    applicationId: string,
    data: {
      line1: string;
      line2?: string;
      line3?: string;
      city: string;
      State: string;
      Pincode: string;
      country: string;
      proofType: string;
      proofNumber: string;
      expiryDate: string;
      frontFile?: File;
      backFile?: File;
      existingFrontDocumentId?: string;
      existingBackDocumentId?: string;
      idempotencyKey?: string;
    },
    hideSpinner?: () => void,
  ): Promise<any> {
    const url = `${this.nriapi}applications/${applicationId}/address/permanent/manual`;

    const form = new FormData();

    form.append("State", data.State ?? "");
    form.append("ExpiryDate", data.expiryDate ?? "");
    form.append("City", data.city ?? "");
    form.append("ProofNumber", data.proofNumber ?? "");
    form.append("IdempotencyKey", data.idempotencyKey ?? "");
    form.append("Country", data.country ?? "");
    form.append("Pincode", data.Pincode ?? "");
    form.append("Line1", data.line1 ?? "");
    form.append("ProofType", data.proofType ?? "");
    form.append("Line2", data.line2 ?? "");
    form.append("Line3", data.line3 ?? "");

    if (data.backFile) form.append("BackFile", data.backFile);
    if (data.frontFile) form.append("FrontFile", data.frontFile);

    if (data.existingBackDocumentId)
      form.append("ExistingBackDocumentId", data.existingBackDocumentId);
    if (data.existingFrontDocumentId)
      form.append("ExistingFrontDocumentId", data.existingFrontDocumentId);

    try {
      const response = await axios.post(url, form, {
        headers: {
          accept: "*/*",
        },
      });

      return response.data;
    } catch (error) {
      return this.handleError(error, hideSpinner);
    }
  }

  // ─── Plans ────────────────────────────────────────────────────────────────

  async getPlans(
    applicationId: string,
    journeyType: string,
    depository: string,
    hideSpinner?: () => void,
  ): Promise<any> {
    const params = new URLSearchParams({ journeyType, depository });
    const url = `${this.nriapi}applications/${applicationId}/plans?${params.toString()}`;
    try {
      const response = await axios.get(url, { headers: { accept: "*/*" } });
      console.log("response.data", response.data);
      return response.data;
    } catch (error) {
      return this.handleError(error, hideSpinner);
    }
  }

  async selectPlan(
    applicationId: string,
    data: any,
    hideSpinner?: () => void,
  ): Promise<any> {
    return this.postNri(
      `applications/${applicationId}/plans/select`,
      {
        planId: data.planId,
        depository: data.depository,
        idempotencyKey: data.idempotencyKey ?? '',
      },
      hideSpinner,
    );
  }

  async getRequest(controller: string, hideSpinner?: () => void): Promise<any> {
    const url = this.api + controller;
    const headers = this.getHeaders();

    try {
      const response = await axios.get(url, { headers });
      return this.decryptResponse(response);
    } catch (error) {
      return this.handleError(error, hideSpinner);
    }
  }

  // ─── DigiLocker ───────────────────────────────────────────────────────────
  async initiateDigilocker(
    applicationId: string,
    hideSpinner?: () => void,
  ): Promise<any> {
    const url = `${this.nriapi}applications/${applicationId}/digilocker/initiate`;
    try {
      const response = await axios.post(url, null, {
        headers: { accept: "*/*" },
      });
      return response.data;
    } catch (error) {
      return this.handleError(error, hideSpinner);
    }
  }

  async digilockerCallback(
    applicationId: string,
    code: string,
    hideSpinner?: () => void,
  ): Promise<any> {
    const params = new URLSearchParams({ applicationId, code });
    const url = `${this.nriapi}digilocker/callback?${params.toString()}`;
    try {
      const response = await axios.get(url, { headers: { accept: "*/*" } });
      return response.data;
    } catch (error) {
      return this.handleError(error, hideSpinner);
    }
  }

  // ─── Workflow stage data (generic "Get Masters") ───────────────────────────
  async getWorkflowStageData(
    applicationId: string,
    stagename: string,
    hideSpinner?: () => void,
  ): Promise<any> {
    try {
      return await this.postNri(
        `applications/${applicationId}/get/workflow/stagewisedate`,
        {
          stagename,
          idempotencyKey: '',
        },
        hideSpinner,
        { accept: "*/*" },
        { silentStatuses: [400, 404], silentErrorCodes: ["COMMON_001"] },
      );
    } catch (err: any) {
      const status = err?.response?.status;
      const errorCode = err?.response?.data?.errorCode;
      if (status === 404 || status === 400 || errorCode === "COMMON_001") {
        return null;
      }
      throw err;
    }
  }

  // ─── Resume / Continue on mobile ───────────────────────────────────────────
  async sendResumeLink(
    applicationId: string,
    hideSpinner?: () => void,
  ): Promise<any> {
    const url = `${this.nriapi}resume/send?applicationId=${encodeURIComponent(
      applicationId,
    )}`;
    try {
      const response = await axios.post(url, "", {
        headers: { Accept: "*/*" },
      });
      return response.data;
    } catch (error) {
      return this.handleError(error, hideSpinner);
    }
  }

  async getDigilockerWorkflow(
    applicationId: string,
    hideSpinner?: () => void,
  ): Promise<any> {
    return this.getWorkflowStageData(applicationId, "DIGILOCKER", hideSpinner);
  }

  async getPanWorkflow(
    applicationId: string,
    hideSpinner?: () => void,
  ): Promise<any> {
    return this.getWorkflowStageData(applicationId, "PAN", hideSpinner);
  }

  async getPersonalDetailsWorkflow(
    applicationId: string,
    hideSpinner?: () => void,
  ): Promise<any> {
    return this.getWorkflowStageData(applicationId, "PERSONAL", hideSpinner);
  }

  async getBankDetailsWorkflow(
    applicationId: string,
    hideSpinner?: () => void,
  ): Promise<any> {
    return this.getWorkflowStageData(applicationId, "BANK", hideSpinner);
  }

  async getSignatureWorkflow(
    applicationId: string,
    hideSpinner?: () => void,
  ): Promise<any> {
    return this.getWorkflowStageData(applicationId, "SIGNATURE", hideSpinner);
  }

  async getDeclarationWorkflow(
    applicationId: string,
    hideSpinner?: () => void,
  ): Promise<any> {
    return this.getWorkflowStageData(applicationId, "DECLARATION", hideSpinner);
  }

  async getPlanSelectionWorkflow(
    applicationId: string,
    hideSpinner?: () => void,
  ): Promise<any> {
    return this.getWorkflowStageData(applicationId, "PLANSELECTION", hideSpinner);
  }

  async getForeignAddressWorkflow(
    applicationId: string,
    hideSpinner?: () => void,
  ): Promise<any> {
    return this.getWorkflowStageData(applicationId, "FOREIGNADDRESS", hideSpinner);
  }

  async getVisaWorkflow(
    applicationId: string,
    hideSpinner?: () => void,
  ): Promise<any> {
    return this.getWorkflowStageData(applicationId, "VISA", hideSpinner);
  }

  async getFatcaWorkflow(
    applicationId: string,
    hideSpinner?: () => void,
  ): Promise<any> {
    return this.getWorkflowStageData(applicationId, "FATCA", hideSpinner);
  }

  async getOciPoiWorkflow(
    applicationId: string,
    cardType: string,
    hideSpinner?: () => void,
  ): Promise<any> {
    const stage = String(cardType).toUpperCase() === "PIO" ? "PIO" : "OCI";
    return this.getWorkflowStageData(applicationId, stage, hideSpinner);
  }

  async getPassportWorkflow(
    applicationId: string,
    hideSpinner?: () => void,
  ): Promise<any> {
    return this.getWorkflowStageData(applicationId, "PASSPORT", hideSpinner);
  }

  // Permanent (Indian) address — stage name is "INDIANADDRESS".
  async getPermanentAddressWorkflow(
    applicationId: string,
    hideSpinner?: () => void,
  ): Promise<any> {
    return this.getWorkflowStageData(applicationId, "INDIANADDRESS", hideSpinner);
  }

}

export const apiService = new APIService();
export default apiService;
