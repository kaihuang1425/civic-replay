import type { CitizenState, Persona, Scenario, StateChanges } from "@civic-replay/shared";

/** Fresh state for a persona at the start of a scenario. */
export function initialCitizenState(
  _scenario: Scenario,
  _persona: Persona,
): CitizenState {
  return {
    safe: true,
    location: "home",
    aware: false,
    understands: null,
    evacuation_info: null,
    transport: null,
    needs_assistance: false,
  };
}

/** Apply a step's derived changes to the state, returning a new object. */
export function applyStateChanges(
  state: CitizenState,
  changes: StateChanges,
): CitizenState {
  return { ...state, ...changes } as CitizenState;
}
