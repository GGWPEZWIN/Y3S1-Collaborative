import { useEffect, useState } from "react";

import {
  EcoReportError,
  getEcoReport,
} from "../../../firebase/ecoReportService";

import {
  isModule2Report,
  isStaleReport,
} from "../services/report/completedReportView.js";

export const ECO_REPORT_LOAD = {
  IDLE: "idle",
  LOADING: "loading",
  SUCCESS: "success",
  NOT_FOUND: "not_found",
  UNAUTHORIZED: "unauthorized",
  ERROR: "error",
};

export default function useEcoReport(itineraryId, enabled = true) {
  const id = typeof itineraryId === "string" ? itineraryId.trim() : "";
  const shouldLoad = Boolean(id && enabled);

  const [activeId, setActiveId] = useState(id);
  const [status, setStatus] = useState(
    shouldLoad ? ECO_REPORT_LOAD.LOADING : ECO_REPORT_LOAD.IDLE
  );
  const [report, setReport] = useState(null);

  if (activeId !== id) {
    setActiveId(id);
    setReport(null);
    setStatus(
      shouldLoad ? ECO_REPORT_LOAD.LOADING : ECO_REPORT_LOAD.IDLE
    );
  }

  useEffect(() => {
    if (!shouldLoad) {
      setReport(null);
      setStatus(
        id ? ECO_REPORT_LOAD.NOT_FOUND : ECO_REPORT_LOAD.IDLE
      );
      return undefined;
    }

    let cancelled = false;

    setStatus(ECO_REPORT_LOAD.LOADING);

    getEcoReport(id)
      .then((data) => {
        if (cancelled) return;

        if (!data) {
          setReport(null);
          setStatus(ECO_REPORT_LOAD.NOT_FOUND);
          return;
        }

        if (!isModule2Report(data) || isStaleReport(data, id)) {
          setReport(null);
          setStatus(ECO_REPORT_LOAD.NOT_FOUND);
          return;
        }

        setReport(data);
        setStatus(ECO_REPORT_LOAD.SUCCESS);
      })
      .catch((error) => {
        if (cancelled) return;

        setReport(null);

        const code =
          error instanceof EcoReportError
            ? error.code
            : "";

        if (
          code === "UNAUTHORIZED" ||
          code === "AUTH_REQUIRED"
        ) {
          setStatus(ECO_REPORT_LOAD.UNAUTHORIZED);
          return;
        }

        if (code === "REPORT_NOT_FOUND") {
          setStatus(ECO_REPORT_LOAD.NOT_FOUND);
          return;
        }

        setStatus(ECO_REPORT_LOAD.ERROR);
      });

    return () => {
      cancelled = true;
    };
  }, [id, shouldLoad]);

  return {
    status,
    report,
  };
}
