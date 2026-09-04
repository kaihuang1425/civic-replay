import type { OutcomeStatus, StepKind } from "@civic-replay/shared";

import logoMark from "./logo/mark.png";

import iconAlert from "./icons/alert.svg";
import iconUnderstand from "./icons/understand.svg";
import iconChooseChannel from "./icons/choose-channel.svg";
import iconPrepare from "./icons/prepare.svg";
import iconVerifyIdentity from "./icons/verify-identity.svg";
import iconObtainResult from "./icons/obtain-result.svg";

import statusCompleted from "./status/completed.png";
import statusBlocker from "./status/blocker.png";
import statusFailed from "./status/failed.png";

import personaOfficeWorker from "./personas/office-worker.png";
import personaSeniorLivingAlone from "./personas/senior-living-alone.png";
import personaNewResident from "./personas/new-resident.png";
import personaMobilityImpaired from "./personas/mobility-impaired.png";
import personaLowDigitalLiteracy from "./personas/low-digital-literacy.png";
import personaFamilyRepresentative from "./personas/family-representative.png";

import categoryPublicSafety from "./categories/public-safety.png";
import categorySocialWelfare from "./categories/social-welfare.png";
import categoryHealthcare from "./categories/healthcare.png";
import categoryHousing from "./categories/housing.png";

import emptyCreateScenario from "./empty-states/create-scenario-card.png";
import emptyNoResults from "./empty-states/no-results-card.png";
import emptyStartSimulation from "./empty-states/start-simulation-card.png";

import labelsData from "./labels.zh-TW.json";

export const LOGO_MARK = logoMark;

/** Step icon per `ServiceStep.kind`, per design.md Decision 2. */
export const STEP_ICONS: Record<StepKind, string> = {
  alert: iconAlert,
  understand: iconUnderstand,
  choose_channel: iconChooseChannel,
  prepare: iconPrepare,
  verify_identity: iconVerifyIdentity,
  obtain_result: iconObtainResult,
};

/** Status icon per replay outcome, per design.md Decision 3. */
export const STATUS_ICONS: Record<OutcomeStatus, string> = {
  PASS: statusCompleted,
  NEED_HELP: statusBlocker,
  BLOCKED: statusFailed,
};

/**
 * Avatar per canonical persona id (`data/seeds/personas.json`), per design.md
 * Decision 4. Deliberately closed — an id outside this set (custom-added or
 * AI-generated) has no entry and MUST fall back to the text/initial treatment,
 * never a guessed avatar.
 */
export const PERSONA_AVATARS: Readonly<Record<string, string>> = {
  general: personaOfficeWorker,
  elderly_alone: personaSeniorLivingAlone,
  new_immigrant: personaNewResident,
  mobility_impaired: personaMobilityImpaired,
  no_smartphone: personaLowDigitalLiteracy,
  family_proxy: personaFamilyRepresentative,
};

/** Service-category icon per template id, per design.md Decision 5. */
export const CATEGORY_ICONS: Readonly<Record<string, string>> = {
  "heavy-rain-flooding": categoryPublicSafety,
  "disaster-relief": categoryPublicSafety,
  "childcare-subsidy": categorySocialWelfare,
  "vaccine-booking": categoryHealthcare,
  "rent-subsidy": categoryHousing,
};

export const EMPTY_STATE_IMAGES = {
  createScenario: emptyCreateScenario,
  noResults: emptyNoResults,
  startSimulation: emptyStartSimulation,
} as const;

export const labels = labelsData;
