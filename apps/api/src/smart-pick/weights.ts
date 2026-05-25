export interface SmartPickWeights {
    age: number;
    fit: number;
    continuation: number;
    diversity: number;
}

export const DEFAULT_SMART_PICK_WEIGHTS: SmartPickWeights = {
    age: 0.30,
    fit: 0.35,
    continuation: 0.25,
    diversity: 0.10,
};
