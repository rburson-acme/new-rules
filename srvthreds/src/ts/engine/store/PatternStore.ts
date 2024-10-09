import { Pattern } from "../Pattern.js";

export class PatternStore {

    constructor(readonly pattern: Pattern, private _numThreds: number = 0, private _lastThredStart: number = 0) {}

    incNumThreds() {
        return this._numThreds++;
    }

    decNumThreds() {
        if(this._numThreds > 0) {
            this._numThreds--;
        }
    }

    get numThreds() {
        return this._numThreds;
    }

    get lastThredStart() {
        return this._lastThredStart;
    }

    set lastThredStart(lastThredStart: number) {
        this._lastThredStart =lastThredStart;
    }

    getState(): PatternStoreState {
        return {
            numThreds: this.numThreds,
            lastThredStart: this.lastThredStart
        }
    }

    fromState(state: PatternStoreState): PatternStore {
        this._numThreds = state.numThreds;
        this._lastThredStart = state.lastThredStart;
        return this;
    }

}

interface PatternStoreState {
    numThreds: number;
    lastThredStart: number;
}