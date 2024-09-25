
export type AddressModel = { include: string[], exclude?: string[] };
export interface PublishModel {
    to: AddressModel | string[];
    description?: string;
}