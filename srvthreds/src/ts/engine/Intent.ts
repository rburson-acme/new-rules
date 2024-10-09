export enum IntentType {
    ACCEPT, DECLINE, CLAIM
}

export class Intent {

    constructor(readonly intentType: IntentType) {}
    
    get claimed() {
        return this.intentType === IntentType.CLAIM;
    }

    get accepted() {
        return this.intentType === IntentType.ACCEPT;
    }

    get declined() {
        return this.intentType === IntentType.DECLINE;
    }

    get acceptedOrClaimed() {
        return this.accepted || this.claimed;
    }

    static isClaimed(intent:Intent) {
        return intent.claimed;
    }

    static isAccepted(intent:Intent) {
        return intent.accepted;
    }

    static isAcceptedOrClaimed(intent:Intent) {
        return intent.acceptedOrClaimed;
    }

    static isDeclined(intent:Intent) {
        return intent.declined;
    }
}