import { EventContent } from "../../thredlib";

export interface Adapter
{
    initialize(): Promise<void>;
    execute(content?: EventContent): Promise<any>;
}
