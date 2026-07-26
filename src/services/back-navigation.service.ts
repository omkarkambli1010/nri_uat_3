import { toast } from "./toast.service";
import apiService from "./api.service";

type BackNavigationDependencies = {
  push: (route: string) => void;
  showSpinner: () => void;
  hideSpinner: () => void;
};

type BackStageData = {
  route?: string;
};

export default async function dynamicBackService(
  currentStageName: string,
  applicationId: string,
  dependencies: BackNavigationDependencies,
): Promise<void> {
  const { push, showSpinner, hideSpinner } = dependencies;

  if (!applicationId) {
    toast.error("Application Id not found");
    return;
  }

  const reqData = {
    currentstage: currentStageName,
    idempotencyKey: "",
  };

  showSpinner();

  try {
    const response = await apiService.postNri(
      `applications/${applicationId}/get/workflow/backdata`,
      reqData,
    );

    console.log("Workflow backdata Response:", response);

    let route = "";

    try {
      const backStageValue = response?.backStageUrl;

      const backStageData: BackStageData | null =
        typeof backStageValue === "string"
          ? JSON.parse(backStageValue)
          : (backStageValue ?? null);

      route = backStageData?.route?.trim() ?? "";

      if (route.includes("digilocker-screen")) {
        route = "aadhar";
      }
    } catch (parseError) {
      console.error("Back stage URL parsing error:", parseError);
    }

    if (!route) {
      toast.error("Back Route Not provided", {
        position: "bottom-center",
        autoClose: 3000,
      });

      return;
    }

    const normalizedRoute = route.startsWith("/") ? route : `/${route}`;

    push(normalizedRoute);
  } catch (error: any) {
    const errorData = error?.response?.data;

    console.error("Workflow back navigation error:", errorData ?? error);

    toast.error(
      errorData?.message ?? "Unable to navigate to the previous page",
      {
        position: "bottom-center",
        autoClose: 3000,
      },
    );
  } finally {
    hideSpinner();
  }
}
