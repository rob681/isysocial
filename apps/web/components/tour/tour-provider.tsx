"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { driver, type Driver } from "driver.js";
import "driver.js/dist/driver.css";
import { trpc } from "@/lib/trpc/client";
import { adminTourSteps, editorTourSteps, clientTourSteps } from "./tour-steps";

export function TourProvider() {
  const { data: session } = useSession();
  const role = (session?.user as any)?.role as string | undefined;
  const driverRef = useRef<Driver | null>(null);
  const hasStarted = useRef(false);

  const { data: onboardingData, isLoading } =
    trpc.profile.getOnboardingStatus.useQuery(undefined, {
      enabled: !!session?.user,
    });

  const completeMutation = trpc.profile.completeOnboarding.useMutation();

  useEffect(() => {
    // Wait until all data is ready
    if (!session?.user || !role || isLoading || !onboardingData) return;

    // Already completed — nothing to do
    if (onboardingData.onboardingCompleted) {
      hasStarted.current = false; // reset so a future toggle works
      return;
    }

    // Don't start twice in the same render cycle
    if (hasStarted.current) return;
    hasStarted.current = true;

    // Small delay to let sidebar render & transition
    const timeout = setTimeout(() => {
      let steps;
      if (role === "ADMIN") steps = adminTourSteps;
      else if (role === "EDITOR") steps = editorTourSteps;
      else if (role === "CLIENTE") steps = clientTourSteps;
      else return;

      // Destroy previous instance if any
      if (driverRef.current) {
        try {
          driverRef.current.destroy();
        } catch {
          // ignore
        }
      }

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
          completeMutation.mutate();
          driverObj.destroy();
          driverRef.current = null;
          hasStarted.current = false;
        },
      });

      driverRef.current = driverObj;
      driverObj.drive();
    }, 1500);

    return () => clearTimeout(timeout);
  }, [session, role, onboardingData, isLoading, completeMutation]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (driverRef.current) {
        try {
          driverRef.current.destroy();
        } catch {
          // ignore
        }
        driverRef.current = null;
      }
    };
  }, []);

  return null;
}
