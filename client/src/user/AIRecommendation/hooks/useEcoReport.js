import { useEffect, useState } from "react";
import { EcoReportError, getEcoReport } from "../../../firebase/ecoReportService";
import { isModule2Report, isStaleReport } from "../services/report/completedReportView.js";

export const ECO_REPORT_LOAD = {
  IDLE: "idle",
  LOADING: "loading",
  SUCCESS: "success",
  NOT_FOUND: "not_found",
  UNAUTHORIZED: "unauthorized",
  ERROR: "error",
};

export default function useEcoReport(itineraryId) {
  const id = typeof itineraryId === "string" ? itineraryId.trim() : "";
  const [activeId, setActiveId] = useState(id);
  const [status, setStatus] = useState(
    id ? ECO_REPORT_LOAD.LOADING : ECO_REPORT_LOAD.IDLE
  );
  const [report, setReport] = useState(null);

  if (activeId !== id) {
    setActiveId(id);
    setReport(null);
    setStatus(id ? ECO_REPORT_LOAD.LOADING : ECO_REPORT_LOAD.IDLE);
  }

  useEffect(() => {
    if (!id) return undefined;

    let cancelled = false;

    getEcoReport(id)
      .then((data) => {
        if (cancelled) return;
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
        const code = error instanceof EcoReportError ? error.code : "";
        setStatus(
          code === "UNAUTHORIZED" || code === "AUTH_REQUIRED"
            ? ECO_REPORT_LOAD.UNAUTHORIZED
            : ECO_REPORT_LOAD.ERROR
        );
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  return { status, report };
}
