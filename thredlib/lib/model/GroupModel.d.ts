export interface GroupModel {
    name: string;
    description?: string;
    readonly participants: {
        participantId: string;
    }[];
}
