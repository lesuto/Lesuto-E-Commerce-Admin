import { Injectable } from '@nestjs/common';
import { RequestContext, Channel, TransactionalConnection } from '@vendure/core';

@Injectable()
export class TenantService {
    constructor(private connection: TransactionalConnection) {}

    async getChannelTokenByCode(ctx: RequestContext, channelCode: string): Promise<string | null> {
        // Find the channel where the 'code' matches the subdomain
        // We use the raw connection repository to search across all channels
        const channel = await this.connection.getRepository(ctx, Channel).findOne({
            where: { code: channelCode },
        });

        return channel ? channel.token : null;
    }
}