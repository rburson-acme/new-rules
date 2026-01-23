/**
 * An addressing construct that defines a group of participants.
 * It may be reference in a pattern with $groupName
 */
export interface GroupModel {
    /** The name of the group */
    name: string;
    /** An optional description of the group */
    description?: string;
    /**
     * The participants that are members of the group
     */
    readonly participants: {
        participantId: string;
    }[];
}
