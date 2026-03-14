"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { driver } from "driver.js";
import "driver.js/dist/driver.css";
import { trpc } from "@/lib/trpc/client";
import { adminTourSteps, editorTourSteps, clientTourSteps } from "./tour-steps";

export function TourProvider() {
  const { data: session } = useSession();
  const role = (session?.user as any)?.role as string | undefined;
  const [hasChecked, setHasChecked] = useState(false);

  const { data: onboardingData } = trpc.profile.getOnboardingStatus.useQuery(
    undefined,
    { enabled: !!session?.user }
  );

  const completeMutation = trpc.profile.completeOnboarding.useMutation();

  useEffect(() => {
    if (!session?.user || !role || !onboardingData || hasChecked) return;
    setHasChecked(true);

    if (onboardingData.onboardingCompleted) return;

    // Small delay to let sidebar render & transition
    const timeout = setTimeout(() => {
      let steps;
      if (role === "ADMIN") steps = adminTourSteps;
      else if (role === "EDITOR") steps = editorTourSteps;
      else if (role === "CLIENTE") steps = clientTourSteps;
      else return; // No tour for SUPER_ADMIN, SOPORTE, FACTURACION

      const driverObj = driver({
        showProgress: true,
        animate: true,
        allowClose: true,
        overlayColor: "rgba(0, 0, 0, 0.65)",
        stagePadding: 8,
        stageRadius: 12,
        popoverClass: "isysocial-tour-popover",
        nextBtnText: "Siguiente",
        prevBtnText: "Anterior",
        doneBtnText: "Finalizar",
        progressText: "{{current}} de {{total}}",
        steps,
        onDestroyStarted: () => {
          // Mark onboarding as completed when user finishes or closes the tour
          completeMutation.mutate(undefined, {
            onSuccess: () => {
              // Could refresh session here, but not critical
            },
          });
          driverObj.destroy();
        },
      });

      driverObj.drive();
    }, 1500);

    return () => clearTimeout(timeout);
  }, [session, role, onboardingData, hasChecked, completeMutation]);

  return null;
}
