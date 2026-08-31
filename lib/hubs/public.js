"use strict";

const { normalizeStudentIds, resolvedConfirmedCount } = require("./join");

function formatVacancyLabel(confirmedStudents, maxStudents) {
  const confirmed = Number(confirmedStudents) || 0;
  const max = Number(maxStudents) || 0;
  const available = Math.max(0, max - confirmed);

  if (max <= 0) {
    return "Vagas disponíveis";
  }

  if (available <= 0) {
    return "Turma completa";
  }

  return `Vagas disponíveis: ${available} de ${max}`;
}

function collectiveSavingsPercent(individualPrice, collectivePrice) {
  const individual = Number(individualPrice);
  const collective = Number(collectivePrice);

  if (!Number.isFinite(individual) || individual <= 0) {
    return 0;
  }

  if (!Number.isFinite(collective) || collective >= individual) {
    return 0;
  }

  return Math.round(((individual - collective) / individual) * 100);
}

function formatHubScheduleDisplay(hub) {
  if (typeof hub?.schedule === "string" && hub.schedule.trim()) {
    return hub.schedule.trim();
  }

  const date = typeof hub?.scheduledDate === "string" ? hub.scheduledDate : "";
  const time = typeof hub?.startTime === "string" ? hub.startTime : "";
  return [date, time].filter(Boolean).join(" · ");
}

function toPublicCollectiveHub(id, data, viewerId) {
  const ids = normalizeStudentIds(data?.confirmedStudentIds);
  const confirmedStudents = resolvedConfirmedCount(data);

  return {
    id,
    title: data?.title || "",
    description: data?.description || "",
    confirmedStudents,
    maxStudents: Number(data?.maxStudents) || 0,
    currentPrice: Number(data?.currentPrice) || 0,
    fullPrice: Number(data?.fullPrice) || 0,
    schedule: formatHubScheduleDisplay(data),
    modality: data?.modality === "presencial" ? "presencial" : "online",
    subject: typeof data?.subject === "string" ? data.subject : "",
    tutorName: typeof data?.tutorName === "string" ? data.tutorName : "",
    scheduledDate: typeof data?.scheduledDate === "string" ? data.scheduledDate : "",
    startTime: typeof data?.startTime === "string" ? data.startTime : "",
    individualPrice: Number(data?.individualPrice) || 0,
    status: data?.status || "open",
    tutorId: data?.tutorId || "",
    isJoined: Boolean(viewerId && ids.includes(viewerId)),
  };
}

function publicHubOmitsStudentIds(hub) {
  return hub != null && !("confirmedStudentIds" in hub);
}

function buildHubSchedule({ scheduledDate, startTime, modality }) {
  const modalityLabel = modality === "presencial" ? "Presencial" : "Online";

  if (scheduledDate && startTime) {
    const date = new Date(`${scheduledDate}T${startTime}:00`);
    if (!Number.isNaN(date.getTime())) {
      const dateLabel = date.toLocaleDateString("pt-BR", {
        weekday: "long",
        day: "numeric",
        month: "long",
      });
      return `${dateLabel}, ${startTime} · ${modalityLabel}`;
    }
  }

  return [scheduledDate, startTime, modalityLabel].filter(Boolean).join(" · ");
}

module.exports = {
  buildHubSchedule,
  collectiveSavingsPercent,
  formatHubScheduleDisplay,
  formatVacancyLabel,
  publicHubOmitsStudentIds,
  toPublicCollectiveHub,
};
