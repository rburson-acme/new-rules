import { AdminService } from '../../admin/AdminService';
import { ThredsStore } from '../../engine/store/ThredsStore';
import { Threds } from '../../engine/Threds';
import { errorCodes, errorKeys, EventContent, eventTypes, Event, EventValues } from '../../thredlib';
import { EventThrowable } from '../../thredlib/core/Errors';
import { Adapter } from '../adapter/Adapter';

export class AdminAdapter implements Adapter {
  private adminService: AdminService;
  constructor(threds: Threds) {
    this.adminService = new AdminService(threds);
  }
  async initialize(): Promise<void> {}
  async execute(event: Event): Promise<EventValues['values']> {
    const content = event.data?.content;
    if (!content)
      throw EventThrowable.get(
        'No content provided for Admin operation',
        errorCodes[errorKeys.MISSING_ARGUMENT_ERROR].code,
      );
    return await this.adminService.handleSystemEvent({ event });
  }
}
